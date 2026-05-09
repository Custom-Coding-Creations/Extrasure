import { NextRequest, NextResponse } from "next/server";

// This endpoint is intentionally minimal in v1 scaffolding.
// Production implementation should validate STRIPE_WEBHOOK_SECRET and persist events.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  return NextResponse.json({
    ok: true,
    received: true,
    payloadBytes: payload.length,
    message: "Webhook received. Signature verification and event persistence pending implementation.",
  });
}
