# Respite for the Weary

Website and house-management app for Respite for the Weary, a 6-bed home in Chester, VA.

- **Public site**: landing page, room listings with live bed availability, a step-by-step room request.
- **Owner dashboard** (`/admin`): requests board, rooms & photos, residents, rent and payments.
- **Resident pay page** (`/portal/<link>`): each resident gets a private link to see what they owe and pay online.

## Run it on your computer

Needs Node 20+.

```bash
npm install
npm run setup     # creates the local database and fills it with sample rooms, residents and requests
npm run dev
```

Then open:

| Page | Address |
| --- | --- |
| Public site | http://localhost:3000 |
| Owner dashboard | http://localhost:3000/admin (password is `ADMIN_PASSWORD` in `.env.local`) |
| A resident's pay page | Open any resident in the dashboard and click their pay link |

To start over with fresh sample data: `npx prisma db push --force-reset && npx prisma db seed`.

### What works offline

- **Emails** (new request alerts, welcome emails, rent reminders) print in the terminal instead of sending, until `RESEND_API_KEY` is set.
- **Payments** run in test mode until `STRIPE_SECRET_KEY` is set: the Pay button goes to a test screen that marks the charge paid. No money moves.
- **Room photos** upload to `public/uploads`. Until a room has photos, the site shows an illustration.

## Before going live

1. **Database** — create a free Postgres database (Neon works well). In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`, set `DATABASE_URL` to the Neon connection string, then run `npx prisma db push`. Run `npx prisma db seed` only if you want the sample rooms as a starting point (then delete the sample residents and requests).
2. **Photo uploads** — Vercel's disk is read-only, so switch `uploadPhoto` in `src/app/admin/actions.ts` to Vercel Blob (`@vercel/blob` `put()`), or upload photos locally and commit them to `public/`.
3. **Hosting** — push to GitHub, import into Vercel, and add every variable from `.env.example` in Project Settings → Environment Variables. Use a long random `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. **Domain** — in Vercel, Settings → Domains → add the client's domain, then add the DNS records Vercel shows at the domain registrar. Set `SITE_URL` to `https://<their domain>`.
5. **Payments** — the owner creates a Stripe account. Add `STRIPE_SECRET_KEY`, then in Stripe → Developers → Webhooks add `https://<domain>/api/stripe/webhook` with events `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Turn on ACH Direct Debit in Stripe's payment methods.
6. **Email** — create a Resend account, verify the domain, add `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Respite for the Weary <hello@domain>`), and `OWNER_EMAIL`.

## Content the owner should check

Prices, deposits, room descriptions and FAQ answers are placeholders written from the flyer. Rooms are editable in the dashboard; the FAQ lives in `src/app/page.tsx`.
