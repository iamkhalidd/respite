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
import { PHONE, PHONE_HREF } from "@/lib/labels";

export const dynamic = "force-dynamic";

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

export default async function HomePage() {
  const [beds, rooms] = await Promise.all([getBeds(), getRoomsWithBeds()]);
  const open = beds.filter((b) => b.state === "open").length;

  return (
    <>
      <SiteHeader />
      <main>
        {/* ───────── Hero: the house at night; windows light up for open beds ───────── */}
        <section data-night className="-mt-16">
          <HouseScene states={beds.map((b) => b.state)}>
            <div className="mx-auto max-w-[1280px] px-4 pt-28 sm:px-6 md:pt-36">
              <p className="mono rise flex items-center gap-2.5 text-[0.8rem] text-white/60">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-porch opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-porch" />
                </span>
                {open} of {beds.length} beds open · Chester, VA
              </p>
              <h1 className="display mt-6 text-[clamp(3.5rem,10.6vw,9.6rem)]">
                <span className="rise block [animation-delay:80ms]">The porch light</span>
                <span className="rise block text-porch [animation-delay:180ms]">is on.</span>
              </h1>
              <p className="rise mt-7 max-w-[30rem] text-[1.1rem] leading-[1.5] text-white/60 [animation-delay:300ms] md:text-[1.2rem]">
                A shared home for veterans, people in recovery and independent seniors. {NUMBER_WORDS[open]}{" "}
                {open === 1 ? "bed is" : "beds are"} open right now.
              </p>
              <div className="rise mt-6 hidden [animation-delay:400ms] sm:block">
                <SearchBar />
              </div>
              <Link
                href="/rooms"
                className="press rise mt-5 flex h-14 items-center gap-3 rounded-full bg-white pl-5 pr-2 text-ink [animation-delay:400ms] sm:hidden"
              >
                <Search size={18} />
                <span className="flex-1">
                  <span className="block text-[0.95rem] font-medium leading-tight">Find a bed</span>
                  <span className="block text-[0.78rem] leading-tight text-ink/50">Who it&apos;s for · Room · Move in</span>
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
            text="Six beds in a quiet house in Chester, Virginia. Rides to the VA, help with the paperwork, a house that stays sober, and people around the kitchen table when you want them."
          />
        </section>

        <ExpandImage src="/images/kitchen.webp" alt="Morning coffee on the kitchen table" caption="The kitchen table, 7:40 a.m." />

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

        <WhoScroll />

        {/* ───────── What's included ───────── */}
        <section id="included" className="mx-auto max-w-[1280px] px-4 py-28 sm:px-6 md:py-40">
          <Reveal className="grid gap-8 md:grid-cols-12">
            <p className="eyebrow md:col-span-3 md:pt-3">Included with rent</p>
            <div className="md:col-span-9">
              <h2 className="display-2 text-[clamp(2.4rem,5.4vw,4.8rem)]">More than a room.</h2>
              <p className="mt-6 max-w-xl text-[1.1rem] text-moss">
                Rent covers a furnished room and the help that makes a fresh start stick. We don&apos;t provide medical care. We make sure residents
                get to the people who do.
              </p>
            </div>
          </Reveal>
          {/* two pictures of the everyday: the drive in, the porch at the end of the day */}
          <div className="mt-16 grid gap-4 md:grid-cols-12">
            <Reveal className="md:col-span-8">
              <figure>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-oat">
                  <img src="/images/road.webp" alt="A quiet road through the pines in the morning" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] hover:scale-[1.03]" />
                </div>
                <figcaption className="mono mt-3 flex justify-between text-[0.72rem] text-moss">
                  <span>The drive to the VA, about 15 minutes</span>
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delay={90} className="md:col-span-4">
              <figure className="h-full">
                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-oat md:aspect-auto md:h-[calc(100%-1.9rem)]">
                  <img src="/images/porch.webp" alt="Rocking chairs on the porch at dusk" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] hover:scale-[1.03]" />
                </div>
                <figcaption className="mono mt-3 flex justify-between text-[0.72rem] text-moss">
                  <span>The porch, after supper</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
          <div className="hairline mt-16 overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Rides", "To what matters", "VA appointments, the pharmacy, meetings, interviews and the grocery store. The Richmond VA Medical Center is about 15 minutes away."],
              ["Mental health", "Someone to call", "We find counselors, book the appointment and follow up afterwards."],
              ["Social work", "The paperwork, handled", "Benefits, IDs, applications and community referrals."],
              ["Services", "We know who to call", "Outpatient programs, in-home care, food assistance and job training in Chesterfield County."],
              ["The home", "Furnished and ready", "Bed, dresser and linens in every room. Shared kitchen, living room, laundry and Wi‑Fi."],
              ["House rules", "Sober, calm, fair", "No alcohol or drugs anywhere on the property. Rules everyone agrees to before moving in."],
            ].map(([k, t, b], i) => (
              <Reveal key={t} delay={(i % 3) * 80} className="h-full">
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
                Four rooms.
                <br />
                <span className="text-moss">Six beds.</span>
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
                  Placing a client?
                  <br />
                  <span className="text-white/40">See open beds before you call.</span>
                </h2>
              </Reveal>
              <p className="mt-8 max-w-lg text-[1.1rem] text-white/60">
                Availability on this site is live. Send a referral in two minutes and we&apos;ll call you back within one business day.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/apply?for=PROFESSIONAL" className="btn btn-porch press !h-12 !px-6">
                  <Roll>Refer a client</Roll> <ArrowRight size={16} />
                </Link>
                <a href={PHONE_HREF} className="btn press mono !h-12 !px-6 text-white ring-1 ring-white/20 hover:bg-white/10">
                  <Roll>{PHONE}</Roll>
                </a>
              </div>
            </div>
            <Reveal className="hidden lg:col-span-4 lg:block">
              <figure className="relative h-full min-h-[420px] overflow-hidden rounded-2xl">
                <img src="/images/referral.webp" alt="A referral folder on a desk" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80" />
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
            <Faq
              items={[
                ["Is this assisted living?", "No. Respite for the Weary is independent living with support. There's no nursing staff on site, so residents need to manage their own daily care. We help arrange in-home care and appointments when they're needed."],
                ["Is the whole house sober?", "Yes. Alcohol and drugs aren't allowed anywhere on the property, for every resident. That keeps the house safe for people in recovery and calm for everyone else."],
                ["What does rent include?", "A furnished room, utilities, Wi‑Fi, laundry and use of the kitchen and living areas, plus rides and help connecting to services."],
                ["Can rent be paid with VA benefits or SSI?", "Yes. Many residents pay with VA benefits, SSI or SSDI. You can pay online by card or bank transfer, or by check."],
                ["How quickly can someone move in?", "If a bed is open, often within a week of the tour. Beds marked “opening soon” can be reserved ahead of time."],
                ["Can we visit first?", "Please do. Request a room or call us and we'll set up a tour that works for you."],
              ]}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
