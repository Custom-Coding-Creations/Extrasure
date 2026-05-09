import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { getAdminState, queuePaymentRetry } from "@/lib/admin-store";

type RetryPayload = {
  invoiceId?: string;
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

  let payload: RetryPayload;

  try {
    payload = (await request.json()) as RetryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!hasValue(payload.invoiceId)) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
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
    message: "Retry queued. Wire this route to Stripe payment intent retries in production.",
  });
}
