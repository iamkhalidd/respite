from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Charge, Resident
from . import notify
from .email import site_url
from .fmt import first_name, long_day, money, month_label, period


def bill_rent(db: Session, due: datetime) -> int:
    """Adds rent due on `due` for every active resident and emails each a pay link.

    Safe to run twice: anyone already billed for that month is skipped. Returns how many were billed.
    """
    p = period(due)
    residents = db.scalars(select(Resident).where(Resident.active.is_(True))).all()
    billed = {rid for rid in db.scalars(select(Charge.residentId).where(Charge.period == p))}
    created: list[Resident] = []
    for r in residents:
        if r.id in billed:
            continue
        db.add(Charge(residentId=r.id, label=f"{month_label(due)} rent", period=p, amountCents=r.rentCents, dueDate=due))
        created.append(r)
    for r in created:
        notify.email(
            db, r.email, f"{month_label(due)} rent is ready to pay",
            f"Hi {first_name(r.name)}, your {month_label(due)} rent of {money(r.rentCents)} is due {long_day(due)}.\n"
            f"Pay here: {site_url()}/portal/{r.portalToken}",
            "rent.billed",
        )
    db.commit()  # the charges and their emails are saved together
    return len(created)
