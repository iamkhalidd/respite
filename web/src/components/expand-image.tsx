"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const seg = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

/**
 * A photograph that opens up as it scrolls in: it starts inset with rounded corners,
 * widens to the full page, and the picture drifts slower than the page beneath it.
 */
export function ExpandImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const clip = useTransform(scrollYProgress, (v) => {
    const t = 1 - seg(v, 0.05, 0.45);
    return `inset(0 ${t * 9}% 0 ${t * 9}% round ${12 + t * 16}px)`;
  });
  const y = useTransform(scrollYProgress, (v) => `${-7 + 14 * v}%`);

  return (
    <div ref={ref} className="relative">
      <motion.div style={reduce ? undefined : { clipPath: clip }} className="relative h-[72vh] min-h-[420px] overflow-hidden md:h-[88vh]">
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={reduce ? undefined : { y }}
          className="absolute inset-x-0 top-[-10%] h-[120%] w-full object-cover"
        />
      </motion.div>
      {caption && (
        <p className="mono mx-auto mt-4 flex max-w-[1280px] justify-between gap-4 px-4 text-[0.72rem] text-moss sm:px-6">
          <span>{caption}</span>
        </p>
      )}
    </div>
  );
}
