import { NextRequest, NextResponse } from "next/server";
import { decodeInvoiceAccessToken } from "@/lib/customer-billing-access";
import { createInvoiceCheckoutSession, getCustomerInvoiceSnapshot } from "@/lib/stripe-billing";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const payload = decodeInvoiceAccessToken(token);

  if (!payload) {
    return redirectTo(request, "/pay?error=not_found");
  }

  const snapshot = await getCustomerInvoiceSnapshot(payload.invoiceId);

  if (!snapshot || snapshot.invoice.status === "paid" || snapshot.invoice.status === "refunded") {
    return redirectTo(request, `/pay/${token}?stripe=cancelled`);
  }

  const session = await createInvoiceCheckoutSession(snapshot.invoice.id, {
    context: "customer",
    successPath: `/pay/${token}?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelPath: `/pay/${token}?stripe=cancelled`,
  });

  return NextResponse.redirect(session.url as string);
}
