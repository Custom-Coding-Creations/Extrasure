import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiRole, requireAdminApiSession } from "@/lib/admin-auth";
import { getAdminState } from "@/lib/admin-store";
import {
  createCustomerPaymentLink,
  createBillingPortalSession,
  createInvoiceCheckoutSession,
  createStripeInvoiceForLocalInvoice,
  finalizeStripeInvoiceForLocalInvoice,
  getStripeInvoiceDocumentLinks,
  replayLatestWebhookForInvoice,
  replayWebhookEventById,
  reconcileInvoiceFromStripe,
  setCustomerSubscriptionLifecycle,
  refundPaymentById,
} from "@/lib/stripe-billing";

type PaymentActionPayload = {
  action?:
    | "collect"
    | "portal"
    | "refund"
    | "retry"
    | "link"
    | "reconcile"
    | "replay"
    | "subscription"
    | "invoice_sync"
    | "invoice_finalize"
    | "invoice_pdf"
    | "invoice_links";
  invoiceId?: string;
  customerId?: string;
  paymentId?: string;
  eventId?: string;
  subscriptionAction?: "pause" | "resume" | "cancel";
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

  if (payload.action === "reconcile") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.invoiceId)) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const result = await reconcileInvoiceFromStripe(payload.invoiceId as string);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      action: "reconcile",
      ...result,
    });
  }

  if (payload.action === "invoice_sync") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.invoiceId)) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const stripeInvoice = await createStripeInvoiceForLocalInvoice(payload.invoiceId as string);

    return NextResponse.json({
      ok: true,
      action: "invoice_sync",
      stripeInvoiceId: stripeInvoice.id,
      status: stripeInvoice.status,
    });
  }

  if (payload.action === "invoice_finalize") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.invoiceId)) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const stripeInvoice = await finalizeStripeInvoiceForLocalInvoice(payload.invoiceId as string);

    return NextResponse.json({
      ok: true,
      action: "invoice_finalize",
      stripeInvoiceId: stripeInvoice.id,
      status: stripeInvoice.status,
    });
  }

  if (payload.action === "invoice_pdf") {
    const roleSession = await requireAdminApiRole(["owner", "dispatch", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.invoiceId)) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const links = await getStripeInvoiceDocumentLinks(payload.invoiceId as string);

    if (!links.pdfUrl) {
      return NextResponse.json({ error: "Stripe invoice PDF is not available until invoice finalization." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      action: "invoice_pdf",
      stripeInvoiceId: links.stripeInvoiceId,
      hostedInvoiceUrl: links.hostedInvoiceUrl,
      pdfUrl: links.pdfUrl,
    });
  }

  if (payload.action === "invoice_links") {
    const roleSession = await requireAdminApiRole(["owner", "dispatch", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.invoiceId)) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    const links = await getStripeInvoiceDocumentLinks(payload.invoiceId as string);

    if (!links.hostedInvoiceUrl && !links.pdfUrl) {
      return NextResponse.json(
        { error: "Stripe invoice links are not available yet. Try finalizing first." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      action: "invoice_links",
      stripeInvoiceId: links.stripeInvoiceId,
      hostedInvoiceUrl: links.hostedInvoiceUrl,
      pdfUrl: links.pdfUrl,
    });
  }

  if (payload.action === "replay") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = hasValue(payload.eventId)
      ? await replayWebhookEventById(payload.eventId as string)
      : hasValue(payload.invoiceId)
        ? await replayLatestWebhookForInvoice(payload.invoiceId as string)
        : { ok: false as const, error: "eventId or invoiceId is required" };

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      action: "replay",
      ...result,
    });
  }

  if (payload.action === "subscription") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!hasValue(payload.customerId) || !hasValue(payload.subscriptionAction)) {
      return NextResponse.json({ error: "customerId and subscriptionAction are required" }, { status: 400 });
    }

    const result = await setCustomerSubscriptionLifecycle(
      payload.customerId as string,
      payload.subscriptionAction as "pause" | "resume" | "cancel",
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      action: "subscription",
      ...result,
    });
  }

  if (!hasValue(payload.invoiceId)) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  if (payload.action === "retry") {
    const roleSession = await requireAdminApiRole(["owner", "accountant"]);

    if (!roleSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Manual retries are deprecated. Stripe Billing dunning and Smart Retries are now the source of truth.",
      },
      { status: 410 },
    );
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

  return NextResponse.json({ error: "Unsupported payment action" }, { status: 400 });
}
