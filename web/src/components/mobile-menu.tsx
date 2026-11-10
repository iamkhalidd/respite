"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Phone } from "lucide-react";

/** Phone navigation: a full-screen sheet with the pages set large. */
export function MobileMenu({ links, phone, phoneHref }: { links: readonly (readonly [string, string])[]; phone: string; phoneHref: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="press relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-current/20 md:hidden"
      >
        <span className="relative block h-3 w-4" aria-hidden>
          <span
            className={`absolute left-0 h-[1.5px] w-4 rounded bg-current transition-transform duration-300 ease-[var(--ease-out)] ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0.5"}`}
          />
          <span
            className={`absolute left-0 h-[1.5px] w-4 rounded bg-current transition-transform duration-300 ease-[var(--ease-out)] ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0.5"}`}
          />
        </span>
      </button>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 flex flex-col bg-night text-white transition-[opacity,visibility] duration-300 md:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center px-6 pt-16">
          <ul className="space-y-1">
            {links.map(([href, label], i) => (
              <li
                key={href}
                className="transition-[opacity,transform] duration-500 ease-[var(--ease-out)]"
                style={{ opacity: open ? 1 : 0, transform: `translateY(${open ? 0 : 16}px)`, transitionDelay: open ? `${60 + i * 45}ms` : "0ms" }}
              >
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between border-b border-white/10 py-3 text-[2.4rem] font-semibold leading-none tracking-[-0.05em] active:text-porch"
                >
                  {label}
                  <ArrowRight size={20} className="text-white/30" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Link href="/apply" onClick={() => setOpen(false)} className="btn btn-porch press !h-14 w-full text-[1.05rem]">
            Request a room <ArrowRight size={18} />
          </Link>
          <a href={phoneHref} className="btn press mono !h-14 w-full text-white ring-1 ring-white/20">
            <Phone size={16} /> {phone}
          </a>
        </div>
      </div>
    </>
  );
}
