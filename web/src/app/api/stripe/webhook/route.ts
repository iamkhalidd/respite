import type Stripe from "stripe";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { settleSession } from "@/lib/payments";

/** Stripe → marks charges paid, including bank (ACH) payments that clear days later. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeEnabled() || !secret) return new Response("Not configured", { status: 404 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await settleSession(event.data.object as Stripe.Checkout.Session);
  }
  return Response.json({ received: true });
}
