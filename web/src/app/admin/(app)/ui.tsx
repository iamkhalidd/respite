import { Check } from "lucide-react";
import { STATUS_LABEL, type Status } from "@/lib/labels";

/**
 * Dashboard kit. Same system as the public site: ink on oat, white surfaces,
 * mono for facts, and amber only where a light is on (something new, open or owed).
 */
export function Page({ title, eyebrow, actions, children, crumb, wide = false }: { title: string; eyebrow?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; crumb?: React.ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto w-full ${wide ? "max-w-[1240px]" : "max-w-[1080px]"} px-4 pb-16 pt-6 sm:px-8 md:pt-12`}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:mb-10">
        <div className="min-w-0">
          {(crumb || eyebrow) && <p className="eyebrow mb-2.5 flex items-center gap-2">{crumb ?? eyebrow}</p>}
          <h1 className="display-2 text-[clamp(1.9rem,4.4vw,2.9rem)]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </main>
  );
}

/** White surface. Everything that can be read or tapped sits on one. */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-paper ring-1 ring-line ${className}`}>{children}</section>;
}

export function CardHead({ title, hint, action }: { title: string; hint?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
      <div>
        <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">{title}</h2>
        {hint && <p className="mt-1 text-[0.88rem] leading-snug text-moss">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-9 text-center text-[0.92rem] text-moss sm:px-6">{children}</p>;
}

/* A request moves through four steps; the pips show how far along it is. */
const STEP: Partial<Record<Status, number>> = { NEW: 1, CONTACTED: 2, TOUR: 3, APPROVED: 4 };
export function StatusPill({ status }: { status: string }) {
  const s = status as Status;
  const n = STEP[s];
  const label = STATUS_LABEL[s] ?? status;
  if (s === "MOVED_IN")
    return (
      <span className="mono inline-flex h-6 items-center gap-1.5 rounded-full bg-ink px-2.5 text-[0.72rem] font-medium uppercase text-white">
        <Check size={11} strokeWidth={3} /> {label}
      </span>
    );
  if (s === "DECLINED") return <span className="mono inline-flex h-6 items-center rounded-full bg-ink/[.06] px-2.5 text-[0.72rem] font-medium uppercase text-moss">{label}</span>;
  return (
    <span className={`mono inline-flex h-6 items-center gap-2 whitespace-nowrap rounded-full px-2.5 text-[0.72rem] font-medium uppercase ${s === "NEW" ? "bg-porch-glow text-ink" : "bg-ink/[.06] text-ink"}`}>
      <span className="flex gap-[3px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-[7px] w-[5px] rounded-[1px] ${n && i <= n ? (s === "NEW" ? "bg-ink" : "bg-ink") : "bg-ink/15"}`} />
        ))}
      </span>
      {label}
    </span>
  );
}

export const isOverdue = (c: { status: string; dueDate: Date }) => c.status === "DUE" && c.dueDate.getTime() < Date.now() - 86400000;

export function ChargePill({ status, dueDate }: { status: string; dueDate: Date }) {
  const overdue = isOverdue({ status, dueDate });
  const base = "mono inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[0.72rem] font-medium uppercase";
  if (status === "PAID")
    return (
      <span className={`${base} bg-ink/[.06] text-ink`}>
        <Check size={11} strokeWidth={3} /> Paid
      </span>
    );
  if (status === "VOID") return <span className={`${base} bg-ink/[.06] text-moss line-through`}>Void</span>;
  if (overdue) return <span className={`${base} bg-ember text-white`}>Overdue</span>;
  return <span className={`${base} bg-porch-glow text-ink`}>Due</span>;
}

export function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 py-3 text-[0.95rem] sm:grid-cols-[9.5rem_1fr]">
      <dt className="text-[0.88rem] text-moss">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Banner for "that worked" and "that didn't". */
export function Notice({ tone = "ok", children }: { tone?: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <div role="status" className={`mb-6 flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[0.93rem] leading-snug ${tone === "ok" ? "bg-ink text-white" : "bg-ember/10 text-ember ring-1 ring-ember/25"}`}>
      {tone === "ok" && (
        <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-porch text-ink">
          <Check size={12} strokeWidth={3.5} />
        </span>
      )}
      <p className="min-w-0">{children}</p>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[0.86rem] font-medium text-ink/75">{children}</span>;
}

export const btn =
  "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.9rem] font-medium transition-[background-color,transform,box-shadow] duration-150 ease-[var(--ease-out)] active:scale-[0.97] sm:h-10";
export const btnPrimary = `${btn} bg-ink text-white hover:bg-[#2a2d2b]`;
export const btnQuiet = `${btn} bg-paper text-ink ring-1 ring-line-strong hover:bg-ink/[.04]`;
export const btnDanger = `${btn} bg-ember text-white hover:bg-[#a83e23]`;
export const input =
  "h-11 w-full rounded-xl bg-paper px-3.5 text-[1rem] ring-1 ring-line-strong outline-none transition-shadow placeholder:text-ink/35 focus:ring-2 focus:ring-ink sm:text-[0.95rem]";
export const link = "font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink";
/** A native select dressed like the inputs, with a quiet chevron. */
export const select = `${input} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236d716e%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-9`;
