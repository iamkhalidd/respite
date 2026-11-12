"""The paperwork side of the dashboard: notes, documents, the deposit, rent records, repairs and the tour calendar."""

import csv
import io
import json
import secrets
from datetime import timedelta
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db, now
from ..models import AdminUser, Bed, Charge, RepairRequest, Resident, ResidentDocument, ResidentNote, SiteContent, Tour
from ..security import current_admin
from ..serialize import iso, row, rows
from ..services import ics, notify, tours
from ..services.content import get_section, house_phone
from ..services.email import site_url
from ..services.fmt import first_name, money, parse_day

router = APIRouter(prefix="/admin", tags=["records"], dependencies=[Depends(current_admin)])
# no login: the secret in the URL is the credential, so calendar apps can subscribe
feeds = APIRouter(prefix="/public/feeds", tags=["public"])

DEPOSIT_LABEL = "Security deposit"
MAX_DOC = 10 * 1024 * 1024
DOC_TYPES = {
    "application/pdf": "PDF",
    "image/jpeg": "photo",
    "image/png": "photo",
    "image/webp": "photo",
    "image/heic": "photo",
    "image/heif": "photo",
}


def _resident(db: Session, resident_id: str) -> Resident:
    r = db.get(Resident, resident_id)
    if not r:
        raise HTTPException(404, "We couldn't find that resident.")
    return r


def _who(user: AdminUser) -> str:
    return (user.name or user.email).strip()[:120]


# ───── Notes ─────

class NoteIn(BaseModel):
    kind: Literal["NOTE", "CHECKIN", "INCIDENT"] = "NOTE"
    body: str = Field(min_length=1, max_length=5000)


@router.get("/residents/{resident_id}/notes")
def list_notes(resident_id: str, db: Session = Depends(get_db)):
    _resident(db, resident_id)
    q = select(ResidentNote).where(ResidentNote.residentId == resident_id).order_by(ResidentNote.createdAt.desc())
    return rows(db.scalars(q).all())


@router.post("/residents/{resident_id}/notes", status_code=201)
def add_note(resident_id: str, body: NoteIn, user: AdminUser = Depends(current_admin), db: Session = Depends(get_db)):
    _resident(db, resident_id)
    text = body.body.strip()
    if not text:
        raise HTTPException(400, "Write the note first.")
    n = ResidentNote(residentId=resident_id, kind=body.kind, body=text, author=_who(user))
    db.add(n)
    db.commit()
    return row(n)


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: str, db: Session = Depends(get_db)):
    n = db.get(ResidentNote, note_id)
    if n:
        db.delete(n)
        db.commit()


# ───── Documents ─────

def _doc_out(d: ResidentDocument) -> dict:
    return {
        "id": d.id, "residentId": d.residentId, "createdAt": iso(d.createdAt), "name": d.name,
        "contentType": d.contentType, "size": d.size, "uploadedBy": d.uploadedBy,
    }


@router.get("/residents/{resident_id}/documents")
def list_documents(resident_id: str, db: Session = Depends(get_db)):
    _resident(db, resident_id)
    q = select(ResidentDocument).where(ResidentDocument.residentId == resident_id).order_by(ResidentDocument.createdAt.desc())
    return [_doc_out(d) for d in db.scalars(q).all()]


@router.post("/residents/{resident_id}/documents", status_code=201)
def upload_document(resident_id: str, file: UploadFile = File(...), user: AdminUser = Depends(current_admin), db: Session = Depends(get_db)):
    _resident(db, resident_id)
    kind = (file.content_type or "").lower()
    if kind not in DOC_TYPES:
        raise HTTPException(400, "Upload a PDF or a photo (JPG, PNG, WebP or HEIC).")
    data = file.file.read(MAX_DOC + 1)
    if len(data) > MAX_DOC:
        raise HTTPException(400, "That file is over 10 MB. Try a smaller scan or photo.")
    if not data:
        raise HTTPException(400, "That file is empty.")
    name = (file.filename or "document").replace("\\", "/").split("/")[-1].strip()[:150] or "document"
    d = ResidentDocument(residentId=resident_id, name=name, contentType=kind, size=len(data), data=data, uploadedBy=_who(user))
    db.add(d)
    db.commit()
    return _doc_out(d)


@router.get("/documents/{doc_id}")
def download_document(doc_id: str, db: Session = Depends(get_db)):
    d = db.get(ResidentDocument, doc_id)
    if not d:
        raise HTTPException(404, "That document is gone.")
    return Response(
        content=d.data,
        media_type=d.contentType,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(d.name)}",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    d = db.get(ResidentDocument, doc_id)
    if d:
        db.delete(d)
        db.commit()


# ───── Deposit ─────

def deposit_paid(r: Resident) -> int:
    return sum(c.amountCents for c in r.charges if c.label == DEPOSIT_LABEL and c.status == "PAID")


class DepositIn(BaseModel):
    returnedCents: int = Field(ge=0)
    note: str = Field(default="", max_length=2000)


@router.patch("/residents/{resident_id}/deposit")
def settle_deposit(resident_id: str, body: DepositIn, db: Session = Depends(get_db)):
    r = _resident(db, resident_id)
    if r.active:
        raise HTTPException(400, "Record the deposit after they move out.")
    paid = deposit_paid(r)
    if body.returnedCents > paid:
        raise HTTPException(400, f"That's more than the deposit they paid ({money(paid)})." if paid else "They didn't pay a deposit, so there's nothing to return.")
    note = body.note.strip()
    if body.returnedCents < paid and not note:
        raise HTTPException(400, "Say why part of the deposit was kept. It's their record too.")
    r.depositReturnedCents, r.depositNote, r.depositSettledAt = body.returnedCents, note or None, now()
    db.commit()
    return {"paidCents": paid, "returnedCents": r.depositReturnedCents, "keptCents": paid - r.depositReturnedCents, "note": r.depositNote, "settledAt": iso(r.depositSettledAt)}


# ───── Rent records ─────

def statement(db: Session, r: Resident) -> dict:
    """A resident's full rent history, for their own records or a benefits office."""
    charges = sorted((c for c in r.charges if c.status != "VOID"), key=lambda c: c.dueDate)
    billed = sum(c.amountCents for c in charges)
    paid = sum(c.amountCents for c in charges if c.status == "PAID")
    house = get_section(db, "house")
    bed = r.bed
    return {
        "resident": {
            "name": r.name, "moveInDate": iso(r.moveInDate), "moveOutDate": iso(r.moveOutDate), "rentCents": r.rentCents,
            "active": r.active, "bed": bed.label if bed else None, "room": bed.room.name if bed and bed.room else None,
        },
        "house": {"name": "Respite for the Weary", "address": house.get("address", ""), "phone": house_phone(db)},
        "charges": [
            {k: v for k, v in (row(c) or {}).items() if k in ("id", "label", "period", "amountCents", "dueDate", "status", "paidAt", "method")}
            for c in charges
        ],
        "totals": {"billedCents": billed, "paidCents": paid, "owedCents": billed - paid},
        "deposit": {"paidCents": deposit_paid(r), "returnedCents": r.depositReturnedCents, "note": r.depositNote, "settledAt": iso(r.depositSettledAt)},
        "generatedAt": iso(now()),
    }


def _with_bed(db: Session, resident_id: str) -> Resident:
    r = db.scalar(
        select(Resident).where(Resident.id == resident_id)
        .options(selectinload(Resident.bed).selectinload(Bed.room), selectinload(Resident.charges))
    )
    if not r:
        raise HTTPException(404, "We couldn't find that resident.")
    return r


@router.get("/residents/{resident_id}/statement")
def resident_statement(resident_id: str, db: Session = Depends(get_db)):
    return statement(db, _with_bed(db, resident_id))


METHODS = {"CASH": "Cash", "CHECK": "Check", "MONEY_ORDER": "Money order", "VOUCHER": "Voucher", "CARD": "Card", "ACH": "Bank transfer", "DEMO": "Test payment"}


@router.get("/export.csv")
def export_csv(
    kind: Literal["payments", "charges"] = Query("payments"),
    start: str = Query("", alias="from"),
    end: str = Query("", alias="to"),
    db: Session = Depends(get_db),
):
    """Payments received (for the accountant) or everything billed, as a spreadsheet."""
    lo, hi = parse_day(start) if start else None, parse_day(end) if end else None
    if (start and not lo) or (end and not hi):
        raise HTTPException(400, "Dates look like 2026-01-31.")
    col = Charge.paidAt if kind == "payments" else Charge.dueDate
    q = select(Charge).options(selectinload(Charge.resident)).order_by(col)
    q = q.where(Charge.status == "PAID") if kind == "payments" else q.where(Charge.status != "VOID")
    if lo:
        q = q.where(col >= lo)
    if hi:
        q = q.where(col < hi + timedelta(days=1))
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Date paid", "Resident", "For", "Amount", "Method", "Due date"] if kind == "payments" else ["Due date", "Resident", "For", "Amount", "Status", "Date paid", "Method"])
    day = lambda d: d.date().isoformat() if d else ""  # noqa: E731
    for c in db.scalars(q).all():
        amount = f"{c.amountCents / 100:.2f}"
        method = METHODS.get(c.method or "", c.method or "")
        if kind == "payments":
            w.writerow([day(c.paidAt), c.resident.name, c.label, amount, method, day(c.dueDate)])
        else:
            w.writerow([day(c.dueDate), c.resident.name, c.label, amount, c.status.title(), day(c.paidAt), method])
    name = f"respite-{kind}{'-' + start if start else ''}{'-to-' + end if end else ''}.csv"
    return Response(
        content="﻿" + out.getvalue(),  # the mark makes Excel read it as UTF-8
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"},
    )


# ───── Repairs ─────

def repair_out(x: RepairRequest) -> dict:
    r = x.resident
    return row(x, resident={"id": r.id, "name": r.name, "phone": r.phone, "bed": r.bed.label if r.bed else None} if r else None)


@router.get("/repairs")
def list_repairs(status: Literal["open", "done", "all"] = Query("open"), db: Session = Depends(get_db)):
    q = select(RepairRequest).options(selectinload(RepairRequest.resident).selectinload(Resident.bed))
    if status == "open":
        q = q.where(RepairRequest.status != "DONE").order_by(RepairRequest.urgent.desc(), RepairRequest.createdAt)
    elif status == "done":
        q = q.where(RepairRequest.status == "DONE").order_by(RepairRequest.doneAt.desc()).limit(100)
    else:
        q = q.order_by(RepairRequest.createdAt.desc()).limit(200)
    return [repair_out(x) for x in db.scalars(q).all()]


class RepairPatch(BaseModel):
    status: Literal["OPEN", "DOING", "DONE"]
    ownerNote: str | None = Field(default=None, max_length=2000)


@router.patch("/repairs/{repair_id}")
def update_repair(repair_id: str, body: RepairPatch, db: Session = Depends(get_db)):
    x = db.get(RepairRequest, repair_id)
    if not x:
        raise HTTPException(404, "We couldn't find that repair.")
    if body.ownerNote is not None:
        x.ownerNote = body.ownerNote.strip()
    finished = body.status == "DONE" and x.status != "DONE"
    x.status = body.status
    x.doneAt = now() if body.status == "DONE" else None
    if finished and x.resident:
        r = x.resident
        note = f"\n\nFrom the house: {x.ownerNote}" if x.ownerNote else ""
        notify.email(
            db, r.email, f"Fixed: {x.area}",
            f"Hi {first_name(r.name)},\n\nThe repair you reported is done:\n\"{x.body}\"{note}\n\n"
            f"If it's still not right, report it again from your page:\n{site_url()}/portal/{r.portalToken}",
            "repair.done",
        )
    db.commit()
    return repair_out(x)


# ───── Tour calendar feed ─────

FEED_KEY = "tour-feed"


def _feed_token(db: Session, *, fresh: bool = False) -> str:
    found = db.get(SiteContent, FEED_KEY)
    if found and not fresh:
        try:
            return json.loads(found.value)["token"]
        except (ValueError, KeyError, TypeError):
            pass
    token = secrets.token_urlsafe(24)
    value = json.dumps({"token": token})
    if found:
        found.value = value
    else:
        db.add(SiteContent(key=FEED_KEY, value=value))
    db.commit()
    return token


def _feed_url(token: str) -> str:
    return f"{site_url()}/feeds/tours/{token}.ics"


@router.get("/tours/feed")
def tour_feed(db: Session = Depends(get_db)):
    return {"url": _feed_url(_feed_token(db))}


@router.post("/tours/feed/reset")
def reset_tour_feed(db: Session = Depends(get_db)):
    """A new link. Calendars subscribed to the old one stop updating."""
    return {"url": _feed_url(_feed_token(db, fresh=True))}


@feeds.get("/tours/{token}.ics")
def tour_feed_ics(token: str, db: Session = Depends(get_db)):
    found = db.get(SiteContent, FEED_KEY)
    try:
        expected = json.loads(found.value)["token"] if found else None
    except (ValueError, KeyError, TypeError):
        expected = None
    if not expected or not secrets.compare_digest(token, expected):
        raise HTTPException(404, "Not found")
    since = (tours.local_now().date() - timedelta(days=30)).isoformat()
    q = select(Tour).where(Tour.date >= since, Tour.status.in_(("BOOKED", "DONE", "NO_SHOW"))).order_by(Tour.date, Tour.time)
    address = get_section(db, "house").get("address", "")
    events = []
    for t in db.scalars(q).all():
        details = [f"Phone: {t.phone}"]
        if t.email:
            details.append(f"Email: {t.email}")
        if t.note:
            details.append(f"Note: {t.note}")
        if t.bookedBy == "HOUSE":
            details.append("Booked by phone")
        details.append(f"{site_url()}/admin/tours")
        prefix = "No show: " if t.status == "NO_SHOW" else ""
        events.append(ics.event(t, summary=f"{prefix}Tour: {t.name}", description="\n".join(details), location=address))
    return Response(
        content=ics.calendar(events, "Respite tours"),
        media_type="text/calendar; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )
