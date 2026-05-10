import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "past_due") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "refunded") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-[#ece2ca] text-[#33453a]";
}

export default async function AdminInvoicesPage() {
  const { state, dataError } = await loadAdminPageData();

  return (
    <AdminShell
      title="Invoices and Billing Cycles"
      subtitle="Manage one-time and recurring invoice schedules across monthly, quarterly, and annual service plans."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Billing Cycle</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {state.invoices.map((invoice) => {
              const customer = state.customers.find((item) => item.id === invoice.customerId);

              return (
                <tr key={invoice.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#1b2f25]">{invoice.id}</td>
                  <td className="px-4 py-3 text-[#33453a]">{customer?.name ?? "Unknown customer"}</td>
                  <td className="px-4 py-3 text-[#33453a]">${invoice.amount}</td>
                  <td className="px-4 py-3 text-[#33453a]">{invoice.dueDate}</td>
                  <td className="px-4 py-3 capitalize text-[#33453a]">{invoice.billingCycle.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.08em] ${statusClass(invoice.status)}`}>
                      {invoice.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </AdminShell>
  );
}
