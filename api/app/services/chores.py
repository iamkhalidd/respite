"""Things that run on a timer: tour reminders and overdue rent reminders.

The outbox worker calls run_chores every few minutes; hosts without the worker call /cron/notifications."""

from sqlalchemy.orm import Session

from .rent import send_overdue_reminders
from .tours import send_reminders


def run_chores(db: Session) -> dict:
    return {"reminded": send_reminders(db), "overdue": send_overdue_reminders(db)}
