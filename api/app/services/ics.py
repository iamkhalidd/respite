"""Calendar files (.ics) so tours land in people's calendars."""

from datetime import UTC, datetime, timedelta

from ..models import Tour
from .tours import starts_at

LENGTH = timedelta(minutes=30)


def _stamp(d: datetime) -> str:
    return d.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def _text(v: str) -> str:
    return v.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r", "").replace("\n", "\\n")


def _fold(line: str) -> str:
    """Lines longer than 75 octets are split, as the format requires."""
    out, raw = [], line.encode("utf-8")
    while len(raw) > 75:
        cut = 75 if not out else 74
        while cut > 0 and (raw[cut] & 0xC0) == 0x80:  # never split a character
            cut -= 1
        out.append(raw[:cut].decode("utf-8"))
        raw = raw[cut:]
    out.append(raw.decode("utf-8"))
    return "\r\n ".join(out)


def event(t: Tour, *, summary: str, description: str, location: str) -> list[str]:
    start = starts_at(t.date, t.time)
    return [
        "BEGIN:VEVENT",
        f"UID:tour-{t.id}@respitefortheweary",
        f"DTSTAMP:{_stamp(t.createdAt or datetime.now(UTC))}",
        f"DTSTART:{_stamp(start)}",
        f"DTEND:{_stamp(start + LENGTH)}",
        f"SUMMARY:{_text(summary)}",
        f"DESCRIPTION:{_text(description)}",
        f"LOCATION:{_text(location)}",
        "STATUS:" + ("CANCELLED" if t.status == "CANCELLED" else "CONFIRMED"),
        "END:VEVENT",
    ]


def calendar(events: list[list[str]], name: str) -> str:
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Respite for the Weary//Tours//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", f"X-WR-CALNAME:{_text(name)}"]
    for e in events:
        lines += e
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(x) for x in lines) + "\r\n"
