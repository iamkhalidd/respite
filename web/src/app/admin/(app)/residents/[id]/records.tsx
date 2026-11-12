"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, FileText, Image as ImageIcon, Loader2, Paperclip, Trash2 } from "lucide-react";
import { addNote, deleteDocument, deleteNote, settleDeposit, uploadDocument, type FormState } from "../../../actions";
import type { NoteKind, ResidentDocument, ResidentNote } from "@/lib/types";
import { money } from "@/lib/format";
import { Card, CardHead, Empty, Label, btnPrimary, input, select } from "../../ui";
import { ConfirmAction } from "../../confirm";

const KIND: Record<NoteKind, string> = { NOTE: "Note", CHECKIN: "Check-in", INCIDENT: "Incident" };
const stamp = (d: Date) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
const iconBtn = "press grid h-9 w-9 shrink-0 place-items-center rounded-full text-moss transition-colors hover:bg-ink/[.05] hover:text-ember";

function Feedback({ state, pending }: { state: FormState; pending: boolean }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
        {state.error}
      </p>
    );
  return (
    <span className="mono flex min-h-4 items-center gap-1 text-[0.72rem] uppercase text-moss" aria-live="polite">
      {!pending && state?.ok && (
        <>
          <Check size={12} strokeWidth={3} /> {state.ok}
        </>
      )}
    </span>
  );
}

/** A dated log for the house: how they're doing, check-ins, anything that happened. Never shown to the resident. */
export function NotesCard({ residentId, notes, firstName }: { residentId: string; notes: ResidentNote[]; firstName: string }) {
  const [state, action, pending] = useActionState(addNote.bind(null, residentId), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <Card>
      <CardHead title="Notes" hint={`Only the house sees these. ${firstName} never does.`} />
      <form ref={form} action={action} className="grid gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
        <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <label>
            <Label>Kind</Label>
            <select name="kind" defaultValue="NOTE" className={select}>
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Label>What happened</Label>
            <textarea name="body" required maxLength={4000} rows={2} placeholder="Checked in, doing well. Started the new job Monday." className={`${input} h-auto min-h-11 resize-y py-2.5`} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className={`${btnPrimary} disabled:opacity-60`}>
            {pending && <Loader2 size={15} className="animate-spin" />} Save note
          </button>
          <Feedback state={state} pending={pending} />
        </div>
      </form>
      <div className="border-t border-line">
        {notes.length ? (
          <ol className="divide-y divide-line">
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.8rem] text-moss">
                    <span
                      className={`mono inline-flex h-6 items-center rounded-full px-2.5 text-[0.7rem] font-medium uppercase ${n.kind === "INCIDENT" ? "bg-ember text-white" : n.kind === "CHECKIN" ? "bg-porch-glow text-ink" : "bg-ink/[.06] text-ink"}`}
                    >
                      {KIND[n.kind] ?? n.kind}
                    </span>
                    <span className="tabular">{stamp(n.createdAt)}</span>
                    {n.author && <span>· {n.author}</span>}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed">{n.body}</p>
                </div>
                <ConfirmAction
                  action={deleteNote.bind(null, n.id)}
                  label={<><Trash2 size={15} /><span className="sr-only">Delete note</span></>}
                  className={iconBtn}
                  title="Delete this note?"
                  body="It's gone for good once you delete it."
                  confirmLabel="Delete"
                  danger
                />
              </li>
            ))}
          </ol>
        ) : (
          <Empty>No notes yet. Write down check-ins, wins and anything the next person on shift should know.</Empty>
        )}
      </div>
    </Card>
  );
}

const MAX = 4 * 1024 * 1024;
const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Signed agreements, house rules, an ID. Stored privately; only someone logged in to the dashboard can open them. */
export function DocumentsCard({ residentId, docs }: { residentId: string; docs: ResidentDocument[] }) {
  const [state, action, pending] = useActionState(uploadDocument.bind(null, residentId), null);
  const [tooBig, setTooBig] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <Card>
      <CardHead title="Documents" hint="The signed agreement, house rules, an ID. PDF or photo, up to 4 MB each. Private to the dashboard." />
      <form ref={form} action={action} className="grid gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
        <label className="press flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 border border-dashed border-line-strong transition-colors focus-within:ring-2 focus-within:ring-ink hover:bg-ink/[.03]">
          <Paperclip size={17} className="shrink-0 text-moss" />
          <span className="min-w-0 flex-1 text-[0.92rem]">
            <span className="font-medium">Choose a file</span>
            <span className="block text-[0.8rem] text-moss">or take a photo of a paper copy</span>
          </span>
          <input
            name="file"
            type="file"
            required
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => setTooBig((e.target.files?.[0]?.size ?? 0) > MAX)}
            className="sr-only"
          />
        </label>
        {tooBig && (
          <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
            That file is over 4 MB. Try a smaller scan, or take a photo instead.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending || tooBig} className={`${btnPrimary} disabled:opacity-60`}>
            {pending && <Loader2 size={15} className="animate-spin" />} Upload
          </button>
          <Feedback state={state} pending={pending} />
        </div>
      </form>
      <div className="border-t border-line">
        {docs.length ? (
          <ul className="divide-y divide-line">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/[.05] text-moss">
                  {d.contentType.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                </span>
                <a href={`/admin/documents/${d.id}`} target="_blank" rel="noopener" className="min-w-0 flex-1">
                  <span className="block truncate text-[0.93rem] font-medium hover:underline">{d.name}</span>
                  <span className="mono block text-[0.72rem] text-moss">
                    {size(d.size)} · {stamp(d.createdAt)}
                    {d.uploadedBy && ` · ${d.uploadedBy}`}
                  </span>
                </a>
                <ConfirmAction
                  action={deleteDocument.bind(null, d.id)}
                  label={<><Trash2 size={15} /><span className="sr-only">Delete {d.name}</span></>}
                  className={iconBtn}
                  title="Delete this document?"
                  body={`${d.name} will be removed for good. Keep a copy if you might need it.`}
                  confirmLabel="Delete"
                  danger
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing on file yet.</Empty>
        )}
      </div>
    </Card>
  );
}

/** After move out: how much of the deposit went back, and why any was kept. */
export function DepositCard({
  residentId,
  paidCents,
  returnedCents,
  note,
  settledAt,
}: {
  residentId: string;
  paidCents: number;
  returnedCents: number | null;
  note: string | null;
  settledAt: Date | null;
}) {
  const [state, action, pending] = useActionState(settleDeposit.bind(null, residentId), null);
  const [editing, setEditing] = useState(returnedCents == null);
  const [back, setBack] = useState(returnedCents != null ? returnedCents / 100 : paidCents / 100);
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);
  const kept = Math.max(0, paidCents - Math.round(back * 100));

  if (!paidCents)
    return (
      <Card className="p-5 sm:p-6">
        <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">Deposit</h2>
        <p className="mt-1 text-[0.88rem] leading-snug text-moss">No security deposit was paid, so there&apos;s nothing to return.</p>
      </Card>
    );

  if (!editing && returnedCents != null)
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">Deposit</h2>
          <button type="button" onClick={() => setEditing(true)} className="text-[0.86rem] font-medium text-moss underline decoration-line-strong underline-offset-4 hover:text-ink">
            Change
          </button>
        </div>
        <dl className="mono tabular mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ["Paid", paidCents],
            ["Returned", returnedCents],
            ["Kept", paidCents - returnedCents],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-ink/[.04] px-2 py-3">
              <dt className="text-[0.68rem] uppercase text-moss">{l}</dt>
              <dd className="mt-1 text-[1.05rem] font-medium">{money(v as number)}</dd>
            </div>
          ))}
        </dl>
        {note && <p className="mt-3 whitespace-pre-line text-[0.92rem] leading-relaxed">{note}</p>}
        {settledAt && <p className="mt-2 text-[0.8rem] text-moss">Recorded {stamp(settledAt)}</p>}
      </Card>
    );

  return (
    <Card>
      <CardHead title="Deposit" hint={`They paid a ${money(paidCents)} deposit. Record what you gave back. It shows on their statement.`} />
      <form action={action} className="grid gap-3 p-5 pt-4 sm:p-6 sm:pt-4">
        <label>
          <Label>Returned to them ($)</Label>
          <input
            name="returned"
            type="number"
            inputMode="decimal"
            min={0}
            max={paidCents / 100}
            step="0.01"
            required
            value={back}
            onChange={(e) => setBack(Number(e.target.value))}
            className={`${input} mono tabular`}
          />
        </label>
        <label>
          <Label>{kept ? `Why ${money(kept)} was kept` : "Note (optional)"}</Label>
          <textarea
            name="note"
            required={kept > 0}
            maxLength={2000}
            rows={2}
            defaultValue={note ?? ""}
            placeholder={kept ? "Cleaning and a replaced door key." : "Returned in full by check."}
            className={`${input} h-auto min-h-11 resize-y py-2.5`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className={`${btnPrimary} disabled:opacity-60`}>
            {pending && <Loader2 size={15} className="animate-spin" />} Save deposit
          </button>
          {returnedCents != null && (
            <button type="button" onClick={() => setEditing(false)} className="text-[0.86rem] font-medium text-moss hover:text-ink">
              Cancel
            </button>
          )}
          <Feedback state={state} pending={pending} />
        </div>
      </form>
    </Card>
  );
}
