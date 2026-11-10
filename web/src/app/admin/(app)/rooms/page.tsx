import Link from "next/link";
import { getRoomsWithBeds } from "@/lib/availability";
import { money, parseList } from "@/lib/format";
import { RoomImage } from "@/components/room-art";
import { WindowRow } from "@/components/house";
import { availabilityText } from "@/components/room-card";
import { Page } from "../ui";

export default async function RoomsAdmin() {
  const rooms = await getRoomsWithBeds();
  return (
    <Page title="Rooms & beds">
      <p className="-mt-6 mb-8 max-w-xl text-[0.95rem] text-ink/55">
        Changes here show up on the public site right away. Beds become open automatically when a resident moves out.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rooms.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/rooms/${r.id}`} className="group flex gap-4 rounded-xl bg-white p-3 ring-1 ring-line transition-shadow hover:shadow-[0_8px_24px_-12px_rgb(23_33_28/.3)]">
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg">
                <RoomImage photos={parseList(r.photos)} tone={r.tone} alt="" />
              </div>
              <div className="min-w-0 py-1">
                <p className="font-semibold">{r.name}</p>
                <p className="text-[0.85rem] text-ink/55">
                  {r.kind === "PRIVATE" ? "Private" : "Shared"} · {money(r.rentCents)}/mo · {parseList(r.photos).length} photos
                </p>
                <p className="mt-3 flex items-center gap-2 text-[0.85rem]">
                  <WindowRow states={r.states.map((s) => s.state)} size={8} /> {availabilityText(r)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
