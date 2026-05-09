import { AdminShell } from "@/components/admin/admin-shell";
import {
  collectInvoiceAction,
  openBillingPortalAction,
  refundPaymentAction,
} from "@/app/admin/payments/actions";
import { getAdminState } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    stripe?: string;
    invoice?: string;
  }>;
};

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

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const state = await getAdminState();
  const params = searchParams ? await searchParams : undefined;
  const stripeState = params?.stripe;

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
      {stripeState ? (
        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4 text-sm text-[#33453a]">
          {stripeState === "success"
            ? "Stripe checkout completed. Billing status will finalize after verified webhook processing."
            : stripeState === "portal_return"
              ? "Returned from the Stripe billing portal."
              : "Stripe checkout was canceled before completion."}
        </section>
      ) : null}

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
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.invoices.map((invoice) => {
              const customer = state.customers.find((item) => item.id === invoice.customerId);
              const canCollect = invoice.status === "open" || invoice.status === "past_due";

              return (
                <tr key={invoice.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#1b2f25]">{invoice.id}</td>
                  <td className="px-4 py-3 text-[#33453a]">{customer?.name ?? invoice.customerId}</td>
                  <td className="px-4 py-3 capitalize text-[#33453a]">{invoice.billingCycle.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-[#33453a]">${invoice.amount}</td>
                  <td className="px-4 py-3 capitalize text-[#33453a]">{invoice.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-xs text-[#5d7267]">
                    {invoice.stripeCheckoutSessionId ? "Checkout linked" : "Not linked"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canCollect ? (
                        <form action={collectInvoiceAction}>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <button
                            type="submit"
                            className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]"
                          >
                            {invoice.billingCycle === "one_time" ? "Collect" : "Start Autopay"}
                          </button>
                        </form>
                      ) : null}
                      {customer ? (
                        <form action={openBillingPortalAction}>
                          <input type="hidden" name="customerId" value={customer.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-[#163526] px-3 py-1 text-xs font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white"
                          >
                            Billing Portal
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
              <th className="px-4 py-3">Actions</th>
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
                  <td className="px-4 py-3">
                    {payment.status === "succeeded" ? (
                      <form action={refundPaymentAction}>
                        <input type="hidden" name="paymentId" value={payment.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
                        >
                          Refund
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[#5d7267]">No action</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Stripe Readiness</h2>
        <p className="mt-2 text-sm text-[#33453a]">
          Stripe Checkout, subscription autopay, refunds, and the billing portal are now wired through server actions.
          Verified webhook processing is required before checkout completions will mark invoices paid automatically.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
          <li>Expected env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_SITE_URL or SITE_URL.</li>
          <li>Enable webhook events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, payment_intent.payment_failed, charge.refunded, invoice.paid, invoice.payment_failed, customer.subscription.updated.</li>
          <li>Route failed payments into retry + reminder automation.</li>
        </ul>
        <p className="mt-4 text-xs text-[#5d7267]">Open invoices in scope: {state.invoices.filter((item) => item.status !== "paid").length}</p>
      </section>
    </AdminShell>
  );
}
