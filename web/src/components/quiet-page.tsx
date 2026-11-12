import { Logo } from "./brand";

/** The small night page used for links people get by email: their tour, their waitlist place. */
export function QuietPage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="relative grid min-h-dvh place-items-center overflow-hidden bg-night px-5 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(50%_60%_at_50%_0%,rgb(240_165_58/0.14),transparent_70%)]" />
      <div className="relative w-full max-w-md text-center">
        <div className="mb-10 flex justify-center">
          <Logo light />
        </div>
        {children}
      </div>
    </main>
  );
}

export const quietSolid = "press inline-flex h-12 w-full items-center justify-center rounded-full bg-porch px-6 font-medium text-ink transition-colors hover:bg-porch-glow sm:w-auto";
export const quietGhost = "press inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[0.92rem] text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/[.06] sm:w-auto";
