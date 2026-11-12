from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from ..db import now
from ..models import Charge
from . import notify
from .fmt import money


def notify_owner(db: Session, charge_ids: list[str]) -> None:
    if not charge_ids:
        return
    charges = db.scalars(select(Charge).where(Charge.id.in_(charge_ids)).options(selectinload(Charge.resident))).all()
    if not charges:
        return
    total = sum(c.amountCents for c in charges)
    r = charges[0].resident
    notify.owner(
        db, "payment.received", f"{r.name} paid {money(total)}",
        "\n".join(f"• {c.label}: {money(c.amountCents)}" for c in charges),
        f"/admin/residents/{r.id}",
    )
    db.commit()


def settle_session(db: Session, session: dict, resident_id: str | None = None) -> bool:
    """Marks the charges in a paid Stripe Checkout Session as paid. Safe to call more than once."""
    if session.get("payment_status") != "paid":
        return False
    meta = session.get("metadata") or {}
    if resident_id and meta.get("residentId") != resident_id:
        return False
    ids = [i for i in str(meta.get("chargeIds", "")).split(",") if i]
    if not ids:
        return False
    types = session.get("payment_method_types") or []
    method = "ACH" if types == ["us_bank_account"] else "STRIPE"
    where = [Charge.id.in_(ids), Charge.status == "DUE"]
    if meta.get("residentId"):
        where.append(Charge.residentId == meta["residentId"])
    res = db.execute(update(Charge).where(*where).values(status="PAID", paidAt=now(), method=method, stripeSessionId=session.get("id")))
    db.commit()
    if res.rowcount:
        notify_owner(db, ids)
    return True
