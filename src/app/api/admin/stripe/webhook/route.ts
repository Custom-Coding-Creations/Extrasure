import { NextRequest, NextResponse } from "next/server";
import { handleStripeEvent, recordStripeWebhookEvent } from "@/lib/stripe-billing";
import { getStripeWebhookSecret, stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const recorded = await recordStripeWebhookEvent(event);

  if (!recorded.duplicate) {
    await handleStripeEvent(event);
  }

  return NextResponse.json({
    ok: true,
    received: true,
    duplicate: recorded.duplicate,
    eventId: event.id,
    eventType: event.type,
  });
}
