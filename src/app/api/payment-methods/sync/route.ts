import { NextResponse } from "next/server";
import { requireAdminApiRole } from "@/lib/admin-auth";
import { syncAllSavedPaymentMethodsFromStripe } from "@/lib/payment-preferences";

export async function POST() {
  const admin = await requireAdminApiRole(["owner", "accountant"]);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllSavedPaymentMethodsFromStripe();

  return NextResponse.json({
    ok: true,
    syncedCustomers: result.count,
  });
}
