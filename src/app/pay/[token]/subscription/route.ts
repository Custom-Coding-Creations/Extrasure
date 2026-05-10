import { NextRequest, NextResponse } from "next/server";
import { inspectInvoiceAccessToken } from "@/lib/customer-billing-access";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getCustomerInvoiceSnapshot, setCustomerSubscriptionLifecycle } from "@/lib/stripe-billing";

type SubscriptionAction = "pause" | "resume" | "cancel";

function redirectTo(request: NextRequest, target: string) {
  const url = new URL(target, request.url);
  return NextResponse.redirect(url);
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ token: string }>;
  },
) {
  const { token } = await context.params;
  const ip = getRequestIp(request);
  const limit = checkRateLimit(`pay-subscription:${token}:${ip}`, 6, 60_000);

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

  const snapshot = await getCustomerInvoiceSnapshot(result.payload.invoiceId);

  if (!snapshot) {
    return redirectTo(request, "/pay?error=not_found");
  }

  if (!snapshot.customer.stripeSubscriptionId) {
    return redirectTo(request, `/pay/${token}?stripe=subscription_error`);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "") as SubscriptionAction;

  if (action !== "pause" && action !== "resume" && action !== "cancel") {
    return redirectTo(request, `/pay/${token}?stripe=subscription_error`);
  }

  const lifecycleResult = await setCustomerSubscriptionLifecycle(snapshot.customer.id, action);

  if (!lifecycleResult.ok) {
    return redirectTo(request, `/pay/${token}?stripe=subscription_error`);
  }

  return redirectTo(request, `/pay/${token}?stripe=subscription_${action}`);
}
