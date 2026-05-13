import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const action = requestUrl.searchParams.get("action");
  const limitParam = requestUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  if (!action) {
    return NextResponse.json({ error: "Missing 'action' parameter" }, { status: 400 });
  }

  try {
    const events = await prisma.auditEvent.findMany({
      where: {
        action,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    });

    const formattedEvents = events.map((event) => ({
      id: event.id,
      actor: event.actor,
      action: event.action,
      timestamp: event.timestamp.toISOString(),
      after: event.after ? JSON.parse(event.after) : null,
    }));

    return NextResponse.json({
      ok: true,
      events: formattedEvents,
      count: formattedEvents.length,
    });
  } catch (error) {
    console.error("Failed to fetch audit events:", error);
    return NextResponse.json({ error: "Failed to fetch audit events" }, { status: 500 });
  }
}
