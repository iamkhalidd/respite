import sys

import httpx

from ..config import get_settings


class EmailError(Exception):
    pass


def deliver(to: str, subject: str, text: str) -> None:
    """Sends one email right now. Raises EmailError on failure; the outbox decides whether to retry.

    Without RESEND_API_KEY the email is printed to the terminal instead.
    """
    s = get_settings()
    if not s.resend_api_key:
        body = "\n   ".join(text.split("\n"))
        msg = f"\n[email preview] To: {to}\n   Subject: {subject}\n   {body}\n"
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        print(msg.encode(enc, "replace").decode(enc), flush=True)  # Windows consoles can't print every character
        return
    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {s.resend_api_key}"},
            json={"from": s.email_from, "to": [to], "subject": subject, "text": text},
            timeout=15,
        )
    except httpx.HTTPError as e:
        raise EmailError(f"Couldn't reach Resend: {e.__class__.__name__}") from e
    if r.status_code >= 400:
        try:
            msg = r.json().get("message") or r.text
        except ValueError:
            msg = r.text
        raise EmailError(f"Resend said {r.status_code}: {str(msg)[:300]}")


def site_url() -> str:
    return get_settings().site_url.rstrip("/")
