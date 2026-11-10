"use client";
import { useEffect, useState } from "react";

/** Header goes clear-on-dark while a [data-night] section sits under it, then turns solid white. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [tone, setTone] = useState<"night" | "day">("day");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => {
      const night = document.querySelector("[data-night]");
      const overNight = night ? night.getBoundingClientRect().bottom > 64 : false;
      setTone(overNight ? "night" : "day");
      setScrolled(window.scrollY > 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <header
      data-tone={tone}
      className={`group/h sticky top-0 z-40 transition-[background-color,border-color,color] duration-300 ${
        tone === "night"
          ? "border-b border-white/0 bg-night/0 text-white"
          : `border-b bg-white/80 text-ink backdrop-blur-xl ${scrolled ? "border-line" : "border-transparent"}`
      }`}
    >
      {children}
    </header>
  );
}
