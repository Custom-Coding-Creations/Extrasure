import { NextResponse } from "next/server";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import {
  getCustomerAccountNotificationPreferences,
  listActiveCustomerAccountNotifications,
  markAllCustomerAccountNotificationsRead,
  setCustomerAccountNotificationPreference,
} from "@/lib/account-notifications";

export async function GET() {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await listActiveCustomerAccountNotifications(session.customerId);

  return NextResponse.json({
    ok: true,
    notifications,
  });
}

export async function PATCH() {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await markAllCustomerAccountNotificationsRead(session.customerId);

  return NextResponse.json({ ok: true });
}

type PreferencePatchPayload = {
  sourceKey?: string;
  enabled?: boolean;
};

export async function POST(request: Request) {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PreferencePatchPayload;

  try {
    payload = (await request.json()) as PreferencePatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.sourceKey || typeof payload.enabled !== "boolean") {
    return NextResponse.json({ error: "sourceKey and enabled are required" }, { status: 400 });
  }

  const ok = await setCustomerAccountNotificationPreference(session.customerId, payload.sourceKey, payload.enabled);

  if (!ok) {
    return NextResponse.json({ error: "Unknown notification source" }, { status: 400 });
  }

  const preferences = await getCustomerAccountNotificationPreferences(session.customerId);

  return NextResponse.json({
    ok: true,
    preferences,
  });
}