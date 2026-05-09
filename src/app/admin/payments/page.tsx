import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminState } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

function paymentTone(status: string) {
  if (status === "succeeded") {
    return "text-emerald-700";
  }

  if (status === "failed") {
    return "text-red-700";
  }

  if (status === "refunded") {
    return "text-slate-700";
  }

  return "text-[#4a5f53]";
}

export default async function AdminPaymentsPage() {
  const state = await getAdminState();

  const collectionTotal = state.payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((total, payment) => total + payment.amount, 0);
  const failedTotal = state.payments
    .filter((payment) => payment.status === "failed")
    .reduce((total, payment) => total + payment.amount, 0);

  return (
    <AdminShell
      title="Payments, Retry, and Refunds"
      subtitle="Track card and ACH outcomes, trigger retries, and maintain refund controls for billing integrity."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Collected</p>
          <p className="mt-2 text-3xl text-[#153126]">${collectionTotal}</p>
          <p className="mt-2 text-sm text-[#445349]">Successful card and ACH transactions in this window.</p>
        </article>
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Failed Payment Exposure</p>
          <p className="mt-2 text-3xl text-[#153126]">${failedTotal}</p>
          <p className="mt-2 text-sm text-[#445349]">Queue retries and reminders before marking accounts for manual follow-up.</p>
        </article>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Payment ID</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {state.payments.map((payment) => {
              const invoice = state.invoices.find((item) => item.id === payment.invoiceId);

              return (
                <tr key={payment.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#1b2f25]">{payment.id}</td>
                  <td className="px-4 py-3 text-[#33453a]">{invoice?.id ?? payment.invoiceId}</td>
                  <td className="px-4 py-3 uppercase text-[#33453a]">{payment.method}</td>
                  <td className="px-4 py-3 text-[#33453a]">${payment.amount}</td>
                  <td className={`px-4 py-3 capitalize ${paymentTone(payment.status)}`}>{payment.status}</td>
                  <td className="px-4 py-3 text-[#33453a]">{new Date(payment.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Stripe Readiness</h2>
        <p className="mt-2 text-sm text-[#33453a]">
          Configure Stripe API keys and webhook secret in environment variables to enable live card and ACH collection.
          QuickBooks synchronization can then mirror paid and refunded invoices.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
          <li>Expected env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.</li>
          <li>Enable webhook events: checkout.session.completed, payment_intent.payment_failed, charge.refunded.</li>
          <li>Route failed payments into retry + reminder automation.</li>
        </ul>
        <p className="mt-4 text-xs text-[#5d7267]">Open invoices in scope: {state.invoices.filter((item) => item.status !== "paid").length}</p>
      </section>
    </AdminShell>
  );
}
