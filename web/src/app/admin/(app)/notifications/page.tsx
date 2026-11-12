import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { admin } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Notification, NotificationStatus } from "@/lib/types";
import { markAllRead, openNotification, retryEmail } from "../../actions";
import { Page, Card, Empty, Notice, btnQuiet } from "../ui";
import { SubmitButton } from "../submit";
import { TestEmailButton } from "./test-email";

const TABS = [
  ["inbox", "Inbox"],
  ["email", "Email"],
] as const;
const FILTERS = [
  ["all", "All"],
  ["PENDING", "Waiting"],
  ["SENT", "Sent"],
  ["FAILED", "Failed"],
] as const;

type Outbox = { items: Notification[]; counts: Record<NotificationStatus, number>; kinds: Record<string, string> };

export default async function Notifications({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "email" ? "email" : "inbox";
  const status = FILTERS.some(([k]) => k === sp.status) ? (sp.status as string) : "all";

  return (
    <Page title="Notifications" eyebrow="What happened while you were away" actions={<TestEmailButton />}>
      <nav aria-label="Notification type" className="mb-5 flex w-fit rounded-full bg-ink/[.06] p-1 text-[0.88rem]">
        {TABS.map(([k, label]) => (
          <Link
            key={k}
            href={k === "inbox" ? "/admin/notifications" : "/admin/notifications?tab=email"}
            aria-current={tab === k ? "true" : undefined}
            className={`grid h-9 place-items-center rounded-full px-4 transition-colors ${tab === k ? "bg-paper font-medium shadow-[0_1px_2px_rgb(15_17_16/.15)]" : "text-moss hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "inbox" ? <InboxList /> : <EmailList status={status} />}
    </Page>
  );
}

/** A small window: lit while unread, dark once seen. Same motif as the beds in the sidebar. */
function Lamp({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-[5px] h-[13px] w-[10px] shrink-0 rounded-[2px]"
      style={{
        background: on ? "linear-gradient(#ffe3a6, #f0a53a)" : "rgb(15 17 16 / .1)",
        boxShadow: on ? "0 0 9px 1px rgb(240 165 58 / .45)" : "none",
      }}
    />
  );
}

async function InboxList() {
  const { items, unread } = await admin.get<{ items: Notification[]; unread: number }>("/admin/notifications");
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
        <p className="text-[0.9rem] text-moss">{unread ? `${unread} new` : "You're all caught up."}</p>
        {unread > 0 && (
          <form action={markAllRead}>
            <SubmitButton className={`${btnQuiet} h-9 sm:h-9`}>Mark all read</SubmitButton>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <Empty>Nothing yet. New requests, payments and anything that needs you will show up here.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((n) => {
            const isNew = !n.readAt;
            return (
              <li key={n.id}>
                <form action={openNotification.bind(null, n.id, n.link)}>
                  <button className="group flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-ink/[.025] sm:px-6">
                    <Lamp on={isNew} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`text-[0.97rem] leading-snug ${isNew ? "font-semibold" : "text-ink/80"}`}>{n.subject}</span>
                        <span className="mono shrink-0 text-[0.74rem] text-moss">{timeAgo(n.createdAt)}</span>
                      </span>
                      {n.body && <span className="mt-1 line-clamp-2 whitespace-pre-line text-[0.88rem] leading-snug text-moss">{n.body}</span>}
                    </span>
                    {n.link && <ArrowRight size={16} className="mt-1 shrink-0 text-ink/25 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink/60" />}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const PILL: Record<NotificationStatus, [string, string]> = {
  PENDING: ["Waiting", "bg-porch-glow text-ink"],
  SENT: ["Sent", "bg-ink/[.06] text-ink"],
  FAILED: ["Failed", "bg-ember text-white"],
};

async function EmailList({ status }: { status: string }) {
  const { items, counts, kinds } = await admin.get<Outbox>(`/admin/outbox?status=${status}`);
  const total = counts.PENDING + counts.SENT + counts.FAILED;
  return (
    <>
      {counts.FAILED > 0 && status !== "FAILED" && (
        <Notice tone="warn">
          {counts.FAILED === 1 ? "One email" : `${counts.FAILED} emails`} couldn&apos;t be sent after several tries.{" "}
          <Link href="/admin/notifications?tab=email&status=FAILED" className="font-medium underline underline-offset-4">
            See which
          </Link>
          , then check the email setup and send {counts.FAILED === 1 ? "it" : "them"} again.
        </Notice>
      )}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
          <nav aria-label="Filter emails" className="flex flex-wrap gap-1 text-[0.86rem]">
            {FILTERS.map(([k, label]) => {
              const n = k === "all" ? total : counts[k];
              const on = status === k;
              return (
                <Link
                  key={k}
                  href={`/admin/notifications?tab=email${k === "all" ? "" : `&status=${k}`}`}
                  aria-current={on ? "true" : undefined}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 transition-colors sm:h-8 ${on ? "bg-ink text-white" : "text-moss hover:bg-ink/[.05] hover:text-ink"}`}
                >
                  {label}
                  <span className={`mono tabular text-[0.72rem] ${on ? "text-white/60" : k === "FAILED" && n ? "text-ember" : "text-ink/40"}`}>{n}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        {items.length === 0 ? (
          <Empty>{status === "FAILED" ? "No failed emails." : status === "PENDING" ? "Nothing waiting to send." : "No emails yet."}</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const [label, tone] = PILL[n.status];
              return (
                <li key={n.id} className="flex flex-col gap-2.5 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
                  <span className={`mono inline-flex h-6 w-fit shrink-0 items-center rounded-full px-2.5 text-[0.72rem] font-medium uppercase sm:mt-px sm:w-[5.5rem] sm:justify-center ${tone}`}>{label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.95rem] font-medium leading-snug">{n.subject}</p>
                    <p className="mt-0.5 truncate text-[0.84rem] text-moss">
                      To {n.recipient} · {kinds[n.kind] ?? n.kind}
                    </p>
                    {n.lastError && n.status !== "SENT" && (
                      <p className="mono mt-1.5 break-words text-[0.76rem] leading-snug text-ember">
                        Try {n.attempts}: {n.lastError}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                    <span className="mono text-[0.74rem] text-moss">{timeAgo(n.sentAt ?? n.createdAt)}</span>
                    {n.status === "FAILED" && (
                      <form action={retryEmail.bind(null, n.id)}>
                        <SubmitButton className={`${btnQuiet} h-8 px-3 text-[0.84rem] sm:h-8`} done="Queued">
                          <RotateCw size={13} /> Send again
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
