import { NextRequest, NextResponse } from "next/server";
import { createInvoiceAccessToken } from "@/lib/customer-billing-access";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getCustomerInvoiceSnapshot } from "@/lib/stripe-billing";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`pay-access:${ip}`, 10, 60_000);

  if (!limit.ok) {
    return redirectTo(request, "/pay?error=rate_limited");
  }

  const formData = await request.formData();
  const priorToken = String(formData.get("token") ?? "").trim();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!invoiceId || !email) {
    return redirectTo(request, priorToken ? `/pay?error=expired&token=${encodeURIComponent(priorToken)}` : "/pay?error=not_found");
  }

  const snapshot = await getCustomerInvoiceSnapshot(invoiceId);

  if (!snapshot || snapshot.customer.email.toLowerCase() !== email) {
    return redirectTo(request, priorToken ? `/pay?error=expired&token=${encodeURIComponent(priorToken)}` : "/pay?error=not_found");
  }

  const token = createInvoiceAccessToken(invoiceId);
  return redirectTo(request, `/pay/${token}`);
}
