import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight, EyeOff } from "lucide-react";
import { admin } from "@/lib/api";
import type { RoomWithBeds } from "@/lib/types";
import { money, parseList } from "@/lib/format";
import { RoomImage } from "@/components/room-art";
import { WindowRow } from "@/components/house";
import { availabilityText } from "@/components/room-card";
import { moveRoom } from "../../actions";
import { Notice, Page } from "../ui";
import { NewRoom } from "./new-room";

export default async function RoomsAdmin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [rooms, { deleted }] = await Promise.all([admin.get<RoomWithBeds[]>("/admin/rooms"), searchParams]);
  const ids = rooms.map((r) => r.id);
  const beds = rooms.reduce((n, r) => n + r.states.length, 0);
  const open = rooms.reduce((n, r) => n + r.states.filter((s) => s.state === "open").length, 0);
  return (
    <Page title="Rooms" eyebrow={`${rooms.length} rooms · ${beds} beds · ${open} open`}>
      {deleted && <Notice>Room deleted. It no longer shows on the site.</Notice>}
      <div className="mb-6">
        <NewRoom />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rooms.map((r, i) => {
          const photos = parseList(r.photos);
          return (
            <li key={r.id} className="flex items-stretch gap-2">
              <Link href={`/admin/rooms/${r.id}`} className="group flex min-w-0 flex-1 items-center gap-4 rounded-2xl bg-paper p-3 ring-1 ring-line transition-[box-shadow] duration-200 hover:ring-line-strong">
                <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl sm:w-32">
                  <RoomImage photos={photos} tone={r.tone} alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold tracking-[-0.02em]">
                    <span className="truncate">{r.name}</span>
                    {r.hidden && (
                      <span className="mono inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-ink/[.06] px-2 text-[0.66rem] font-medium uppercase text-moss">
                        <EyeOff size={11} /> Hidden
                      </span>
                    )}
                  </p>
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
              {rooms.length > 1 && (
                <div className="flex flex-col gap-1">
                  {([[-1, ArrowUp, "up"], [1, ArrowDown, "down"]] as const).map(([by, Icon, word]) => {
                    const off = by === -1 ? i === 0 : i === rooms.length - 1;
                    return (
                      <form key={word} action={moveRoom.bind(null, ids, i, by)} className="flex flex-1">
                        <button
                          disabled={off}
                          aria-label={`Move ${r.name} ${word}`}
                          className="press grid w-10 flex-1 place-items-center rounded-xl bg-paper text-ink ring-1 ring-line transition-colors hover:bg-ink/[.04] disabled:pointer-events-none disabled:opacity-35"
                        >
                          <Icon size={15} />
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-6 max-w-xl text-[0.88rem] leading-relaxed text-moss">Changes show on the public site right away, in this order. A bed opens by itself when its resident moves out.</p>
    </Page>
  );
}
