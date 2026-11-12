import Link from "next/link";
import { Page, Card, btnPrimary } from "./ui";

export default function NotFound() {
  return (
    <Page title="Nothing here" eyebrow="Not found">
      <Card className="px-5 py-10 text-center sm:px-6">
        <p className="mx-auto max-w-sm text-[0.95rem] leading-relaxed text-moss">This request, resident or room no longer exists, or the link is wrong.</p>
        <Link href="/admin" className={`${btnPrimary} mt-5`}>
          Back to the overview
        </Link>
      </Card>
    </Page>
  );
}
