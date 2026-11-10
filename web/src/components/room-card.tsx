import Link from "next/link";
import type { RoomWithBeds } from "@/lib/availability";
import { money, parseList, shortDate } from "@/lib/format";
import { RoomImage } from "./room-art";
import { WindowRow } from "./house";

export function availabilityText(room: Pick<RoomWithBeds, "open" | "soon" | "states">) {
  if (room.open > 0) return room.states.length > 1 ? `${room.open} of ${room.states.length} beds open` : "Open now";
  if (room.soon) return `Opens ${shortDate(room.soon)}`;
  return "Full · join the waitlist";
}

export function RoomCard({ room, priority = false }: { room: RoomWithBeds; priority?: boolean }) {
  const photos = parseList(room.photos);
  return (
    <Link href={`/rooms/${room.slug}`} className="group block" prefetch={priority}>
      <div className="relative aspect-[4/4.6] overflow-hidden rounded-xl bg-oat">
        <div className="h-full w-full transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.035]">
          <RoomImage photos={photos} tone={room.tone} alt={room.name} />
        </div>
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-2 mono rounded-full px-2.5 py-1.5 text-[0.74rem] font-medium backdrop-blur ${
            room.open ? "bg-white/95 text-ink" : "bg-ink/75 text-white"
          }`}
        >
          <WindowRow states={room.states.map((s) => s.state)} size={7} />
          {availabilityText(room)}
        </span>
      </div>
      <div className="mt-3.5 flex items-start justify-between gap-4 px-0.5">
        <div className="min-w-0">
          <h3 className="truncate text-[1.15rem] font-medium tracking-[-0.03em]">{room.name}</h3>
          <p className="text-[0.9rem] text-moss">
            {room.kind === "PRIVATE" ? "Private room" : "Shared room"} · {room.floor === "Ground" ? "Ground floor" : "Upstairs"} · {room.bathroom} bath
          </p>
        </div>
        <p className="shrink-0 text-right text-[0.95rem]">
          <span className="mono tabular font-medium">{money(room.rentCents)}</span>
          <span className="text-moss"> /mo</span>
        </p>
      </div>
    </Link>
  );
}
