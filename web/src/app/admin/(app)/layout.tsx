import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBeds } from "@/lib/availability";
import { Sidebar } from "./sidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const [newRequests, overdue, beds] = await Promise.all([
    db.request.count({ where: { status: "NEW" } }),
    db.charge.count({ where: { status: "DUE", dueDate: { lt: new Date(Date.now() - 86400000) } } }),
    getBeds(),
  ]);
  return (
    <div className="min-h-dvh bg-oat text-ink md:grid md:grid-cols-[236px_minmax(0,1fr)]">
      <Sidebar newRequests={newRequests} overdue={overdue} beds={beds.map((b) => b.state)} />
      {/* bottom padding clears the phone tab bar */}
      <div className="min-w-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
    </div>
  );
}
