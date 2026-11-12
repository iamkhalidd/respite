import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import func, select

from .config import get_settings
from .db import Base, SessionLocal, engine
from .models import AdminUser
from .routers import admin, auth, hooks, notifications, portal, public
from .security import hash_password
from .services.notify import outbox

log = logging.getLogger("respite")


def bootstrap() -> None:
    """Creates any missing tables, and the first owner account if there are none yet."""
    Base.metadata.create_all(engine)
    s = get_settings()
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(AdminUser)):
            return
        if s.admin_email and s.admin_password:
            db.add(AdminUser(email=s.admin_email.lower(), name=s.admin_name, passwordHash=hash_password(s.admin_password)))
            db.commit()
            log.warning("Created the first owner account for %s", s.admin_email)
        else:
            log.warning("No owner accounts yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, or run: python -m app.cli create-admin")


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap()
    worker = get_settings().notify_worker
    if worker:
        outbox.start()
    yield
    if worker:
        outbox.stop()


app = FastAPI(title="Respite for the Weary API", version="1.0.0", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

for r in (auth.router, auth.users, public.router, portal.router, admin.router, notifications.router, hooks.router):
    app.include_router(r)


@app.get("/health", tags=["hooks"])
def health():
    return {"ok": True}
