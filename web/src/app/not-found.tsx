import Link from "next/link";
import { Logo } from "@/components/site-chrome";
import { PHONE, PHONE_HREF } from "@/lib/labels";

export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-night px-5 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[55vh] bg-[radial-gradient(50%_60%_at_50%_0%,rgb(240_165_58/0.14),transparent_70%)]" />
      <div className="relative w-full max-w-md text-center">
        <div className="mb-10 flex justify-center">
          <Logo light />
        </div>
        <p className="mono text-[0.72rem] uppercase tracking-[0.02em] text-white/45">Page not found</p>
        <h1 className="display-2 mt-3 text-[clamp(2.2rem,8vw,3rem)]">Nobody&apos;s home at this address.</h1>
        <p className="mx-auto mt-4 max-w-sm text-[0.98rem] leading-relaxed text-white/60">The page may have moved, or the link was typed wrong. The rooms are still where they were.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/rooms" className="press inline-flex h-12 w-full items-center justify-center rounded-full bg-porch px-6 font-medium text-ink transition-colors hover:bg-porch-glow sm:w-auto">
            See the rooms
          </Link>
          <a href={PHONE_HREF} className="press mono inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-[0.92rem] text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/[.06] sm:w-auto">
            Call {PHONE}
          </a>
        </div>
      </div>
    </main>
  );
}
