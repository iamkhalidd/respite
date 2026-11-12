"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, Mail, MessageSquare } from "lucide-react";
import { updateResident, type FormState } from "../../../actions";
import { Label, btnPrimary, input } from "../../ui";

const tile = "press flex h-12 items-center justify-center gap-2 rounded-xl bg-white/[.08] px-2 text-[0.9rem] font-medium text-white transition-colors hover:bg-white/[.14] disabled:opacity-45";

/** Three ways to hand a resident their pay link: copy it, text it, or email it. */
export function PayLink({ url, phone, firstName, hasEmail, send }: { url: string; phone: string | null; firstName: string; hasEmail: boolean; send: () => Promise<FormState> }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<FormState>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4000);
    return () => clearTimeout(t);
  }, [note]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setNote({ error: "Couldn't copy. Press and hold the link to copy it." });
    }
  }
  const sms = phone ? `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(`Hi ${firstName}, here is your link to pay at Respite for the Weary: ${url}`)}` : undefined;

  return (
    <div>
      <a href={url} target="_blank" className="mono block truncate rounded-xl bg-white/[.06] px-3.5 py-3 text-[0.78rem] text-white/70 ring-1 ring-white/10 transition-colors hover:text-white">
        {url.replace(/^https?:\/\//, "")}
      </a>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={copy} className={tile}>
          {copied ? <Check size={15} className="text-porch" /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
        </button>
        {sms ? (
          <a href={sms} className={tile}>
            <MessageSquare size={15} /> Text
          </a>
        ) : (
          <button type="button" disabled className={tile}>
            <MessageSquare size={15} /> Text
          </button>
        )}
        <button type="button" disabled={!hasEmail || pending} onClick={() => start(async () => setNote(await send()))} className={tile}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Email
        </button>
      </div>
      <p className={`mt-2 min-h-5 text-[0.8rem] leading-snug ${note?.error ? "text-[#ff9c82]" : "text-white/55"}`} aria-live="polite">
        {note?.error ?? note?.ok ?? (hasEmail ? "They pay from this link. No password needed." : "No email on file, so text them the link.")}
      </p>
    </div>
  );
}

export function EditResident({ id, name, phone, email, rent }: { id: string; name: string; phone: string; email: string; rent: number }) {
  const [state, action, pending] = useActionState(updateResident.bind(null, id), null);
  return (
    <form action={action} className="grid gap-3.5">
      <label>
        <Label>Name</Label>
        <input name="name" defaultValue={name} required autoComplete="off" className={input} />
      </label>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-1">
        <label>
          <Label>Phone</Label>
          <input name="phone" type="tel" inputMode="tel" defaultValue={phone} autoComplete="off" className={`${input} mono tabular`} />
        </label>
        <label>
          <Label>Email</Label>
          <input name="email" type="email" inputMode="email" defaultValue={email} autoComplete="off" placeholder="None on file" className={input} />
        </label>
      </div>
      <label>
        <Label>Monthly rent ($)</Label>
        <input name="rent" type="number" inputMode="decimal" min={1} step="1" defaultValue={rent} required className={`${input} mono tabular`} />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-ember/10 px-3.5 py-2.5 text-[0.88rem] text-ember ring-1 ring-ember/25">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button disabled={pending} className={`${btnPrimary} disabled:opacity-60`}>
          {pending && <Loader2 size={15} className="animate-spin" />} Save details
        </button>
        <span className="mono flex items-center gap-1 text-[0.72rem] uppercase text-moss" aria-live="polite">
          {!pending && state?.ok && (
            <>
              <Check size={12} strokeWidth={3} /> {state.ok}
            </>
          )}
        </span>
      </div>
      <p className="text-[0.8rem] leading-snug text-moss">A new rent applies the next time you bill. Charges already sent stay as they are.</p>
    </form>
  );
}
