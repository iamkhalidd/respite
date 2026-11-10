"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";

const STEPS = [
  ["Request a room", "Tell us about who's moving in. It takes about two minutes."],
  ["We call you back", "Usually within one business day, to answer questions and check it's a good fit."],
  ["Visit the house", "Tour the home, meet the house manager and see the room."],
  ["Move in", "Sign the agreement, pay the deposit online, and the room is ready."],
] as const;

const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
// the line travels between the first and last dot over this part of the scroll; the rest is a hold
const lineAt = (v: number) => seg(v, 0.06, 0.82);

/**
 * Moving in, told as a sequence: the section pins, a line draws from step to step
 * and each step lights up as the line reaches it. Ends on the porch light.
 */
export function MoveInSteps() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [reached, setReached] = useState(0);

  const fill = useTransform(scrollYProgress, (v) => lineAt(v));
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const f = lineAt(v);
    // dots sit at 0, 1/3, 2/3 and 1 of the line
    setReached(Math.min(3, Math.floor(f * 3 + 0.02)));
  });

  const r = reduce ? 3 : reached;

  return (
    <div ref={ref} className={reduce ? "" : "relative h-[340vh]"}>
      <div className={reduce ? "py-28" : "sticky top-0 flex h-dvh flex-col justify-center pt-16"}>
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-12 md:gap-8">
            <p className="eyebrow md:col-span-3 md:pt-3">Moving in</p>
            <div className="flex items-end justify-between gap-6 md:col-span-9">
              <h2 className="display-2 text-[clamp(2.2rem,5.4vw,4.8rem)]">From first call to front door.</h2>
              <p className="mono hidden shrink-0 pb-2 text-[0.85rem] text-moss tabular md:block" aria-hidden>
                <span className="text-ink">{String(r + 1).padStart(2, "0")}</span> / 04
              </p>
            </div>
          </div>

          <ol className="relative mt-8 grid h-[min(30rem,56dvh)] grid-rows-4 md:mt-20 md:h-auto md:grid-cols-4 md:grid-rows-none">
            {/* the rail: vertical on phones, horizontal from md */}
            <span aria-hidden className="absolute left-[5.5px] top-[9px] h-[75%] w-px bg-line-strong md:left-[6px] md:top-[5.5px] md:h-px md:w-full" />
            <motion.span
              aria-hidden
              style={reduce ? undefined : { scaleY: fill }}
              className="absolute left-[5.5px] top-[9px] h-[75%] w-px origin-top bg-ink md:hidden"
            />
            <motion.span
              aria-hidden
              style={reduce ? undefined : { scaleX: fill }}
              className="absolute left-[6px] top-[5.5px] hidden h-px w-[75%] origin-left bg-ink md:block"
            />

            {STEPS.map(([title, body], i) => {
              const on = i <= r;
              const last = i === STEPS.length - 1;
              return (
                <li
                  key={title}
                  className="relative pl-9 transition-opacity duration-500 ease-[var(--ease-out)] md:pl-0 md:pr-8"
                  style={{ opacity: on ? 1 : 0.28 }}
                  aria-current={i === r ? "step" : undefined}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-[3px] block h-3 w-3 rounded-full transition-[background-color,box-shadow,transform] duration-500 ease-[var(--ease-out)] md:static md:top-0 ${
                      on ? (last ? "bg-porch shadow-[0_0_16px_3px_rgb(240_165_58/.65)]" : "bg-ink") : "bg-line-strong"
                    } ${i === r && !reduce ? "scale-[1.35]" : "scale-100"}`}
                  />
                  <div
                    className="transition-transform duration-700 ease-[var(--ease-out)]"
                    style={{ transform: `translateY(${on ? 0 : 10}px)` }}
                  >
                    <p className="mono hidden text-[0.78rem] text-moss md:mt-6 md:block">Step {i + 1}</p>
                    <h3 className="text-[1.25rem] font-medium leading-tight tracking-[-0.035em] md:mt-2 md:text-[1.45rem]">{title}</h3>
                    <p className="mt-1.5 max-w-xs text-[0.95rem] leading-snug text-moss md:mt-2 md:text-base md:leading-normal">{body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div
            className="mt-10 hidden transition-[opacity,transform] duration-500 ease-[var(--ease-out)] md:block"
            style={{ opacity: r === 3 ? 1 : 0, transform: `translateY(${r === 3 ? 0 : 12}px)` }}
          >
            <Link href="/apply" tabIndex={r === 3 ? 0 : -1} className="btn btn-primary press !h-12 px-6">
              Start with step one <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
