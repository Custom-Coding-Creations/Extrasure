import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { loadAdminPageData } from "@/lib/admin-page-data";
import { getReportingDateRange, getDatePreset } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    preset?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

function toDateOnly(date: Date | string) {
  if (typeof date === "string") return date.split("T")[0];
  return date.toISOString().split("T")[0];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const { state, dataError } = await loadAdminPageData();
  const params = searchParams ? await searchParams : undefined;
  const preset = (params?.preset ?? "today") as "today" | "last_7_days" | "last_30_days" | string;
  const customFromDate = params?.fromDate ? new Date(params.fromDate) : undefined;
  const customToDate = params?.toDate ? new Date(params.toDate) : undefined;

  if (!state) {
    return (
      <AdminShell
        title="Owner Reporting"
        subtitle="Revenue, retention, scheduling throughput, and technician performance snapshots for daily decision-making."
      >
        <AdminDataNotice message={dataError} />
      </AdminShell>
    );
  }

  let dateRange = customFromDate && customToDate ? { fromDate: customFromDate, toDate: customToDate } : getDatePreset(preset as "today" | "last_7_days" | "last_30_days");

  if (preset === "custom" && (!customFromDate || !customToDate)) {
    dateRange = getDatePreset("today");
  }

  const filtered = getReportingDateRange(state, dateRange.fromDate, dateRange.toDate);

  const totalRevenue = filtered.payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const failedTotal = filtered.payments.filter((payment) => payment.status === "failed").reduce((sum, payment) => sum + payment.amount, 0);
  const averageTicket =
    filtered.invoices.length > 0 ? Math.round(filtered.invoices.reduce((sum, invoice) => sum + invoice.amount, 0) / filtered.invoices.length) : 0;
  const completedJobs = filtered.jobs.filter((job) => job.status === "completed").length;
  const activePlans = state.customers.filter((customer) => customer.activePlan !== "none").length;
  const utilization =
    state.technicians.length > 0 ? Math.round(state.technicians.reduce((sum, tech) => sum + tech.utilizationPercent, 0) / state.technicians.length) : 0;

  const fromDateStr = toDateOnly(dateRange.fromDate);
  const toDateStr = toDateOnly(dateRange.toDate);

  return (
    <AdminShell
      title="Owner Reporting"
      subtitle="Revenue, retention, scheduling throughput, and technician performance snapshots for daily decision-making."
    >
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-lg text-[#1b2f25]">Date Range</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`?preset=today`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              preset === "today" ? "bg-[#163526] text-white" : "border border-[#cbbd9f] bg-[#fffdf6] text-[#1d2f25] hover:border-[#163526]"
            }`}
          >
            Today
          </a>
          <a
            href={`?preset=last_7_days`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              preset === "last_7_days" ? "bg-[#163526] text-white" : "border border-[#cbbd9f] bg-[#fffdf6] text-[#1d2f25] hover:border-[#163526]"
            }`}
          >
            Last 7 days
          </a>
          <a
            href={`?preset=last_30_days`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              preset === "last_30_days" ? "bg-[#163526] text-white" : "border border-[#cbbd9f] bg-[#fffdf6] text-[#1d2f25] hover:border-[#163526]"
            }`}
          >
            Last 30 days
          </a>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-[#445349]">
          Showing: {fromDateStr} to {toDateStr}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Revenue Collected</p>
          <p className="mt-2 text-2xl text-[#153126]">{formatCurrency(totalRevenue)}</p>
          <p className="mt-2 text-xs text-[#5d7267]">{filtered.payments.filter((p) => p.status === "succeeded").length} payments</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Failed Payments</p>
          <p className="mt-2 text-2xl text-[#8a3d22]">{formatCurrency(failedTotal)}</p>
          <p className="mt-2 text-xs text-[#5d7267]">{filtered.payments.filter((p) => p.status === "failed").length} failed</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Avg Ticket</p>
          <p className="mt-2 text-2xl text-[#153126]">{formatCurrency(averageTicket)}</p>
          <p className="mt-2 text-xs text-[#5d7267]">{filtered.invoices.length} invoices</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Completed Jobs</p>
          <p className="mt-2 text-2xl text-[#153126]">{completedJobs}</p>
          <p className="mt-2 text-xs text-[#5d7267]">{filtered.jobs.length} total jobs</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Active Plans</p>
          <p className="mt-2 text-2xl text-[#153126]">{activePlans}</p>
          <p className="mt-2 text-xs text-[#5d7267]">Recurring customers</p>
        </article>
      </div>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Export Data</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const data = `Date Range: ${fromDateStr} to ${toDateStr}\n\nRevenue Collected,${totalRevenue}\nFailed Payments,${failedTotal}\nAverage Ticket,${averageTicket}\nCompleted Jobs,${completedJobs}\nActive Plans,${activePlans}\nTech Utilization,${utilization}%`;
              const blob = new Blob([data], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `extrasure-kpi-${fromDateStr}-to-${toDateStr}.csv`;
              a.click();
            }}
            className="rounded-lg bg-[#163526] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Export KPI Snapshot
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Recommended Operational Actions</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
          {failedTotal > 0 && <li>Prioritize failed payment retries ({failedTotal} outstanding) before the next weekly dispatch cycle.</li>}
          {completedJobs < 3 && <li>Monitor job completion rate; ensure technicians have adequate support and scheduling.</li>}
          {activePlans < 2 && <li>Promote recurring plans to existing one-time service customers.</li>}
          <li>Review utilization by technician to identify capacity constraints and route optimization opportunities.</li>
        </ul>
      </section>
    </AdminShell>
  );
}
