"use client";
import { useEffect } from "react";
import { PHONE, PHONE_HREF } from "@/lib/labels";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="min-h-dvh bg-oat text-ink">
      <main className="mx-auto max-w-xl px-4 pb-20 pt-16 sm:px-5">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display-2 mt-3 text-[clamp(2.2rem,8vw,3rem)]">That didn&apos;t go through.</h1>
        <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-moss">You have not been charged. Try again, and if it happens twice, call the house and we will sort it out.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button onClick={reset} className="press inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 font-medium text-white">
            Try again
          </button>
          <a href={PHONE_HREF} className="press mono inline-flex h-12 items-center justify-center rounded-full px-6 text-[0.92rem] ring-1 ring-line-strong">
            Call {PHONE}
          </a>
        </div>
      </main>
    </div>
  );
}
