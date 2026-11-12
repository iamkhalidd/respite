import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/email";
import { longDate, money } from "@/lib/format";
import { addCharge, moveOut, sendPayLink } from "../../../actions";
import { Page, Card, CardHead, Notice, Label, Prop, isOverdue, btnPrimary, btnQuiet, input, link } from "../../ui";
import { SubmitButton } from "../../submit";
import { ConfirmAction } from "../../confirm";
import { ChargeList } from "../../payments/charge-table";
import { PayLink, EditResident } from "./client";

export default async function ResidentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { id } = await params;
  const { welcome } = await searchParams;
  const r = await db.resident.findUnique({
    where: { id },
    include: { bed: { include: { room: true } }, charges: { orderBy: { dueDate: "desc" } }, request: true },
  });
  if (!r) notFound();
  const due = r.charges.filter((c) => c.status === "DUE");
  const owed = due.reduce((s, c) => s + c.amountCents, 0);
  const late = due.some(isOverdue);
  const paid = r.charges.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amountCents, 0);
  const portal = `${siteUrl()}/portal/${r.portalToken}`;
  const today = new Date().toISOString().slice(0, 10);
  const first = r.name.split(" ")[0];

  return (
    <Page
      wide
      title={r.name}
      crumb={
        <>
          <Link href="/admin/residents" className="hover:text-ink">
            Residents
          </Link>
          <span aria-hidden>/</span>
          <span>{r.active ? (r.bed ? `${r.bed.label} · ${r.bed.room.name.replace("The ", "")}` : "No bed") : "Moved out"}</span>
        </>
      }
      actions={
        r.phone ? (
          <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className={btnQuiet}>
            <Phone size={15} /> Call {first}
          </a>
        ) : undefined
      }
    >
      {welcome && (
        <Notice>
          {first} is moved in. The deposit and first month are billed{r.email ? ", and a link to pay was emailed to them." : ". There is no email on file, so text them the pay link."}
        </Notice>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* What they owe and how they pay */}
        <section className="relative overflow-hidden rounded-2xl bg-night p-5 text-white sm:p-6 lg:col-start-2 lg:row-start-1">
          {owed > 0 && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_85%_0%,rgb(240_165_58/0.16),transparent_70%)]" />}
          <div className="relative">
            <p className="mono text-[0.7rem] uppercase tracking-[0.02em] text-white/45">{owed ? (late ? "Past due" : "Waiting to be paid") : "Balance"}</p>
            <p className={`mono tabular mt-2 text-[2.6rem] font-medium leading-none tracking-[-0.055em] ${owed ? "text-porch-glow" : ""}`}>{owed ? money(owed) : "Paid up"}</p>
            <p className="mt-2.5 text-[0.86rem] text-white/55">
              {money(r.rentCents)} a month · {money(paid)} paid so far
            </p>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 text-[0.86rem] font-medium text-white/80">Pay link</p>
              <PayLink url={portal} phone={r.phone} firstName={first} hasEmail={!!r.email} send={sendPayLink.bind(null, r.id)} />
            </div>
          </div>
        </section>

        <div className="grid min-w-0 gap-5 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <Card>
            <CardHead title="Charges" hint={due.length ? `${due.length} unpaid. Tap the dots to mark one paid in person.` : undefined} />
            <div className="mt-3 border-t border-line">
              <ChargeList charges={r.charges} canRemind={!!r.email} empty="No charges yet." />
            </div>
          </Card>

          {r.active && (
            <Card>
              <CardHead title="Add a charge" hint="A late fee, a key replacement, anything outside rent. It shows on their pay page right away." />
              <form action={addCharge.bind(null, r.id)} className="grid gap-3 p-5 pt-4 sm:grid-cols-[minmax(0,1fr)_7.5rem_10.5rem] sm:p-6 sm:pt-4">
                <label>
                  <Label>What it&apos;s for</Label>
                  <input name="label" placeholder="Late fee" required maxLength={80} className={input} />
                </label>
                <label>
                  <Label>Amount ($)</Label>
                  <input name="amount" type="number" inputMode="decimal" min={1} step="0.01" required className={`${input} mono tabular`} />
                </label>
                <label>
                  <Label>Due</Label>
                  <input name="due" type="date" defaultValue={today} required className={input} />
                </label>
                <div className="sm:col-span-3">
                  <SubmitButton className={`${btnPrimary} w-full disabled:opacity-60 sm:w-auto`} done="Added">
                    Add charge
                  </SubmitButton>
                </div>
              </form>
            </Card>
          )}
        </div>

        <Card className="lg:col-start-2">
          <CardHead title="Details" />
          {r.active ? (
            <div className="p-5 pt-4 sm:p-6 sm:pt-4">
              <EditResident id={r.id} name={r.name} phone={r.phone ?? ""} email={r.email ?? ""} rent={r.rentCents / 100} />
            </div>
          ) : (
            <dl className="mt-2 divide-y divide-line px-5 pb-2 sm:px-6">
              <Prop label="Phone">{r.phone ?? "None"}</Prop>
              <Prop label="Email">{r.email ?? "None"}</Prop>
              <Prop label="Rent">{money(r.rentCents)} a month</Prop>
            </dl>
          )}
          <dl className="divide-y divide-line border-t border-line px-5 pb-2 sm:px-6">
            <Prop label="Moved in">{longDate(r.moveInDate)}</Prop>
            {r.moveOutDate && <Prop label="Moved out">{longDate(r.moveOutDate)}</Prop>}
            {r.request && (
              <Prop label="Came from">
                <Link className={link} href={`/admin/requests/${r.request.id}`}>
                  Their request
                </Link>
              </Prop>
            )}
          </dl>
        </Card>

        {r.active && (
          <Card className="p-5 sm:p-6 lg:col-start-2">
            <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">Moving out</h2>
            <p className="mt-1 text-[0.88rem] leading-snug text-moss">Frees {r.bed ? r.bed.label : "their bed"} and shows it as open on the site. Their payment history is kept.</p>
            <div className="mt-4">
              <ConfirmAction
                action={moveOut.bind(null, r.id)}
                label={`Move ${first} out`}
                title={`Move ${first} out?`}
                body={
                  <>
                    {r.bed ? `${r.bed.label} in ${r.bed.room.name}` : "Their bed"} will show as open on the public site right away.
                    {owed > 0 && <span className="mt-2 block font-medium text-ember">{first} still owes {money(owed)}. Those charges stay on their pay link.</span>}
                  </>
                }
                confirmLabel="Move out"
                danger
              />
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
