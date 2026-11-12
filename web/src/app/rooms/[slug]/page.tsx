import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Check, Phone, MapPin } from "lucide-react";
import { getRoomsWithBeds } from "@/lib/availability";
import { money, parseList, longDate } from "@/lib/format";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { RoomImage } from "@/components/room-art";
import { WindowRow } from "@/components/house";
import { availabilityText } from "@/components/room-card";
import { Reveal } from "@/components/reveal";
import { getHouse } from "@/lib/content";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const rooms = await getRoomsWithBeds();
  return { room: rooms.find((r) => r.slug === slug), rooms };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { room } = await load((await params).slug);
  return { title: room?.name ?? "Room" };
}

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ room, rooms }, house] = await Promise.all([load((await params).slug), getHouse()]);
  if (!room) notFound();
  const photos = parseList(room.photos);
  const features = parseList(room.features);
  const others = rooms.filter((r) => r.id !== room.id).slice(0, 3);
  const canRequest = room.open > 0 || room.soon;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6">
        <Link href="/rooms" className="press mb-6 inline-flex items-center gap-2 rounded-full py-2 pr-3 text-[0.92rem] text-ink/65 hover:text-ink">
          <ArrowLeft size={16} /> All rooms
        </Link>

        <h1 className="display text-[clamp(2.6rem,6vw,4.8rem)]">{room.name}</h1>
        <p className="mt-3 text-ink/65">
          {room.kind === "PRIVATE" ? "Private room" : `Shared room · ${room.states.length} beds`} · {room.floor === "Ground" ? "Ground floor, no stairs" : "Upstairs"} ·{" "}
          {room.bathroom} bathroom
        </p>

        {/* Gallery: one large, two stacked */}
        <Reveal variant="clip" className="mt-8">
          <div className="grid h-[52vh] min-h-[320px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[28px]">
            <div className="col-span-4 row-span-2 bg-paper md:col-span-3">
              <RoomImage photos={photos} tone={room.tone} index={0} alt={`${room.name}, main view`} />
            </div>
            <div className="hidden bg-paper md:block">
              <RoomImage photos={photos} tone={room.tone} index={1} alt={`${room.name}, second view`} />
            </div>
            <div className="hidden bg-paper md:block">
              <RoomImage photos={photos} tone={room.tone} index={2} alt={`${room.name}, third view`} />
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-14 lg:grid-cols-[1fr_380px]">
          <div className="space-y-12">
            <section>
              <p className="max-w-2xl text-[1.2rem] leading-relaxed text-ink/80">{room.description}</p>
            </section>

            <section className="border-t border-line pt-10">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">In this room</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-paper ring-1 ring-line">
                      <Check size={15} className="text-pine" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-line pt-10">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">Beds</h2>
              <ul className="divide-y divide-line rounded-[22px] bg-paper ring-1 ring-line">
                {room.states.map((b) => (
                  <li key={b.label} className="flex items-center justify-between gap-4 px-6 py-4">
                    <span className="flex items-center gap-3">
                      <WindowRow states={[b.state]} size={11} />
                      <span className="font-medium">{b.label}</span>
                    </span>
                    <span className={`text-[0.92rem] ${b.state === "open" ? "font-semibold text-pine" : "text-ink/55"}`}>
                      {b.state === "open" ? "Open now" : b.state === "soon" ? `Opens ${longDate(b.availableFrom!)}` : "Taken"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-line pt-10">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">Every resident shares</h2>
              <p className="max-w-2xl text-ink/70">
                The kitchen, living room, laundry, porch and back garden. Rent also covers utilities, Wi‑Fi, rides to appointments and help connecting to services.
              </p>
            </section>

            <section className="border-t border-line pt-10">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">Where it is</h2>
              <p className="flex items-center gap-2 text-ink/80"><MapPin size={16} /> {house.town}</p>
              <ul className="mt-5 grid gap-3 text-[0.95rem] text-ink/70 sm:grid-cols-2">
                <li>About 15 minutes to the Richmond VA Medical Center</li>
                <li>Close to I-95 and Route 10</li>
                <li>Near grocery stores, pharmacies and bus service</li>
                <li>
                  Exact address shared when you{" "}
                  <Link href="/tour" className="font-medium text-ink underline underline-offset-4">
                    book a tour
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          {/* Booking card */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[28px] bg-paper p-7 shadow-[0_24px_60px_-28px_rgb(23_33_28/.35)] ring-1 ring-line">
              <p>
                <span className="display tabular text-4xl">{money(room.rentCents)}</span>
                <span className="text-ink/55"> / month{room.kind === "SHARED" ? " per bed" : ""}</span>
              </p>
              <p className="mt-1 text-[0.92rem] text-ink/60">{money(room.depositCents)} deposit, paid online at move-in</p>

              <div className="my-6 flex items-center gap-3 rounded-2xl bg-oat px-4 py-3">
                <WindowRow states={room.states.map((s) => s.state)} size={10} />
                <span className="text-[0.95rem] font-semibold">{availabilityText(room)}</span>
              </div>

              <Link href={canRequest ? `/apply?room=${room.slug}` : `/waitlist?room=${room.slug}`} className="btn btn-primary press !h-12 w-full">
                {canRequest ? "Request this room" : "Join the waitlist"}
              </Link>
              <Link href="/tour" className="btn btn-ghost press mt-2.5 !h-12 w-full">
                <CalendarDays size={15} /> Book a tour
              </Link>
              <a href={house.phoneHref} className="press mono mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[0.88rem] text-ink/65 hover:text-ink">
                <Phone size={14} /> {house.phone}
              </a>
              <p className="mt-4 text-center text-[0.85rem] text-ink/55">Requesting is free. We&apos;ll call you before anything is final.</p>
            </div>
          </aside>
        </div>

        <section className="mt-24 border-t border-line pt-14">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight">Other rooms</h2>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-3">
            {others.map((r) => (
              <Link key={r.id} href={`/rooms/${r.slug}`} className="group">
                <div className="aspect-[4/3] overflow-hidden rounded-[20px]">
                  <div className="h-full transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.035]">
                    <RoomImage photos={parseList(r.photos)} tone={r.tone} alt={r.name} />
                  </div>
                </div>
                <p className="mt-3 font-semibold">{r.name}</p>
                <p className="text-[0.92rem] text-ink/60">{availabilityText(r)} · {money(r.rentCents)}/mo</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      {/* phones: price and the request button stay in reach, like a checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[640px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="leading-tight">
              <span className="tabular font-semibold">{money(room.rentCents)}</span>
              <span className="text-[0.9rem] text-ink/55"> / mo</span>
            </p>
            <p className="truncate text-[0.82rem] text-ink/60">{availabilityText(room)}</p>
          </div>
          <Link href={canRequest ? `/apply?room=${room.slug}` : `/waitlist?room=${room.slug}`} className="btn btn-primary press !h-12 shrink-0 px-6">
            {canRequest ? "Request" : "Join waitlist"}
          </Link>
        </div>
      </div>
      <SiteFooter />
      <div className="h-20 bg-night lg:hidden" aria-hidden />
    </>
  );
}
