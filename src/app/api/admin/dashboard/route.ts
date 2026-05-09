import { NextResponse } from "next/server";
import {
  automationEvents,
  customers,
  getOverviewKpis,
  invoices,
  jobs,
  payments,
  technicians,
} from "@/lib/admin-data";

export async function GET() {
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    kpis: getOverviewKpis(),
    totals: {
      customers: customers.length,
      technicians: technicians.length,
      jobs: jobs.length,
      invoices: invoices.length,
      payments: payments.length,
      automations: automationEvents.length,
    },
  });
}
