import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiRole } from "@/lib/admin-auth";
import { getPaymentClientSecret } from "@/lib/stripe-billing";

export async function POST(request: NextRequest) {
  const session = await requireAdminApiRole(["owner", "dispatch", "accountant"]);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const invoiceId = String(body.invoiceId ?? "").trim();
    const savePaymentMethod = typeof body.savePaymentMethod === "boolean" ? body.savePaymentMethod : true;

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const result = await getPaymentClientSecret(invoiceId, {
      context: "admin",
      returnPath: `/admin/payments?stripe=success&invoice=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
      savePaymentMethod,
    });

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
    const message = error instanceof Error ? error.message : "Failed to initialize admin checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
