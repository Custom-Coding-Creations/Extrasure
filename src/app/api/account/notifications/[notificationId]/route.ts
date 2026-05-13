import { NextResponse } from "next/server";
import { requireCustomerApiSession } from "@/lib/customer-auth";
import { dismissCustomerAccountNotification, snoozeCustomerAccountNotification } from "@/lib/account-notifications";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = await context.params;
  const dismissed = await dismissCustomerAccountNotification(session.customerId, notificationId);

  if (!dismissed) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

type SnoozePayload = {
  hours?: number;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireCustomerApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SnoozePayload;

  try {
    payload = (await request.json()) as SnoozePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const hours = payload.hours;

  if (!Number.isFinite(hours) || (hours as number) <= 0) {
    return NextResponse.json({ error: "hours must be a positive number" }, { status: 400 });
  }

  const { notificationId } = await context.params;
  const snoozed = await snoozeCustomerAccountNotification(session.customerId, notificationId, hours as number);

  if (!snoozed) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}