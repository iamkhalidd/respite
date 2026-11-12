import type { Metadata } from "next";
import { getRoomsWithBeds } from "@/lib/availability";
import { getHouse } from "@/lib/content";
import { WaitlistForm } from "./form";

export const metadata: Metadata = { title: "Join the waitlist", description: "Every bed is taken? Leave your email and we'll tell you when one opens." };
export const dynamic = "force-dynamic";

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const [{ room }, rooms, house] = await Promise.all([searchParams, getRoomsWithBeds(), getHouse()]);
  return (
    <WaitlistForm
      rooms={rooms.map((r) => ({ slug: r.slug, name: r.name, full: r.open === 0 && !r.soon }))}
      initialRoom={room}
      openBeds={rooms.reduce((n, r) => n + r.open, 0)}
      phone={{ label: house.phone, href: house.phoneHref }}
    />
  );
}
