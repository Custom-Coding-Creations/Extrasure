import { AdminShell } from "@/components/admin/admin-shell";
import {
  getAdminState,
  getOverviewKpisFromState,
} from "@/lib/admin-store";

export const dynamic = "force-dynamic";

function toneClass(tone: "positive" | "neutral" | "attention") {
  if (tone === "positive") {
    return "text-emerald-700";
  }

  if (tone === "attention") {
    return "text-amber-700";
  }

  return "text-[#4a5f53]";
}

export default async function AdminOverviewPage() {
  const state = await getAdminState();
  const kpis = getOverviewKpisFromState(state);
  const recentJobs = state.jobs.slice(0, 4);
  const failedPayments = state.payments.filter((payment) => payment.status === "failed");
  const leadCount = state.customers.filter((customer) => customer.lifecycle === "lead").length;

  return (
    <AdminShell
      title="Business Overview"
      subtitle="Monitor the owner KPIs, job flow, payment risk, and same-day lead activity in one place."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">{kpi.label}</p>
            <p className="mt-2 text-2xl text-[#153126]">{kpi.value}</p>
            <p className={`mt-1 text-xs ${toneClass(kpi.tone)}`}>{kpi.trend}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-2xl text-[#1b2f25]">Live Dispatch Snapshot</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {recentJobs.map((job) => {
              const customer = state.customers.find((item) => item.id === job.customerId);
              const tech = state.technicians.find((item) => item.id === job.technicianId);

              return (
                <li key={job.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
                  <p className="font-semibold text-[#20372c]">{job.service}</p>
                  <p className="text-[#445349]">
                    {customer?.name ?? "Unknown customer"} with {tech?.name ?? "Unassigned tech"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#61766a]">
                    Status: {job.status.replaceAll("_", " ")}
                    {job.emergency ? " • emergency" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-2xl text-[#1b2f25]">Risk and Follow-Up Queue</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#33453a]">
            <li className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
              <p className="font-semibold text-[#20372c]">Failed Payments</p>
              <p>{failedPayments.length} accounts need retry handling before next billing window.</p>
            </li>
            <li className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
              <p className="font-semibold text-[#20372c]">Open Lead Follow-Up</p>
              <p>{leadCount} new leads are awaiting conversion to approved estimates.</p>
            </li>
            <li className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
              <p className="font-semibold text-[#20372c]">QuickBooks Sync</p>
              <p>Last successful reconciliation completed 14 minutes ago.</p>
            </li>
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
