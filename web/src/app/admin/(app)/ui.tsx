import { STATUS_LABEL, type Status } from "@/lib/labels";

/** Notion-style page: generous top space, big title, quiet properties. */
export function Page({ title, icon, actions, children, crumb }: { title: string; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; crumb?: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-5 pb-24 pt-8 sm:px-10 md:pt-14">
      {crumb && <div className="mb-6 text-sm text-ink/50">{crumb}</div>}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          {icon && <div className="mb-3 text-ink/70">{icon}</div>}
          <h1 className="text-[2.1rem] font-bold leading-tight tracking-[-0.02em]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  NEW: "bg-porch/25 text-[#6e4b0c]",
  CONTACTED: "bg-[#dfe7f0] text-[#2f4a66]",
  TOUR: "bg-[#ebe2f2] text-[#5a3d73]",
  APPROVED: "bg-[#dfeadb] text-[#2f5b2b]",
  MOVED_IN: "bg-pine text-paper",
  DECLINED: "bg-ink/[.07] text-ink/60",
};
export function StatusPill({ status }: { status: string }) {
  const s = status as Status;
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.78rem] font-medium ${STATUS_STYLE[s] ?? ""}`}>{STATUS_LABEL[s] ?? status}</span>;
}

export function ChargePill({ status, dueDate }: { status: string; dueDate: Date }) {
  const overdue = status === "DUE" && dueDate.getTime() < Date.now() - 86400000;
  const cls = status === "PAID" ? "bg-[#dfeadb] text-[#2f5b2b]" : status === "VOID" ? "bg-ink/[.07] text-ink/50 line-through" : overdue ? "bg-ember/15 text-ember" : "bg-porch/25 text-[#6e4b0c]";
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-[0.78rem] font-medium ${cls}`}>{status === "PAID" ? "Paid" : status === "VOID" ? "Void" : overdue ? "Overdue" : "Due"}</span>;
}

export function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3 py-1.5 text-[0.92rem]">
      <dt className="text-ink/50">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.88rem] font-medium transition-[background-color,transform] duration-150 active:scale-[0.97]";
export const btnPrimary = `${btn} bg-pine text-paper hover:bg-[#17301f]`;
export const btnQuiet = `${btn} text-ink/70 ring-1 ring-line hover:bg-ink/[.04] hover:text-ink`;
export const input = "h-9 w-full rounded-lg bg-white px-3 text-[0.92rem] ring-1 ring-line outline-none focus:ring-2 focus:ring-pine";
