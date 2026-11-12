import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, orNull } from "@/lib/api";
import { getHouse } from "@/lib/content";
import { QuietPage, quietGhost, quietSolid } from "@/components/quiet-page";
import { leaveWaitlist } from "../../tour/actions";

export const metadata: Metadata = { title: "Your waitlist place", robots: { index: false } };
export const dynamic = "force-dynamic";

type Entry = { firstName: string; status: "WAITING" | "NOTIFIED" | "REMOVED"; room: string | null };

/** The link in waitlist emails: leave the list in one tap. */
export default async function WaitlistPlace({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [entry, house] = await Promise.all([orNull(api.get<Entry>(`/public/waitlist/${encodeURIComponent(token)}`)), getHouse()]);
  if (!entry) notFound();
  const left = entry.status === "REMOVED";

  return (
    <QuietPage>
      <p className="mono text-[0.72rem] uppercase text-white/45">{left ? "Off the waitlist" : "On the waitlist"}</p>
      <h1 className="display-2 mt-3 text-[clamp(2rem,7vw,2.8rem)]" style={{ textWrap: "balance" }}>
        {left ? `You're off the list, ${entry.firstName}.` : `Leave the waitlist, ${entry.firstName}?`}
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-[0.98rem] leading-relaxed text-white/60" style={{ textWrap: "pretty" }}>
        {left
          ? "We won't email you about open beds. If you change your mind, join again any time."
          : `You'll stop getting emails about open beds${entry.room ? ` in ${entry.room}` : ""}.`}
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {left ? (
          <Link href="/waitlist" className={quietSolid}>
            Join again
          </Link>
        ) : (
          <form action={leaveWaitlist.bind(null, token)} className="w-full sm:w-auto">
            <button className={quietSolid}>Yes, take me off</button>
          </form>
        )}
        <Link href="/rooms" className={quietGhost}>
          See the rooms
        </Link>
      </div>
      <p className="mono mt-8 text-[0.8rem] text-white/40">
        Questions? <a href={house.phoneHref} className="underline underline-offset-4 hover:text-white/70">{house.phone}</a>
      </p>
    </QuietPage>
  );
}
