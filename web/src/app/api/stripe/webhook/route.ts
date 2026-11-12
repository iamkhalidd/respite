import { revalidatePath } from "next/cache";
import { API_URL } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Stripe → API, untouched: the API checks the signature against the exact raw body. */
export async function POST(req: Request) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": req.headers.get("content-type") ?? "application/json", "stripe-signature": req.headers.get("stripe-signature") ?? "" },
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return new Response("API unreachable", { status: 503 }); // Stripe retries
  }
  if (res.ok) revalidatePath("/", "layout");
  return new Response(await res.text(), { status: res.status });
}
