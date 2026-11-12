"""The owner's notifications: the dashboard inbox (the bell) and the email outbox."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db, now
from ..models import Notification
from ..security import current_admin
from ..serialize import rows
from ..services import notify

router = APIRouter(prefix="/admin", tags=["notifications"], dependencies=[Depends(current_admin)])

INBOX = Notification.channel == "INBOX"
EMAIL = Notification.channel == "EMAIL"


def unread_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Notification).where(INBOX, Notification.readAt.is_(None))) or 0


def failed_count(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Notification).where(EMAIL, Notification.status == "FAILED")) or 0


@router.get("/notifications")
def inbox(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    items = db.scalars(select(Notification).where(INBOX).order_by(Notification.createdAt.desc()).limit(limit)).all()
    return {"items": rows(items), "unread": unread_count(db)}


class ReadIn(BaseModel):
    ids: list[str] | None = None  # leave out to mark everything read


@router.post("/notifications/read")
def mark_read(body: ReadIn, db: Session = Depends(get_db)):
    q = update(Notification).where(INBOX, Notification.readAt.is_(None))
    if body.ids:
        q = q.where(Notification.id.in_(body.ids))
    db.execute(q.values(readAt=now()))
    db.commit()
    return {"unread": unread_count(db)}


@router.get("/outbox")
def outbox(
    status: Literal["all", "PENDING", "SENT", "FAILED"] = Query("all"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = select(Notification).where(EMAIL)
    if status != "all":
        q = q.where(Notification.status == status)
    items = db.scalars(q.order_by(Notification.createdAt.desc()).limit(limit)).all()
    counts = dict(db.execute(select(Notification.status, func.count()).where(EMAIL).group_by(Notification.status)).all())
    return {
        "items": rows(items),
        "counts": {k: int(counts.get(k, 0)) for k in ("PENDING", "SENT", "FAILED")},
        "kinds": notify.KINDS,
    }


@router.post("/outbox/{notification_id}/retry")
def retry(notification_id: str, db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if not n or n.channel != "EMAIL":
        raise HTTPException(404, "That email no longer exists.")
    if n.status == "SENT":
        raise HTTPException(400, "That email was already sent.")
    n.status, n.attempts, n.nextAttemptAt, n.lastError = "PENDING", 0, now(), None
    notify._wake_after_commit(db)
    db.commit()
    return {"ok": "Queued to send again."}


@router.post("/notifications/test")
def send_test_email(db: Session = Depends(get_db)):
    """Sends the owner a test email, to check the email setup end to end."""
    to = get_settings().owner_email
    if not to:
        raise HTTPException(400, "Set OWNER_EMAIL on the API first.")
    notify.email(db, to, "Test email from your dashboard", "If you can read this, email is working.", "test")
    db.commit()
    return {"ok": f"Test email queued for {to}."}
