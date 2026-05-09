import { NextRequest, NextResponse } from "next/server";

type LeadPayload = {
  source?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  addressOrZip?: string;
  serviceNeeded?: string;
  details?: string;
};

const ROUTES = [
  { key: "email", url: process.env.LEAD_EMAIL_WEBHOOK_URL },
  { key: "sms", url: process.env.LEAD_SMS_WEBHOOK_URL },
  { key: "crm", url: process.env.LEAD_CRM_WEBHOOK_URL },
] as const;

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function POST(request: NextRequest) {
  let payload: LeadPayload;

  try {
    payload = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!hasValue(payload.fullName) || !hasValue(payload.phone) || !hasValue(payload.addressOrZip) || !hasValue(payload.details)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const lead = {
    ...payload,
    createdAt: new Date().toISOString(),
    ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };

  const configuredRoutes = ROUTES.filter((route) => hasValue(route.url));

  if (configuredRoutes.length === 0) {
    console.info("Lead captured with no webhooks configured", lead);
    return NextResponse.json({ ok: true, routedTo: [] }, { status: 200 });
  }

  const routeResults = await Promise.allSettled(
    configuredRoutes.map(async (route) => {
      const response = await fetch(route.url as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lead-source": payload.source ?? "unknown",
        },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`Routing failed for ${route.key}`);
      }

      return route.key;
    }),
  );

  const successful: string[] = [];
  for (const result of routeResults) {
    if (result.status === "fulfilled") {
      successful.push(result.value);
    }
  }

  if (successful.length === 0) {
    return NextResponse.json({ error: "Lead routing failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, routedTo: successful }, { status: 200 });
}
