"use client";
import { useEffect, useRef } from "react";

/** Reveals children once when they scroll into view. "clip" wipes up from the bottom (for images). */
export function Reveal({
  children,
  delay = 0,
  variant = "fade",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  variant?: "fade" | "clip";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.shown = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const attr = variant === "clip" ? { "data-reveal-clip": "" } : { "data-reveal": "" };
  return (
    <div ref={ref} {...attr} className={className} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
