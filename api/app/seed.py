"""Fills the database with the sample house: 4 rooms, 6 beds, 3 residents, 5 requests.

    python -m app.seed           # create tables and sample data (wipes rooms, residents, requests, charges)

Owner accounts are kept. The first one comes from ADMIN_EMAIL / ADMIN_PASSWORD.
"""

import json
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from .db import Base, SessionLocal, engine
from .main import bootstrap
from .models import Bed, Charge, Request, Resident, Room


def day(s: str) -> datetime:
    return datetime.fromisoformat(s).replace(tzinfo=UTC)


def days_ago(n: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=n)


ROOMS = [
    dict(slug="porch-room", name="The Porch Room", kind="PRIVATE", floor="Ground", bathroom="Shared",
         rentCents=87500, depositCents=30000, tone="sage", sortOrder=1,
         summary="A quiet private room off the front porch. No stairs.",
         description="The Porch Room sits on the ground floor beside the front door, so there are no stairs to manage. Morning light comes through two windows that face the yard. It shares a full bathroom with one other room.",
         features=["No stairs", "Two windows", "Closet", "Furnished"], beds=["Bed 1"]),
    dict(slug="garden-room", name="The Garden Room", kind="PRIVATE", floor="Ground", bathroom="Private",
         rentCents=95000, depositCents=30000, tone="clay", sortOrder=2,
         summary="A private room with its own bathroom, looking onto the back garden.",
         description="The Garden Room has its own bathroom with a walk-in shower and grab bars. It looks onto the back garden and is a short walk from the kitchen.",
         features=["Private bathroom", "Walk-in shower", "Grab bars", "No stairs", "Furnished"], beds=["Bed 2"]),
    dict(slug="maple-room", name="The Maple Room", kind="SHARED", floor="Upper", bathroom="Shared",
         rentCents=65000, depositCents=25000, tone="oat", sortOrder=3,
         summary="A bright shared room upstairs with two beds and space for each person.",
         description="The Maple Room is upstairs under the maple tree. Each person has their own bed, dresser and nightstand. The hall bathroom is shared with the Dogwood Room.",
         features=["Own dresser", "Own nightstand", "Ceiling fan", "Furnished"], beds=["Bed 3", "Bed 4"]),
    dict(slug="dogwood-room", name="The Dogwood Room", kind="SHARED", floor="Upper", bathroom="Shared",
         rentCents=65000, depositCents=25000, tone="dusk", sortOrder=4,
         summary="A shared room upstairs, named for Virginia's state flower.",
         description="The Dogwood Room is the largest bedroom in the house. Two beds sit on opposite walls, with a reading chair and a desk between them.",
         features=["Largest room", "Desk", "Reading chair", "Furnished"], beds=["Bed 5", "Bed 6"]),
]

RESIDENTS = [
    dict(name="Harold B.", bed="Bed 2", rent=95000, since=120, email="harold@example.com"),
    dict(name="Marcus T.", bed="Bed 3", rent=65000, since=200, email="marcus@example.com"),
    dict(name="Denise W.", bed="Bed 5", rent=65000, since=45, email="denise@example.com"),
]

REQUESTS = [
    dict(status="NEW", forWhom="PROFESSIONAL", program="VETERAN", name="James R.", phone="(804) 555-0142", moveIn="ASAP", payment="VA", room="porch-room", referrerName="Alicia Moore", referrerOrg="Richmond VA Medical Center", referrerEmail="a.moore@example.org", message="Veteran leaving inpatient care next week, needs ground floor.", ago=0),
    dict(status="NEW", forWhom="FAMILY", program="SENIOR", name="Gloria P.", phone="(804) 555-0177", email="gpfamily@example.com", moveIn="30_DAYS", payment="SSI", room="garden-room", message="Asking for my mother, 78, very independent.", ago=1),
    dict(status="CONTACTED", forWhom="SELF", program="RECOVERY", name="Tyler K.", phone="(804) 555-0190", moveIn="ASAP", payment="PRIVATE", room="maple-room", message="90 days sober, finishing outpatient program.", ago=3),
    dict(status="TOUR", forWhom="PROFESSIONAL", program="RECOVERY", name="Andre M.", phone="(804) 555-0111", moveIn="30_DAYS", payment="UNSURE", room="dogwood-room", referrerName="Sam Ortiz", referrerOrg="Chesterfield Recovery Court", ago=6),
    dict(status="DECLINED", forWhom="SELF", program="SENIOR", name="Frank L.", phone="(804) 555-0155", moveIn="EXPLORING", payment="PRIVATE", ownerNotes="Needs daily nursing care — referred to an assisted living facility.", ago=12),
]


def seed() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        for model in (Charge, Resident, Request, Bed, Room):
            db.execute(delete(model))
        db.commit()

        bed_ids: dict[str, str] = {}
        room_ids: dict[str, str] = {}
        for spec in ROOMS:
            spec = dict(spec)
            labels, features = spec.pop("beds"), spec.pop("features")
            room = Room(**spec, features=json.dumps(features))
            room.beds = [Bed(label=label) for label in labels]
            db.add(room)
            db.flush()
            room_ids[room.slug] = room.id
            bed_ids.update({b.label: b.id for b in room.beds})

        db.get(Bed, bed_ids["Bed 3"]).availableFrom = day("2026-12-15")  # Bed 3 frees up on Dec 15

        for r in RESIDENTS:
            res = Resident(name=r["name"], email=r["email"], bedId=bed_ids[r["bed"]], moveInDate=days_ago(r["since"]),
                           rentCents=r["rent"], portalToken=secrets.token_urlsafe(18))
            db.add(res)
            db.flush()
            db.add(Charge(residentId=res.id, label="October rent", period="2026-10", amountCents=r["rent"], dueDate=day("2026-10-01"),
                          status="PAID", paidAt=day("2026-10-02"), method="ACH"))
            paid = r["name"] != "Denise W."
            db.add(Charge(residentId=res.id, label="November rent", period="2026-11", amountCents=r["rent"], dueDate=day("2026-11-01"),
                          status="PAID" if paid else "DUE", paidAt=day("2026-11-03") if paid else None,
                          method=("CHECK" if r["name"] == "Harold B." else "CARD") if paid else None))

        for spec in REQUESTS:
            spec = dict(spec)
            slug, ago = spec.pop("room", None), spec.pop("ago")
            db.add(Request(**spec, roomId=room_ids.get(slug) if slug else None, createdAt=days_ago(ago)))
        db.commit()
    bootstrap()
    print("Seeded 4 rooms, 6 beds, 3 residents, 5 requests.")


if __name__ == "__main__":
    seed()
