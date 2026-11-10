import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "./sidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const [newRequests, due] = await Promise.all([
    db.request.count({ where: { status: "NEW" } }),
    db.charge.count({ where: { status: "DUE", dueDate: { lt: new Date() } } }),
  ]);
  return (
    <div className="min-h-dvh bg-[#fbfaf7] text-ink md:grid md:grid-cols-[248px_1fr]">
      <Sidebar newRequests={newRequests} overdue={due} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
