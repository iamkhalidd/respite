import { Logo } from "@/components/site-chrome";
import { getHouse } from "@/lib/content";

export default async function PortalNotFound() {
  const house = await getHouse();
  return (
    <div className="min-h-dvh bg-oat text-ink">
      <header className="mx-auto max-w-xl px-5 py-5">
        <Logo />
      </header>
      <main className="mx-auto max-w-xl px-4 pb-20 sm:px-5">
        <p className="eyebrow mt-4">Pay link</p>
        <h1 className="display-2 mt-3 text-[clamp(2.2rem,8vw,3rem)]">This link doesn&apos;t work.</h1>
        <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-moss">It may have been copied without its last few letters. Open it again from the text or email you were sent, or call the house and we will send a new one.</p>
        <a href={house.phoneHref} className="press mono mt-7 inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-[0.95rem] text-white">
          Call {house.phone}
        </a>
      </main>
    </div>
  );
}
