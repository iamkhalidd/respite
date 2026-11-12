import { Phone, Mail } from "lucide-react";
import { admin } from "@/lib/api";
import type { Tour, WaitlistEntry } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { PROGRAMS, type Program } from "@/lib/labels";
import { setWaitlistStatus } from "../../actions";
import { Page, Card, Empty, btnQuiet } from "../ui";
import { SubmitButton } from "../submit";
import { ConfirmAction } from "../confirm";
import { InboxTabs } from "../inbox-tabs";

export const dynamic = "force-dynamic";

const small = `${btnQuiet} !h-9 !px-3 !text-[0.85rem]`;

export default async function Waitlist() {
  const [all, tours] = await Promise.all([admin.get<WaitlistEntry[]>("/admin/waitlist"), admin.get<Tour[]>("/admin/tours?when=upcoming")]);
  const waiting = all.filter((w) => w.status === "WAITING");
  const told = all.filter((w) => w.status === "NOTIFIED");

  const item = (w: WaitlistEntry) => (
    <li key={w.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 font-medium leading-snug">
          {w.name}
          <span className="mono text-[0.72rem] font-normal uppercase text-moss">joined {timeAgo(w.createdAt)}</span>
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.86rem] text-moss">
          <a href={`mailto:${w.email}`} className="inline-flex min-w-0 items-center gap-1.5 truncate hover:text-ink">
            <Mail size={13} /> {w.email}
          </a>
          {w.phone && (
            <a href={`tel:${w.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
              <Phone size={13} /> {w.phone}
            </a>
          )}
          <span>{w.roomName ?? "Any room"}</span>
          {w.program && <span>{PROGRAMS[w.program as Program]?.long ?? w.program}</span>}
        </p>
        {w.status === "NOTIFIED" && w.notifiedAt && <p className="mt-2 text-[0.84rem] text-moss">Emailed about an open bed {timeAgo(w.notifiedAt)}.</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {w.status === "NOTIFIED" && (
          <form action={setWaitlistStatus.bind(null, w.id, "WAITING")}>
            <SubmitButton className={small}>Put back on the list</SubmitButton>
          </form>
        )}
        <ConfirmAction
          action={setWaitlistStatus.bind(null, w.id, "REMOVED")}
          label="Remove"
          className={small}
          title={`Take ${w.name.split(" ")[0]} off the waitlist?`}
          body="They won't hear about open beds any more. They can always join again from the site."
          confirmLabel="Remove"
          danger
        />
      </div>
    </li>
  );

  return (
    <Page wide title="Waitlist" eyebrow={`${waiting.length} waiting · ${told.length} told about a bed`}>
      <InboxTabs on="waitlist" counts={{ tours: tours.length, waitlist: waiting.length }} />
      <div className="space-y-6">
        <section>
          <h2 className="mb-1 text-[0.95rem] font-semibold">Waiting</h2>
          <p className="mb-3 text-[0.88rem] text-moss">When a bed opens in a room they picked, or any room for those who said any, they get an email with a link to request it. First to join is first on the list.</p>
          <Card>{waiting.length ? <ul className="divide-y divide-line">{waiting.map(item)}</ul> : <Empty>No one is waiting. When every bed is full, the site offers the waitlist instead of the request form.</Empty>}</Card>
        </section>
        {told.length > 0 && (
          <section>
            <h2 className="mb-1 text-[0.95rem] font-semibold">Told about a bed</h2>
            <p className="mb-3 text-[0.88rem] text-moss">They got one email. Put someone back on the list if the bed went to someone else and they still want to hear.</p>
            <Card>
              <ul className="divide-y divide-line">{told.map(item)}</ul>
            </Card>
          </section>
        )}
      </div>
    </Page>
  );
}
