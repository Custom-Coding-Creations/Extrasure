import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

export default async function AdminEstimatesPage() {
  const { state, dataError } = await loadAdminPageData();

  return (
    <AdminShell
      title="Estimate Builder and Approvals"
      subtitle="Generate line-item estimates, monitor approval status, and convert approved work into scheduled jobs and invoices."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <div className="grid gap-4 md:grid-cols-3">
        {state.estimates.map((estimate) => {
          const customer = state.customers.find((item) => item.id === estimate.customerId);

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
      )}
    </AdminShell>
  );
}
