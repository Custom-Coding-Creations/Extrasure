import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { CreateStripeInvoiceDraftButton } from "@/components/admin/create-stripe-invoice-draft-button";
import { FinalizeStripeInvoiceButton } from "@/components/admin/finalize-stripe-invoice-button";
import { OpenStripeInvoiceLinkButton } from "@/components/admin/open-stripe-invoice-link-button";
import { StripeInvoicePdfButton } from "@/components/admin/stripe-invoice-pdf-button";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  updateInvoiceAction,
} from "@/app/admin/invoices/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";
import { getStripeInvoiceStatusesForLocalInvoices } from "@/lib/stripe-billing";

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

function stripeStatusClass(status: string | null | undefined) {
  if (status === "paid") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "draft") {
    return "bg-slate-200 text-slate-700";
  }

  if (status === "open") {
    return "bg-[#ece2ca] text-[#33453a]";
  }

  if (status === "uncollectible" || status === "void") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-[#ece2ca] text-[#33453a]";
}

export default async function AdminInvoicesPage() {
  const { state, dataError } = await loadAdminPageData();
  const stripeStatusByInvoiceId = state
    ? await getStripeInvoiceStatusesForLocalInvoices(state.invoices.map((invoice) => invoice.id))
    : {};

  return (
    <AdminShell
      title="Invoices and Billing Cycles"
      subtitle="Manage one-time and recurring invoice schedules, then sync/finalize Stripe invoices and open hosted/PDF documents."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Create Invoice</h2>
        <form action={createInvoiceAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select name="customerId" defaultValue="" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="" disabled>Select customer</option>
            {state.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <input name="amount" type="number" min="0" step="1" required placeholder="Amount" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="dueDate" type="date" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <select name="billingCycle" defaultValue="one_time" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="one_time">One time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <select name="status" defaultValue="open" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="open">Open</option>
            <option value="past_due">Past due</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
          <input name="estimateId" placeholder="Estimate ID (optional)" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">Create invoice</button>
        </form>
      </section>

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
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.invoices.map((invoice) => {
              const formId = `invoice-form-${invoice.id}`;

              return (
                <tr key={invoice.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 align-top font-semibold text-[#1b2f25]">
                    <input form={formId} name="invoiceIdDisplay" value={invoice.id} readOnly className="w-full rounded-lg border border-[#cbbd9f] bg-[#f3ecd7] px-3 py-2 text-sm text-[#1d2f25]" />
                  </td>
                  <td className="px-4 py-3 align-top text-[#33453a]">
                    <select form={formId} name="customerId" defaultValue={invoice.customerId} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                      {state.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top text-[#33453a]">
                    <input form={formId} name="amount" type="number" min="0" step="1" defaultValue={invoice.amount} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  </td>
                  <td className="px-4 py-3 align-top text-[#33453a]">
                    <input form={formId} name="dueDate" type="date" defaultValue={invoice.dueDate} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                  </td>
                  <td className="px-4 py-3 align-top capitalize text-[#33453a]">
                    <select form={formId} name="billingCycle" defaultValue={invoice.billingCycle} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                      <option value="one_time">One time</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select form={formId} name="status" defaultValue={invoice.status} className={`w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm ${statusClass(invoice.status)}`}>
                      <option value="open">Open</option>
                      <option value="past_due">Past due</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-[#4f695b]">
                    <div className="space-y-1">
                      <p>
                        {invoice.stripeInvoiceId ? "Invoice API linked" : invoice.stripeCheckoutSessionId ? "Checkout linked" : "Not linked"}
                      </p>
                      {invoice.stripeInvoiceId ? (
                        <p>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stripeStatusClass(stripeStatusByInvoiceId[invoice.id])}`}>
                            Stripe: {(stripeStatusByInvoiceId[invoice.id] ?? "unknown").replace("_", " ")}
                          </span>
                        </p>
                      ) : null}
                      {invoice.stripeInvoiceId ? (
                        <p className="text-[#5d7267]">Invoice: {invoice.stripeInvoiceId}</p>
                      ) : null}
                      {invoice.stripePaymentIntentId ? (
                        <p className="text-[#5d7267]">PI: {invoice.stripePaymentIntentId}</p>
                      ) : null}
                      {invoice.stripeSubscriptionId ? (
                        <p className="text-[#5d7267]">Sub: {invoice.stripeSubscriptionId}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <form id={formId} action={updateInvoiceAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">Save</button>
                      </form>
                      <CreateStripeInvoiceDraftButton
                        invoiceId={invoice.id}
                        disabled={invoice.status === "paid" || invoice.status === "refunded"}
                      />
                      <FinalizeStripeInvoiceButton
                        invoiceId={invoice.id}
                        disabled={
                          invoice.status === "paid" ||
                          invoice.status === "refunded" ||
                          !invoice.stripeInvoiceId
                        }
                      />
                      <OpenStripeInvoiceLinkButton invoiceId={invoice.id} disabled={!invoice.stripeInvoiceId} />
                      <StripeInvoicePdfButton invoiceId={invoice.id} disabled={!invoice.stripeInvoiceId} />
                      <form action={deleteInvoiceAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">Delete</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </AdminShell>
  );
}
