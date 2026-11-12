import { passFile } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/** Payments or charges as a spreadsheet: /admin/export?kind=payments&from=2026-01-01&to=2026-12-31 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  q.set("kind", sp.get("kind") === "charges" ? "charges" : "payments");
  for (const k of ["from", "to"]) {
    const v = sp.get(k);
    if (v) q.set(k, v);
  }
  return passFile(`/admin/export.csv?${q}`, { admin: true });
}
