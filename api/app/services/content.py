"""Site wording, the FAQ, house details and homepage photos.

Each section is one JSON document in SiteContent. Until the owners save a section, the site shows
the defaults below, which are the words the site launched with.
"""

import json
import re

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from ..models import SiteContent


def _text(n: int, required: bool = True):
    return Field(min_length=1 if required else 0, max_length=n)


class Clean(BaseModel):
    """Trims every string, so a field of spaces counts as empty."""

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class Photo(Clean):
    src: str = _text(1000)
    alt: str = _text(200, required=False)
    caption: str = _text(160, required=False)


class House(Clean):
    phone: str = _text(40)
    address: str = _text(160)  # footer "Visit"
    town: str = _text(80)  # the short place name on room pages
    tourNote: str = _text(160, required=False)
    footerBlurb: str = _text(300)
    footerTagline: str = _text(120, required=False)


class Included(Clean):
    label: str = _text(40)
    title: str = _text(80)
    body: str = _text(400)


class Home(Clean):
    heroLine1: str = _text(60)
    heroLine2: str = _text(60, required=False)
    heroText: str = _text(400)
    statement: str = _text(600)
    includedTitle: str = _text(80)
    includedText: str = _text(500)
    included: list[Included] = Field(min_length=1, max_length=12)
    referralsLine1: str = _text(80)
    referralsLine2: str = _text(120, required=False)
    referralsText: str = _text(400)
    closingLine1: str = _text(80)
    closingLine2: str = _text(80, required=False)
    closingText: str = _text(400)
    photos: dict[str, Photo]

    @field_validator("photos")
    @classmethod
    def _known_photos(cls, v: dict[str, Photo]):
        missing = set(HOME_PHOTOS) - set(v)
        if missing:
            raise ValueError(f"Missing photo: {', '.join(sorted(missing))}")
        return {k: v[k] for k in HOME_PHOTOS}


class Chapter(Clean):
    key: str
    word: str = _text(60)
    line: str = _text(120)
    body: str = _text(600)
    good: list[str] = Field(max_length=8)
    referred: str = _text(300, required=False)
    photo: Photo

    @field_validator("good", mode="before")
    @classmethod
    def _drop_blank(cls, v):
        return [s.strip() for s in v if isinstance(s, str) and s.strip()] if isinstance(v, list) else v


class Who(Clean):
    chapters: list[Chapter]

    @field_validator("chapters")
    @classmethod
    def _three_programs(cls, v: list[Chapter]):
        # the three chapters match the three programs the request form and room filters know
        if sorted(c.key for c in v) != sorted(PROGRAM_KEYS):
            raise ValueError("Keep one chapter for each program.")
        return sorted(v, key=lambda c: PROGRAM_KEYS.index(c.key))


class Question(Clean):
    q: str = _text(200)
    a: str = _text(1500)


class Faq(Clean):
    items: list[Question] = Field(max_length=30)


SCHEMAS: dict[str, type[BaseModel]] = {"house": House, "home": Home, "who": Who, "faq": Faq}
PROGRAM_KEYS = ["VETERAN", "RECOVERY", "SENIOR"]
HOME_PHOTOS = ["kitchen", "road", "porch", "referral"]

DEFAULTS: dict[str, dict] = {
    "house": {
        "phone": "804-803-6248",
        "address": "Chester, Virginia 23831",
        "town": "Chester, Virginia",
        "tourNote": "Tours by appointment.",
        "footerBlurb": "A home with six beds in Chester, Virginia, for veterans, people in recovery and independent seniors.",
        "footerTagline": "Real support. Lasting hope.",
    },
    "home": {
        "heroLine1": "The porch light",
        "heroLine2": "is on.",
        "heroText": "A sober, shared home in Chester, Virginia for veterans, people in recovery and independent seniors. Rent includes rides to appointments and help with the paperwork.",
        "statement": "Six beds in a quiet house in Chester, Virginia. Rides to the VA, help with the paperwork, a house that stays sober, and people around the kitchen table when you want them.",
        "includedTitle": "More than a room.",
        "includedText": "Rent covers a furnished room and the help that makes a fresh start stick. We don't provide medical care. We make sure residents get to the people who do.",
        "included": [
            {"label": "Rides", "title": "To what matters", "body": "VA appointments, the pharmacy, meetings, interviews and the grocery store. The Richmond VA Medical Center is about 15 minutes away."},
            {"label": "Mental health", "title": "Someone to call", "body": "We find counselors, book the appointment and follow up afterwards."},
            {"label": "Social work", "title": "The paperwork, handled", "body": "Benefits, IDs, applications and community referrals."},
            {"label": "Services", "title": "We know who to call", "body": "Outpatient programs, home care, food assistance and job training in Chesterfield County."},
            {"label": "The home", "title": "Furnished and ready", "body": "Bed, dresser and linens in every room. Shared kitchen, living room, laundry and Wi‑Fi."},
            {"label": "House rules", "title": "Sober, calm, fair", "body": "No alcohol or drugs anywhere on the property. Rules everyone agrees to before moving in."},
        ],
        "referralsLine1": "Placing a client?",
        "referralsLine2": "See open beds before you call.",
        "referralsText": "Availability on this site is live. Send a referral in two minutes and we'll call you back within one business day.",
        "closingLine1": "Come see the house",
        "closingLine2": "before you decide.",
        "closingText": "Request a room and we'll set up a tour at a time that suits you. Rather talk first? Call the house.",
        "photos": {
            "kitchen": {"src": "/images/kitchen.webp", "alt": "Morning coffee on the kitchen table", "caption": "The kitchen table, 7:40 a.m."},
            "road": {"src": "/images/road.webp", "alt": "A quiet road through the pines in the morning", "caption": "The drive to the VA, about 15 minutes"},
            "porch": {"src": "/images/porch.webp", "alt": "Rocking chairs on the porch at dusk", "caption": "The porch, after supper"},
            "referral": {"src": "/images/referral.webp", "alt": "A referral folder on a desk", "caption": ""},
        },
    },
    "who": {
        "chapters": [
            {
                "key": "VETERAN", "word": "Veterans", "line": "who want a steady place to land.",
                "body": "A respectful, structured home after service. We help with VA appointments, benefits paperwork and rides to the Richmond VA Medical Center, about 15 minutes away.",
                "referred": "VA social workers, HUD-VASH case managers, veteran service officers",
                "good": ["Living independently", "Wants community, not a facility", "Paying with VA benefits is fine"],
                "photo": {"src": "/images/veteran.webp", "alt": "", "caption": ""},
            },
            {
                "key": "RECOVERY", "word": "People in recovery", "line": "who are ready for the next chapter.",
                "body": "A drug- and alcohol-free house with house meetings, clear rules and neighbors who understand. We connect residents to outpatient programs, meetings and work.",
                "referred": "Treatment centers, recovery courts, probation officers, peer recovery specialists",
                "good": ["Committed to staying sober", "Finished or finishing treatment", "Ready to follow house rules"],
                "photo": {"src": "/images/recovery.webp", "alt": "", "caption": ""},
            },
            {
                "key": "SENIOR", "word": "Independent seniors", "line": "who would rather not live alone.",
                "body": "Your own room and your own routine, with people around and help close by. Rooms on the ground floor, rides to appointments and links to home care when it's needed.",
                "referred": "Hospital discharge planners, families, churches, Area Agency on Aging",
                "good": ["Manages daily care on their own", "Doesn't need nursing on site", "Wants company and support nearby"],
                "photo": {"src": "/images/senior.webp", "alt": "", "caption": ""},
            },
        ]
    },
    "faq": {
        "items": [
            {"q": "Is this assisted living?", "a": "No. Respite for the Weary is independent living with support. There's no nursing staff on site, so residents need to manage their own daily care. We help arrange home care and appointments when they're needed."},
            {"q": "Is the whole house sober?", "a": "Yes. Alcohol and drugs aren't allowed anywhere on the property, for every resident. That keeps the house safe for people in recovery and calm for everyone else."},
            {"q": "What does rent include?", "a": "A furnished room, utilities, Wi‑Fi, laundry and use of the kitchen and living areas, plus rides and help connecting to services."},
            {"q": "Can rent be paid with VA benefits or SSI?", "a": "Yes. Many residents pay with VA benefits, SSI or SSDI. You can pay online by card or bank transfer, or by check."},
            {"q": "How quickly can someone move in?", "a": "If a bed is open, often within a week of the tour. Beds marked “opening soon” can be reserved ahead of time."},
            {"q": "Can we visit first?", "a": "Please do. Book a time on the tour page, or call us and we'll find one that works for you."},
        ]
    },
}


def get_section(db: Session, key: str) -> dict:
    """The saved section, or the default. A saved section that no longer fits the schema falls back too."""
    found = db.get(SiteContent, key)
    if found:
        try:
            return SCHEMAS[key].model_validate(json.loads(found.value)).model_dump()
        except ValueError:
            pass
    return SCHEMAS[key].model_validate(DEFAULTS[key]).model_dump()


def get_all(db: Session) -> dict:
    out = {k: get_section(db, k) for k in SCHEMAS}
    out["house"]["phoneHref"] = phone_href(out["house"]["phone"])
    return out


def save_section(db: Session, key: str, data: BaseModel) -> dict:
    value = json.dumps(data.model_dump())
    found = db.get(SiteContent, key)
    if found:
        found.value = value
    else:
        db.add(SiteContent(key=key, value=value))
    db.commit()
    return get_section(db, key)


def reset_section(db: Session, key: str) -> dict:
    found = db.get(SiteContent, key)
    if found:
        db.delete(found)
        db.commit()
    return get_section(db, key)


def phone_href(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        digits = "1" + digits
    return f"tel:+{digits}" if digits else ""


def house_phone(db: Session) -> str:
    return get_section(db, "house")["phone"]
