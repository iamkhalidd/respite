import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getBeds, getRoomsWithBeds } from "@/lib/availability";
import { HouseScene } from "@/components/house-scene";
import { ExpandImage } from "@/components/expand-image";
import { SearchBar } from "@/components/search-bar";
import { ScrollWords } from "@/components/scroll-words";
import { WhoScroll } from "@/components/who-scroll";
import { MoveInSteps } from "@/components/move-in-steps";
import { Faq } from "@/components/faq";
import { Reveal } from "@/components/reveal";
import { RoomCard } from "@/components/room-card";
import { SiteHeader, SiteFooter, Roll } from "@/components/site-chrome";
import { shortDate } from "@/lib/format";
import { getContent } from "@/lib/content";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const count = (n: number, one: string, many: string) => `${WORDS[n] ?? n} ${n === 1 ? one : many}.`;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [beds, rooms, content] = await Promise.all([getBeds(), getRoomsWithBeds(), getContent()]);
  const { home, who, faq, house } = content;
  const photo = home.photos;
  const open = beds.filter((b) => b.state === "open").length;

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {/* ───────── Hero: the house at night; windows light up for open beds ───────── */}
        <section data-night className="-mt-16">
          <HouseScene states={beds.map((b) => b.state)}>
            {/* top padding = the 64px header the hero sits under, plus Spacing-600 (mobile) / Spacing-800 (desktop) */}
            <div className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6 md:pt-36">
              {/* proof signal: the live bed count */}
              <p className="mono caption-4 rise flex items-center gap-2 text-white/60">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-porch opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-porch" />
                </span>
                {open} of {beds.length} beds open tonight
              </p>
              {/* Heading 1 from sm up; Heading 2 on phones so "The porch light" stays on one line */}
              <h1 className="heading-2 sm:heading-1 mt-6 max-w-[680px]">
                <span className="hero-gradient rise block [animation-delay:80ms]">{home.heroLine1}</span>
                {home.heroLine2 && <span className="hero-gradient rise block [animation-delay:160ms]">{home.heroLine2}</span>}
              </h1>
              <p className="body-7 rise mt-6 max-w-[680px] text-white/60 [animation-delay:240ms]">
                {home.heroText}
              </p>
              <div className="rise mt-8 hidden [animation-delay:320ms] sm:block">
                <SearchBar />
              </div>
              <Link
                href="/rooms"
                className="press rise mt-8 flex h-14 items-center gap-3 rounded-full bg-white pl-4 pr-2 text-ink [animation-delay:320ms] sm:hidden"
              >
                <Search size={18} />
                <span className="flex-1">
                  <span className="title-3 block">Find a bed</span>
                  <span className="caption-5 block text-ink/50">Who it&apos;s for · Room · Move in</span>
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-porch">
                  <ArrowRight size={17} />
                </span>
              </Link>
            </div>
          </HouseScene>
        </section>

        {/* ───────── Statement: reads itself as you scroll ───────── */}
        <section className="mx-auto grid max-w-[1280px] gap-8 px-4 py-28 sm:px-6 md:grid-cols-12 md:py-44">
          <p className="eyebrow md:col-span-3 md:pt-4">The house</p>
          <ScrollWords
            className="display-2 text-[clamp(1.9rem,4.3vw,3.9rem)] font-medium md:col-span-9"
            text={home.statement}
          />
        </section>

        <ExpandImage src={photo.kitchen.src} alt={photo.kitchen.alt} caption={photo.kitchen.caption} />

        {/* ───────── Tonight: every bed, live ───────── */}
        <section className="mx-auto max-w-[1280px] px-4 py-28 sm:px-6 md:py-40">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 className="display-2 text-[clamp(2.2rem,4.6vw,4rem)]">
              Tonight, <span className="text-moss">bed by bed.</span>
            </h2>
            <Link href="/rooms" className="btn btn-ghost press">
              <Roll>See every room</Roll> <ArrowRight size={16} />
            </Link>
          </Reveal>
          <Reveal>
            <ul className="hairline grid-cols-2 overflow-hidden rounded-2xl md:grid-cols-3 lg:grid-cols-6">
              {beds.map((b) => (
                <li key={b.id}>
                  <Link href={`/rooms/${b.roomSlug}`} className="group flex h-full min-h-[200px] flex-col justify-between p-5 transition-colors hover:bg-oat">
                    <span className="flex items-start justify-between">
                      <span className="mono text-[0.78rem] text-moss">{b.label}</span>
                      <span
                        className="h-7 w-5 rounded-[3px]"
                        style={{
                          background: b.state === "open" ? "linear-gradient(var(--porch-glow), var(--porch))" : b.state === "soon" ? "rgb(240 165 58 / .3)" : "var(--ink)",
                          boxShadow: b.state === "open" ? "0 0 18px 2px rgb(240 165 58 / .55)" : "none",
                        }}
                        aria-hidden
                      />
                    </span>
                    <span>
                      <span className="block text-[1.05rem] font-medium tracking-[-0.02em]">{b.roomName}</span>
                      <span className={`mono mt-1 block text-[0.78rem] ${b.state === "open" ? "text-ink" : "text-moss"}`}>
                        {b.state === "open" ? "Open now" : b.state === "soon" ? `Opens ${shortDate(b.availableFrom!)}` : "Taken"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <WhoScroll chapters={who.chapters} />

        {/* ───────── What's included ───────── */}
        <section id="included" className="mx-auto max-w-[1280px] px-4 py-28 sm:px-6 md:py-40">
          <Reveal className="grid gap-8 md:grid-cols-12">
            <p className="eyebrow md:col-span-3 md:pt-3">Included with rent</p>
            <div className="md:col-span-9">
              <h2 className="display-2 text-[clamp(2.4rem,5.4vw,4.8rem)]">{home.includedTitle}</h2>
              <p className="mt-6 max-w-xl text-[1.1rem] text-moss">{home.includedText}</p>
            </div>
          </Reveal>
          {/* two pictures of the everyday: the drive in, the porch at the end of the day */}
          <div className="mt-16 grid gap-4 md:grid-cols-12">
            <Reveal className="md:col-span-8">
              <figure>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-oat">
                  <img src={photo.road.src} alt={photo.road.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] hover:scale-[1.03]" />
                </div>
                <figcaption className="mono mt-3 flex justify-between text-[0.72rem] text-moss">
                  <span>{photo.road.caption}</span>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={90} className="md:col-span-4">
              <figure className="h-full">
                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-oat md:aspect-auto md:h-[calc(100%-1.9rem)]">
                  <img src={photo.porch.src} alt={photo.porch.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] hover:scale-[1.03]" />
                </div>
                <figcaption className="mono mt-3 flex justify-between text-[0.72rem] text-moss">
                  <span>{photo.porch.caption}</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
          <div className="hairline mt-16 overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-3">
            {home.included.map(({ label: k, title: t, body: b }, i) => (
              <Reveal key={`${i}-${t}`} delay={(i % 3) * 80} className="h-full">
                <article className="group relative flex h-full min-h-[260px] flex-col justify-between p-7 sm:p-8">
                  <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-porch transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-x-100" />
                  <p className="mono text-[0.78rem] text-moss">{k}</p>
                  <div>
                    <h3 className="text-[1.45rem] font-medium tracking-[-0.035em]">{t}</h3>
                    <p className="mt-2 text-moss">{b}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ───────── Rooms ───────── */}
        <section className="border-t border-line bg-oat">
          <div className="mx-auto max-w-[1280px] px-4 py-28 sm:px-6 md:py-40">
            <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6">
              <h2 className="display-2 text-[clamp(2.4rem,5.4vw,4.8rem)]">
                {count(rooms.length, "room", "rooms")}
                <br />
                <span className="text-moss">{count(beds.length, "bed", "beds")}</span>
              </h2>
              <Link href="/rooms" className="btn btn-primary press">
                <Roll>Compare rooms</Roll> <ArrowRight size={16} />
              </Link>
            </Reveal>
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {rooms.map((r, i) => (
                <Reveal key={r.id} delay={i * 70}>
                  <RoomCard room={r} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Moving in: a real sequence ───────── */}
        <section aria-label="Moving in">
          <MoveInSteps />
        </section>

        {/* ───────── For professionals ───────── */}
        <section id="referrals" className="bg-night text-white">
          <div className="mx-auto grid max-w-[1280px] gap-12 px-4 py-28 sm:px-6 md:grid-cols-12 md:py-40">
            <p className="eyebrow !text-white/40 md:col-span-3 md:pt-3">Case managers & discharge planners</p>
            <div className="md:col-span-9 lg:col-span-5">
              <Reveal>
                <h2 className="display-2 text-[clamp(2.4rem,5.4vw,4.8rem)]">
                  {home.referralsLine1}
                  {home.referralsLine2 && (
                    <>
                      <br />
                      <span className="text-white/40">{home.referralsLine2}</span>
                    </>
                  )}
                </h2>
              </Reveal>
              <p className="mt-8 max-w-lg text-[1.1rem] text-white/60">
                {home.referralsText}
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/apply?for=PROFESSIONAL" className="btn btn-porch press !h-12 !px-6">
                  <Roll>Refer a client</Roll> <ArrowRight size={16} />
                </Link>
                <a href={house.phoneHref} className="btn press mono !h-12 !px-6 text-white ring-1 ring-white/20 hover:bg-white/10">
                  <Roll>{house.phone}</Roll>
                </a>
              </div>
            </div>
            <Reveal className="hidden lg:col-span-4 lg:block">
              <figure className="relative h-full min-h-[420px] overflow-hidden rounded-2xl">
                <img src={photo.referral.src} alt={photo.referral.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ───────── FAQ ───────── */}
        <section id="faq" className="mx-auto grid max-w-[1280px] gap-10 px-4 py-28 sm:px-6 md:grid-cols-12 md:py-40">
          <div className="md:col-span-4">
            <p className="eyebrow mb-6">Questions</p>
            <h2 className="display-2 text-[clamp(2.4rem,5vw,4.4rem)]">Good to know.</h2>
          </div>
          <div className="md:col-span-8">
            <Faq items={faq.items.map((f) => [f.q, f.a] as [string, string])} />
          </div>
        </section>

        {/* ───────── Closing ask: same action as the header, with the visit as the safety net ───────── */}
        <section className="border-t border-line bg-oat">
          <Reveal className="mx-auto grid max-w-[1280px] gap-10 px-4 py-24 sm:px-6 md:grid-cols-12 md:py-32">
            <p className="eyebrow md:col-span-3 md:pt-3">
              {open} of {beds.length} beds open
            </p>
            <div className="md:col-span-9">
              <h2 className="display-2 text-[clamp(2.4rem,5.4vw,4.8rem)]">
                {home.closingLine1}
                {home.closingLine2 && (
                  <>
                    <br />
                    <span className="text-moss">{home.closingLine2}</span>
                  </>
                )}
              </h2>
              <p className="mt-6 max-w-xl text-[1.1rem] text-moss" style={{ textWrap: "pretty" }}>
                {home.closingText}
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href={open ? "/apply" : "/waitlist"} className="btn btn-primary press !h-12 !px-6">
                  <Roll>{open ? "Request a room" : "Join the waitlist"}</Roll> <ArrowRight size={16} />
                </Link>
                <Link href="/tour" className="btn btn-ghost press !h-12 !px-6">
                  <Roll>Book a tour</Roll>
                </Link>
                <a href={house.phoneHref} className="btn btn-ghost press mono !h-12 !px-6">
                  <Roll>{house.phone}</Roll>
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
