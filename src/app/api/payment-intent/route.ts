import { NextRequest, NextResponse } from "next/server";
import { getPaymentClientSecret } from "@/lib/stripe-billing";
import { inspectInvoiceAccessToken } from "@/lib/customer-billing-access";

/**
 * Phase 1: API route to get Payment Element client secret
 * Used by customer payment page to initialize Stripe Payment Element
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify the token is valid
    const tokenResult = inspectInvoiceAccessToken(token);

    if (!tokenResult.ok) {
      return NextResponse.json(
        { error: tokenResult.reason === "expired" ? "Token expired" : "Invalid token" },
        { status: 401 }
      );
    }

    const { invoiceId } = tokenResult.payload;

    // Get the client secret for Payment Element
    const result = await getPaymentClientSecret(invoiceId);

    return NextResponse.json({
      ok: true,
      clientSecret: result.clientSecret,
      type: result.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
