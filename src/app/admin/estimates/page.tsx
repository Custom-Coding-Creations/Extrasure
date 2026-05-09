import { AdminShell } from "@/components/admin/admin-shell";
import { estimates, getCustomerById } from "@/lib/admin-data";

export default function AdminEstimatesPage() {
  return (
    <AdminShell
      title="Estimate Builder and Approvals"
      subtitle="Generate line-item estimates, monitor approval status, and convert approved work into scheduled jobs and invoices."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {estimates.map((estimate) => {
          const customer = getCustomerById(estimate.customerId);

          return (
            <article key={estimate.id} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">{estimate.id}</p>
              <h2 className="mt-1 text-xl text-[#1b2f25]">{estimate.service}</h2>
              <p className="mt-2 text-sm text-[#445349]">{customer?.name ?? "Unknown customer"}</p>
              <p className="mt-1 text-sm text-[#445349]">Created {estimate.createdAt}</p>
              <p className="mt-3 text-2xl text-[#153126]">${estimate.amount}</p>
              <p className="mt-2 inline-block rounded-full bg-[#ece2ca] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[#33453a]">
                {estimate.status}
              </p>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
