"use client";
import { useEffect } from "react";
import { Page, Card, btnPrimary, btnQuiet } from "./ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Page title="That didn't load" eyebrow="Something went wrong">
      <Card className="px-5 py-10 text-center sm:px-6">
        <p className="mx-auto max-w-sm text-[0.95rem] leading-relaxed text-moss">Nothing was lost. Try again, and if it keeps happening, check your connection.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className={btnPrimary}>
            Try again
          </button>
          {/* A full page load on purpose: it clears whatever state broke. */}
          <a href="/admin" className={btnQuiet}>
            Back to the overview
          </a>
        </div>
        {error.digest && <p className="mono mt-5 text-[0.7rem] uppercase text-ink/35">Ref {error.digest}</p>}
      </Card>
    </Page>
  );
}
