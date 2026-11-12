import Link from "next/link";

/** Rolling hover label. Put inside a link or button. */
export function Roll({ children }: { children: string }) {
  return (
    <span className="roll">
      <span data-text={children}>{children}</span>
    </span>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="Respite for the Weary home">
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" aria-hidden>
        <path d="M2.5 11 L12 3 L21.5 11 V21.5 H2.5 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <rect x="9.5" y="12.5" width="5" height="5" fill="var(--porch)" />
      </svg>
      <span className={`text-[1.06rem] font-semibold leading-none tracking-[-0.045em] ${light ? "text-white" : ""}`}>
        Respite <span className={`hidden font-normal min-[420px]:inline ${light ? "text-white/50" : "opacity-50"}`}>for the Weary</span>
      </span>
    </Link>
  );
}
