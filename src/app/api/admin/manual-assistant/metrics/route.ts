import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import {
  getAdminManualAssistantModeCounts,
  getAdminManualAssistantModeTimeline,
} from "@/lib/admin-manual-assistant-analytics";

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const lookbackParam = requestUrl.searchParams.get("lookbackHours");
  const parsedLookback = lookbackParam ? Number.parseInt(lookbackParam, 10) : 24;
  const lookbackHours = Number.isFinite(parsedLookback) ? Math.max(1, Math.min(parsedLookback, 168)) : 24;

  const [modeCounts, timeline] = await Promise.all([
    getAdminManualAssistantModeCounts({ lookbackHours }),
    getAdminManualAssistantModeTimeline({ lookbackHours }),
  ]);

  const totalResponses = Object.values(modeCounts).reduce((total, count) => total + count, 0);

  return NextResponse.json({
    ok: true,
    lookbackHours,
    totalResponses,
    modeCounts,
    timeline,
  });
}
