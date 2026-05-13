import { NextResponse } from "next/server";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { getCustomerAccountNotificationPreferences } from "@/lib/account-notifications";

export async function GET() {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getCustomerAccountNotificationPreferences(session.customerId);

  return NextResponse.json({
    ok: true,
    preferences,
  });
}