"""House tours: the weekly times the owners offer, the open slots, and reminder emails.

The schedule is one JSON document in SiteContent under "tours". It starts empty: until the owners
add times, the site asks people to call instead of booking online. Dates and times are the house's
own local time, so "Tuesday 2 PM" means 2 PM in Virginia whatever timezone the server runs in.
"""

import json
import secrets
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import now
from ..models import SiteContent, Tour
from . import notify
from .content import get_section, house_phone
from .email import site_url
from .fmt import first_name

HOUSE_TZ = ZoneInfo("America/New_York")
KEY = "tours"
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


class Slot(BaseModel):
    day: int = Field(ge=0, le=6)  # 0 is Monday
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class Settings(BaseModel):
    enabled: bool = False
    slots: list[Slot] = Field(default_factory=list, max_length=60)
    closedDays: list[str] = Field(default_factory=list, max_length=120)  # 2026-12-25: no tours that day
    daysAhead: int = Field(default=21, ge=3, le=90)
    minNoticeHours: int = Field(default=12, ge=0, le=168)

    @field_validator("closedDays")
    @classmethod
    def _dates(cls, v: list[str]) -> list[str]:
        for d in v:
            date.fromisoformat(d)
        return sorted(set(v))

    @field_validator("slots")
    @classmethod
    def _unique(cls, v: list[Slot]) -> list[Slot]:
        seen = {(s.day, s.time): s for s in v}
        return sorted(seen.values(), key=lambda s: (s.day, s.time))


def get_settings(db: Session) -> Settings:
    found = db.get(SiteContent, KEY)
    if found:
        try:
            return Settings.model_validate(json.loads(found.value))
        except ValueError:
            pass
    return Settings()


def save_settings(db: Session, s: Settings) -> Settings:
    value = s.model_dump_json()
    found = db.get(SiteContent, KEY)
    if found:
        found.value = value
    else:
        db.add(SiteContent(key=KEY, value=value))
    db.commit()
    return s


def local_now() -> datetime:
    return now().astimezone(HOUSE_TZ)


def starts_at(day: str, at: str) -> datetime:
    """The tour's start as an aware datetime in house time."""
    return datetime.combine(date.fromisoformat(day), time.fromisoformat(at), HOUSE_TZ)


def open_slots(db: Session) -> list[dict]:
    """Every bookable time from now to daysAhead, as [{date, times: [...]}] with empty days left out."""
    s = get_settings(db)
    if not s.enabled or not s.slots:
        return []
    today = local_now()
    earliest = today + timedelta(hours=s.minNoticeHours)
    last = today.date() + timedelta(days=s.daysAhead)
    taken = {
        (t.date, t.time)
        for t in db.scalars(select(Tour).where(Tour.status == "BOOKED", Tour.date >= today.date().isoformat())).all()
    }
    by_day: dict[int, list[str]] = {}
    for slot in s.slots:
        by_day.setdefault(slot.day, []).append(slot.time)
    closed = set(s.closedDays)
    out = []
    d = today.date()
    while d <= last:
        key = d.isoformat()
        if key not in closed:
            times = [t for t in sorted(by_day.get(d.weekday(), [])) if (key, t) not in taken and starts_at(key, t) >= earliest]
            if times:
                out.append({"date": key, "times": times})
        d += timedelta(days=1)
    return out


def is_open(db: Session, day: str, at: str) -> bool:
    return any(d["date"] == day and at in d["times"] for d in open_slots(db))


def when(day: str, at: str) -> str:
    """'Tuesday, December 3 at 2:30 PM'"""
    d = starts_at(day, at)
    hour = d.hour % 12 or 12
    clock = f"{hour}:{d.minute:02d}" if d.minute else f"{hour}"
    return f"{DAYS[d.weekday()]}, {MONTHS[d.month - 1]} {d.day} at {clock} {'AM' if d.hour < 12 else 'PM'}"


def new_token() -> str:
    return secrets.token_urlsafe(18)


def _details(db: Session, tour: Tour) -> str:
    house = get_section(db, "house")
    return f"When: {when(tour.date, tour.time)}\nWhere: {house['address']}\nIf you need to call: {house_phone(db)}"


def email_booked(db: Session, tour: Tour) -> None:
    if not tour.email:
        return
    notify.email(
        db, tour.email, f"Your tour is booked for {when(tour.date, tour.time)}",
        f"Hi {first_name(tour.name)},\n\nThanks for booking a visit. We look forward to showing you around.\n\n"
        f"{_details(db, tour)}\n\nAdd it to your calendar:\n{site_url()}/tour/{tour.token}/calendar\n\n"
        f"Need to change it? Cancel here and book another time:\n{site_url()}/tour/{tour.token}",
        "tour.confirmed",
    )


def email_cancelled_by_house(db: Session, tour: Tour) -> None:
    if not tour.email:
        return
    notify.email(
        db, tour.email, "We need to move your tour",
        f"Hi {first_name(tour.name)},\n\nSorry, we can't keep the tour on {when(tour.date, tour.time)}.\n"
        f"Please pick another time at {site_url()}/tour or call us at {house_phone(db)}.",
        "tour.cancelled",
    )


def send_reminders(db: Session) -> int:
    """A day ahead, reminds the visitor (by email, when they gave one) and the house (inbox and email). Once per tour."""
    current = local_now()
    soon = current + timedelta(hours=24)
    days = {current.date().isoformat(), soon.date().isoformat()}
    due = db.scalars(
        select(Tour).where(Tour.status == "BOOKED", Tour.reminderSentAt.is_(None), Tour.date.in_(days))
    ).all()
    sent = 0
    for t in due:
        start = starts_at(t.date, t.time)
        if not current < start <= soon:
            continue
        # booked within the last few hours: the confirmation already covers it
        if start - t.createdAt.astimezone(HOUSE_TZ) < timedelta(hours=6):
            t.reminderSentAt = now()
            continue
        at = when(t.date, t.time)
        notify.owner(
            db, "tour.reminder", f"Tour {'today' if start.date() == current.date() else 'tomorrow'}: {t.name}",
            f"{at}\n{t.name} · {t.phone}" + (f" · {t.email}" if t.email else "") + (f'\n\n"{t.note}"' if t.note else ""),
            "/admin/tours",
        )
        notify.email(
            db, t.email, f"See you {'today' if start.date() == current.date() else 'tomorrow'} at {at.split(' at ')[1]}",
            f"Hi {first_name(t.name)},\n\nA reminder about your visit.\n\n{_details(db, t)}\n\n"
            f"Can't make it? Cancel here so someone else can have the time:\n{site_url()}/tour/{t.token}",
            "tour.reminder",
        )
        notify.sms(
            db, t.phone,
            f"Respite for the Weary: see you {'today' if start.date() == current.date() else 'tomorrow'}, {at}. Can't make it? {site_url()}/tour/{t.token}",
            "tour.reminder",
        )
        t.reminderSentAt = now()
        sent += 1
    db.commit()
    return sent
