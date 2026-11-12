import threading
import time
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import AdminUser

ALGORITHM = "HS256"
# a real hash to compare against when the email is unknown, so timing doesn't reveal which emails exist
_DUMMY_HASH = bcrypt.hashpw(b"not-a-real-password", bcrypt.gensalt(rounds=12))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], (hashed or "").encode() or _DUMMY_HASH)
    except ValueError:
        return False


def burn_time(password: str) -> None:
    bcrypt.checkpw(password.encode()[:72], _DUMMY_HASH)


def make_token(user: AdminUser) -> tuple[str, datetime]:
    s = get_settings()
    exp = datetime.now(UTC) + timedelta(minutes=s.jwt_minutes)
    payload = {"sub": user.id, "ver": user.tokenVersion, "exp": exp, "iat": datetime.now(UTC), "typ": "admin"}
    return jwt.encode(payload, s.jwt_secret, algorithm=ALGORITHM), exp


_bearer = HTTPBearer(auto_error=False)
_unauthorized = HTTPException(
    status.HTTP_401_UNAUTHORIZED, "Log in to continue.", headers={"WWW-Authenticate": "Bearer"}
)


def current_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> AdminUser:
    if not creds:
        raise _unauthorized
    try:
        payload = jwt.decode(creds.credentials, get_settings().jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise _unauthorized from None
    if payload.get("typ") != "admin":
        raise _unauthorized
    user = db.get(AdminUser, payload.get("sub"))
    if not user or user.tokenVersion != payload.get("ver"):
        raise _unauthorized
    return user


def owner_only(user: AdminUser = Depends(current_admin)) -> AdminUser:
    if user.role != "OWNER":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an owner can do that.")
    return user


class LoginLimiter:
    """Allows `limit` failed logins per key in a sliding window. In-memory, per process."""

    def __init__(self, limit: int = 8, window: int = 15 * 60):
        self.limit, self.window = limit, window
        self._fails: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str) -> list[float]:
        cutoff = time.monotonic() - self.window
        hits = [t for t in self._fails.get(key, []) if t > cutoff]
        self._fails[key] = hits
        return hits

    def blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key)) >= self.limit

    def fail(self, key: str) -> None:
        with self._lock:
            self._recent(key).append(time.monotonic())

    def clear(self, key: str) -> None:
        with self._lock:
            self._fails.pop(key, None)


login_limiter = LoginLimiter()
