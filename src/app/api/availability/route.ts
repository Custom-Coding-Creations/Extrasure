import { NextRequest, NextResponse } from "next/server";
import { calculateAvailableSlots } from "@/lib/scheduling-engine";

/**
 * GET /api/availability
 *
 * Query parameters:
 * - date: ISO date string (YYYY-MM-DD)
 * - serviceId: Service catalog item ID
 * - technicianIds: Comma-separated technician IDs (optional)
 * - customerLocation: Customer address string (optional)
 *
 * Returns available booking slots for the given service and date
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const dateStr = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");
    const technicianIdsStr = searchParams.get("technicianIds");
    const customerLocation = searchParams.get("customerLocation");

    // Validate required parameters
    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: "Missing required parameters: date and serviceId" },
        { status: 400 }
      );
    }

    // Parse date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Set to start of day in local time
    date.setHours(0, 0, 0, 0);

    // Parse technician IDs if provided
    let technicianIds: string[] | undefined;
    if (technicianIdsStr) {
      technicianIds = technicianIdsStr.split(",").filter((id) => id.trim());
    }

    // Get available slots
    const availability = await calculateAvailableSlots(
      date,
      serviceId,
      technicianIds,
      customerLocation || undefined,
      30 // 30-minute slots
    );

    return NextResponse.json(availability);
  } catch (error) {
    console.error("[API] Availability endpoint error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
