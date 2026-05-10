import { NextRequest, NextResponse } from "next/server";
import { inspectInvoiceAccessToken } from "@/lib/customer-billing-access";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { createInvoiceCheckoutSession, getCustomerInvoiceSnapshot } from "@/lib/stripe-billing";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`pay-checkout:${token}:${ip}`, 8, 60_000);

  if (!limit.ok) {
    return redirectTo(request, `/pay/${token}?stripe=rate_limited`);
  }

  const result = inspectInvoiceAccessToken(token);

  if (!result.ok) {
    if (result.reason === "expired") {
      return redirectTo(request, `/pay?error=expired&token=${encodeURIComponent(token)}`);
    }

    return redirectTo(request, "/pay?error=not_found");
  }

  const payload = result.payload;

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
