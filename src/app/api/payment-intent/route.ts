import { NextRequest, NextResponse } from "next/server";
import { applyAchDiscountIfEligible, attachPaymentMethodPreference, getPaymentClientSecret } from "@/lib/stripe-billing";
import { inspectInvoiceAccessToken } from "@/lib/customer-billing-access";

/**
 * Returns a Checkout Session client secret for Checkout Elements.
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

    const result = await getPaymentClientSecret(invoiceId, {
      context: "customer",
      returnPath: `/pay/${token}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    });

    if (result.paymentIntentId) {
      await attachPaymentMethodPreference(result.paymentIntentId, result.preferredPaymentMethod);

      if (result.preferredPaymentMethod === "ach") {
        await applyAchDiscountIfEligible(result.paymentIntentId, result.customerId, result.amount);
      }
    }

    return NextResponse.json({
      ok: true,
      clientSecret: result.clientSecret,
      sessionId: result.sessionId,
      type: result.type,
      paymentElementOptions: result.paymentElementOptions,
      achDiscount: result.achDiscount,
      preferredPaymentMethod: result.preferredPaymentMethod,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
