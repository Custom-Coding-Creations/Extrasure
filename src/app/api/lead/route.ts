import { NextRequest, NextResponse } from "next/server";
import { hasRequiredLeadFields, routeLeadPayload, type LeadPayload } from "@/lib/lead-routing";

export async function POST(request: NextRequest) {
  let payload: LeadPayload;

  try {
    payload = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!hasRequiredLeadFields(payload)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const routing = await routeLeadPayload(payload, {
    ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  });

  if (routing.configuredRouteCount > 0 && routing.successful.length === 0) {
    return NextResponse.json({ error: "Lead routing failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, routedTo: routing.successful }, { status: 200 });
}
