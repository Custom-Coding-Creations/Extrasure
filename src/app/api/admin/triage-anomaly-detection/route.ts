import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { detectTriageAnomalies } from "@/lib/triage-anomaly-detection";
import { sendWebhookNotification } from "@/lib/triage-webhook-notifications";

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const hoursParam = requestUrl.searchParams.get("hoursBack");
  const hoursBack = hoursParam ? Math.min(Math.max(1, parseInt(hoursParam, 10)), 168) : 24;

  try {
    const result = await detectTriageAnomalies(hoursBack);

    // Send webhook notifications if anomalies detected (async, don't block response)
    if (result.anomalies.length > 0) {
      void sendWebhookNotification({
        event: "triage_anomaly_detected",
        timestamp: new Date().toISOString(),
        data: {
          anomalies: result.anomalies,
          metrics: result.metrics,
          hoursBack,
        },
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to detect triage anomalies:", error);
    return NextResponse.json({ error: "Failed to detect anomalies" }, { status: 500 });
  }
}
