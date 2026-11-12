import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Mail, MessageSquare, Phone } from "lucide-react";
import { admin, orNull } from "@/lib/api";
import type { BedView, Request, Resident, Room } from "@/lib/types";
import { longDate, shortDate, timeAgo } from "@/lib/format";
import { FOR_WHOM, MOVE_IN, PAYMENT, PROGRAMS } from "@/lib/labels";
import { Page, Card, CardHead, Prop, StatusPill, btnPrimary, btnQuiet, link } from "../../ui";
import { StatusSteps, Notes, MoveInForm, type BedOption } from "./client";

const digits = (p: string) => p.replace(/[^\d+]/g, "");

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, beds, rooms] = await Promise.all([
    orNull(admin.get<Request & { room: Room | null; resident: Resident | null }>(`/admin/requests/${encodeURIComponent(id)}`)),
    admin.get<BedView[]>("/admin/beds"),
    admin.get<Room[]>("/admin/rooms"),
  ]);
  if (!r) notFound();
  const roomOf = (slug: string) => rooms.find((x) => x.slug === slug)!;
  // a bed can be moved into only when nobody lives in it; beds someone is leaving are listed but locked
  const options: BedOption[] = beds
    .filter((b) => !b.residentName || b.state !== "taken")
    .map((b) => ({
      id: b.id,
      label: b.label,
      roomName: b.roomName,
      rent: roomOf(b.roomSlug).rentCents / 100,
      deposit: roomOf(b.roomSlug).depositCents / 100,
      blocked: b.residentName ? `${b.residentName} is still here${b.availableFrom ? ` until ${shortDate(b.availableFrom)}` : ""}. Move them out first.` : undefined,
    }));
  const free = options.filter((o) => !o.blocked);
  const preferred = free.find((o) => beds.find((b) => b.id === o.id)?.roomSlug === r.room?.slug) ?? free[0];
  const today = new Date().toISOString().slice(0, 10);
  const first = r.name.split(" ")[0];
  const open = !r.resident && r.status !== "DECLINED";

  return (
    <Page
      wide
      title={r.name}
      crumb={
        <>
          <Link href="/admin/requests" className="hover:text-ink">
            Requests
          </Link>
          <span aria-hidden>/</span>
          <span>{timeAgo(r.createdAt)}</span>
        </>
      }
      actions={<StatusPill status={r.status} />}
    >
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Reach them: first thing on a phone */}
        <Card className="p-4 lg:col-start-2 lg:row-start-1">
          <div className="grid grid-cols-3 gap-2">
            <a href={`tel:${digits(r.phone)}`} className={`${btnPrimary} !h-12 !px-2`}>
              <Phone size={16} /> Call
            </a>
            <a href={`sms:${digits(r.phone)}`} className={`${btnQuiet} !h-12 !px-2`}>
              <MessageSquare size={16} /> Text
            </a>
            {r.email ? (
              <a href={`mailto:${r.email}`} className={`${btnQuiet} !h-12 !px-2`}>
                <Mail size={16} /> Email
              </a>
            ) : (
              <span className={`${btnQuiet} !h-12 !px-2 cursor-not-allowed opacity-45`} aria-disabled>
                <Mail size={16} /> Email
              </span>
            )}
          </div>
          <p className="mono tabular mt-3 text-center text-[0.86rem] text-moss">
            {r.phone}
            {r.email ? ` · ${r.email}` : ""}
          </p>
        </Card>

        <div className="grid gap-5 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          {r.message && (
            <Card className="p-5 sm:p-6">
              <p className="eyebrow mb-3">In their words</p>
              <blockquote className="whitespace-pre-line border-l-2 border-porch pl-4 text-[1.08rem] leading-relaxed">{r.message}</blockquote>
            </Card>
          )}

          <Card>
            <CardHead title="The request" hint={`Received ${longDate(r.createdAt)}`} />
            <dl className="mt-2 divide-y divide-line px-5 pb-2 sm:px-6">
              <Prop label="Looking for">{PROGRAMS[r.program as keyof typeof PROGRAMS]?.long}</Prop>
              <Prop label="Request from">{FOR_WHOM[r.forWhom as keyof typeof FOR_WHOM]}</Prop>
              <Prop label="Room">
                {r.room ? (
                  <Link className={link} href={`/rooms/${r.room.slug}`} target="_blank">
                    {r.room.name}
                  </Link>
                ) : (
                  "No preference"
                )}
              </Prop>
              <Prop label="Move in">{MOVE_IN[r.moveIn as keyof typeof MOVE_IN]}</Prop>
              <Prop label="Pays with">{r.payment ? PAYMENT[r.payment as keyof typeof PAYMENT] : "Not said"}</Prop>
              {r.referrerName && (
                <Prop label="Referred by">
                  {r.referrerName}
                  {r.referrerOrg && <span className="text-moss">, {r.referrerOrg}</span>}
                  <span className="block text-[0.86rem] text-moss">{[r.referrerPhone, r.referrerEmail].filter(Boolean).join(" · ")}</span>
                </Prop>
              )}
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-3 text-[1.02rem] font-semibold tracking-[-0.02em]">Your notes</h2>
            <Notes id={r.id} initial={r.ownerNotes} />
          </Card>
        </div>

        {!r.resident && (
          <Card className="p-3 lg:col-start-2">
            <h2 className="px-3 pb-2 pt-2 text-[1.02rem] font-semibold tracking-[-0.02em]">Where it stands</h2>
            <StatusSteps id={r.id} status={r.status} />
          </Card>
        )}

        <Card className="lg:col-start-2">
          {r.resident ? (
            <div className="p-5 sm:p-6">
              <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">{first} lives here now</h2>
              <p className="mt-1 text-[0.92rem] text-moss">Moved in on {longDate(r.resident.moveInDate)}.</p>
              <Link href={`/admin/residents/${r.resident.id}`} className={`${btnPrimary} mt-4`}>
                Open resident <ArrowRight size={15} />
              </Link>
            </div>
          ) : !open ? (
            <p className="p-5 text-[0.92rem] text-moss sm:p-6">Marked as not a fit. Reopen the request above if that changes.</p>
          ) : !free.length ? (
            <div className="p-5 sm:p-6">
              <h2 className="text-[1.02rem] font-semibold tracking-[-0.02em]">No bed is free</h2>
              <p className="mt-1 text-[0.92rem] leading-snug text-moss">Keep {first} on the board. When someone moves out, their bed shows up here.</p>
            </div>
          ) : (
            <>
              <CardHead title={`Move ${first} in`} />
              <div className="p-5 pt-4 sm:p-6 sm:pt-4">
                <MoveInForm requestId={r.id} firstName={first} beds={options} preferredId={preferred?.id} today={today} hasEmail={!!r.email} />
              </div>
            </>
          )}
        </Card>
      </div>
    </Page>
  );
}
