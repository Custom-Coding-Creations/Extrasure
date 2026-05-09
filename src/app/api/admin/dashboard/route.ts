import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-auth";
import { getAdminState, getOverviewKpisFromState } from "@/lib/admin-store";

export async function GET() {
  const session = await requireAdminApiSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await getAdminState();

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    kpis: getOverviewKpisFromState(state),
    totals: {
      customers: state.customers.length,
      technicians: state.technicians.length,
      jobs: state.jobs.length,
      invoices: state.invoices.length,
      payments: state.payments.length,
      automations: state.automationEvents.length,
    },
  });
}
