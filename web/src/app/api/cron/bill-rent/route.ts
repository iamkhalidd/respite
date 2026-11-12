import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Runs on the 25th of each month (see vercel.json) and bills next month's rent.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; the API checks it against its own CRON_SECRET.
 */
export async function GET(req: Request) {
  const res = await api.raw("/cron/bill-rent", { method: "GET", headers: { authorization: req.headers.get("authorization") ?? "" } });
  if (res.ok) revalidatePath("/", "layout");
  return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}
