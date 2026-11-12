from datetime import UTC, datetime

MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def money(cents: int) -> str:
    dollars = cents / 100
    return f"${dollars:,.2f}" if cents % 100 else f"${dollars:,.0f}"


def month_label(d: datetime) -> str:
    return MONTHS[d.astimezone(UTC).month - 1]


def period(d: datetime) -> str:
    d = d.astimezone(UTC)
    return f"{d.year}-{d.month:02d}"


def long_day(d: datetime) -> str:
    d = d.astimezone(UTC)
    return f"{MONTHS[d.month - 1]} {d.day}"


def month_start(d: datetime) -> datetime:
    d = d.astimezone(UTC)
    return datetime(d.year, d.month, 1, tzinfo=UTC)


def next_month_start(d: datetime) -> datetime:
    d = d.astimezone(UTC)
    return datetime(d.year + (d.month == 12), d.month % 12 + 1, 1, tzinfo=UTC)


def parse_day(value: str) -> datetime | None:
    """'2026-12-01' → midnight UTC that day, or None if it isn't a date."""
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").replace(tzinfo=UTC)
    except (ValueError, AttributeError):
        return None


def first_name(name: str) -> str:
    return name.split(" ")[0]
