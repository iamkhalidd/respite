"use client";
import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { BedState } from "@/lib/availability";

/**
 * The hero: a photograph of the house at blue hour, scrubbed with scroll like a film.
 * The camera eases toward the porch and the windows switch on one at a time —
 * one window per bed, lit only if that bed is open tonight.
 */
const SRC = "/images/hero/house-dark.webp";
const IMG_W = 2048;
const IMG_H = 1152;
// where the camera ends up (in image px) and how far it pushes in
const FOCUS = { x: 900, y: 820 };
const ZOOM = 0.5;

// glass of each window in image px, in bed order
const WINDOWS = [
  { x: 389, y: 877, w: 30, h: 70 },
  { x: 537, y: 869, w: 32, h: 72 },
  { x: 696, y: 863, w: 16, h: 78 },
  { x: 1078, y: 847, w: 40, h: 84 },
  { x: 886, y: 668, w: 36, h: 75 },
  { x: 1070, y: 643, w: 44, h: 82 },
];

const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const winStart = (i: number) => 0.2 + i * 0.07;

export function HouseScene({ states, children }: { states: BedState[]; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const progressRef = useRef(0);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // While a search menu is open the headline holds still and stays visible, so scrolling to reach
  // an option doesn't fade it away. It eases back to the scroll position once the menu closes.
  const content = useRef<HTMLDivElement>(null);
  const hold = useMotionValue(0);
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const check = () => animate(hold, el.querySelector('[aria-expanded="true"]') ? 1 : 0, { duration: 0.35, ease: [0.23, 1, 0.32, 1] });
    const mo = new MutationObserver(check);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["aria-expanded"] });
    return () => mo.disconnect();
  }, [hold]);
  // the fade waits a beat, so a small scroll doesn't start it
  const headY = useTransform([scrollYProgress, hold], ([v, h]: number[]) => `${-30 * seg(v, 0.04, 0.4) * (1 - h)}%`);
  const headO = useTransform([scrollYProgress, hold], ([v, h]: number[]) => Math.max(h, 1 - seg(v, 0.06, 0.32)));
  const capO = useTransform([scrollYProgress, hold], ([v, h]: number[]) => seg(v, 0.66, 0.8) * (1 - h));
  const capY = useTransform(scrollYProgress, (v) => 24 * (1 - seg(v, 0.66, 0.8)));

  const open = states.filter((s) => s === "open").length;
  const soon = states.filter((s) => s === "soon").length;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const draw = () => {
      raf = 0;
      const img = imgRef.current;
      if (!img) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      const p = reduce ? 1 : progressRef.current;
      const t = ease(seg(p, 0, 0.85));

      // landscape: cover-fit, then push in toward the porch.
      // portrait: fit the whole house to the width so every window stays in frame.
      const portrait = cw / ch < 1;
      // whole house (roofline to lawn) first, then push in on the six windows
      const HOUSE = { x: 870, y: 790, w: 1240 };
      const WIN = { x: 760, y: 800 };
      const cover = Math.max(cw / IMG_W, ch / IMG_H);
      const s = portrait ? (cw / HOUSE.w) * (1 + 0.45 * t) : cover * (1 + ZOOM * t);
      const fx0 = portrait ? HOUSE.x : IMG_W / 2;
      const fy0 = portrait ? HOUSE.y : IMG_H / 2 + 60;
      const fx = fx0 + ((portrait ? WIN.x : FOCUS.x) - fx0) * t;
      const fy = fy0 + ((portrait ? WIN.y : FOCUS.y) - fy0) * t;
      let ox = cw / 2 - fx * s;
      let oy = ch * (portrait ? 0.76 - 0.18 * t : 0.56) - fy * s;
      ox = Math.min(0, Math.max(cw - IMG_W * s, ox));
      if (!portrait) oy = Math.min(0, Math.max(ch - IMG_H * s, oy));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#0b0d0c";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, ox, oy, IMG_W * s, IMG_H * s);
      if (portrait) {
        // melt the photo's top and bottom edges into the night
        const ih = IMG_H * s;
        const top = ctx.createLinearGradient(0, oy, 0, oy + ih * 0.35);
        top.addColorStop(0, "#0b0d0c");
        top.addColorStop(1, "rgba(11,13,12,0)");
        ctx.fillStyle = top;
        ctx.fillRect(0, oy - 1, cw, ih * 0.35 + 1);
        const bot = ctx.createLinearGradient(0, oy + ih * 0.8, 0, oy + ih);
        bot.addColorStop(0, "rgba(11,13,12,0)");
        bot.addColorStop(1, "#0b0d0c");
        ctx.fillStyle = bot;
        ctx.fillRect(0, oy + ih * 0.8, cw, ih * 0.2 + 1);
      }

      // windows switch on
      ctx.globalCompositeOperation = "screen";
      WINDOWS.forEach((w, i) => {
        const state = states[i] ?? "taken";
        if (state === "taken") return;
        const on = reduce ? 1 : ease(seg(p, winStart(i), winStart(i) + 0.06));
        if (on <= 0) return;
        const strength = state === "open" ? 1 : 0.32;
        const x = ox + w.x * s;
        const y = oy + w.y * s;
        const ww = w.w * s;
        const hh = w.h * s;

        // bloom
        const cx = x + ww / 2;
        const cy = y + hh / 2;
        const r = Math.max(ww, hh) * 2.4;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(255,190,100,${0.42 * on * strength})`);
        g.addColorStop(1, "rgba(240,165,58,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

        // lamplit glass
        const pane = ctx.createLinearGradient(x, y, x, y + hh);
        pane.addColorStop(0, "#ffe2a3");
        pane.addColorStop(1, "#f0a03a");
        ctx.globalAlpha = 0.95 * on * strength;
        ctx.fillStyle = pane;
        ctx.fillRect(x, y, ww, hh);
      });

      // sash rails and muntins over the lit glass
      ctx.globalCompositeOperation = "source-over";
      WINDOWS.forEach((w, i) => {
        const state = states[i] ?? "taken";
        if (state === "taken") return;
        const on = reduce ? 1 : seg(p, winStart(i), winStart(i) + 0.06);
        if (on <= 0) return;
        const x = ox + w.x * s;
        const y = oy + w.y * s;
        const ww = w.w * s;
        const hh = w.h * s;
        ctx.globalAlpha = 0.55 * on;
        ctx.strokeStyle = "#3a2a18";
        ctx.lineWidth = Math.max(1, s * 2.2);
        ctx.beginPath();
        ctx.moveTo(x, y + hh / 2);
        ctx.lineTo(x + ww, y + hh / 2);
        ctx.stroke();
        ctx.lineWidth = Math.max(0.6, s * 1.1);
        ctx.beginPath();
        for (const fx of [1 / 3, 2 / 3]) {
          ctx.moveTo(x + ww * fx, y);
          ctx.lineTo(x + ww * fx, y + hh);
        }
        ctx.moveTo(x, y + hh / 4);
        ctx.lineTo(x + ww, y + hh / 4);
        ctx.moveTo(x, y + (hh * 3) / 4);
        ctx.lineTo(x + ww, y + (hh * 3) / 4);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    (canvas as HTMLCanvasElement & { __draw?: () => void }).__draw = schedule;

    const img = new Image();
    img.decoding = "async";
    img.src = SRC;
    img.onload = () => {
      imgRef.current = img;
      schedule();
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [states, reduce]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    (canvasRef.current as (HTMLCanvasElement & { __draw?: () => void }) | null)?.__draw?.();
  });

  return (
    <div ref={ref} className="relative h-[260vh] bg-night text-white">
      <div className="sticky top-0 flex h-dvh flex-col overflow-hidden">
        {/* poster underneath the canvas so there is never an empty frame */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:50%_70%]"
          style={{ backgroundImage: `url(${SRC})` }}
        />
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`The house at blue hour. ${open} of ${states.length} windows lit for open beds.`}
          className="absolute inset-0 h-full w-full"
        />
        {/* legibility: night falls from the top, and the page picks up from the bottom */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-gradient-to-b from-night via-night/70 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night to-transparent" />

        <motion.div ref={content} style={reduce ? undefined : { y: headY, opacity: headO }} className="relative z-10">
          {children}
        </motion.div>

        <motion.p
          style={reduce ? undefined : { opacity: capO, y: capY }}
          className="absolute inset-x-0 top-[14vh] z-10 px-4 text-center text-[clamp(1.6rem,3.6vw,3rem)] font-medium leading-[1.1] tracking-[-0.04em] text-white"
        >
          {open > 0 ? `${open} ${open === 1 ? "window" : "windows"} lit. ${open === 1 ? "That bed is" : "Those beds are"} yours to ask for.` : "Every window is full tonight."}
          {soon > 0 && <span className="block text-white/50">{soon === 1 ? "One more opens soon." : `${soon} more open soon.`}</span>}
        </motion.p>
      </div>
    </div>
  );
}
