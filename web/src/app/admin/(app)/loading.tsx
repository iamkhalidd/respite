/** Shown while a dashboard screen loads. Same shape as a page, so nothing jumps. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-16 pt-6 sm:px-8 md:pt-12" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="animate-pulse motion-reduce:animate-none">
        <div className="h-3 w-28 rounded bg-ink/[.07]" />
        <div className="mt-4 h-10 w-56 rounded-lg bg-ink/[.07]" />
        <div className="mt-9 h-36 rounded-2xl bg-ink/[.05]" />
        <div className="mt-5 h-64 rounded-2xl bg-ink/[.05]" />
      </div>
    </main>
  );
}
