import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  getAchAdoptionMetrics,
  getPaymentMethodDistribution,
  loadAdminPageData,
} from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

function percentLabel(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function AdminAchAnalyticsPage() {
  const pageData = await loadAdminPageData();

  if (!pageData.state) {
    return (
      <AdminShell
        title="ACH Adoption Analytics"
        subtitle="Track ACH preference adoption, autopay participation, and payment outcomes."
      >
        <AdminDataNotice message={pageData.dataError} />
      </AdminShell>
    );
  }

  const { state } = pageData;
  const [achMetrics, distribution] = await Promise.all([
    getAchAdoptionMetrics(state),
    getPaymentMethodDistribution(state),
  ]);
  const avgInvoiceAmount = state.invoices.length
    ? state.invoices.reduce((total, invoice) => total + invoice.amount, 0) / state.invoices.length
    : 0;
  const estimatedSavingsYtd = Number(
    (achMetrics.achDiscountUsageCount * avgInvoiceAmount * 0.03).toFixed(2),
  );

  const succeeded = {
    ach: state.payments.filter((payment) => payment.method === "ach" && payment.status === "succeeded").length,
    card: state.payments.filter((payment) => payment.method === "card" && payment.status === "succeeded").length,
  };
  const attempts = {
    ach: state.payments.filter((payment) => payment.method === "ach").length,
    card: state.payments.filter((payment) => payment.method === "card").length,
  };

  const successRate = {
    ach: attempts.ach ? (succeeded.ach / attempts.ach) * 100 : 0,
    card: attempts.card ? (succeeded.card / attempts.card) * 100 : 0,
  };

  return (
    <AdminShell
      title="ACH Adoption Analytics"
      subtitle="Monitor customer ACH preference, autopay adoption, and discount impact for billing optimization."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">ACH Adoption</p>
          <p className="mt-2 text-3xl text-[#153126]">
            {percentLabel((achMetrics.achEnabledCustomers / Math.max(achMetrics.totalCustomers, 1)) * 100)}
          </p>
          <p className="mt-2 text-sm text-[#445349]">
            {achMetrics.achEnabledCustomers} of {achMetrics.totalCustomers} customers prefer ACH.
          </p>
        </article>

        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Autopay Adoption</p>
          <p className="mt-2 text-3xl text-[#153126]">
            {percentLabel((achMetrics.autopayCustomers / Math.max(achMetrics.totalCustomers, 1)) * 100)}
          </p>
          <p className="mt-2 text-sm text-[#445349]">
            {achMetrics.autopayCustomers} customers have autopay enabled.
          </p>
        </article>

        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">ACH Discount Usage</p>
          <p className="mt-2 text-3xl text-[#153126]">{achMetrics.achDiscountUsageCount}</p>
          <p className="mt-2 text-sm text-[#445349]">Successful ACH payment count used for 3% savings tracking.</p>
        </article>

        <article className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Estimated Savings YTD</p>
          <p className="mt-2 text-3xl text-[#153126]">${estimatedSavingsYtd.toFixed(2)}</p>
          <p className="mt-2 text-sm text-[#445349]">Estimated as ACH success count × average invoice × 3%.</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-xl text-[#1b2f25]">Payment Method Distribution</h2>
          <p className="mt-1 text-sm text-[#445349]">Overall mix across all recorded payment attempts.</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border border-[#dec3a9] bg-[#fff4e8] p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-[#7b3d13]">Card</p>
              <p className="mt-1 text-2xl text-[#5f2f10]">{distribution.card.count}</p>
              <p className="text-sm text-[#6b3f1a]">{percentLabel(distribution.card.percentage)}</p>
            </div>
            <div className="rounded-xl border border-[#b8d8c6] bg-[#ecf9f0] p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-[#1f4b33]">ACH</p>
              <p className="mt-1 text-2xl text-[#1f4b33]">{distribution.ach.count}</p>
              <p className="text-sm text-[#2d5f45]">{percentLabel(distribution.ach.percentage)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-xl text-[#1b2f25]">Success Rate Comparison</h2>
          <p className="mt-1 text-sm text-[#445349]">ACH and card success outcomes by attempt count.</p>
          <div className="mt-4 space-y-3 text-sm text-[#33453a]">
            <div className="rounded-xl border border-[#d8cbaf] bg-[#f9f1df] p-3">
              <p className="font-semibold text-[#24392d]">ACH</p>
              <p>{succeeded.ach} succeeded / {attempts.ach} attempts</p>
              <p className="text-xs text-[#5d7267]">Success rate: {percentLabel(successRate.ach)}</p>
            </div>
            <div className="rounded-xl border border-[#d8cbaf] bg-[#f9f1df] p-3">
              <p className="font-semibold text-[#24392d]">Card</p>
              <p>{succeeded.card} succeeded / {attempts.card} attempts</p>
              <p className="text-xs text-[#5d7267]">Success rate: {percentLabel(successRate.card)}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-xl text-[#1b2f25]">ACH Share by Billing Cycle</h2>
        <p className="mt-1 text-sm text-[#445349]">Percent of successful ACH payments by recurring billing interval.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-[#d8cbaf] bg-[#f9f1df] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Monthly</p>
            <p className="mt-1 text-2xl text-[#1b2f25]">{percentLabel(achMetrics.achMethodShareByBillingCycle.monthly)}</p>
          </article>
          <article className="rounded-xl border border-[#d8cbaf] bg-[#f9f1df] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Quarterly</p>
            <p className="mt-1 text-2xl text-[#1b2f25]">{percentLabel(achMetrics.achMethodShareByBillingCycle.quarterly)}</p>
          </article>
          <article className="rounded-xl border border-[#d8cbaf] bg-[#f9f1df] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Annual</p>
            <p className="mt-1 text-2xl text-[#1b2f25]">{percentLabel(achMetrics.achMethodShareByBillingCycle.annual)}</p>
          </article>
        </div>
      </section>
    </AdminShell>
  );
}
