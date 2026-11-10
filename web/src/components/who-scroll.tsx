"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CHAPTERS = [
  {
    key: "VETERAN",
    word: "Veterans",
    img: "/images/veteran.webp",
    line: "who want a steady place to land.",
    body: "A respectful, structured home after service. We help with VA appointments, benefits paperwork and rides to the Richmond VA Medical Center, about 15 minutes away.",
    referred: "VA social workers, HUD-VASH case managers, veteran service officers",
    good: ["Living independently", "Wants community, not a facility", "Paying with VA benefits is fine"],
  },
  {
    key: "RECOVERY",
    word: "People in recovery",
    img: "/images/recovery.webp",
    line: "who are ready for the next chapter.",
    body: "A drug- and alcohol-free house with house meetings, clear rules and neighbors who understand. We connect residents to outpatient programs, meetings and work.",
    referred: "Treatment centers, recovery courts, probation officers, peer recovery specialists",
    good: ["Committed to staying sober", "Finished or finishing treatment", "Ready to follow house rules"],
  },
  {
    key: "SENIOR",
    word: "Independent seniors",
    img: "/images/senior.webp",
    line: "who would rather not live alone.",
    body: "Your own room and your own routine, with people around and help close by. Ground-floor rooms, rides to appointments and links to in-home care when it's needed.",
    referred: "Hospital discharge planners, families, churches, Area Agency on Aging",
    good: ["Manages daily care on their own", "Doesn't need nursing on site", "Wants company and support nearby"],
  },
];

export function WhoScroll() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="who" className="relative mx-auto max-w-[1280px] px-4 py-24 sm:px-6 md:py-32">
      <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:gap-16">
        {/* Sticky headline: the word changes as each chapter scrolls past */}
        <div className="md:sticky md:top-28 md:h-[calc(100dvh-10rem)] md:self-start">
          <p className="eyebrow mb-6">Who lives here</p>
          <h2 className="display-2 text-[clamp(2.6rem,6.2vw,5.6rem)]">
            <span className="text-moss">A home for</span>
            <span className="relative mt-1 block h-[2.05em] overflow-hidden md:h-[2.1em]">
              {CHAPTERS.map((c, i) => (
                <span
                  key={c.key}
                  className="absolute inset-x-0 top-0 text-ink transition-[opacity,transform,filter] duration-700 ease-[var(--ease-out)]"
                  style={{
                    opacity: active === i ? 1 : 0,
                    transform: `translateY(${(i - active) * 40}%)`,
                    filter: active === i ? "blur(0)" : "blur(6px)",
                  }}
                  aria-hidden={active !== i}
                >
                  {c.word}
                </span>
              ))}
            </span>
          </h2>
          <div className="mt-8 hidden gap-2 md:flex" aria-hidden>
            {CHAPTERS.map((c, i) => (
              <span key={c.key} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/8">
                <span
                  className="block h-full origin-left rounded-full bg-ink transition-transform duration-500 ease-[var(--ease-out)]"
                  style={{ transform: `scaleX(${i <= active ? 1 : 0})` }}
                />
              </span>
            ))}
          </div>
          {/* the picture changes with the chapter */}
          <div className="relative mt-8 hidden aspect-[4/3] max-h-[38vh] overflow-hidden rounded-2xl bg-oat md:block">
            {CHAPTERS.map((c, i) => (
              <img
                key={c.key}
                src={c.img}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out)]"
                style={{ opacity: active === i ? 1 : 0, transform: `scale(${active === i ? 1 : 1.06})` }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6 md:space-y-[22vh] md:py-[8vh]">
          {CHAPTERS.map((c, i) => (
            <div
              key={c.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className={`rounded-2xl bg-oat p-7 transition-[opacity,transform] duration-500 sm:p-9 md:min-h-[46vh] ${
                active === i ? "md:opacity-100" : "md:opacity-45"
              }`}
            >
              <div className="relative -mx-2 -mt-2 mb-6 aspect-[16/10] overflow-hidden rounded-xl sm:-mx-4 sm:-mt-4 md:hidden">
                <img src={c.img} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <p className="eyebrow mb-3 md:hidden">{c.word}</p>
              <p className="text-[1.6rem] font-medium leading-[1.15] tracking-[-0.035em] text-ink">
                <span className="md:hidden">{c.word} </span>
                {c.line}
              </p>
              <p className="mt-4 text-moss">{c.body}</p>
              <ul className="mt-6 space-y-2 text-[0.95rem]">
                {c.good.map((g) => (
                  <li key={g} className="flex gap-3">
                    <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-porch" />
                    {g}
                  </li>
                ))}
              </ul>
              <div className="mt-7 border-t border-line pt-5">
                <p className="eyebrow mb-1.5">Often referred by</p>
                <p className="text-[0.95rem] text-moss">{c.referred}</p>
              </div>
              <Link href={`/rooms?program=${c.key}`} className="group mt-6 inline-flex items-center gap-2 font-medium text-ink">
                See rooms
                <ArrowRight size={17} className="transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
