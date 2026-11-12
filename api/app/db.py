import secrets
import time
from collections.abc import Iterator
from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from .config import get_settings


class Base(DeclarativeBase):
    pass


class UtcDateTime(TypeDecorator):
    """Timezone-aware UTC datetimes.

    SQLite stores them as epoch milliseconds (the format the original Prisma database used),
    Postgres as `timestamp(3)` without a zone, always in UTC.
    """

    impl = DateTime
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "sqlite":
            return dialect.type_descriptor(BigInteger())
        return dialect.type_descriptor(DateTime(timezone=False))

    def process_bind_param(self, value: datetime | None, dialect):
        if value is None:
            return None
        value = value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
        if dialect.name == "sqlite":
            return int(value.timestamp() * 1000)
        return value.replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000, UTC)
        if isinstance(value, str):
            value = datetime.fromisoformat(value)
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)


_B36 = "0123456789abcdefghijklmnopqrstuvwxyz"


def new_id() -> str:
    """A sortable, cuid-like id: 'c' + base36 time + random."""
    n, out = int(time.time() * 1000), ""
    while n:
        n, r = divmod(n, 36)
        out = _B36[r] + out
    return "c" + out + "".join(secrets.choice(_B36) for _ in range(16))


def now() -> datetime:
    return datetime.now(UTC)


def make_engine(url: str | None = None) -> Engine:
    url = url or get_settings().sqlalchemy_url
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _fk_on(conn, _):  # SQLite ignores foreign keys unless asked
            conn.execute("PRAGMA foreign_keys=ON")

        return engine
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
