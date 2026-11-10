import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getBeds } from "@/lib/availability";
import { longDate, money } from "@/lib/format";
import { FOR_WHOM, MOVE_IN, PAYMENT, PROGRAMS } from "@/lib/labels";
import { moveIn } from "../../../actions";
import { Page, Prop, btnPrimary, input } from "../../ui";
import { StatusPicker, Notes } from "./client";
import { SubmitButton } from "../../submit";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.request.findUnique({ where: { id }, include: { room: true, resident: true } });
  if (!r) notFound();
  const beds = (await getBeds()).filter((b) => b.state !== "taken");
  const preferred = beds.find((b) => b.roomSlug === r.room?.slug) ?? beds[0];
  const rooms = await db.room.findMany();
  const roomOf = (slug: string) => rooms.find((x) => x.slug === slug)!;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Page title={r.name} crumb={<Link href="/admin/requests" className="hover:text-ink">Requests</Link>}>
      <dl className="max-w-2xl">
        <Prop label="Status"><StatusPicker id={r.id} status={r.status} /></Prop>
        <Prop label="Received">{longDate(r.createdAt)}</Prop>
        <Prop label="Looking for">{PROGRAMS[r.program as keyof typeof PROGRAMS]?.long}</Prop>
        <Prop label="Request from">{FOR_WHOM[r.forWhom as keyof typeof FOR_WHOM]}</Prop>
        <Prop label="Room">{r.room ? <Link className="underline decoration-line-strong underline-offset-4" href={`/rooms/${r.room.slug}`} target="_blank">{r.room.name}</Link> : "No preference"}</Prop>
        <Prop label="Move in">{MOVE_IN[r.moveIn as keyof typeof MOVE_IN]}</Prop>
        <Prop label="Pays with">{r.payment ? PAYMENT[r.payment as keyof typeof PAYMENT] : "—"}</Prop>
        <Prop label="Phone"><a className="tabular font-medium text-pine" href={`tel:${r.phone}`}>{r.phone}</a></Prop>
        <Prop label="Email">{r.email ? <a className="text-pine" href={`mailto:${r.email}`}>{r.email}</a> : "—"}</Prop>
        {r.referrerName && (
          <Prop label="Referred by">
            {r.referrerName}
            {r.referrerOrg && <span className="text-ink/55">, {r.referrerOrg}</span>}
            <span className="block text-[0.85rem] text-ink/55">{[r.referrerPhone, r.referrerEmail].filter(Boolean).join(" · ")}</span>
          </Prop>
        )}
      </dl>

      {r.message && (
        <blockquote className="mt-8 max-w-2xl border-l-[3px] border-porch pl-4 text-[1.02rem] leading-relaxed text-ink/80">{r.message}</blockquote>
      )}

      <section className="mt-12 max-w-2xl border-t border-line pt-8">
        <h2 className="mb-3 text-[0.95rem] font-semibold">Your notes</h2>
        <Notes id={r.id} initial={r.ownerNotes} />
      </section>

      <section className="mt-12 max-w-2xl border-t border-line pt-8">
        {r.resident ? (
          <p className="text-ink/70">
            Moved in on {longDate(r.resident.moveInDate)}. <Link href={`/admin/residents/${r.resident.id}`} className="font-medium text-pine underline underline-offset-4">Open resident</Link>
          </p>
        ) : r.status === "DECLINED" ? (
          <p className="text-ink/55">Marked as not a fit.</p>
        ) : beds.length === 0 ? (
          <p className="text-ink/55">Every bed is taken. Keep this request on the board and move them in when a bed opens.</p>
        ) : (
          <>
            <h2 className="text-[0.95rem] font-semibold">Move in</h2>
            <p className="mt-1 text-[0.9rem] text-ink/55">
              Assigns the bed, bills the deposit and first month, and {r.email ? "emails them a link to pay online." : "creates a payment link you can share (no email on file)."}
            </p>
            <form action={moveIn.bind(null, r.id)} className="mt-5 grid gap-4 rounded-xl bg-white p-5 ring-1 ring-line sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[0.85rem] text-ink/60">Bed</span>
                <select name="bedId" defaultValue={preferred?.id} className={input}>
                  {beds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} — {b.roomName} ({money(roomOf(b.roomSlug).rentCents)}/mo){b.state === "soon" ? ` · frees up ${longDate(b.availableFrom!)}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-[0.85rem] text-ink/60">Move-in date</span>
                <input type="date" name="moveInDate" defaultValue={today} required className={input} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1.5 block text-[0.85rem] text-ink/60">Monthly rent ($)</span>
                  <input type="number" name="rent" min={0} step="1" defaultValue={(preferred ? roomOf(preferred.roomSlug).rentCents : 0) / 100} className={input} />
                </label>
                <label>
                  <span className="mb-1.5 block text-[0.85rem] text-ink/60">Deposit ($)</span>
                  <input type="number" name="deposit" min={0} step="1" defaultValue={(preferred ? roomOf(preferred.roomSlug).depositCents : 0) / 100} className={input} />
                </label>
              </div>
              <div className="sm:col-span-2">
                <SubmitButton className={btnPrimary}>Move in {r.name.split(" ")[0]}</SubmitButton>
              </div>
            </form>
          </>
        )}
      </section>
    </Page>
  );
}
