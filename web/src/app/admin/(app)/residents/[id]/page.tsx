import Link from "next/link";
import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/email";
import { longDate, money, shortDate } from "@/lib/format";
import { addCharge, moveOut } from "../../../actions";
import { Page, Prop, btnPrimary, btnQuiet, input } from "../../ui";
import { SubmitButton } from "../../submit";
import { ChargeTable } from "../../payments/charge-table";
import { CopyLink, ConfirmButton } from "./client";

export default async function ResidentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { id } = await params;
  const { welcome } = await searchParams;
  const r = await db.resident.findUnique({
    where: { id },
    include: { bed: { include: { room: true } }, charges: { orderBy: { dueDate: "desc" } }, request: true },
  });
  if (!r) notFound();
  const owed = r.charges.filter((c) => c.status === "DUE").reduce((s, c) => s + c.amountCents, 0);
  const portal = `${siteUrl()}/portal/${r.portalToken}`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Page
      title={r.name}
      crumb={<Link href="/admin/residents" className="hover:text-ink">Residents</Link>}
      actions={r.active ? <form action={moveOut.bind(null, r.id)}><ConfirmButton className={btnQuiet} message={`Move ${r.name} out? Their bed will show as open on the site.`}>Move out</ConfirmButton></form> : undefined}
    >
      {welcome && (
        <div className="mb-8 flex max-w-2xl items-start gap-3 rounded-xl bg-porch-glow/50 p-4 ring-1 ring-porch/40">
          <PartyPopper size={18} className="mt-0.5 shrink-0 text-[#6e4b0c]" />
          <p className="text-[0.92rem] text-[#4d3508]">
            {r.name.split(" ")[0]} is moved in. Their deposit and first month are billed{r.email ? ", and a link to pay was emailed to them." : ". Text them the portal link below so they can pay."}
          </p>
        </div>
      )}

      <dl className="max-w-2xl">
        <Prop label="Bed">{r.bed ? `${r.bed.label} · ${r.bed.room.name}` : "—"}</Prop>
        <Prop label="Moved in">{longDate(r.moveInDate)}</Prop>
        {r.moveOutDate && <Prop label="Moved out">{longDate(r.moveOutDate)}</Prop>}
        <Prop label="Monthly rent"><span className="tabular">{money(r.rentCents)}</span></Prop>
        <Prop label="Balance"><span className={`tabular font-medium ${owed ? "text-ember" : ""}`}>{owed ? `${money(owed)} due` : "Paid up"}</span></Prop>
        <Prop label="Phone"><a className="tabular text-pine" href={`tel:${r.phone}`}>{r.phone}</a></Prop>
        <Prop label="Email">{r.email ?? "—"}</Prop>
        <Prop label="Pay link"><CopyLink url={portal} /></Prop>
        {r.request && <Prop label="Original request"><Link className="text-pine underline underline-offset-4" href={`/admin/requests/${r.request.id}`}>Open</Link></Prop>}
      </dl>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="mb-4 text-[0.95rem] font-semibold">Charges</h2>
        <ChargeTable charges={r.charges} />
      </section>

      {r.active && (
        <section className="mt-10 max-w-3xl">
          <h3 className="mb-3 text-[0.88rem] font-semibold text-ink/60">Add a charge</h3>
          <form action={addCharge.bind(null, r.id)} className="grid gap-3 sm:grid-cols-[1fr_120px_160px_auto]">
            <input name="label" placeholder="e.g. Late fee, key replacement" required className={input} aria-label="What it's for" />
            <input name="amount" type="number" min={1} step="0.01" placeholder="$" required className={input} aria-label="Amount" />
            <input name="due" type="date" defaultValue={today} required className={input} aria-label="Due date" />
            <SubmitButton className={btnPrimary} done="Added">Add charge</SubmitButton>
          </form>
          <p className="mt-2 text-[0.8rem] text-ink/45">It shows up on their pay page right away. Last charge {r.charges[0] ? shortDate(r.charges[0].dueDate) : "—"}.</p>
        </section>
      )}
    </Page>
  );
}
