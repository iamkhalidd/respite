import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api, orNull } from "@/lib/api";
import type { Statement } from "@/lib/types";
import { StatementSheet } from "@/components/statement";

export const metadata: Metadata = { title: "Your rent statement", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PortalStatement({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await orNull(api.get<Statement>(`/portal/${encodeURIComponent(token)}/statement`));
  if (!s) notFound();
  return (
    <main id="main" className="min-h-dvh bg-oat text-ink print:bg-white">
      <StatementSheet
        s={s}
        back={
          <Link href={`/portal/${token}`} className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-moss hover:text-ink">
            <ArrowLeft size={15} /> Back to your page
          </Link>
        }
      />
    </main>
  );
}
