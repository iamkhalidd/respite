"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, BedDouble, Users, CreditCard, ArrowUpRight, LogOut, Bell, Globe, UserCog } from "lucide-react";
import type { BedState } from "@/lib/availability";
import { logout } from "../actions";

const ITEMS = [
  { href: "/admin", label: "Overview", short: "Home", icon: Home, exact: true },
  { href: "/admin/requests", label: "Requests", short: "Requests", icon: Inbox, badge: "requests" },
  { href: "/admin/rooms", label: "Rooms & beds", short: "Rooms", icon: BedDouble },
  { href: "/admin/residents", label: "Residents", short: "Residents", icon: Users },
  { href: "/admin/payments", label: "Payments", short: "Payments", icon: CreditCard, badge: "overdue" },
  { href: "/admin/notifications", label: "Notifications", short: "Alerts", icon: Bell, badge: "unread", rail: true },
  { href: "/admin/site", label: "Website", short: "Website", icon: Globe, rail: true },
  { href: "/admin/team", label: "Team", short: "Team", icon: UserCog, rail: true },
] as const;
// the phone tab bar keeps five; the rest sit as icons in the phone's top bar instead
const TABS = ITEMS.filter((it) => !("rail" in it));

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" aria-hidden>
      <path d="M2.5 11 L12 3 L21.5 11 V21.5 H2.5 Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="9.5" y="12.5" width="5" height="5" fill="var(--porch)" />
    </svg>
  );
}

/** Six small windows, one per bed. Lit means open. */
function Windows({ beds }: { beds: BedState[] }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {beds.map((s, i) => (
        <span
          key={i}
          className="h-[15px] w-3 rounded-[2px]"
          style={{
            background: s === "open" ? "linear-gradient(#ffe3a6, #f0a53a)" : s === "soon" ? "rgb(240 165 58 / .3)" : "rgb(255 255 255 / .12)",
            boxShadow: s === "open" ? "0 0 10px 1px rgb(240 165 58 / .5)" : "none",
          }}
        />
      ))}
    </span>
  );
}

type Props = { newRequests: number; overdue: number; beds: BedState[]; unread: number; failedEmails: number };

/** The bell: amber when something new came in, ember when an email couldn't be sent. */
function BellLink({ unread, failedEmails, className }: { unread: number; failedEmails: number; className: string }) {
  const n = unread + failedEmails;
  const label = n ? `Notifications, ${unread} unread${failedEmails ? `, ${failedEmails} emails failed` : ""}` : "Notifications";
  return (
    <Link href={failedEmails && !unread ? "/admin/notifications?tab=email" : "/admin/notifications"} aria-label={label} className={className}>
      <span className="relative">
        <Bell size={18} />
        {n > 0 && (
          <span className={`absolute -right-[3px] -top-[2px] h-2 w-2 rounded-full ring-2 ring-night ${failedEmails ? "bg-ember" : "bg-porch shadow-[0_0_8px_1px_rgb(240_165_58/.6)]"}`} />
        )}
      </span>
    </Link>
  );
}

export function Sidebar({ newRequests, overdue, beds, unread, failedEmails }: Props) {
  const path = usePathname();
  const count = { requests: newRequests, overdue, unread: unread + failedEmails } as const;
  // tours and the waitlist live under Requests, so it stays lit there too
  const isActive = (href: string, exact?: boolean) =>
    exact ? path === href : path.startsWith(href) || (href === "/admin/requests" && /^\/admin\/(tours|waitlist)/.test(path));
  const open = beds.filter((b) => b === "open").length;

  return (
    <>
      {/* Phone: slim top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-night px-4 text-white md:hidden">
        <Link href="/admin" className="flex items-center gap-2" aria-label="Dashboard home">
          <Mark />
          <span className="text-[1.02rem] font-semibold tracking-[-0.04em]">Respite</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="mr-2 flex items-center gap-2 text-white/60">
            <Windows beds={beds} />
            <span className="mono text-[0.72rem]">{open}/{beds.length}</span>
          </span>
          <BellLink unread={unread} failedEmails={failedEmails} className="press grid h-10 w-10 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" />
          <Link href="/admin/site" aria-label="Website" aria-current={isActive("/admin/site") ? "page" : undefined} className={`press grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 hover:text-white ${isActive("/admin/site") ? "bg-white/10 text-porch" : "text-white/70"}`}>
            <Globe size={18} />
          </Link>
          <Link href="/admin/team" aria-label="Team and your account" aria-current={isActive("/admin/team") ? "page" : undefined} className={`press grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 hover:text-white ${isActive("/admin/team") ? "bg-white/10 text-porch" : "text-white/70"}`}>
            <UserCog size={18} />
          </Link>
        </div>
      </header>

      {/* Desktop: the night rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-night px-3 py-5 text-white md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-3">
          <Mark />
          <span className="text-[1.06rem] font-semibold leading-none tracking-[-0.045em]">
            Respite <span className="font-normal text-white/45">for the Weary</span>
          </span>
        </Link>

        <nav className="mt-9" aria-label="Dashboard">
          <ul className="space-y-0.5">
            {ITEMS.map(({ href, label, icon: Icon, ...it }) => {
              const active = isActive(href, "exact" in it && it.exact);
              const n = "badge" in it ? count[it.badge] : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[0.93rem] transition-colors duration-150 ${
                      active ? "bg-white/[.09] font-medium text-white" : "text-white/60 hover:bg-white/[.05] hover:text-white"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.8} className={active ? "text-porch" : "text-white/45 group-hover:text-white/80"} />
                    <span className="flex-1">{label}</span>
                    {n > 0 && (
                      <span className={`mono tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-semibold ${"badge" in it && (it.badge === "overdue" || (it.badge === "unread" && failedEmails)) ? "bg-ember text-white" : "bg-porch text-ink"}`}>
                        {n}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto">
          <Link href="/admin/rooms" className="block rounded-xl px-3 py-3 transition-colors hover:bg-white/[.05]">
            <span className="mono block text-[0.68rem] uppercase tracking-[0.02em] text-white/40">Tonight</span>
            <span className="mt-2 flex items-center justify-between">
              <Windows beds={beds} />
              <span className="mono text-[0.78rem] text-white/70">
                {open} of {beds.length} open
              </span>
            </span>
          </Link>
          <div className="mt-2 border-t border-white/10 pt-2 text-[0.9rem]">
            <Link href="/" target="_blank" className="flex h-10 items-center gap-3 rounded-xl px-3 text-white/60 transition-colors hover:bg-white/[.05] hover:text-white">
              <ArrowUpRight size={17} className="text-white/45" /> View public site
            </Link>
            <form action={logout}>
              <button className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-white/60 transition-colors hover:bg-white/[.05] hover:text-white">
                <LogOut size={16} className="text-white/45" /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Phone: tab bar within thumb reach */}
      <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, short, icon: Icon, ...it }) => {
            const active = isActive(href, "exact" in it && it.exact);
            const n = "badge" in it ? count[it.badge] : 0;
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={`press relative flex h-[4.25rem] flex-col items-center justify-center gap-1 ${active ? "text-ink" : "text-moss"}`}>
                  <span className="relative">
                    <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
                    {n > 0 && (
                      <span className={`mono absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.62rem] font-semibold ${"badge" in it && it.badge === "overdue" ? "bg-ember text-white" : "bg-porch text-ink"}`}>
                        {n}
                      </span>
                    )}
                  </span>
                  <span className={`text-[0.68rem] leading-none ${active ? "font-semibold" : ""}`}>{short}</span>
                  {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-porch" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
