"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";

/** A statement that reads itself: each word brightens as it scrolls past. */
export function ScrollWords({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} p={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} reduce={!!reduce}>
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, p, range, reduce }: { children: string; p: MotionValue<number>; range: [number, number]; reduce: boolean }) {
  const o = useTransform(p, (v) => 0.16 + 0.84 * Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0]))));
  return (
    <>
      <motion.span style={{ opacity: reduce ? 1 : o }}>{children}</motion.span>{" "}
    </>
  );
}
