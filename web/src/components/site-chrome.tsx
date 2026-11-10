import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { PHONE, PHONE_HREF } from "@/lib/labels";
import { HeaderShell } from "./header-shell";
import { MobileMenu } from "./mobile-menu";

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

const NAV = [
  ["/rooms", "Rooms"],
  ["/#who", "Who it's for"],
  ["/#included", "Included"],
  ["/#referrals", "Professionals"],
  ["/#faq", "FAQ"],
] as const;

export function SiteHeader() {
  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-[0.9rem] md:flex" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="opacity-70 transition-opacity hover:opacity-100">
              <Roll>{label}</Roll>
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={PHONE_HREF}
            className="press mono hidden h-10 items-center gap-2 rounded-full px-3 text-[0.85rem] opacity-80 hover:opacity-100 xl:inline-flex"
          >
            <Phone size={14} strokeWidth={2} /> <Roll>{PHONE}</Roll>
          </a>
          <a
            href={PHONE_HREF}
            aria-label={`Call ${PHONE}`}
            className="press hidden h-10 w-10 items-center justify-center rounded-full ring-1 ring-current/20 sm:inline-flex xl:hidden"
          >
            <Phone size={16} strokeWidth={2} />
          </a>
          <Link
            href="/apply"
            className="btn press !h-10 bg-ink text-white group-data-[tone=night]/h:bg-white group-data-[tone=night]/h:text-ink hover:!bg-porch hover:!text-ink"
          >
            <Roll>Request a room</Roll>
          </Link>
          <MobileMenu links={[...NAV, ["/apply?for=PROFESSIONAL", "Refer a client"]]} phone={PHONE} phoneHref={PHONE_HREF} />
        </div>
      </div>
    </HeaderShell>
  );
}

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-night text-white">
      <div className="mx-auto max-w-[1280px] px-4 pt-20 sm:px-6">
        <p className="eyebrow !text-white/40">Call the house</p>
        <a
          href={PHONE_HREF}
          className="group mt-4 flex items-baseline gap-4 text-[clamp(3.2rem,13.5vw,12.5rem)] font-semibold leading-[0.85] tracking-[-0.06em] tabular"
        >
          <span className="transition-colors duration-300 group-hover:text-porch">{PHONE}</span>
          <ArrowUpRight className="hidden h-[0.4em] w-[0.4em] shrink-0 text-white/30 transition-[transform,color] duration-300 ease-[var(--ease-out)] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-porch sm:block" />
        </a>

        <div className="mt-20 grid gap-10 border-t border-white/10 py-12 text-[0.95rem] sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-white/55">A six-bed home in Chester, Virginia for veterans, people in recovery and independent seniors.</p>
          </div>
          <div>
            <p className="eyebrow mb-4 !text-white/40">Visit</p>
            <p className="text-white/80">Chester, Virginia 23831</p>
            <p className="mt-1 text-white/50">Tours by appointment.</p>
          </div>
          <div>
            <p className="eyebrow mb-4 !text-white/40">Pages</p>
            <ul className="space-y-1.5 text-white/75">
              {[
                ["/rooms", "Rooms and availability"],
                ["/apply", "Request a room"],
                ["/apply?for=PROFESSIONAL", "Refer a client"],
                ["/admin", "Owner login"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link className="hover:text-white" href={href}>
                    <Roll>{label}</Roll>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mono flex flex-wrap justify-between gap-2 border-t border-white/10 py-6 text-[0.75rem] text-white/40">
          <span>© {new Date().getFullYear()} Respite for the Weary</span>
          <span>Real support. Lasting hope.</span>
        </div>
      </div>
    </footer>
  );
}
