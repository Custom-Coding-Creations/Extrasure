import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { CreateStripeInvoiceDraftButton } from "@/components/admin/create-stripe-invoice-draft-button";
import {
  collectInvoiceAction,
  openBillingPortalAction,
  refundPaymentAction,
} from "@/app/admin/payments/actions";
import { GeneratePaymentLinkButton } from "@/components/admin/generate-payment-link-button";
import { FinalizeStripeInvoiceButton } from "@/components/admin/finalize-stripe-invoice-button";
import { OpenStripeInvoiceLinkButton } from "@/components/admin/open-stripe-invoice-link-button";
import { ReconcileInvoiceButton } from "@/components/admin/reconcile-invoice-button";
import { ReplayWebhookButton } from "@/components/admin/replay-webhook-button";
import { StripeInvoicePdfButton } from "@/components/admin/stripe-invoice-pdf-button";
import { SubscriptionLifecycleButton } from "@/components/admin/subscription-lifecycle-button";
import { loadAdminPageData } from "@/lib/admin-page-data";

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
  const { state, dataError } = await loadAdminPageData();
  const params = searchParams ? await searchParams : undefined;
  const stripeState = params?.stripe;

  if (!state) {
    return (
      <AdminShell
        title="Payments, Dunning, and Refunds"
        subtitle="Track card and ACH outcomes, monitor Stripe-managed recovery, and maintain refund controls for billing integrity."
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
        <AdminDataNotice message={dataError} />
      </AdminShell>
    );
  }

  const collectionTotal = state.payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((total, payment) => total + payment.amount, 0);
  const failedTotal = state.payments
    .filter((payment) => payment.status === "failed")
    .reduce((total, payment) => total + payment.amount, 0);

  return (
    <AdminShell
      title="Payments, Dunning, and Refunds"
      subtitle="Track card and ACH outcomes, monitor Stripe-managed recovery, and maintain refund controls for billing integrity."
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
          <p className="mt-2 text-sm text-[#445349]">Stripe Billing dunning now handles retries and reminders automatically.</p>
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
              const canGenerateLink = canCollect;
              const hasSubscription = Boolean(customer?.stripeSubscriptionId);
              const subscriptionStatus = customer?.stripeSubscriptionStatus ?? "";
              const canPause = hasSubscription && !subscriptionStatus.includes("paused") && !subscriptionStatus.includes("cancel");
              const canResume = hasSubscription && (subscriptionStatus.includes("paused") || subscriptionStatus.includes("canceling"));
              const canCancel = hasSubscription && !subscriptionStatus.includes("cancel");

              return (
                <tr key={invoice.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#1b2f25]">{invoice.id}</td>
                  <td className="px-4 py-3 text-[#33453a]">{customer?.name ?? invoice.customerId}</td>
                  <td className="px-4 py-3 capitalize text-[#33453a]">{invoice.billingCycle.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-[#33453a]">${invoice.amount}</td>
                  <td className="px-4 py-3 capitalize text-[#33453a]">{invoice.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-xs text-[#5d7267]">
                    {invoice.stripeInvoiceId
                      ? "Invoice API linked"
                      : invoice.stripeCheckoutSessionId
                        ? "Checkout linked"
                        : "Not linked"}
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
                      <GeneratePaymentLinkButton invoiceId={invoice.id} disabled={!canGenerateLink} />
                      <CreateStripeInvoiceDraftButton invoiceId={invoice.id} disabled={invoice.status === "paid" || invoice.status === "refunded"} />
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
                      <ReconcileInvoiceButton
                        invoiceId={invoice.id}
                        disabled={!invoice.stripeCheckoutSessionId && !invoice.stripePaymentIntentId && !invoice.stripeInvoiceId}
                      />
                      <ReplayWebhookButton invoiceId={invoice.id} disabled={!invoice.stripeCheckoutSessionId && !invoice.stripePaymentIntentId && !invoice.stripeInvoiceId} />
                      {customer && hasSubscription ? (
                        <>
                          <SubscriptionLifecycleButton customerId={customer.id} action="pause" disabled={!canPause} />
                          <SubscriptionLifecycleButton customerId={customer.id} action="resume" disabled={!canResume} />
                          <SubscriptionLifecycleButton customerId={customer.id} action="cancel" disabled={!canCancel} />
                        </>
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
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-[#b8d8c6] bg-[#ecf9f0] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1f4b33]">✅ Phase 0: Foundation (Complete)</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#2d5f45]">
              <li>Test/live mode indicator active in admin UI</li>
              <li>Webhook signature verification working</li>
              <li>10 core webhook event handlers implemented</li>
              <li>Deduplication via unique constraint (P2002) prevents duplicate processing</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#b8d8c6] bg-[#ecf9f0] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1f4b33]">✅ Phase 1: Payment Element & Subscriptions (Complete)</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#2d5f45]">
              <li>Payment Element embedded on customer invoice pages</li>
              <li>Direct Subscriptions API (auto-renewing, no manual checkout)</li>
              <li>Payment Intent flow for one-time payments</li>
              <li>New webhook handlers: payment_intent.succeeded, invoice.created</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#b8d8c6] bg-[#ecf9f0] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#1f4b33]">✅ Phase 2: Stripe Dunning & Radar (Complete)</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#2d5f45]">
              <li>Stripe Radar enabled in dashboard</li>
              <li>Smart Retries enabled in Stripe Billing recovery settings</li>
              <li>Webhook handlers: charge.dispute.created/updated/closed</li>
              <li>Webhook handler: invoice.payment_action_required</li>
              <li>Manual retry API action deprecated in favor of Stripe dunning</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#dec3a9] bg-[#fff4e8] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7b3d13]">🔄 Phase 3: Stripe Invoicing (In Progress)</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[#6b3f1a]">
              <li>Admin actions added: sync draft Stripe invoice, finalize invoice, and open PDF</li>
              <li>Webhook handler added: invoice.finalized</li>
              <li>invoice.created sync now upserts local invoices by metadata/linkage</li>
              <li>Customer billing page now shows Download Invoice PDF when available</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-xs text-[#5d7267]">
          <div>
            <p className="font-semibold text-[#24392d]">{state.invoices.filter((item) => item.status !== "paid").length}</p>
            <p>Open invoices</p>
          </div>
          <div>
            <p className="font-semibold text-[#24392d]">{state.payments.filter((item) => item.status === "succeeded").length}</p>
            <p>Successful payments</p>
          </div>
          <div>
            <p className="font-semibold text-[#24392d]">{state.payments.filter((item) => item.status === "failed").length}</p>
            <p>Failed payments</p>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
