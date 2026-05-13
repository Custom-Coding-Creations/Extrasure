import { NextResponse } from "next/server";
import { PaymentPreferenceMethod } from "@prisma/client";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { updateCustomerPaymentPreferences } from "@/lib/payment-preferences";

type PreferencePayload = {
  preferredMethod?: "card" | "ach" | "none";
  autopayEnabled?: boolean;
  autopayMethodType?: "card" | "ach" | "none";
};

function toMethod(value: PreferencePayload["preferredMethod"] | PreferencePayload["autopayMethodType"]) {
  if (value === "card") {
    return PaymentPreferenceMethod.card;
  }

  if (value === "ach") {
    return PaymentPreferenceMethod.ach;
  }

  return PaymentPreferenceMethod.none;
}

export async function POST(request: Request) {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PreferencePayload;

  try {
    payload = (await request.json()) as PreferencePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const preference = await updateCustomerPaymentPreferences(session.customerId, {
    preferredMethod: payload.preferredMethod ? toMethod(payload.preferredMethod) : undefined,
    autopayEnabled: typeof payload.autopayEnabled === "boolean" ? payload.autopayEnabled : undefined,
    autopayMethodType: payload.autopayMethodType ? toMethod(payload.autopayMethodType) : undefined,
  });

  return NextResponse.json({
    ok: true,
    preference,
  });
}
