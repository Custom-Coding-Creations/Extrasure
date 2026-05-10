import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiRole, requireAdminApiSession } from "@/lib/admin-auth";
import { getAdminState, queuePaymentRetry } from "@/lib/admin-store";
import {
  createCustomerPaymentLink,
  createBillingPortalSession,
  createInvoiceCheckoutSession,
  refundPaymentById,
} from "@/lib/stripe-billing";

type PaymentActionPayload = {
  action?: "collect" | "portal" | "refund" | "retry" | "link";
  invoiceId?: string;
  customerId?: string;
  paymentId?: string;
};

function hasValue(input: string | undefined) {
  return Boolean(input && input.trim().length > 0);
}

export async function GET() {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getAdminState();

  return NextResponse.json({
    ok: true,
    invoices: state.invoices,
    payments: state.payments,
  });
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PaymentActionPayload;

  try {
    payload = (await request.json()) as PaymentActionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload.action === "portal") {
    const roleSession = await requireAdminApiRole(["owner", "dispatch", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.customerId)) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const portal = await createBillingPortalSession(payload.customerId as string);

    return NextResponse.json({
      ok: true,
      action: "portal",
      url: portal.url,
    });
  }

  if (payload.action === "refund") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.paymentId)) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const refund = await refundPaymentById(payload.paymentId as string);

    return NextResponse.json({
      ok: true,
      action: "refund",
      refundId: refund.id,
      status: refund.status,
    });
  }

  if (payload.action === "link") {
    const roleSession = await requireAdminApiRole(["owner", "dispatch", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.invoiceId)) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const state = await getAdminState();
    const invoice = state.invoices.find((item) => item.id === payload.invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid" || invoice.status === "refunded") {
      return NextResponse.json({ error: "Invoice is not eligible for a payment link" }, { status: 400 });
    }

    const url = createCustomerPaymentLink(invoice.id);

    return NextResponse.json({
      ok: true,
      action: "link",
      invoiceId: invoice.id,
      url,
    });
  }

  if (!hasValue(payload.invoiceId)) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  if (payload.action === "collect") {
    const roleSession = await requireAdminApiRole(["owner", "dispatch", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const checkout = await createInvoiceCheckoutSession(payload.invoiceId as string);

    return NextResponse.json({
      ok: true,
      action: "collect",
      sessionId: checkout.id,
      url: checkout.url,
    });
  }

  const invoiceId = payload.invoiceId as string;
  const result = await queuePaymentRetry(invoiceId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    invoiceId: result.invoice.id,
    action: "retry_queued",
    provider: "stripe",
    retryEventId: result.retryEventId,
    retryPaymentId: result.retryPaymentId,
    queuedAt: new Date().toISOString(),
    message: "Retry queued for internal follow-up.",
  });
}
