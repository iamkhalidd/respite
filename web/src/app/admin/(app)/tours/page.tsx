import Link from "next/link";
import { Phone, Mail, BellRing } from "lucide-react";
import { admin } from "@/lib/api";
import type { Tour, TourSettings, WaitlistEntry } from "@/lib/types";
import { clock, longDay } from "@/lib/when";
import { PROGRAMS, type Program } from "@/lib/labels";
import { setTourStatus } from "../../actions";
import { Page, Card, Empty, Notice, btnQuiet } from "../ui";
import { SubmitButton } from "../submit";
import { ConfirmAction } from "../confirm";
import { InboxTabs } from "../inbox-tabs";
import { CallerForm, ScheduleEditor } from "./client";

export const dynamic = "force-dynamic";

const small = `${btnQuiet} !h-9 !px-3 !text-[0.85rem]`;
const PAST_LABEL: Record<Tour["status"], string> = { BOOKED: "Not marked", DONE: "Came", NO_SHOW: "No show", CANCELLED: "Cancelled" };

function Who({ t }: { t: Tour }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-medium leading-snug">
        {t.name}
        {t.bookedBy === "HOUSE" && <span className="mono ml-2 text-[0.7rem] uppercase text-moss">booked by phone</span>}
      </p>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.86rem] text-moss">
        <a href={`tel:${t.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-ink">
          <Phone size={13} /> {t.phone}
        </a>
        {t.email && (
          <a href={`mailto:${t.email}`} className="inline-flex min-w-0 items-center gap-1.5 truncate hover:text-ink">
            <Mail size={13} /> {t.email}
          </a>
        )}
        {t.program && <span>{PROGRAMS[t.program as Program]?.long ?? t.program}</span>}
      </p>
      {t.note && <p className="mt-2 rounded-lg bg-ink/[.04] px-3 py-2 text-[0.88rem]">{t.note}</p>}
    </div>
  );
}

export default async function Tours({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const past = view === "past";
  const [settings, upcoming, list, waiting] = await Promise.all([
    admin.get<TourSettings>("/admin/tours/settings"),
    admin.get<Tour[]>("/admin/tours?when=upcoming"),
    past ? admin.get<Tour[]>("/admin/tours?when=past") : Promise.resolve(null),
    admin.get<WaitlistEntry[]>("/admin/waitlist"),
  ]);
  const days = [...new Set(upcoming.map((t) => t.date))];

  return (
    <Page
      wide
      title="Tours"
      eyebrow={`${upcoming.length} coming up`}
      actions={
        <div className="flex rounded-full bg-ink/[.06] p-1 text-[0.88rem]">
          {[
            ["upcoming", "Coming up", "/admin/tours"],
            ["past", "Past", "/admin/tours?view=past"],
          ].map(([v, l, href]) => (
            <Link
              key={v}
              href={href}
              className={`grid h-9 place-items-center rounded-full px-4 transition-colors ${(past ? "past" : "upcoming") === v ? "bg-paper font-medium shadow-[0_1px_2px_rgb(15_17_16/.15)]" : "text-moss hover:text-ink"}`}
            >
              {l}
            </Link>
          ))}
        </div>
      }
    >
      <InboxTabs on="tours" counts={{ tours: upcoming.length, waitlist: waiting.filter((w) => w.status === "WAITING").length }} />
      {!settings.enabled && (
        <Notice tone="warn">Online booking is off, so the tour page asks people to call. Add your weekly times and switch it on under Weekly schedule.</Notice>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {past ? (
            <Card>
              {list && list.length ? (
                <ul className="divide-y divide-line">
                  {list.map((t) => (
                    <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
                      <div className="w-40 shrink-0">
                        <p className="text-[0.9rem] font-medium">{longDay(t.date)}</p>
                        <p className="mono text-[0.8rem] text-moss">{clock(t.time)}</p>
                      </div>
                      <Who t={t} />
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className={`mono rounded-md px-2 py-1 text-[0.72rem] uppercase ${t.status === "DONE" ? "bg-ink text-white" : "bg-ink/[.06] text-moss"}`}>
                          {PAST_LABEL[t.status]}
                          {t.status === "CANCELLED" && t.cancelledBy && ` by ${t.cancelledBy === "HOUSE" ? "you" : "them"}`}
                        </span>
                        {t.status !== "CANCELLED" && t.status !== "DONE" && (
                          <form action={setTourStatus.bind(null, t.id, "DONE")}>
                            <SubmitButton className={small}>Came</SubmitButton>
                          </form>
                        )}
                        {t.status !== "CANCELLED" && t.status !== "NO_SHOW" && (
                          <form action={setTourStatus.bind(null, t.id, "NO_SHOW")}>
                            <SubmitButton className={small}>No show</SubmitButton>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No past tours yet.</Empty>
              )}
            </Card>
          ) : days.length ? (
            days.map((d) => (
              <section key={d}>
                <h2 className="mb-2.5 text-[0.95rem] font-semibold">{longDay(d)}</h2>
                <Card>
                  <ul className="divide-y divide-line">
                    {upcoming
                      .filter((t) => t.date === d)
                      .map((t) => (
                        <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6">
                          <p className="mono tabular w-20 shrink-0 pt-0.5 text-[0.95rem] font-medium">{clock(t.time)}</p>
                          <Who t={t} />
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {t.reminderSentAt && (
                              <span title="Reminder sent" className="inline-flex items-center gap-1 text-[0.78rem] text-moss">
                                <BellRing size={13} /> Reminded
                              </span>
                            )}
                            <form action={setTourStatus.bind(null, t.id, "DONE")}>
                              <SubmitButton className={small}>Came</SubmitButton>
                            </form>
                            <form action={setTourStatus.bind(null, t.id, "NO_SHOW")}>
                              <SubmitButton className={small}>No show</SubmitButton>
                            </form>
                            <ConfirmAction
                              action={setTourStatus.bind(null, t.id, "CANCELLED")}
                              label="Cancel"
                              className={small}
                              title={`Cancel ${t.name.split(" ")[0]}'s tour?`}
                              body={t.email ? `We'll email ${t.email} to say it's cancelled and how to pick another time.` : "They didn't leave an email, so give them a call to let them know."}
                              confirmLabel="Cancel the tour"
                              danger
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                </Card>
              </section>
            ))
          ) : (
            <Card>
              <Empty>No tours coming up. When someone books on the site, it shows up here and in your email.</Empty>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <CallerForm />
          <ScheduleEditor initial={settings} />
        </div>
      </div>
    </Page>
  );
}
