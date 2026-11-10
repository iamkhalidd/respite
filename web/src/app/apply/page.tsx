import type { Metadata } from "next";
import { getRoomsWithBeds } from "@/lib/availability";
import { Flow } from "./flow";

export const metadata: Metadata = { title: "Request a room" };
export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const rooms = await getRoomsWithBeds();
  return (
    <Flow
      rooms={rooms.map((r) => ({
        slug: r.slug,
        name: r.name,
        kind: r.kind,
        floor: r.floor,
        rentCents: r.rentCents,
        tone: r.tone,
        states: r.states.map((s) => s.state),
        open: r.open,
        soon: r.soon ? r.soon.toISOString() : null,
      }))}
      initialRoom={sp.room}
      initialFor={sp.for === "PROFESSIONAL" ? "PROFESSIONAL" : undefined}
    />
  );
}
