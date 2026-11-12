import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { admin, orNull } from "@/lib/api";
import type { Statement } from "@/lib/types";
import { StatementSheet } from "@/components/statement";

export const metadata = { title: "Rent statement" };

export default async function ResidentStatement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await orNull(admin.get<Statement>(`/admin/residents/${encodeURIComponent(id)}/statement`));
  if (!s) notFound();
  return (
    <StatementSheet
      s={s}
      back={
        <Link href={`/admin/residents/${id}`} className="inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-moss hover:text-ink">
          <ArrowLeft size={15} /> {s.resident.name}
        </Link>
      }
    />
  );
}
