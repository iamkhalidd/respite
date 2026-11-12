"""Database tables.

Table and column names match the original Prisma schema (camelCase), so the API runs
on the existing Postgres database without a migration. Attribute names follow the columns.
"""

from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Index, Integer, LargeBinary, String, Text, UniqueConstraint, false, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, UtcDateTime, new_id, now


class AdminUser(Base):
    __tablename__ = "AdminUser"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String, default="")
    passwordHash: Mapped[str] = mapped_column(String)
    # bumped on password change so older tokens stop working
    tokenVersion: Mapped[int] = mapped_column(Integer, default=0)
    # OWNER can manage the team; STAFF can do everything else
    role: Mapped[str] = mapped_column(String, default="OWNER", server_default=text("'OWNER'"))
    lastLoginAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    # forgot password: only a hash of the emailed token is kept, and it works once, for an hour
    resetTokenHash: Mapped[str | None] = mapped_column(String, nullable=True)
    resetExpiresAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


class Room(Base):
    __tablename__ = "Room"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)  # PRIVATE | SHARED
    floor: Mapped[str] = mapped_column(String)  # Ground | Upper
    bathroom: Mapped[str] = mapped_column(String)  # Private | Shared
    rentCents: Mapped[int] = mapped_column(Integer)
    depositCents: Mapped[int] = mapped_column(Integer)
    summary: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    features: Mapped[str] = mapped_column(Text)  # JSON string[]
    photos: Mapped[str] = mapped_column(Text, default="[]")  # JSON string[]
    tone: Mapped[str] = mapped_column(String, default="sage")
    sortOrder: Mapped[int] = mapped_column(Integer, default=0)
    # hidden rooms stay in the dashboard but drop off the public site
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)

    beds: Mapped[list["Bed"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class Bed(Base):
    __tablename__ = "Bed"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    label: Mapped[str] = mapped_column(String)
    roomId: Mapped[str] = mapped_column(ForeignKey("Room.id", ondelete="CASCADE"))
    availableFrom: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    room: Mapped[Room] = relationship(back_populates="beds")
    resident: Mapped["Resident | None"] = relationship(back_populates="bed", uselist=False)


class Request(Base):
    __tablename__ = "Request"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    status: Mapped[str] = mapped_column(String, default="NEW")
    forWhom: Mapped[str] = mapped_column(String)
    program: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    moveIn: Mapped[str] = mapped_column(String)
    payment: Mapped[str | None] = mapped_column(String, nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    roomId: Mapped[str | None] = mapped_column(ForeignKey("Room.id", ondelete="SET NULL"), nullable=True)
    referrerName: Mapped[str | None] = mapped_column(String, nullable=True)
    referrerOrg: Mapped[str | None] = mapped_column(String, nullable=True)
    referrerPhone: Mapped[str | None] = mapped_column(String, nullable=True)
    referrerEmail: Mapped[str | None] = mapped_column(String, nullable=True)
    ownerNotes: Mapped[str] = mapped_column(Text, default="")

    room: Mapped[Room | None] = relationship()
    resident: Mapped["Resident | None"] = relationship(back_populates="request", uselist=False)


class Resident(Base):
    __tablename__ = "Resident"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    bedId: Mapped[str | None] = mapped_column(ForeignKey("Bed.id", ondelete="SET NULL"), unique=True, nullable=True)
    requestId: Mapped[str | None] = mapped_column(ForeignKey("Request.id", ondelete="SET NULL"), unique=True, nullable=True)
    moveInDate: Mapped[datetime] = mapped_column(UtcDateTime)
    moveOutDate: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    rentCents: Mapped[int] = mapped_column(Integer)
    autopay: Mapped[bool] = mapped_column(Boolean, default=False)
    portalToken: Mapped[str] = mapped_column(String, unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    # what happened to the deposit after they left; null until the owner records it
    depositReturnedCents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    depositNote: Mapped[str | None] = mapped_column(Text, nullable=True)
    depositSettledAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    bed: Mapped[Bed | None] = relationship(back_populates="resident")
    request: Mapped[Request | None] = relationship(back_populates="resident")
    charges: Mapped[list["Charge"]] = relationship(back_populates="resident", cascade="all, delete-orphan")


class Charge(Base):
    __tablename__ = "Charge"
    __table_args__ = (UniqueConstraint("residentId", "period"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    residentId: Mapped[str] = mapped_column(ForeignKey("Resident.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String)
    period: Mapped[str | None] = mapped_column(String, nullable=True)  # "2026-12" for rent
    amountCents: Mapped[int] = mapped_column(Integer)
    dueDate: Mapped[datetime] = mapped_column(UtcDateTime)
    status: Mapped[str] = mapped_column(String, default="DUE")  # DUE | PAID | VOID
    paidAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    method: Mapped[str | None] = mapped_column(String, nullable=True)
    stripeSessionId: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    reminderSentAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)  # the one overdue reminder

    resident: Mapped[Resident] = relationship(back_populates="charges")


class Notification(Base):
    """One message: an email in the outbox, or an entry in the owner's dashboard inbox.

    Emails are written here first and sent by a background worker, so a slow or failing
    email provider never breaks the action that caused them, and nothing is lost.
    """

    __tablename__ = "Notification"
    __table_args__ = (Index("Notification_channel_status_idx", "channel", "status", "nextAttemptAt"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    channel: Mapped[str] = mapped_column(String)  # EMAIL | SMS | INBOX
    kind: Mapped[str] = mapped_column(String)  # request.new, payment.received, ... (services/notify.py)
    recipient: Mapped[str | None] = mapped_column(String, nullable=True)  # email address or phone; null for the inbox
    subject: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str | None] = mapped_column(String, nullable=True)  # dashboard path, e.g. /admin/requests/<id>
    # EMAIL: PENDING, then SENT, or FAILED after the last retry. INBOX: always SENT.
    status: Mapped[str] = mapped_column(String, default="PENDING")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    nextAttemptAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    lastError: Mapped[str | None] = mapped_column(Text, nullable=True)
    sentAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    readAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)  # INBOX only


class SiteContent(Base):
    """Words, photos and contact details the owners edit from the dashboard. One JSON document per section."""

    __tablename__ = "SiteContent"
    key: Mapped[str] = mapped_column(String, primary_key=True)  # house | home | who | faq
    value: Mapped[str] = mapped_column(Text)  # JSON
    updatedAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now, onupdate=now)


class Tour(Base):
    """A visit to the house. Date and time are the house's own local time (America/New_York)."""

    __tablename__ = "Tour"
    __table_args__ = (
        # one booked visit per slot; cancelled ones free it again
        Index("Tour_slot_booked", "date", "time", unique=True, sqlite_where=text("status = 'BOOKED'"), postgresql_where=text("status = 'BOOKED'")),
    )
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    date: Mapped[str] = mapped_column(String)  # 2026-12-03
    time: Mapped[str] = mapped_column(String)  # 14:30
    name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    program: Mapped[str | None] = mapped_column(String, nullable=True)  # VETERAN | RECOVERY | SENIOR
    note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="BOOKED")  # BOOKED | DONE | NO_SHOW | CANCELLED
    cancelledBy: Mapped[str | None] = mapped_column(String, nullable=True)  # VISITOR | HOUSE
    bookedBy: Mapped[str] = mapped_column(String, default="VISITOR")  # VISITOR | HOUSE (taken over the phone)
    token: Mapped[str] = mapped_column(String, unique=True)  # the visitor's link to see or cancel it
    reminderSentAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)


class WaitlistEntry(Base):
    """Someone who wants an email when a bed opens."""

    __tablename__ = "Waitlist"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, index=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    program: Mapped[str | None] = mapped_column(String, nullable=True)
    roomId: Mapped[str | None] = mapped_column(ForeignKey("Room.id", ondelete="SET NULL"), nullable=True)  # null: any room
    note: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="WAITING")  # WAITING | NOTIFIED | REMOVED
    notifiedAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)
    token: Mapped[str] = mapped_column(String, unique=True)  # their link to leave the list

    room: Mapped[Room | None] = relationship()


class ResidentNote(Base):
    """A dated line in a resident's file: a note, a check-in, or something that happened."""

    __tablename__ = "ResidentNote"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    residentId: Mapped[str] = mapped_column(ForeignKey("Resident.id", ondelete="CASCADE"), index=True)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    kind: Mapped[str] = mapped_column(String, default="NOTE")  # NOTE | CHECKIN | INCIDENT
    body: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String, default="")


class ResidentDocument(Base):
    """A signed agreement, house rules, an ID. Kept in the database, not public storage, so only the dashboard can open it."""

    __tablename__ = "ResidentDocument"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    residentId: Mapped[str] = mapped_column(ForeignKey("Resident.id", ondelete="CASCADE"), index=True)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    name: Mapped[str] = mapped_column(String)
    contentType: Mapped[str] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer)
    data: Mapped[bytes] = mapped_column(LargeBinary, deferred=True)
    uploadedBy: Mapped[str] = mapped_column(String, default="")


class RepairRequest(Base):
    """Something broken, reported by a resident from their portal."""

    __tablename__ = "RepairRequest"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    residentId: Mapped[str] = mapped_column(ForeignKey("Resident.id", ondelete="CASCADE"), index=True)
    createdAt: Mapped[datetime] = mapped_column(UtcDateTime, default=now)
    area: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String, default="OPEN")  # OPEN | DOING | DONE
    ownerNote: Mapped[str] = mapped_column(Text, default="")
    doneAt: Mapped[datetime | None] = mapped_column(UtcDateTime, nullable=True)

    resident: Mapped[Resident] = relationship()
