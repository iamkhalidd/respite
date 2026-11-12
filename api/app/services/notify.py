"""The notification service: every email and every owner alert goes through here.

    notify.email(db, to, subject, text, kind)     queue an email
    notify.owner(db, kind, title, body, link)     put it in the dashboard inbox and email the owner

Both only add rows to the session; the caller commits as usual, so nothing goes out for an
action that was rolled back. The outbox worker then sends the emails, retrying with backoff.
"""

import logging
import threading
import time
from datetime import timedelta

from sqlalchemy import event, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import SessionLocal, now
from ..models import Notification
from .email import EmailError, deliver, site_url

log = logging.getLogger("respite.notify")

KINDS = {
    "request.new": "New room request",
    "request.received": "Request received",
    "resident.welcome": "Welcome and pay link",
    "resident.pay_link": "Pay link or reminder",
    "rent.billed": "Rent billed",
    "payment.received": "Payment received",
    "tour.booked": "Tour booked",
    "tour.confirmed": "Tour confirmation",
    "tour.reminder": "Tour reminder",
    "tour.cancelled": "Tour cancelled",
    "waitlist.joined": "Joined the waitlist",
    "waitlist.opening": "Bed open, to the waitlist",
    "waitlist.told": "Waitlist told",
    "email.failed": "Email couldn't be sent",
    "test": "Test email",
}

# wait after each failed try; after the last one the email is marked FAILED and the owner is told
BACKOFF = [timedelta(minutes=1), timedelta(minutes=5), timedelta(minutes=30), timedelta(hours=2)]
MAX_ATTEMPTS = len(BACKOFF) + 1


def email(db: Session, to: str | None, subject: str, text: str, kind: str) -> Notification | None:
    to = (to or "").strip()
    if not to:
        return None
    n = Notification(channel="EMAIL", kind=kind, recipient=to, subject=subject[:250], body=text, status="PENDING", nextAttemptAt=now())
    db.add(n)
    _wake_after_commit(db)
    return n


def owner(db: Session, kind: str, title: str, body: str = "", link: str | None = None, *, send_email: bool = True) -> Notification:
    """An alert for the owner: always in the dashboard inbox, and by email when OWNER_EMAIL is set."""
    n = Notification(channel="INBOX", kind=kind, subject=title[:250], body=body, link=link, status="SENT", sentAt=now(), nextAttemptAt=None)
    db.add(n)
    if send_email:
        text = body + (f"\n\nOpen it: {site_url()}{link}" if link else "")
        email(db, get_settings().owner_email, title, text.strip(), kind)
    return n


# ───── Outbox worker ─────

def deliver_pending(db: Session, limit: int = 25) -> int:
    """Sends emails that are due and returns how many went out. Safe to run from several processes."""
    q = (
        select(Notification)
        .where(Notification.channel == "EMAIL", Notification.status == "PENDING", Notification.nextAttemptAt <= now())
        .order_by(Notification.createdAt)
        .limit(limit)
    )
    if db.get_bind().dialect.name == "postgresql":
        q = q.with_for_update(skip_locked=True)  # two API instances never send the same email
    sent = 0
    for n in db.scalars(q).all():
        n.attempts += 1
        try:
            deliver(n.recipient or "", n.subject, n.body)
        except Exception as e:  # one bad email must never jam the queue
            if not isinstance(e, EmailError):
                log.exception("Unexpected error sending email %s", n.id)
                e = EmailError(f"{e.__class__.__name__}: {e}"[:300])
            n.lastError = str(e)
            if n.attempts >= MAX_ATTEMPTS:
                n.status, n.nextAttemptAt = "FAILED", None
                log.error("Gave up on email %s to %s: %s", n.id, n.recipient, e)
                # tell the owner in the dashboard (not by email: email is what's broken)
                owner(
                    db, "email.failed", f"Couldn't email {n.recipient}",
                    f"“{n.subject}” failed {n.attempts} times. Last error: {e}",
                    "/admin/notifications?tab=email", send_email=False,
                )
            else:
                n.nextAttemptAt = now() + BACKOFF[n.attempts - 1]
                log.warning("Email %s to %s failed (try %s), will retry: %s", n.id, n.recipient, n.attempts, e)
        else:
            n.status, n.sentAt, n.lastError, n.nextAttemptAt = "SENT", now(), None, None
            sent += 1
    db.commit()
    return sent


def deliver_all(db: Session) -> int:
    total = 0
    while n := deliver_pending(db):
        total += n
    return total


class Outbox:
    """A background thread in the API process that sends queued emails a moment after they're queued."""

    def __init__(self) -> None:
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._next_chores = 0.0

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="outbox", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        if self._thread:
            self._thread.join(timeout=20)

    def wake(self) -> None:
        self._wake.set()

    def _run(self) -> None:
        poll = get_settings().notify_poll_seconds
        while not self._stop.is_set():
            self._wake.clear()
            try:
                with SessionLocal() as db:
                    if time.monotonic() >= self._next_chores:
                        self._next_chores = time.monotonic() + 300
                        from .tours import send_reminders  # here, not at the top: tours imports this module

                        send_reminders(db)
                    while deliver_pending(db) and not self._stop.is_set():
                        pass
            except Exception:  # keep the worker alive whatever happens
                log.exception("Outbox run failed")
            self._wake.wait(poll)


outbox = Outbox()


def _wake_after_commit(db: Session) -> None:
    if not db.info.get("outbox_hook"):
        db.info["outbox_hook"] = True
        event.listen(db, "after_commit", lambda _s: outbox.wake())
