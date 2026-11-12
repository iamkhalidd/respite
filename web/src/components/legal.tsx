import { SiteFooter, SiteHeader } from "./site-chrome";

/** Shared frame for the privacy and terms pages: one readable column, plain headings. */
export function LegalPage({ title, intro, updated, children }: { title: string; intro: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[680px] px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
        <p className="eyebrow">Last updated {updated}</p>
        <h1 className="display-2 mt-3 text-[clamp(2.1rem,5.4vw,3rem)]" style={{ textWrap: "balance" }}>
          {title}
        </h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-ink/70" style={{ textWrap: "pretty" }}>
          {intro}
        </p>
        <div className="mt-12 space-y-11">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-[1rem] leading-relaxed text-ink/75 [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5" style={{ textWrap: "pretty" }}>
        {children}
      </div>
    </section>
  );
}
