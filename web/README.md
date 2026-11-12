# Respite for the Weary

Website and house-management app for Respite for the Weary, a 6-bed home in Chester, VA.

- **Public site**: landing page, room listings with live bed availability, a step-by-step room request.
- **Owner dashboard** (`/admin`): requests board, rooms & photos, residents, rent and payments.
- **Resident pay page** (`/portal/<link>`): each resident gets a private link to see what they owe and pay online.

Two parts that run side by side:

| Folder | What it is |
| --- | --- |
| `api/` | **FastAPI backend.** Owns the database, owner logins (email + password, JWT), payments (Stripe), email (Resend), rent billing and photo storage. Docs at `http://localhost:8000/docs`. |
| `web/` | **Next.js website.** Pages and forms only. Its server talks to the API (`API_URL`); browsers never do. The owner's login token sits in an httpOnly cookie. |

## Run it on your computer

Needs Node 20+ and [uv](https://docs.astral.sh/uv/) (Python 3.12+).

```bash
# 1. the API (terminal one)
cd api
cp .env.example .env            # set ADMIN_EMAIL, ADMIN_PASSWORD and a long JWT_SECRET
uv sync
uv run python -m app.seed       # sample rooms, residents and requests, plus the first owner account
uv run uvicorn app.main:app --port 8000 --reload
```

```bash
# 2. the website (terminal two)
cd web
npm install
npm run dev
```

Then open:

| Page | Address |
| --- | --- |
| Public site | http://localhost:3000 |
| Owner dashboard | http://localhost:3000/admin (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `api/.env`) |
| A resident's pay page | Open any resident in the dashboard and click their pay link |
| API docs | http://localhost:8000/docs |

To start over with fresh sample data, run `uv run python -m app.seed` again (owner accounts are kept).

### Owner accounts

- The first account is created on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` when there are none.
- Add another: `uv run python -m app.cli create-admin someone@example.com "Their Name"` (asks for the password).
- Reset a forgotten password: `uv run python -m app.cli reset-password someone@example.com`.
- Changing a password (`POST /auth/password`) signs out every other device.
- Eight wrong passwords in 15 minutes locks that email and that address out for 15 minutes.

### Tests

```bash
cd api && uv run pytest
```

### What works offline

- **Emails** (new request alerts, welcome emails, rent reminders) print in the API's terminal until `RESEND_API_KEY` is set.
- **Notifications.** Every email is queued in the API's outbox and sent by a background worker, which retries a failed send four times (after 1m, 5m, 30m and 2h). Owner alerts (new requests, payments, rent billed, an email that gave up) also land in the dashboard bell at `/admin/notifications`, where you can see every email, resend failed ones and send a test.
- **Payments** run in test mode until `STRIPE_SECRET_KEY` is set: the Pay button goes to a test screen that marks the charge paid. No money moves.
- **Room photos** save to `web/public/uploads` until `BLOB_READ_WRITE_TOKEN` is set. Until a room has photos, the site shows an illustration.

## Before going live

1. **Database** — the API runs on the same Postgres the site used before (Neon). Set the API's `DATABASE_URL` to the Neon connection string. Tables keep the same names, so existing rooms, residents and charges carry over; the owner accounts table is added on first start.
2. **Host the API** — any Python host works (Render, Railway, Fly.io, a small VPS). Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set every variable from `api/.env.example`, with a long random `JWT_SECRET` (`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
3. **Host the website** — Vercel, as before. Its only variables are `API_URL` (the API's https address) and `SITE_URL`.
4. **Domain** — in Vercel, Settings → Domains → add the client's domain, then add the DNS records it shows. Set `SITE_URL` to `https://<their domain>` on both the site and the API.
5. **Photos** — create a Vercel Blob store and give the API its `BLOB_READ_WRITE_TOKEN`.
6. **Payments** — add `STRIPE_SECRET_KEY` to the API. In Stripe → Developers → Webhooks add `https://<domain>/api/stripe/webhook` (the site passes it straight to the API) with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and put its signing secret in the API's `STRIPE_WEBHOOK_SECRET`. Turn on ACH Direct Debit.
7. **Email** — create a Resend account, verify the domain, and give the API `RESEND_API_KEY`, `EMAIL_FROM` and `OWNER_EMAIL`.
8. **Monthly rent** — Vercel's cron calls `/api/cron/bill-rent` on the 25th, which passes it to the API. Set the same `CRON_SECRET` on Vercel and on the API. If the API runs somewhere without a long-lived process, set `NOTIFY_WORKER=false` and have a scheduler call the API's `/cron/notifications` every minute with the same secret.

## Content the owner should check

Prices, deposits, room descriptions and FAQ answers are placeholders written from the flyer. Rooms are editable in the dashboard; the FAQ lives in `src/app/page.tsx`.
