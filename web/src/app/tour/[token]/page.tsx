import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, orNull } from "@/lib/api";
import { getHouse } from "@/lib/content";
import { QuietPage as Shell, quietGhost as ghost, quietSolid as solid } from "@/components/quiet-page";
import { cancelTour } from "../actions";

export const metadata: Metadata = { title: "Your tour", robots: { index: false } };
export const dynamic = "force-dynamic";

type Tour = { when: string; firstName: string; status: "BOOKED" | "DONE" | "NO_SHOW" | "CANCELLED"; past: boolean; phone: string };

/** The link in the visitor's email: shows the tour and lets them cancel it. */
export default async function YourTour({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ cancel?: string }> }) {
  const [{ token }, { cancel }] = await Promise.all([params, searchParams]);
  const [tour, house] = await Promise.all([orNull(api.get<Tour>(`/public/tours/${encodeURIComponent(token)}`)), getHouse()]);
  if (!tour) notFound();
  const live = tour.status === "BOOKED" && !tour.past;

  return (
    <Shell>
      <p className="mono text-[0.72rem] uppercase text-white/45">{tour.status === "CANCELLED" ? "Cancelled" : live ? "Your tour" : "Past tour"}</p>
      <h1 className="display-2 mt-3 text-[clamp(2rem,7vw,2.8rem)]" style={{ textWrap: "balance" }}>
        {tour.when}
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-[0.98rem] leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
        {tour.status === "CANCELLED"
          ? `This tour is cancelled, ${tour.firstName}. Pick another time whenever you're ready.`
          : live
            ? `We'll see you then, ${tour.firstName}. The house is at ${house.address}.`
            : `Thanks for coming by, ${tour.firstName}.`}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {live && !cancel && (
          <Link href="?cancel=1" className={ghost}>
            Cancel this tour
          </Link>
        )}
        {live && cancel && (
          <>
            <form action={cancelTour.bind(null, token)} className="w-full sm:w-auto">
              <button className={`${solid} !bg-ember !text-white hover:!bg-ember/90`}>Yes, cancel it</button>
            </form>
            <Link href="?" className={ghost}>
              Keep it
            </Link>
          </>
        )}
        {!live && (
          <Link href="/tour" className={solid}>
            Book a time
          </Link>
        )}
        <a href={house.phoneHref} className={`${ghost} mono`}>
          Call {house.phone}
        </a>
      </div>
    </Shell>
  );
}
