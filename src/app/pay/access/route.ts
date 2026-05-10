import { NextRequest, NextResponse } from "next/server";
import { createInvoiceAccessToken } from "@/lib/customer-billing-access";
import { getCustomerInvoiceSnapshot } from "@/lib/stripe-billing";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!invoiceId || !email) {
    return redirectTo(request, "/pay?error=not_found");
  }

  const snapshot = await getCustomerInvoiceSnapshot(invoiceId);

  if (!snapshot || snapshot.customer.email.toLowerCase() !== email) {
    return redirectTo(request, "/pay?error=not_found");
  }

  const token = createInvoiceAccessToken(invoiceId);
  return redirectTo(request, `/pay/${token}`);
}
