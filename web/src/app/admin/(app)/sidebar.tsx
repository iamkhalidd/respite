"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Inbox, BedDouble, Users, CreditCard, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { logout } from "../actions";

export function Sidebar({ newRequests, overdue }: { newRequests: number; overdue: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/admin", label: "Overview", icon: Home, exact: true },
    { href: "/admin/requests", label: "Requests", icon: Inbox, badge: newRequests },
    { href: "/admin/rooms", label: "Rooms & beds", icon: BedDouble },
    { href: "/admin/residents", label: "Residents", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: CreditCard, badge: overdue, warn: true },
  ];

  const nav = (
    <nav className="flex h-full flex-col px-2 py-3 text-[0.9rem]">
      <div className="mb-4 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-pine">
          <span className="h-2.5 w-2 rounded-[1px] bg-porch" />
        </span>
        <span className="font-semibold tracking-tight">Respite for the Weary</span>
      </div>
      <ul className="space-y-px">
        {items.map(({ href, label, icon: Icon, badge, exact, warn }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] transition-colors duration-100 ${
                  active ? "bg-ink/[.06] font-medium text-ink" : "text-ink/65 hover:bg-ink/[.04] hover:text-ink"
                }`}
              >
                <Icon size={17} strokeWidth={1.9} className={active ? "text-ink" : "text-ink/50"} />
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className={`tabular rounded-md px-1.5 text-[0.75rem] font-semibold ${warn ? "bg-ember/12 text-ember" : "bg-porch/25 text-[#7a5410]"}`}>{badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto space-y-px border-t border-line pt-3">
        <Link href="/" target="_blank" className="flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-ink/65 hover:bg-ink/[.04] hover:text-ink">
          <ExternalLink size={16} className="text-ink/50" /> View public site
        </Link>
        <form action={logout}>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-ink/65 hover:bg-ink/[.04] hover:text-ink">
            <LogOut size={16} className="text-ink/50" /> Log out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-[#fbfaf7]/90 px-3 backdrop-blur md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="press grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
          <Menu size={19} />
        </button>
        <span className="text-sm font-semibold">Dashboard</span>
        <span className="w-9" />
      </div>
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-[#f4f2ed] md:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/30 [animation:fadeIn_200ms_ease-out]" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[80%] max-w-[300px] bg-[#f4f2ed] shadow-xl [animation:slideIn_300ms_var(--ease-drawer)]">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-2 top-3 grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
              <X size={18} />
            </button>
            {nav}
          </aside>
          <style>{`@keyframes fadeIn{from{opacity:0}}@keyframes slideIn{from{transform:translateX(-100%)}}`}</style>
        </div>
      )}
    </>
  );
}
