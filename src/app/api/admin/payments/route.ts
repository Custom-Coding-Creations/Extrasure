import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById, invoices, payments } from "@/lib/admin-data";

type RetryPayload = {
  invoiceId?: string;
};

function hasValue(input: string | undefined) {
  return Boolean(input && input.trim().length > 0);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    invoices,
    payments,
  });
}

export async function POST(request: NextRequest) {
  let payload: RetryPayload;

  try {
    payload = (await request.json()) as RetryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!hasValue(payload.invoiceId)) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const invoice = getInvoiceById(payload.invoiceId);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    invoiceId: invoice.id,
    action: "retry_queued",
    provider: "stripe",
    queuedAt: new Date().toISOString(),
    message: "Retry queued. Wire this route to Stripe payment intent retries in production.",
  });
}
