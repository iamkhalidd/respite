"""Text messages through Twilio. Optional: without TWILIO_* settings nothing is queued or sent."""

import re

import httpx

from ..config import get_settings
from .email import EmailError


def normalize(phone: str | None) -> str | None:
    """A US number in E.164 (+15405550100), or None when it can't be read as one."""
    raw = (phone or "").strip()
    digits = re.sub(r"\D", "", raw)
    if raw.startswith("+") and 8 <= len(digits) <= 15:
        return "+" + digits
    if len(digits) == 10:
        return "+1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return "+" + digits
    return None


def deliver_sms(to: str, text: str) -> None:
    """Sends one text now. Raises EmailError (the outbox's failure type) so it retries like an email."""
    s = get_settings()
    if not s.sms_enabled:
        raise EmailError("Text messages aren't set up (TWILIO_* settings).")
    try:
        r = httpx.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{s.twilio_account_sid}/Messages.json",
            auth=(s.twilio_account_sid, s.twilio_auth_token),
            data={"To": to, "From": s.twilio_from, "Body": text[:600]},
            timeout=15,
        )
    except httpx.HTTPError as e:
        raise EmailError(f"Couldn't reach Twilio: {e.__class__.__name__}") from e
    if r.status_code >= 400:
        try:
            msg = r.json().get("message") or r.text
        except ValueError:
            msg = r.text
        raise EmailError(f"Twilio said {r.status_code}: {str(msg)[:300]}")
