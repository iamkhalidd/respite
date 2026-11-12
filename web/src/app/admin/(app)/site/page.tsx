import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { admin } from "@/lib/api";
import type { SiteContent } from "@/lib/types";
import { Page, btnQuiet } from "../ui";
import { FaqEditor, HomeEditor, HouseEditor, WhoEditor } from "./editors";

const TABS = [
  { key: "home", label: "Home page" },
  { key: "who", label: "Who it's for" },
  { key: "faq", label: "Questions" },
  { key: "house", label: "House details" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export const metadata = { title: "Website" };

export default async function SiteAdmin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab: asked }, content] = await Promise.all([searchParams, admin.get<SiteContent & { defaults: Omit<SiteContent, "house"> & { house: Omit<SiteContent["house"], "phoneHref"> } }>("/admin/content")]);
  const tab: Tab = TABS.some((t) => t.key === asked) ? (asked as Tab) : "home";
  const { defaults } = content;
  const { phoneHref, ...house } = content.house;
  void phoneHref; // the site works this out from the number

  return (
    <Page
      title="Website"
      eyebrow="Words, photos and contact details"
      actions={
        <Link className={btnQuiet} href={tab === "house" ? "/" : tab === "faq" ? "/#faq" : tab === "who" ? "/#who" : "/"} target="_blank">
          View on site <ArrowUpRight size={15} />
        </Link>
      }
    >
      <nav aria-label="Website sections" className="no-scrollbar -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-full bg-ink/[.05] p-1">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={`/admin/site?tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[0.9rem] transition-colors duration-150 ${tab === t.key ? "bg-paper font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/.08)] ring-1 ring-line" : "text-moss hover:text-ink"}`}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* key: switching tabs starts the editor fresh from what's saved */}
      {tab === "home" && <HomeEditor key="home" initial={content.home} defaults={defaults.home} />}
      {tab === "who" && <WhoEditor key="who" initial={content.who} defaults={defaults.who} />}
      {tab === "faq" && <FaqEditor key="faq" initial={content.faq} defaults={defaults.faq} />}
      {tab === "house" && <HouseEditor key="house" initial={house} defaults={defaults.house} />}
    </Page>
  );
}
