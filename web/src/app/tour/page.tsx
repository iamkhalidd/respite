import type { Metadata } from "next";
import Link from "next/link";
import { Phone, X } from "lucide-react";
import { api } from "@/lib/api";
import { getHouse } from "@/lib/content";
import { Booking } from "./booking";

export const metadata: Metadata = { title: "Book a tour", description: "Pick a time to visit the house in Chester, Virginia, and see the rooms before you decide." };
export const dynamic = "force-dynamic";

type Slots = { enabled: boolean; days: { date: string; times: string[] }[] };

export default async function TourPage() {
  const [slots, house] = await Promise.all([api.get<Slots>("/public/tours/slots").catch((): Slots => ({ enabled: false, days: [] })), getHouse()]);
  const phone = { label: house.phone, href: house.phoneHref };
  if (slots.enabled) return <Booking days={slots.days} phone={phone} address={house.address} />;

  // no weekly times set yet: tours are by phone
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-5 sm:px-6">
        <Link href="/" aria-label="Close and go home" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink">
          <X size={22} />
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
        <h1 className="display-2 text-[clamp(2.1rem,5.4vw,3.4rem)]" style={{ textWrap: "balance" }}>
          Come and see the house.
        </h1>
        <p className="mt-4 max-w-xl text-[1.05rem] text-ink/65" style={{ textWrap: "pretty" }}>
          Call and we&apos;ll set up a time that works for you. {house.tourNote}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <a href={house.phoneHref} className="btn btn-primary press mono !h-12 !px-6">
            <Phone size={16} /> {house.phone}
          </a>
          <Link href="/apply" className="btn btn-ghost press !h-12 !px-6">
            Request a room instead
          </Link>
        </div>
      </main>
    </div>
  );
}
