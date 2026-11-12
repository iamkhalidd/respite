"""Turns rows into the JSON shapes the website reads (camelCase, dates as ISO 8601 UTC)."""

from datetime import datetime
from typing import Any

from sqlalchemy import inspect


def iso(d: datetime | None) -> str | None:
    return d.isoformat(timespec="milliseconds").replace("+00:00", "Z") if d else None


def row(obj: Any, **extra: Any) -> dict[str, Any] | None:
    """Every column of a row, plus any related objects passed as keyword arguments."""
    if obj is None:
        return None
    out: dict[str, Any] = {}
    for attr in inspect(obj).mapper.column_attrs:
        if attr.key == "passwordHash":
            continue
        v = getattr(obj, attr.key)
        out[attr.key] = iso(v) if isinstance(v, datetime) else v
    out.update(extra)
    return out


def rows(objs, **extra: Any) -> list[dict[str, Any]]:
    return [row(o, **extra) for o in objs]  # type: ignore[misc]
