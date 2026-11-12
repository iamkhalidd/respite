"""Owner dashboard: requests, rooms and beds, residents, charges. Every route needs an owner login."""

import json
import logging
import secrets
import time
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..db import get_db, now
from ..models import Bed, Charge, Request, Resident, Room
from ..security import current_admin
from ..serialize import row, rows
from ..services.availability import get_beds, get_rooms_with_beds, sorted_beds
from ..services.billing import bill_rent
from ..services import notify
from ..services.email import site_url
from .notifications import failed_count, unread_count
from ..services.fmt import first_name, money, month_label, month_start, parse_day, period
from ..services.labels import ACTIVE_STATUSES, PAY_METHODS, STATUSES
from ..services.storage import save_photo

log = logging.getLogger("respite.admin")
router = APIRouter(prefix="/admin", tags=["owner dashboard"], dependencies=[Depends(current_admin)])


def _get(db: Session, model, id_: str, what: str):
    obj = db.get(model, id_)
    if not obj:
        raise HTTPException(404, f"That {what} no longer exists.")
    return obj


def _late_cutoff() -> datetime:
    return datetime.now(UTC) - timedelta(days=1)


def _sum(db: Session, *where) -> tuple[int, int]:
    total, count = db.execute(select(func.coalesce(func.sum(Charge.amountCents), 0), func.count()).where(*where)).one()
    return int(total), int(count)


def _resident_brief(r: Resident) -> dict:
    return {"id": r.id, "name": r.name, "email": r.email}


# ───── Dashboard ─────

@router.get("/config")
def config():
    s = get_settings()
    return {"stripeEnabled": s.stripe_enabled, "canUploadPhotos": s.can_upload_photos, "siteUrl": site_url()}


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    """The sidebar badges: new requests, overdue charges, and each bed's state."""
    return {
        "newRequests": db.scalar(select(func.count()).select_from(Request).where(Request.status == "NEW")),
        "overdue": db.scalar(select(func.count()).select_from(Charge).where(Charge.status == "DUE", Charge.dueDate < _late_cutoff())),
        "beds": [b["state"] for b in get_beds(db)],
        "unreadNotifications": unread_count(db),
        "failedEmails": failed_count(db),
    }


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    active = db.scalars(
        select(Request).where(Request.status.in_(ACTIVE_STATUSES)).options(selectinload(Request.room)).order_by(Request.createdAt.desc())
    ).all()
    due = db.scalars(select(Charge).where(Charge.status == "DUE").options(selectinload(Charge.resident)).order_by(Charge.dueDate)).all()
    collected, _ = _sum(db, Charge.status == "PAID", Charge.paidAt >= month_start(now()))
    return {
        "beds": get_beds(db),
        "requests": [row(r, room=row(r.room)) for r in active],
        "due": [row(c, resident=row(c.resident)) for c in due],
        "collectedThisMonthCents": collected,
    }


@router.get("/beds")
def beds(db: Session = Depends(get_db)):
    return get_beds(db)


# ───── Requests ─────

@router.get("/requests")
def list_requests(db: Session = Depends(get_db)):
    reqs = db.scalars(select(Request).options(selectinload(Request.room)).order_by(Request.createdAt.desc())).all()
    return [row(r, room=row(r.room)) for r in reqs]


@router.get("/requests/{request_id}")
def get_request(request_id: str, db: Session = Depends(get_db)):
    r = _get(db, Request, request_id, "request")
    return row(r, room=row(r.room), resident=row(r.resident))


class RequestPatch(BaseModel):
    status: str | None = None
    ownerNotes: str | None = Field(default=None, max_length=5000)


@router.patch("/requests/{request_id}")
def update_request(request_id: str, body: RequestPatch, db: Session = Depends(get_db)):
    r = _get(db, Request, request_id, "request")
    if body.status is not None:
        if body.status not in STATUSES:
            raise HTTPException(400, "Unknown status.")
        r.status = body.status
    if body.ownerNotes is not None:
        r.ownerNotes = body.ownerNotes
    db.commit()
    return row(r)


class MoveInIn(BaseModel):
    bedId: str = ""
    moveInDate: str = ""
    rentCents: int = 0
    depositCents: int = 0


@router.post("/requests/{request_id}/move-in", status_code=201)
def move_in(request_id: str, body: MoveInIn, db: Session = Depends(get_db)):
    """Approve → move in: creates the resident, assigns the bed, and bills deposit + first month."""
    req = _get(db, Request, request_id, "request")
    if req.resident:
        return {"residentId": req.resident.id, "existing": True}
    bed = db.get(Bed, body.bedId) if body.bedId else None
    if not bed:
        raise HTTPException(400, "Choose a bed.")
    if bed.resident and bed.resident.active:
        raise HTTPException(409, f"{bed.resident.name} still lives in {bed.label}. Move them out first, then try again.")
    date = parse_day(body.moveInDate)
    if not date:
        raise HTTPException(400, "Choose a move-in date.")
    if body.rentCents <= 0:
        raise HTTPException(400, "Enter the monthly rent.")
    if body.depositCents < 0:
        raise HTTPException(400, "The deposit can't be less than zero.")

    if bed.resident:  # a past resident still linked to the bed
        bed.resident.bedId = None
        db.flush()
    resident = Resident(
        name=req.name, email=req.email, phone=req.phone, bedId=bed.id, requestId=req.id,
        moveInDate=date, rentCents=body.rentCents, portalToken=secrets.token_urlsafe(18),
    )
    db.add(resident)
    db.flush()
    bed.availableFrom = None
    if body.depositCents > 0:
        db.add(Charge(residentId=resident.id, label="Security deposit", amountCents=body.depositCents, dueDate=date))
    db.add(Charge(residentId=resident.id, label=f"{month_label(date)} rent", period=period(date), amountCents=body.rentCents, dueDate=date))
    req.status = "MOVED_IN"
    if req.email:
        notify.email(
            db, req.email,
            "Welcome home — your resident portal",
            f"Hi {first_name(req.name)},\n\nYour room is ready: {bed.room.name}, {bed.label}.\n"
            f"You can pay your deposit and first month ({money(body.depositCents + body.rentCents)}) here:\n"
            f"{site_url()}/portal/{resident.portalToken}\n\nBookmark that link — it's where you'll pay rent each month.",
            "resident.welcome",
        )
    db.commit()  # the move-in and the welcome email are saved together
    return {"residentId": resident.id, "existing": False}


# ───── Rooms & beds ─────

@router.get("/rooms")
def list_rooms(db: Session = Depends(get_db)):
    return get_rooms_with_beds(db)


@router.get("/rooms/{room_id}")
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = _get(db, Room, room_id, "room")
    return row(room, beds=[row(b, resident=row(b.resident)) for b in sorted_beds(list(room.beds))])


class RoomPatch(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    summary: str = Field(max_length=500)
    description: str = Field(max_length=5000)
    rentCents: int = Field(ge=0)
    depositCents: int = Field(ge=0)
    features: list[str] = []


@router.put("/rooms/{room_id}")
def update_room(room_id: str, body: RoomPatch, db: Session = Depends(get_db)):
    room = _get(db, Room, room_id, "room")
    room.name, room.summary, room.description = body.name.strip(), body.summary, body.description
    room.rentCents, room.depositCents = body.rentCents, body.depositCents
    room.features = json.dumps([f.strip() for f in body.features if f.strip()])
    db.commit()
    return row(room)


class BedPatch(BaseModel):
    availableFrom: str | None = None


@router.patch("/beds/{bed_id}")
def update_bed(bed_id: str, body: BedPatch, db: Session = Depends(get_db)):
    bed = _get(db, Bed, bed_id, "bed")
    if body.availableFrom:
        day = parse_day(body.availableFrom)
        if not day:
            raise HTTPException(400, "That isn't a date.")
        bed.availableFrom = day
    else:
        bed.availableFrom = None
    db.commit()
    return row(bed)


IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_PHOTO = 8 * 1024 * 1024


def _photos(room: Room) -> list[str]:
    try:
        return json.loads(room.photos)
    except ValueError:
        return []


@router.post("/rooms/{room_id}/photos", status_code=201)
def upload_photo(room_id: str, photo: UploadFile = File(...), db: Session = Depends(get_db)):
    room = _get(db, Room, room_id, "room")
    if not get_settings().can_upload_photos:
        raise HTTPException(400, "Photo uploads aren't set up on this server yet.")
    ctype = (photo.content_type or "").lower()
    if not ctype.startswith("image/"):
        raise HTTPException(400, "That file isn't a picture. Use a JPG, PNG or WebP.")
    data = photo.file.read(MAX_PHOTO + 1)
    if not data:
        raise HTTPException(400, "Choose a photo first.")
    if len(data) > MAX_PHOTO:
        raise HTTPException(400, "That photo is over 8 MB. Use a smaller one.")
    ext = IMAGE_TYPES.get(ctype, "jpg")
    try:
        url = save_photo(f"{room.id}-{int(time.time() * 1000)}.{ext}", data, ctype)
    except Exception:
        log.exception("Photo upload failed")
        raise HTTPException(502, "The photo couldn't be saved. Try again in a minute.") from None
    room.photos = json.dumps([*_photos(room), url])
    db.commit()
    return {"photos": _photos(room)}


class PhotoRef(BaseModel):
    src: str


@router.post("/rooms/{room_id}/photos/remove")
def remove_photo(room_id: str, body: PhotoRef, db: Session = Depends(get_db)):
    room = _get(db, Room, room_id, "room")
    room.photos = json.dumps([p for p in _photos(room) if p != body.src])
    db.commit()
    return {"photos": _photos(room)}


# ───── Residents ─────

@router.get("/residents")
def list_residents(db: Session = Depends(get_db)):
    rs = db.scalars(
        select(Resident)
        .options(selectinload(Resident.bed).selectinload(Bed.room), selectinload(Resident.charges))
        .order_by(Resident.active.desc(), Resident.moveInDate.desc())
    ).all()
    return [
        row(r, bed=row(r.bed, room=row(r.bed.room)) if r.bed else None, charges=rows(c for c in r.charges if c.status == "DUE"))
        for r in rs
    ]


@router.get("/residents/{resident_id}")
def get_resident(resident_id: str, db: Session = Depends(get_db)):
    r = _get(db, Resident, resident_id, "resident")
    charges = sorted(r.charges, key=lambda c: c.dueDate, reverse=True)
    return row(r, bed=row(r.bed, room=row(r.bed.room)) if r.bed else None, charges=rows(charges), request=row(r.request))


class ResidentPatch(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""
    rentCents: int = 0


@router.patch("/residents/{resident_id}")
def update_resident(resident_id: str, body: ResidentPatch, db: Session = Depends(get_db)):
    r = _get(db, Resident, resident_id, "resident")
    name, phone, email = body.name.strip(), body.phone.strip(), body.email.strip().lower()
    if not name:
        raise HTTPException(400, "Enter their name.")
    if email and ("@" not in email or "." not in email.split("@")[-1] or " " in email):
        raise HTTPException(400, "That email doesn't look right.")
    if body.rentCents <= 0:
        raise HTTPException(400, "Enter the monthly rent.")
    r.name, r.phone, r.email, r.rentCents = name[:120], phone[:40] or None, email or None, body.rentCents
    db.commit()
    return row(r)


@router.post("/residents/{resident_id}/move-out")
def move_out(resident_id: str, db: Session = Depends(get_db)):
    r = _get(db, Resident, resident_id, "resident")
    r.active, r.moveOutDate, r.bedId = False, now(), None
    db.commit()
    return row(r)


class ChargeIn(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    amountCents: int = Field(gt=0)
    dueDate: str


@router.post("/residents/{resident_id}/charges", status_code=201)
def add_charge(resident_id: str, body: ChargeIn, db: Session = Depends(get_db)):
    _get(db, Resident, resident_id, "resident")
    due = parse_day(body.dueDate)
    if not due:
        raise HTTPException(400, "Choose a due date.")
    c = Charge(residentId=resident_id, label=body.label.strip(), amountCents=body.amountCents, dueDate=due)
    db.add(c)
    db.commit()
    return row(c)


@router.post("/residents/{resident_id}/send-link")
def send_pay_link(resident_id: str, db: Session = Depends(get_db)):
    """Emails the resident what they owe and their pay link."""
    r = _get(db, Resident, resident_id, "resident")
    if not r.email:
        raise HTTPException(400, "No email on file. Text them the link instead.")
    due = sorted((c for c in r.charges if c.status == "DUE"), key=lambda c: c.dueDate)
    owed = sum(c.amountCents for c in due)
    link = f"{site_url()}/portal/{r.portalToken}"
    if owed:
        items = "\n".join(f"• {c.label}: {money(c.amountCents)}" for c in due)
        subject = f"You have {money(owed)} to pay at Respite for the Weary"
        text = f"Hi {first_name(r.name)},\n\nHere is what is waiting to be paid:\n{items}\n\nTotal: {money(owed)}\nPay here: {link}\n\nIf you already paid in person, you can ignore this."
    else:
        subject = "Your Respite for the Weary pay link"
        text = f"Hi {first_name(r.name)},\n\nYou're paid up. This is the link where you'll pay rent each month:\n{link}"
    notify.email(db, r.email, subject, text, "resident.pay_link")
    db.commit()
    return {"ok": f"Sent to {r.email}"}


# ───── Charges & billing ─────

@router.get("/charges")
def list_charges(tab: Literal["due", "paid", "all"] = Query("due"), db: Session = Depends(get_db)):
    q = select(Charge).options(selectinload(Charge.resident)).limit(200)
    if tab == "paid":
        q = q.where(Charge.status == "PAID").order_by(Charge.paidAt.desc())
    elif tab == "all":
        q = q.order_by(Charge.dueDate.desc())
    else:
        q = q.where(Charge.status == "DUE").order_by(Charge.dueDate)
    due_total, due_count = _sum(db, Charge.status == "DUE")
    late_total, late_count = _sum(db, Charge.status == "DUE", Charge.dueDate < _late_cutoff())
    collected, _ = _sum(db, Charge.status == "PAID", Charge.paidAt >= month_start(now()))
    return {
        "charges": [row(c, resident=_resident_brief(c.resident)) for c in db.scalars(q)],
        "due": {"totalCents": due_total, "count": due_count},
        "late": {"totalCents": late_total, "count": late_count},
        "collectedThisMonthCents": collected,
        "activeResidents": db.scalar(select(func.count()).select_from(Resident).where(Resident.active.is_(True))),
    }


class PaymentIn(BaseModel):
    method: str = "CASH"


@router.post("/charges/{charge_id}/pay")
def record_payment(charge_id: str, body: PaymentIn, db: Session = Depends(get_db)):
    c = _get(db, Charge, charge_id, "charge")
    if body.method not in PAY_METHODS:
        raise HTTPException(400, "Unknown payment method.")
    c.status, c.paidAt, c.method = "PAID", now(), body.method
    db.commit()
    return row(c)


@router.post("/charges/{charge_id}/void")
def void_charge(charge_id: str, db: Session = Depends(get_db)):
    c = _get(db, Charge, charge_id, "charge")
    c.status = "VOID"
    db.commit()
    return row(c)


class BillIn(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")


@router.post("/billing/run")
def bill_month(body: BillIn, db: Session = Depends(get_db)):
    """Creates a month's rent for every active resident (skips anyone already billed)."""
    y, m = map(int, body.month.split("-"))
    if not 1 <= m <= 12:
        raise HTTPException(400, "Choose a month.")
    return {"billed": bill_rent(db, datetime(y, m, 1, tzinfo=UTC))}
