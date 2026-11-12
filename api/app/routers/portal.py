"""A resident's private pay page. The token in the URL is the only credential."""

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..db import get_db, now
from ..models import Bed, Charge, Resident
from ..serialize import row, rows
from ..services.email import site_url
from ..services.payments import notify_owner, settle_session

router = APIRouter(prefix="/portal", tags=["resident portal"])


def _resident(db: Session, token: str) -> Resident:
    r = db.scalar(
        select(Resident)
        .where(Resident.portalToken == token)
        .options(selectinload(Resident.bed).selectinload(Bed.room), selectinload(Resident.charges))
    )
    if not r:
        raise HTTPException(404, "This pay link isn't valid.")
    return r


def _due(r: Resident, ids: list[str]) -> list[Charge]:
    return sorted(
        (c for c in r.charges if c.status == "DUE" and (not ids or c.id in ids)),
        key=lambda c: c.dueDate,
    )


@router.get("/{token}")
def portal(token: str, db: Session = Depends(get_db)):
    r = _resident(db, token)
    charges = sorted((c for c in r.charges if c.status != "VOID"), key=lambda c: c.dueDate, reverse=True)
    bed = row(r.bed, room=row(r.bed.room)) if r.bed else None
    out = row(r, bed=bed, charges=rows(charges))
    out.pop("portalToken")
    return out | {"stripeEnabled": get_settings().stripe_enabled}


@router.get("/{token}/due")
def due(token: str, ids: str = Query(""), db: Session = Depends(get_db)):
    r = _resident(db, token)
    return {"name": r.name, "charges": rows(_due(r, [i for i in ids.split(",") if i])), "stripeEnabled": get_settings().stripe_enabled}


class ChargesIn(BaseModel):
    chargeIds: list[str] = []


@router.post("/{token}/checkout")
def checkout(token: str, body: ChargesIn, db: Session = Depends(get_db)):
    """Returns where to send the resident: Stripe Checkout, or the test-mode pay screen."""
    r = _resident(db, token)
    charges = _due(r, body.chargeIds)
    if not charges:
        return {"url": f"/portal/{token}"}
    s = get_settings()
    if not s.stripe_enabled:
        return {"url": f"/portal/{token}/pay?c={','.join(c.id for c in charges)}"}
    base = site_url()
    session = stripe.checkout.Session.create(
        api_key=s.stripe_secret_key,
        mode="payment",
        payment_method_types=["card", "us_bank_account"],
        customer_email=r.email or None,
        line_items=[
            {"quantity": 1, "price_data": {"currency": "usd", "unit_amount": c.amountCents, "product_data": {"name": c.label}}}
            for c in charges
        ],
        metadata={"chargeIds": ",".join(c.id for c in charges), "residentId": r.id},
        payment_intent_data={"description": f"Respite for the Weary — {r.name}"},
        success_url=f"{base}/portal/{token}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/portal/{token}",
    )
    return {"url": session.url}


@router.post("/{token}/demo-pay")
def demo_pay(token: str, body: ChargesIn, db: Session = Depends(get_db)):
    """Test mode only: records the payment without moving money."""
    if get_settings().stripe_enabled:
        raise HTTPException(403, "Test payments are off.")
    r = _resident(db, token)
    ids = [c.id for c in _due(r, body.chargeIds)]
    if ids:
        db.execute(update(Charge).where(Charge.id.in_(ids)).values(status="PAID", paidAt=now(), method="DEMO"))
        db.commit()
        notify_owner(db, ids)
    return {"paid": len(ids)}


class SettleIn(BaseModel):
    sessionId: str


@router.post("/{token}/settle")
def settle(token: str, body: SettleIn, db: Session = Depends(get_db)):
    """Called when Stripe sends the resident back, so the page shows paid before the webhook lands."""
    s = get_settings()
    if not s.stripe_enabled:
        return {"paid": False}
    r = _resident(db, token)
    try:
        session = stripe.checkout.Session.retrieve(body.sessionId, api_key=s.stripe_secret_key)
    except stripe.StripeError:
        return {"paid": False}
    return {"paid": settle_session(db, session.to_dict(), resident_id=r.id)}
