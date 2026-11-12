import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRoomsWithBeds } from "@/lib/availability";
import { money, parseList } from "@/lib/format";
import { RoomImage } from "@/components/room-art";
import { WindowRow } from "@/components/house";
import { availabilityText } from "@/components/room-card";
import { Page } from "../ui";

export default async function RoomsAdmin() {
  const rooms = await getRoomsWithBeds();
  const beds = rooms.reduce((n, r) => n + r.states.length, 0);
  const open = rooms.reduce((n, r) => n + r.states.filter((s) => s.state === "open").length, 0);
  return (
    <Page title="Rooms" eyebrow={`${rooms.length} rooms · ${beds} beds · ${open} open`}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rooms.map((r) => {
          const photos = parseList(r.photos);
          return (
            <li key={r.id}>
              <Link href={`/admin/rooms/${r.id}`} className="group flex h-full items-center gap-4 rounded-2xl bg-paper p-3 ring-1 ring-line transition-[box-shadow] duration-200 hover:ring-line-strong">
                <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                  <RoomImage photos={photos} tone={r.tone} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold tracking-[-0.02em]">{r.name}</p>
                  <p className="mt-0.5 truncate text-[0.85rem] text-moss">
                    {r.kind === "PRIVATE" ? "Private" : "Shared"} · <span className="mono tabular">{money(r.rentCents)}</span> a month
                  </p>
                  <p className="mt-2.5 flex items-center gap-2 text-[0.85rem]">
                    <WindowRow states={r.states.map((s) => s.state)} size={8} /> <span className="truncate">{availabilityText(r).replace(" · join the waitlist", "")}</span>
                  </p>
                  {!photos.length && <p className="mono mt-1.5 text-[0.7rem] uppercase text-ember">Needs photos</p>}
                </div>
                <ChevronRight size={18} className="shrink-0 text-ink/30 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 max-w-xl text-[0.88rem] leading-relaxed text-moss">Changes show on the public site right away. A bed opens by itself when its resident moves out.</p>
    </Page>
  );
}
