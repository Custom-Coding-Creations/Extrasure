import { NextResponse } from "next/server";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { removeSavedPaymentMethod, setDefaultSavedPaymentMethod } from "@/lib/payment-preferences";

type RouteContext = {
  params: Promise<{ savedPaymentMethodId: string }>;
};

type PatchPayload = {
  action?: "set-default";
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { savedPaymentMethodId } = await context.params;
  const removed = await removeSavedPaymentMethod(session.customerId, savedPaymentMethodId);

  if (!removed) {
    return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PatchPayload;

  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload.action !== "set-default") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { savedPaymentMethodId } = await context.params;
  const updated = await setDefaultSavedPaymentMethod(session.customerId, savedPaymentMethodId);

  if (!updated) {
    return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
