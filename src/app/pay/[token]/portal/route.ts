import { NextRequest, NextResponse } from "next/server";
import { decodeInvoiceAccessToken } from "@/lib/customer-billing-access";
import { createBillingPortalSession, getCustomerInvoiceSnapshot } from "@/lib/stripe-billing";
import { getBaseUrl } from "@/lib/stripe";

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

  if (!snapshot) {
    return redirectTo(request, "/pay?error=not_found");
  }

  const session = await createBillingPortalSession(snapshot.customer.id, {
    returnUrl: `${getBaseUrl()}/pay/${token}?stripe=portal_return`,
  });

  return NextResponse.redirect(session.url);
}
