"""What anyone can see or do: rooms and open beds, and asking for a room."""

import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Request, Room
from ..services.availability import get_beds, get_rooms_with_beds
from ..services import notify
from ..services.fmt import first_name
from ..services.labels import FOR_WHOM, MOVE_IN, PAYMENT, PHONE, PROGRAMS

router = APIRouter(prefix="/public", tags=["public"])
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@router.get("/rooms")
def rooms(db: Session = Depends(get_db)):
    return get_rooms_with_beds(db)


@router.get("/beds")
def beds(db: Session = Depends(get_db)):
    # who sleeps where is private; the dashboard gets names from /admin/beds
    return [{k: v for k, v in b.items() if k != "residentName"} for b in get_beds(db)]


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
            f"Thanks for reaching out about {what}.\nWe'll call within one business day. If it's urgent, call {PHONE}.",
            "request.received",
        )
    db.commit()  # the request and its notifications are saved together

    who = d["referrerName"] if d["forWhom"] == "PROFESSIONAL" else d["name"]
    return {"ok": True, "id": req.id, "firstName": first_name(who)}
