"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";

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
