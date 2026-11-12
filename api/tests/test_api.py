import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp())
os.environ.update(
    DATABASE_URL=f"sqlite:///{(_tmp / 'test.db').as_posix()}",
    JWT_SECRET="test-secret-that-is-at-least-32-bytes-long",
    ADMIN_EMAIL="owner@example.com",
    ADMIN_PASSWORD="correct-horse-battery",
    OWNER_EMAIL="owner@example.com",
    UPLOAD_DIR=str(_tmp / "uploads"),
    CRON_SECRET="cron-test",
    STRIPE_SECRET_KEY="",
    RESEND_API_KEY="",
    NOTIFY_WORKER="false",  # tests send the outbox by hand
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import SessionLocal, now  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Notification  # noqa: E402
from app.services import notify  # noqa: E402
from app.services.email import EmailError  # noqa: E402
from app.seed import seed  # noqa: E402

PW = "correct-horse-battery"


@pytest.fixture(scope="module")
def client():
    seed()
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth(client):
    r = client.post("/auth/login", json={"email": "owner@example.com", "password": PW})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['accessToken']}"}


def test_public_rooms_and_beds(client, auth):
    rooms = client.get("/public/rooms").json()
    assert [r["slug"] for r in rooms] == ["porch-room", "garden-room", "maple-room", "dogwood-room"]
    maple = rooms[2]
    assert [s["state"] for s in maple["states"]] == ["soon", "open"]
    assert maple["soon"].startswith("2026-12-15T00:00:00")
    beds = client.get("/public/beds").json()
    assert len(beds) == 6 and {b["state"] for b in beds} <= {"open", "soon", "taken"}
    assert all("residentName" not in b for b in beds)
    assert "residentName" in client.get("/admin/beds", headers=auth).json()[0]


def test_admin_needs_login(client):
    assert client.get("/admin/overview").status_code == 401
    assert client.get("/admin/overview", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_login_rejects_wrong_password(client):
    r = client.post("/auth/login", json={"email": "owner@example.com", "password": "wrong"})
    assert r.status_code == 401
    assert client.post("/auth/login", json={"email": "nobody@example.com", "password": "x"}).status_code == 401


def test_me_and_no_hash_leak(client, auth):
    me = client.get("/auth/me", headers=auth).json()
    assert me["email"] == "owner@example.com"
    assert "passwordHash" not in me and "tokenVersion" not in me


def test_apply_then_move_in_then_pay(client, auth):
    bad = client.post("/public/requests", json={"forWhom": "SELF", "program": "SENIOR", "moveIn": "ASAP", "payment": "VA", "name": "A", "phone": "1234567"})
    assert bad.status_code == 400 and bad.json()["detail"] == "Enter a name"

    r = client.post("/public/requests", json={
        "forWhom": "SELF", "program": "SENIOR", "moveIn": "ASAP", "payment": "VA",
        "name": "Ruth Example", "phone": "804 555 0100", "email": "ruth@example.com", "room": "porch-room",
    })
    assert r.status_code == 201, r.text
    req_id = r.json()["id"]
    assert r.json()["firstName"] == "Ruth"

    porch_bed = next(b for b in client.get("/admin/beds", headers=auth).json() if b["roomSlug"] == "porch-room")
    mi = client.post(f"/admin/requests/{req_id}/move-in", headers=auth,
                     json={"bedId": porch_bed["id"], "moveInDate": "2026-12-01", "rentCents": 87500, "depositCents": 30000})
    assert mi.status_code == 201, mi.text
    rid = mi.json()["residentId"]

    again = client.post(f"/admin/requests/{req_id}/move-in", headers=auth, json={"bedId": porch_bed["id"], "moveInDate": "2026-12-01", "rentCents": 1})
    assert again.json() == {"residentId": rid, "existing": True}

    res = client.get(f"/admin/residents/{rid}", headers=auth).json()
    assert res["bed"]["room"]["slug"] == "porch-room"
    assert sorted(c["amountCents"] for c in res["charges"]) == [30000, 87500]
    token = res["portalToken"]

    portal = client.get(f"/portal/{token}").json()
    assert "portalToken" not in portal and portal["stripeEnabled"] is False
    co = client.post(f"/portal/{token}/checkout", json={"chargeIds": []}).json()
    assert co["url"].startswith(f"/portal/{token}/pay?c=")
    ids = co["url"].split("c=")[1].split(",")
    assert client.post(f"/portal/{token}/demo-pay", json={"chargeIds": ids}).json() == {"paid": 2}
    assert all(c["status"] == "PAID" for c in client.get(f"/portal/{token}").json()["charges"])

    # bed is now taken; another move-in into it is refused
    other = client.post("/public/requests", json={"forWhom": "SELF", "program": "VETERAN", "moveIn": "ASAP", "payment": "VA", "name": "Sam Other", "phone": "804 555 0101"}).json()["id"]
    blocked = client.post(f"/admin/requests/{other}/move-in", headers=auth, json={"bedId": porch_bed["id"], "moveInDate": "2026-12-01", "rentCents": 1000})
    assert blocked.status_code == 409


def test_portal_bad_token(client):
    assert client.get("/portal/not-a-token").status_code == 404


def test_billing_is_idempotent(client, auth):
    first = client.post("/admin/billing/run", headers=auth, json={"month": "2027-01"}).json()["billed"]
    assert first >= 3
    assert client.post("/admin/billing/run", headers=auth, json={"month": "2027-01"}).json()["billed"] == 0
    ch = client.get("/admin/charges?tab=due", headers=auth).json()
    assert ch["due"]["count"] >= first and ch["activeResidents"] >= 3


def test_cron_needs_secret(client):
    assert client.get("/cron/bill-rent").status_code == 401
    assert client.get("/cron/bill-rent", headers={"Authorization": "Bearer cron-test"}).status_code == 200


def _emails(**where):
    with SessionLocal() as db:
        q = db.query(Notification).filter_by(channel="EMAIL", **where)
        return [(n.kind, n.recipient, n.status) for n in q.order_by(Notification.createdAt)]


def test_actions_queue_notifications(client, auth, monkeypatch):
    kinds = {k for k, _, _ in _emails()}
    assert {"request.new", "request.received", "resident.welcome", "payment.received", "rent.billed"} <= kinds
    assert ("request.received", "ruth@example.com", "PENDING") in _emails()

    inbox = client.get("/admin/notifications", headers=auth).json()
    assert {"request.new", "payment.received"} <= {n["kind"] for n in inbox["items"]}
    assert inbox["unread"] == len(inbox["items"]) and all(n["channel"] == "INBOX" for n in inbox["items"])
    assert client.get("/admin/summary", headers=auth).json()["unreadNotifications"] == inbox["unread"]

    sent = []
    monkeypatch.setattr(notify, "deliver", lambda to, subject, text: sent.append((to, subject)))
    assert client.get("/cron/notifications").status_code == 401
    out = client.post("/cron/notifications", headers={"Authorization": "Bearer cron-test"}).json()
    assert out["sent"] == len(sent) > 0
    assert _emails(status="PENDING") == []
    assert ("ruth@example.com", "We got your request — Respite for the Weary") in sent


def test_failed_email_retries_then_alerts_owner(client, auth, monkeypatch):
    def broken(*_):
        raise EmailError("Resend said 500: down")

    monkeypatch.setattr(notify, "deliver", broken)
    assert client.post("/admin/notifications/test", headers=auth).status_code == 200
    with SessionLocal() as db:
        for attempt in range(1, notify.MAX_ATTEMPTS + 1):
            assert notify.deliver_pending(db) == 0
            n = db.query(Notification).filter_by(kind="test").one()
            assert n.attempts == attempt and n.lastError == "Resend said 500: down"
            if attempt < notify.MAX_ATTEMPTS:
                assert n.status == "PENDING" and n.nextAttemptAt > now()
                assert notify.deliver_pending(db) == 0 and n.attempts == attempt  # not due yet
                n.nextAttemptAt = now()
                db.commit()
        assert n.status == "FAILED" and n.nextAttemptAt is None
        alert = db.query(Notification).filter_by(kind="email.failed").one()
        assert alert.channel == "INBOX" and alert.link == "/admin/notifications?tab=email"
        assert db.query(Notification).filter_by(kind="email.failed", channel="EMAIL").count() == 0
        nid = n.id

    box = client.get("/admin/outbox?status=FAILED", headers=auth).json()
    assert box["counts"]["FAILED"] == 1 and box["items"][0]["id"] == nid and "test" in box["kinds"]
    assert client.get("/admin/summary", headers=auth).json()["failedEmails"] == 1

    monkeypatch.setattr(notify, "deliver", lambda *_: None)
    assert client.post(f"/admin/outbox/{nid}/retry", headers=auth).status_code == 200
    with SessionLocal() as db:
        assert notify.deliver_pending(db) == 1
    assert client.post(f"/admin/outbox/{nid}/retry", headers=auth).status_code == 400
    assert client.get("/admin/summary", headers=auth).json()["failedEmails"] == 0


def test_unexpected_send_error_does_not_jam_the_queue(client, auth, monkeypatch):
    def crash(*_):
        raise UnicodeEncodeError("charmap", "x", 0, 1, "nope")

    monkeypatch.setattr(notify, "deliver", crash)
    assert client.post("/admin/notifications/test", headers=auth).status_code == 200
    with SessionLocal() as db:
        assert notify.deliver_pending(db) == 0
        n = db.query(Notification).filter_by(kind="test", status="PENDING").one()
        assert n.attempts == 1 and n.lastError.startswith("UnicodeEncodeError")
        n.status = "SENT"  # tidy up for the tests after this
        db.commit()


def test_mark_notifications_read(client, auth):
    items = client.get("/admin/notifications", headers=auth).json()["items"]
    before = client.get("/admin/notifications", headers=auth).json()["unread"]
    assert client.post("/admin/notifications/read", headers=auth, json={"ids": [items[0]["id"]]}).json()["unread"] == before - 1
    assert client.post("/admin/notifications/read", headers=auth, json={}).json()["unread"] == 0
    assert client.get("/admin/summary", headers=auth).json()["unreadNotifications"] == 0


def test_room_edit_and_photo(client, auth):
    room = client.get("/admin/rooms", headers=auth).json()[0]
    r = client.put(f"/admin/rooms/{room['id']}", headers=auth, json={
        "name": "The Porch Room", "summary": "s", "description": "d", "rentCents": 90000, "depositCents": 30000, "features": ["A", " ", "B"]})
    assert r.status_code == 200 and r.json()["features"] == '["A", "B"]'
    up = client.post(f"/admin/rooms/{room['id']}/photos", headers=auth, files={"photo": ("p.png", b"\x89PNG fake", "image/png")})
    assert up.status_code == 201, up.text
    src = up.json()["photos"][-1]
    assert src.startswith("/uploads/") and (_tmp / "uploads" / src.split("/")[-1]).exists()
    assert client.post(f"/admin/rooms/{room['id']}/photos/remove", headers=auth, json={"src": src}).json()["photos"] == []
    txt = client.post(f"/admin/rooms/{room['id']}/photos", headers=auth, files={"photo": ("a.txt", b"hi", "text/plain")})
    assert txt.status_code == 400


def test_password_change_revokes_old_tokens(client):
    tok = client.post("/auth/login", json={"email": "owner@example.com", "password": PW}).json()["accessToken"]
    h = {"Authorization": f"Bearer {tok}"}
    new = client.post("/auth/password", headers=h, json={"currentPassword": PW, "newPassword": "a-brand-new-password"})
    assert new.status_code == 200
    assert client.get("/auth/me", headers=h).status_code == 401
    h2 = {"Authorization": f"Bearer {new.json()['accessToken']}"}
    assert client.get("/auth/me", headers=h2).status_code == 200
    client.post("/auth/password", headers=h2, json={"currentPassword": "a-brand-new-password", "newPassword": PW})


def test_login_rate_limit(client):
    for _ in range(8):
        client.post("/auth/login", json={"email": "limit@example.com", "password": "x"})
    assert client.post("/auth/login", json={"email": "limit@example.com", "password": "x"}).status_code == 429
