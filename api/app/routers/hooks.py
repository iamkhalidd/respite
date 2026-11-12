"""Machine-to-machine routes: the monthly rent cron and Stripe's webhook."""

import hmac

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db, now
from ..models import Charge
from ..services.billing import bill_rent
from ..services import notify
from ..services.fmt import money, next_month_start, period
from ..services.payments import settle_session

router = APIRouter(tags=["hooks"])


@router.api_route("/cron/bill-rent", methods=["GET", "POST"])
def cron_bill_rent(authorization: str = Header(""), db: Session = Depends(get_db)):
    """Bills next month's rent. Run on the 25th so residents get their link a week ahead.

    Needs `Authorization: Bearer $CRON_SECRET`; without the secret set it refuses to run.
    """
    _check_cron(authorization)
    due =next_month_start(now())
    billed = bill_rent(db, due)
    if billed:
        total = db.scalar(select(func.coalesce(func.sum(Charge.amountCents), 0)).where(Charge.period == period(due), Charge.status == "DUE"))
        who = "resident" if billed == 1 else "residents"
        notify.owner(
            db, "rent.billed", f"Rent billed for {billed} {who}",
            f"Next month's rent went out automatically: {billed} {who}, {money(total)} in all.\n"
            "Everyone with an email on file was sent their pay link. Anyone without one needs their link texted.",
            "/admin/payments",
        )
        db.commit()
    return {"period": period(due), "billed": billed}


def _check_cron(authorization: str) -> None:
    secret = get_settings().cron_secret
    if not secret or not hmac.compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(401, "Not allowed")


@router.api_route("/cron/notifications", methods=["GET", "POST"])
def cron_notifications(authorization: str = Header(""), db: Session = Depends(get_db)):
    """Sends any queued emails that are due. For hosts that run with NOTIFY_WORKER=false."""
    _check_cron(authorization)
    return {"sent": notify.deliver_all(db)}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Marks charges paid, including bank (ACH) payments that clear days later."""
    s = get_settings()
    if not s.stripe_enabled or not s.stripe_webhook_secret:
        raise HTTPException(404, "Not configured")
    try:
        event = stripe.Webhook.construct_event(
            await request.body(), request.headers.get("stripe-signature", ""), s.stripe_webhook_secret
        )
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(400, "Bad signature") from None
    if event["type"] in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        settle_session(db, event["data"]["object"].to_dict())
    return {"received": True}
