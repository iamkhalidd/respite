"""What anyone can see or do: rooms and open beds, and asking for a room."""

import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Request, Room, Tour, WaitlistEntry
from ..services.availability import get_beds, get_rooms_with_beds
from ..services import notify, tours
from ..services.email import site_url
from ..services.fmt import first_name
from ..services.content import get_all, house_phone
from ..services.labels import FOR_WHOM, MOVE_IN, PAYMENT, PROGRAMS

router = APIRouter(prefix="/public", tags=["public"])
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@router.get("/rooms")
def rooms(db: Session = Depends(get_db)):
    return get_rooms_with_beds(db, public=True)


@router.get("/beds")
def beds(db: Session = Depends(get_db)):
    # who sleeps where is private; the dashboard gets names from /admin/beds
    return [{k: v for k, v in b.items() if k != "residentName"} for b in get_beds(db, public=True)]


@router.get("/content")
def content(db: Session = Depends(get_db)):
    """Everything the owners can edit: house details, homepage wording and photos, who it's for, the FAQ."""
    return get_all(db)


class RequestIn(BaseModel):
    forWhom: Literal["SELF", "FAMILY", "PROFESSIONAL"]
    program: Literal["VETERAN", "RECOVERY", "SENIOR"]
    room: str | None = None
    moveIn: Literal["ASAP", "30_DAYS", "60_DAYS", "EXPLORING"]
    payment: Literal["VA", "SSI", "PRIVATE", "OTHER", "UNSURE"]
    name: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=60)
    email: str | None = Field(default=None, max_length=200)
    message: str | None = None
    referrerName: str | None = Field(default=None, max_length=200)
    referrerOrg: str | None = Field(default=None, max_length=200)
    referrerPhone: str | None = Field(default=None, max_length=60)
    referrerEmail: str | None = Field(default=None, max_length=200)


def _clean(v: str | None) -> str | None:
    v = (v or "").strip()
    return v or None


@router.post("/requests", status_code=201)
def submit_request(body: RequestIn, db: Session = Depends(get_db)):
    d = {k: _clean(v) if isinstance(v, str) or v is None else v for k, v in body.model_dump().items()}
    problem = (
        "Enter a name" if len(d["name"] or "") < 2
        else "Enter a phone number we can call" if len(d["phone"] or "") < 7
        else "Check the email address" if d["email"] and not EMAIL.match(d["email"])
        else "Check your email address" if d["referrerEmail"] and not EMAIL.match(d["referrerEmail"])
        else "Keep the message under 1,500 characters." if len(d["message"] or "") > 1500
        else "Enter your name as the referring professional." if d["forWhom"] == "PROFESSIONAL" and not d["referrerName"]
        else None
    )
    if problem:
        raise HTTPException(400, problem)

    room = db.scalar(select(Room).where(Room.slug == d["room"])) if d["room"] else None
    req = Request(
        forWhom=d["forWhom"], program=d["program"], moveIn=d["moveIn"], payment=d["payment"],
        name=d["name"], phone=d["phone"], email=d["email"], message=d["message"],
        roomId=room.id if room else None,
        referrerName=d["referrerName"], referrerOrg=d["referrerOrg"],
        referrerPhone=d["referrerPhone"], referrerEmail=d["referrerEmail"],
    )
    db.add(req)
    db.flush()

    lines = [
        f"{d['name']} · {d['phone']}" + (f" · {d['email']}" if d["email"] else ""),
        f"For: {FOR_WHOM[d['forWhom']]} · {PROGRAMS[d['program']]['long']}",
        f"Room: {room.name if room else 'Any'} · Move in: {MOVE_IN[d['moveIn']]} · Pays with: {PAYMENT[d['payment']]}",
        f"Referred by {d['referrerName']}" + (f", {d['referrerOrg']}" if d["referrerOrg"] else "") + f" {d['referrerPhone'] or ''}" if d["referrerName"] else "",
        f'\n"{d["message"]}"' if d["message"] else "",
    ]
    notify.owner(
        db, "request.new", f"New room request: {d['name']} ({PROGRAMS[d['program']]['label']})",
        "\n".join(x for x in lines if x), f"/admin/requests/{req.id}",
    )

    contact = d["referrerEmail"] if d["forWhom"] == "PROFESSIONAL" else d["email"]
    if contact:
        what = "a room" if d["forWhom"] == "SELF" else f"a room for {d['name']}"
        notify.email(
            db, contact, "We got your request — Respite for the Weary",
            f"Thanks for reaching out about {what}.\nWe'll call within one business day. If it's urgent, call {house_phone(db)}.",
            "request.received",
        )
    db.commit()  # the request and its notifications are saved together

    who = d["referrerName"] if d["forWhom"] == "PROFESSIONAL" else d["name"]
    return {"ok": True, "id": req.id, "firstName": first_name(who)}


# ───── Tours ─────

@router.get("/tours/slots")
def tour_slots(db: Session = Depends(get_db)):
    """The times anyone can book. Empty when the owners haven't set a schedule: the site shows the phone number."""
    s = tours.get_settings(db)
    return {"enabled": s.enabled and bool(s.slots), "days": tours.open_slots(db)}


class TourIn(BaseModel):
    date: str = Field(max_length=10)
    time: str = Field(max_length=5)
    name: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=60)
    email: str | None = Field(default=None, max_length=200)
    program: Literal["VETERAN", "RECOVERY", "SENIOR"] | None = None
    note: str | None = Field(default=None, max_length=1000)


def _tour_view(t: Tour) -> dict:
    return {"date": t.date, "time": t.time, "when": tours.when(t.date, t.time), "name": t.name, "status": t.status, "firstName": first_name(t.name)}


@router.post("/tours", status_code=201)
def book_tour(body: TourIn, db: Session = Depends(get_db)):
    name, phone, email, note = (_clean(v) for v in (body.name, body.phone, body.email, body.note))
    problem = (
        "Enter your name" if len(name or "") < 2
        else "Enter a phone number we can call" if len(phone or "") < 7
        else "Check the email address" if email and not EMAIL.match(email)
        else None
    )
    if problem:
        raise HTTPException(400, problem)
    if not tours.is_open(db, body.date, body.time):
        raise HTTPException(409, "Someone just took that time. Please pick another.")
    t = Tour(date=body.date, time=body.time, name=name, phone=phone, email=email, program=body.program, note=note or "", token=tours.new_token())
    db.add(t)
    try:
        db.flush()
    except IntegrityError:  # two people pressed book on the same slot at once
        db.rollback()
        raise HTTPException(409, "Someone just took that time. Please pick another.")
    at = tours.when(t.date, t.time)
    lines = [
        f"{name} · {phone}" + (f" · {email}" if email else ""),
        f"Interested in: {PROGRAMS[body.program]['long']}" if body.program else "",
        f'\n"{note}"' if note else "",
        "" if email else "\nNo email given, so they won't get a reminder. Call or text them the day before.",
    ]
    notify.owner(db, "tour.booked", f"Tour booked: {at}, {name}", "\n".join(x for x in lines if x), "/admin/tours")
    tours.email_booked(db, t)
    db.commit()
    return {**_tour_view(t), "token": t.token}


def _tour(db: Session, token: str) -> Tour:
    t = db.scalar(select(Tour).where(Tour.token == token))
    if not t:
        raise HTTPException(404, "We couldn't find that tour.")
    return t


@router.get("/tours/{token}")
def get_tour(token: str, db: Session = Depends(get_db)):
    t = _tour(db, token)
    past = tours.starts_at(t.date, t.time) < tours.local_now()
    return {**_tour_view(t), "past": past, "phone": house_phone(db)}


@router.post("/tours/{token}/cancel")
def cancel_tour(token: str, db: Session = Depends(get_db)):
    t = _tour(db, token)
    if t.status == "BOOKED":
        t.status, t.cancelledBy = "CANCELLED", "VISITOR"
        notify.owner(db, "tour.cancelled", f"Tour cancelled: {tours.when(t.date, t.time)}, {t.name}", f"{t.name} cancelled online. The time is open again.", "/admin/tours")
        db.commit()
    return _tour_view(t)


# ───── Waitlist ─────

class WaitlistIn(BaseModel):
    name: str = Field(default="", max_length=200)
    email: str = Field(default="", max_length=200)
    phone: str | None = Field(default=None, max_length=60)
    program: Literal["VETERAN", "RECOVERY", "SENIOR"] | None = None
    room: str | None = None  # a room slug, or none for any room
    note: str | None = Field(default=None, max_length=1000)


@router.post("/waitlist", status_code=201)
def join_waitlist(body: WaitlistIn, db: Session = Depends(get_db)):
    name, email, phone, note = (_clean(v) for v in (body.name, body.email, body.phone, body.note))
    problem = "Enter your name" if len(name or "") < 2 else "Enter an email address so we can tell you" if not email or not EMAIL.match(email) else None
    if problem:
        raise HTTPException(400, problem)
    email = email.lower()
    room = db.scalar(select(Room).where(Room.slug == body.room, Room.hidden.is_(False))) if body.room else None
    # the same person asking again updates their place instead of adding a second one
    w = db.scalar(select(WaitlistEntry).where(func.lower(WaitlistEntry.email) == email, WaitlistEntry.status == "WAITING"))
    again = bool(w)
    if not w:
        w = WaitlistEntry(email=email, token=tours.new_token())
        db.add(w)
    w.name, w.phone, w.program, w.roomId, w.note = name, phone, body.program, room.id if room else None, note or ""
    db.flush()
    if not again:
        what = room.name if room else "any room"
        notify.owner(
            db, "waitlist.joined", f"On the waitlist: {name}",
            f"{name} · {email}" + (f" · {phone}" if phone else "") + f"\nWaiting for: {what}" + (f'\n\n"{note}"' if note else ""),
            "/admin/waitlist", send_email=False,
        )
        notify.email(
            db, email, "You're on the waitlist — Respite for the Weary",
            f"Hi {first_name(name)},\n\nWe'll email you as soon as a bed opens in {what}.\n"
            f"Want to see the house first? Book a tour at {site_url()}/tour or call {house_phone(db)}.\n\n"
            f"Changed your mind? Leave the list here:\n{site_url()}/waitlist/{w.token}",
            "waitlist.joined",
        )
    db.commit()
    return {"ok": True, "firstName": first_name(name), "again": again}


def _entry(db: Session, token: str) -> WaitlistEntry:
    w = db.scalar(select(WaitlistEntry).where(WaitlistEntry.token == token))
    if not w:
        raise HTTPException(404, "We couldn't find that place on the waitlist.")
    return w


@router.get("/waitlist/{token}")
def get_entry(token: str, db: Session = Depends(get_db)):
    w = _entry(db, token)
    return {"firstName": first_name(w.name), "status": w.status, "room": w.room.name if w.room else None}


@router.post("/waitlist/{token}/leave")
def leave_waitlist(token: str, db: Session = Depends(get_db)):
    w = _entry(db, token)
    if w.status != "REMOVED":
        w.status = "REMOVED"
        db.commit()
    return {"firstName": first_name(w.name), "status": w.status, "room": w.room.name if w.room else None}
