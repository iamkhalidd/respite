"""The waitlist: people who asked to hear when a bed opens.

announce() runs after anything that can open a bed (a move out, an opening date, a new bed, a room
shown again). Each person is emailed once; after that they're NOTIFIED and the owners can put them
back on the list from the dashboard if they still want to wait.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import now
from ..models import WaitlistEntry
from . import notify
from .availability import get_rooms_with_beds
from .email import site_url
from .fmt import first_name, long_day, parse_day


def _opening(room: dict) -> str | None:
    if room["open"]:
        return "open now"
    if room["soon"]:
        day = parse_day(room["soon"][:10])
        return f"opening {long_day(day)}" if day else "opening soon"
    return None


def announce(db: Session) -> int:
    """Emails everyone waiting whose room (or any room) has a bed open or opening. Returns how many were told."""
    rooms = [r for r in get_rooms_with_beds(db, public=True) if _opening(r)]
    if not rooms:
        return 0
    waiting = db.scalars(select(WaitlistEntry).where(WaitlistEntry.status == "WAITING").order_by(WaitlistEntry.createdAt)).all()
    told = 0
    for w in waiting:
        fits = [r for r in rooms if not w.roomId or r["id"] == w.roomId]
        if not fits:
            continue
        lines = "\n".join(f"· {r['name']}: {_opening(r)}\n  {site_url()}/apply?room={r['slug']}" for r in fits)
        notify.email(
            db, w.email, "A bed is opening at Respite for the Weary",
            f"Hi {first_name(w.name)},\n\nYou asked us to tell you when a bed opens. One has:\n\n{lines}\n\n"
            "Beds go to whoever asks first, so request it soon if you'd like it.\n\n"
            f"Don't need a room any more? Leave the list here:\n{site_url()}/waitlist/{w.token}",
            "waitlist.opening",
        )
        w.status, w.notifiedAt = "NOTIFIED", now()
        told += 1
    if told:
        who = "person" if told == 1 else "people"
        notify.owner(
            db, "waitlist.told", f"Told {told} {who} on the waitlist about an open bed",
            "They were emailed a link to request it. You'll see their requests come in as usual.",
            "/admin/waitlist", send_email=False,
        )
    db.commit()
    return told
