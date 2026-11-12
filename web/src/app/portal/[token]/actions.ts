"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";

const ids = (form: FormData) => String(form.get("charges") ?? "").split(",").filter(Boolean);

/** Sends the resident to Stripe Checkout, or to the test-mode pay screen when Stripe isn't set up. */
export async function startCheckout(token: string, form: FormData) {
  const { url } = await api.post<{ url: string }>(`/portal/${encodeURIComponent(token)}/checkout`, { chargeIds: ids(form) });
  redirect(url);
}

/** Test mode only: records the payment without moving money. */
export async function demoPay(token: string, chargeIds: string[]) {
  await api.post(`/portal/${encodeURIComponent(token)}/demo-pay`, { chargeIds });
  revalidatePath("/", "layout");
  redirect(`/portal/${token}?paid=1`);
}

export type RepairState = { error?: string; ok?: string } | null;

/** A resident telling the house something needs fixing. The owners get an alert right away. */
export async function reportRepair(token: string, _: RepairState, form: FormData): Promise<RepairState> {
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 3) return { error: "Tell us what needs fixing." };
  try {
    await api.post(`/portal/${encodeURIComponent(token)}/repairs`, {
      area: String(form.get("area") ?? "Other"),
      body,
      urgent: form.get("urgent") === "on",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status < 500) return { error: e.message };
    throw e;
  }
  revalidatePath(`/portal/${token}`);
  return { ok: "Sent. The house has been told." };
}
