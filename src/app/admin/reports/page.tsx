import { AdminShell } from "@/components/admin/admin-shell";
import { customers, invoices, jobs, payments, technicians } from "@/lib/admin-data";

export default function AdminReportsPage() {
  const totalRevenue = payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const averageTicket = invoices.length
    ? Math.round(invoices.reduce((sum, invoice) => sum + invoice.amount, 0) / invoices.length)
    : 0;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;
  const activePlans = customers.filter((customer) => customer.activePlan !== "none").length;
  const utilization = technicians.length
    ? Math.round(
        technicians.reduce((sum, tech) => sum + tech.utilizationPercent, 0) / technicians.length,
      )
    : 0;

  return (
    <AdminShell
      title="Owner Reporting"
      subtitle="Revenue, retention, scheduling throughput, and technician performance snapshots for daily decision-making."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Revenue</p>
          <p className="mt-2 text-2xl text-[#153126]">${totalRevenue}</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Avg Ticket</p>
          <p className="mt-2 text-2xl text-[#153126]">${averageTicket}</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Completed Jobs</p>
          <p className="mt-2 text-2xl text-[#153126]">{completedJobs}</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Active Plans</p>
          <p className="mt-2 text-2xl text-[#153126]">{activePlans}</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Tech Utilization</p>
          <p className="mt-2 text-2xl text-[#153126]">{utilization}%</p>
        </article>
      </div>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Recommended Operational Actions</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
          <li>Prioritize failed payment retries before the next weekly dispatch cycle.</li>
          <li>Convert lead-stage customers into scheduled inspections within 24 hours.</li>
          <li>Increase route density for high-demand zones in Syracuse and Liverpool.</li>
          <li>Promote annual plans to customers with repeated one-time visits.</li>
        </ul>
      </section>
    </AdminShell>
  );
}
