from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db, now
from ..models import AdminUser
from ..security import burn_time, current_admin, hash_password, login_limiter, make_token, owner_only, verify_password
from ..serialize import iso, row

router = APIRouter(prefix="/auth", tags=["auth"])
# anyone signed in can see the team; only owners can add or remove people
users = APIRouter(prefix="/admin/users", tags=["team"], dependencies=[Depends(current_admin)])


class LoginIn(BaseModel):
    email: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class PasswordIn(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=10, max_length=200)


class NewUserIn(BaseModel):
    email: EmailStr
    name: str = Field(default="", max_length=120)
    password: str = Field(min_length=10, max_length=200)
    role: Literal["OWNER", "STAFF"] = "STAFF"


class RoleIn(BaseModel):
    role: Literal["OWNER", "STAFF"]


def user_out(u: AdminUser) -> dict:
    out = row(u)
    out.pop("tokenVersion", None)
    return out


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
    keys = [f"email:{email}", f"ip:{ip}"]
    if any(login_limiter.blocked(k) for k in keys):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many tries. Wait 15 minutes and try again.")
    user = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email))
    if not user:
        burn_time(body.password)
    if not user or not verify_password(body.password, user.passwordHash):
        for k in keys:
            login_limiter.fail(k)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email and password don't match.")
    login_limiter.clear(f"email:{email}")
    user.lastLoginAt = now()
    db.commit()
    token, exp = make_token(user)
    return {"accessToken": token, "tokenType": "bearer", "expiresAt": iso(exp), "user": user_out(user)}


@router.get("/me")
def me(user: AdminUser = Depends(current_admin)):
    return user_out(user)


@router.post("/password")
def change_password(body: PasswordIn, user: AdminUser = Depends(current_admin), db: Session = Depends(get_db)):
    if not verify_password(body.currentPassword, user.passwordHash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password isn't right.")
    user.passwordHash = hash_password(body.newPassword)
    user.tokenVersion += 1  # logs out every other device
    db.commit()
    token, exp = make_token(user)
    return {"accessToken": token, "tokenType": "bearer", "expiresAt": iso(exp), "user": user_out(user)}


@users.get("")
def list_users(db: Session = Depends(get_db)):
    return [user_out(u) for u in db.scalars(select(AdminUser).order_by(AdminUser.createdAt))]


@users.post("", status_code=201, dependencies=[Depends(owner_only)])
def create_user(body: NewUserIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "There's already an account with that email.")
    u = AdminUser(email=email, name=body.name.strip(), role=body.role, passwordHash=hash_password(body.password))
    db.add(u)
    db.commit()
    return user_out(u)


def _other_owners(db: Session, user_id: str) -> int:
    return db.scalar(select(func.count()).select_from(AdminUser).where(AdminUser.role == "OWNER", AdminUser.id != user_id)) or 0


@users.patch("/{user_id}")
def set_role(user_id: str, body: RoleIn, me: AdminUser = Depends(owner_only), db: Session = Depends(get_db)):
    u = db.get(AdminUser, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such account.")
    if u.role == "OWNER" and body.role != "OWNER" and not _other_owners(db, u.id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The house needs at least one owner.")
    if u.role != body.role:
        u.role = body.role
        u.tokenVersion += 1  # signs them out so the new role applies at once
    db.commit()
    return user_out(u)


@users.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, me: AdminUser = Depends(owner_only), db: Session = Depends(get_db)):
    if user_id == me.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't remove your own account.")
    u = db.get(AdminUser, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such account.")
    db.delete(u)
    db.commit()
