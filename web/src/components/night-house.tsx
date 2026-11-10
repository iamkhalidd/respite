"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import type { BedState } from "@/lib/availability";

/**
 * The hero signature: the house at night, drawn in fine light lines.
 * As you scroll, the house comes closer and its windows switch on one by one:
 * amber for an open bed, a low ember for one opening soon, dark for taken.
 */
const WINDOWS = [
  { x: 66, y: 214, w: 50, h: 58 },
  { x: 284, y: 214, w: 50, h: 58 },
  { x: 58, y: 128, w: 40, h: 48 },
  { x: 112, y: 128, w: 40, h: 48 },
  { x: 248, y: 128, w: 40, h: 48 },
  { x: 302, y: 128, w: 40, h: 48 },
];

const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

export function NightHouse({ states, children }: { states: BedState[]; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // function-form transforms: computed per frame and clamped (no native scroll-timeline quirks)
  const headY = useTransform(scrollYProgress, (v) => `${-30 * seg(v, 0, 0.4)}%`);
  const headO = useTransform(scrollYProgress, (v) => 1 - seg(v, 0, 0.3));
  const houseScale = useTransform(scrollYProgress, (v) => 0.82 + 0.36 * seg(v, 0, 0.75));
  const houseY = useTransform(scrollYProgress, (v) => `${22 - 26 * seg(v, 0, 0.75)}%`);
  const capO = useTransform(scrollYProgress, (v) => seg(v, 0.6, 0.78));
  const capY = useTransform(scrollYProgress, (v) => 24 * (1 - seg(v, 0.6, 0.78)));

  const open = states.filter((s) => s === "open").length;
  const soon = states.filter((s) => s === "soon").length;

  return (
    <div ref={ref} className="relative h-[230vh] bg-night text-white">
      <div className="sticky top-0 flex h-dvh flex-col overflow-hidden">
        {/* faint stars + horizon glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 12% 18%, #fff8 50%, transparent), radial-gradient(1px 1px at 72% 12%, #fff6 50%, transparent), radial-gradient(1px 1px at 38% 30%, #fff4 50%, transparent), radial-gradient(1px 1px at 86% 34%, #fff5 50%, transparent), radial-gradient(1px 1px at 22% 44%, #fff3 50%, transparent), radial-gradient(1px 1px at 58% 8%, #fff5 50%, transparent), radial-gradient(1px 1px at 92% 22%, #fff3 50%, transparent)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[radial-gradient(60%_70%_at_50%_100%,rgb(240_165_58/0.16),transparent_70%)]" />

        <motion.div style={reduce ? undefined : { y: headY, opacity: headO }} className="relative z-10">
          {children}
        </motion.div>

        <motion.div
          style={reduce ? undefined : { scale: houseScale, y: houseY }}
          className="absolute inset-x-0 bottom-0 mx-auto w-[min(92vw,760px)] origin-bottom"
        >
          <svg viewBox="0 0 400 310" className="w-full" role="img" aria-label={`The house at night. ${open} of ${states.length} windows lit for open beds.`}>
            <defs>
              <radialGradient id="nh-glow">
                <stop offset="0%" stopColor="#ffd98f" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#f0a53a" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="nh-pane" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffe3a6" />
                <stop offset="100%" stopColor="#f0a53a" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="rgb(255 255 255 / .55)" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round">
              <path d="M0 300 H400" stroke="rgb(255 255 255 / .18)" />
              <rect x="40" y="104" width="320" height="196" fill="#101311" />
              {Array.from({ length: 11 }).map((_, i) => (
                <path key={i} d={`M40 ${118 + i * 17} H360`} stroke="rgb(255 255 255 / .06)" />
              ))}
              <path d="M24 108 L200 26 L376 108 Z" fill="#0b0d0c" />
              <path d="M292 62 V36 H312 V72" fill="#0b0d0c" />
              <path d="M176 104 V70 L200 52 L224 70 V104" fill="#101311" />
              <path d="M150 196 L200 172 L250 196 Z" fill="#101311" />
              <path d="M144 198 H256" />
              <path d="M158 198 V292 M242 198 V292" />
              <rect x="182" y="222" width="36" height="70" fill="#0b0d0c" />
              <path d="M168 292 H232 V298 H168 Z" fill="#101311" />
              {/* the porch lamp is always on */}
              <circle cx="200" cy="208" r="26" fill="url(#nh-glow)" stroke="none" className="window-lit" />
              <circle cx="200" cy="208" r="2.4" fill="#ffd98f" stroke="none" />
              {WINDOWS.map((w, i) => (
                <Window key={i} w={w} i={i} state={states[i] ?? "taken"} progress={scrollYProgress} reduce={!!reduce} />
              ))}
            </g>
          </svg>
        </motion.div>

        <motion.p
          style={reduce ? undefined : { opacity: capO, y: capY }}
          className="absolute inset-x-0 top-[16vh] z-10 px-4 text-center text-[clamp(1.6rem,3.6vw,3rem)] font-medium leading-[1.1] tracking-[-0.04em] text-white"
        >
          {open > 0 ? `${open} ${open === 1 ? "window" : "windows"} lit. ${open === 1 ? "That bed is" : "Those beds are"} yours to ask for.` : "Every window is full tonight."}
          {soon > 0 && <span className="block text-white/50">{soon === 1 ? "One more opens soon." : `${soon} more open soon.`}</span>}
        </motion.p>
      </div>
    </div>
  );
}

function Window({
  w,
  i,
  state,
  progress,
  reduce,
}: {
  w: { x: number; y: number; w: number; h: number };
  i: number;
  state: BedState;
  progress: MotionValue<number>;
  reduce: boolean;
}) {
  // each window switches on at its own point in the scroll
  const start = 0.22 + i * 0.065;
  const on = useTransform(progress, (v) => (reduce ? 1 : seg(v, start, start + 0.05)));
  const lit = state === "open";
  const soon = state === "soon";
  return (
    <g>
      <rect x={w.x} y={w.y} width={w.w} height={w.h} fill="#141815" />
      {(lit || soon) && (
        <motion.g style={{ opacity: reduce ? 1 : on }}>
          {lit && <ellipse cx={w.x + w.w / 2} cy={w.y + w.h / 2} rx={w.w * 1.05} ry={w.h * 0.95} fill="url(#nh-glow)" stroke="none" />}
          <rect x={w.x} y={w.y} width={w.w} height={w.h} fill={lit ? "url(#nh-pane)" : "#f0a53a"} fillOpacity={lit ? 1 : 0.28} stroke="none" />
        </motion.g>
      )}
      <path
        d={`M${w.x + w.w / 2} ${w.y} V${w.y + w.h} M${w.x} ${w.y + w.h / 2} H${w.x + w.w}`}
        stroke={lit ? "rgb(11 13 12 / .55)" : "rgb(255 255 255 / .22)"}
        strokeWidth="1"
      />
      <rect x={w.x} y={w.y} width={w.w} height={w.h} />
    </g>
  );
}
