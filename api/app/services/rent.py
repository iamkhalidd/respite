"""Overdue rent: one friendly reminder a few days after the due date, never more."""

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..db import now
from ..models import Charge, Resident
from . import notify
from .email import site_url
from .fmt import first_name, money

# a charge older than this is a conversation, not an automatic email
STALE_AFTER = timedelta(days=45)


def send_overdue_reminders(db: Session) -> int:
    """Reminds each resident once about charges past due. Returns how many residents were reminded."""
    current = now()
    late = current - timedelta(days=get_settings().overdue_after_days)
    charges = db.scalars(
        select(Charge)
        .join(Resident)
        .options(selectinload(Charge.resident))
        .where(
            Charge.status == "DUE",
            Charge.reminderSentAt.is_(None),
            Charge.dueDate <= late,
            Charge.dueDate >= current - STALE_AFTER,
            Resident.active.is_(True),
        )
        .order_by(Charge.dueDate)
    ).all()
    by_resident: dict[str, list[Charge]] = {}
    for c in charges:
        by_resident.setdefault(c.residentId, []).append(c)

    for cs in by_resident.values():
        r = cs[0].resident
        owed = sum(c.amountCents for c in cs)
        link = f"{site_url()}/portal/{r.portalToken}"
        items = "\n".join(f"• {c.label}: {money(c.amountCents)}" for c in cs)
        notify.email(
            db, r.email, f"A reminder: {money(owed)} is past due",
            f"Hi {first_name(r.name)},\n\nThis is a friendly reminder that this is past due:\n{items}\n\n"
            f"Total: {money(owed)}\nPay here: {link}\n\n"
            "If you've already paid in person, or need more time, just let us know. We're happy to work something out.",
            "rent.overdue",
        )
        texted = notify.sms(db, r.phone, f"Respite for the Weary: a reminder that {money(owed)} in rent is past due. Pay here: {link}", "rent.overdue")
        if not r.email and not texted:
            notify.owner(
                db, "rent.overdue", f"{r.name} is past due, {money(owed)}",
                f"{items}\n\nThere's no email on file and no number we can text, so we couldn't remind them. Give them a call or text their pay link.",
                f"/admin/residents/{r.id}",
            )
        for c in cs:
            c.reminderSentAt = current
    db.commit()
    return len(by_resident)
