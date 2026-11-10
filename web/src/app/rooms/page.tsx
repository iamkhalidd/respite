import Link from "next/link";
import type { Metadata } from "next";
import { X } from "lucide-react";
import { getRoomsWithBeds } from "@/lib/availability";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { SearchBar } from "@/components/search-bar";
import { RoomCard } from "@/components/room-card";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Rooms and availability" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

const CHIPS: { key: string; label: string; value: string }[] = [
  { key: "stairs", label: "No stairs", value: "none" },
  { key: "bath", label: "Private bathroom", value: "private" },
  { key: "max", label: "Under $700", value: "70000" },
];

export default async function RoomsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const all = await getRoomsWithBeds();
  const in60 = Date.now() + 60 * 86400000;

  let rooms = all.filter((r) => {
    if (sp.kind && r.kind !== sp.kind) return false;
    if (sp.when === "now" && r.open === 0) return false;
    if (sp.when === "soon" && r.open === 0 && !(r.soon && r.soon.getTime() < in60)) return false;
    if (sp.stairs === "none" && r.floor !== "Ground") return false;
    if (sp.bath === "private" && r.bathroom !== "Private") return false;
    if (sp.max && r.rentCents > Number(sp.max)) return false;
    return true;
  });
  // Seniors see ground-floor rooms first; everyone sees open rooms before full ones.
  rooms = rooms.sort(
    (a, b) =>
      Number(b.open > 0) - Number(a.open > 0) ||
      (sp.program === "SENIOR" ? Number(b.floor === "Ground") - Number(a.floor === "Ground") : 0) ||
      a.sortOrder - b.sortOrder,
  );

  const href = (patch: SP) => {
    const q = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && q.set(k, v));
    return `/rooms${q.size ? `?${q}` : ""}`;
  };
  const activeCount = ["kind", "when", "stairs", "bath", "max", "program"].filter((k) => sp[k]).length;
  const openBeds = all.reduce((n, r) => n + r.open, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1240px] px-4 pb-28 sm:px-6">
        <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-oat/85 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex justify-center">
            <SearchBar compact initial={{ program: sp.program ?? "", kind: sp.kind ?? "", when: sp.when ?? "" }} />
          </div>
          <div className="no-scrollbar mx-auto mt-4 flex max-w-3xl gap-2 overflow-x-auto">
            {CHIPS.map((c) => {
              const on = sp[c.key] === c.value;
              return (
                <Link
                  key={c.key}
                  href={href({ [c.key]: on ? undefined : c.value })}
                  scroll={false}
                  aria-pressed={on}
                  className={`press shrink-0 rounded-full px-4 py-2 text-[0.9rem] font-medium ring-1 ${
                    on ? "bg-ink text-paper ring-ink" : "bg-paper text-ink ring-line hover:ring-line-strong"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
            {activeCount > 0 && (
              <Link href="/rooms" scroll={false} className="press inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[0.9rem] font-medium text-ink/60 hover:text-ink">
                <X size={14} /> Clear all
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 pb-8 pt-12">
          <div>
            <h1 className="display text-[clamp(2.4rem,5vw,4rem)]">Rooms in Chester, VA</h1>
            <p className="mt-3 text-ink/65">
              {rooms.length} of {all.length} rooms match · <span className="font-semibold text-ink">{openBeds} beds open in the house</span>
            </p>
          </div>
        </div>

        {rooms.length ? (
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r, i) => (
              <Reveal key={r.id} delay={i * 60}>
                <RoomCard room={r} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] bg-paper p-10 text-center ring-1 ring-line sm:p-16">
            <p className="display text-3xl">No rooms match those filters.</p>
            <p className="mx-auto mt-3 max-w-md text-ink/65">
              Remove a filter to see more, or send a request anyway. We keep a waitlist and call when a bed opens.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/rooms" className="btn btn-ghost press">Clear filters</Link>
              <Link href="/apply" className="btn btn-primary press">Join the waitlist</Link>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
