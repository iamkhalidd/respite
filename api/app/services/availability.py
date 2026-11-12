import re
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Bed, Room
from ..serialize import iso, row


def bed_state(bed: Bed) -> str:
    """open: nobody lives there · soon: someone is leaving on availableFrom · taken."""
    if not bed.resident or not bed.resident.active:
        return "open"
    if bed.availableFrom and bed.availableFrom > datetime.now(UTC):
        return "soon"
    if bed.availableFrom:
        return "open"
    return "taken"


def _natural(label: str):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", label)]


def sorted_beds(beds: list[Bed]) -> list[Bed]:
    return sorted(beds, key=lambda b: _natural(b.label))


def get_beds(db: Session, public: bool = False) -> list[dict]:
    q = select(Bed).join(Bed.room).options(selectinload(Bed.room), selectinload(Bed.resident)).order_by(Room.sortOrder)
    if public:
        q = q.where(Room.hidden.is_(False))
    beds = db.scalars(q).all()
    return [
        {
            "id": b.id,
            "label": b.label,
            "roomSlug": b.room.slug,
            "roomName": b.room.name,
            "state": bed_state(b),
            "availableFrom": iso(b.availableFrom),
            "residentName": b.resident.name if b.resident and b.resident.active else None,
        }
        for b in sorted(beds, key=lambda b: (b.room.sortOrder, _natural(b.label)))
    ]


def get_rooms_with_beds(db: Session, public: bool = False) -> list[dict]:
    q = select(Room).options(selectinload(Room.beds).selectinload(Bed.resident)).order_by(Room.sortOrder, Room.createdAt)
    if public:
        q = q.where(Room.hidden.is_(False))
    rooms = db.scalars(q).all()
    out = []
    for r in rooms:
        beds = sorted_beds(list(r.beds))
        states = [{"label": b.label, "state": bed_state(b), "availableFrom": b.availableFrom} for b in beds]
        soon = sorted(s["availableFrom"] for s in states if s["state"] == "soon")
        out.append(
            row(
                r,
                beds=[row(b) for b in beds],
                states=[{**s, "availableFrom": iso(s["availableFrom"])} for s in states],
                open=sum(s["state"] == "open" for s in states),
                soon=iso(soon[0]) if soon else None,
            )
        )
    return out
