import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { PaymentMethodManager } from "@/components/payment-methods/PaymentMethodManager";
import { DashboardCard } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

export default async function AccountBillingPaymentMethodsPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const shellState = await buildAccountShellState(snapshot, "billing");

  return (
    <AccountShell
      title="Payment Methods"
      subtitle="Manage saved methods, preferred payment type, and autopay settings for your protection plan."
      activePath="/account/billing"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Billing Method Manager" subtitle="Secure Stripe-backed payment controls for future charges">
          <PaymentMethodManager />
        </DashboardCard>

        <DashboardCard title="Security & Guidance" subtitle="How this payment management experience works">
          <div className="grid gap-3 text-sm text-[#40584a] dark:text-[#d5c8ad]">
            <p className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
              Payment credentials are managed and tokenized by Stripe. ExtraSure stores only method metadata needed for preference and analytics.
            </p>
            <p className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
              ACH preference can unlock 3% savings where eligible. Card preference remains available if you prefer standard card checkout.
            </p>
            <Link
              href="/account/billing"
              className="elevated-action inline-flex w-fit rounded-full bg-[#163526] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
            >
              Back to Protection Plan
            </Link>
          </div>
        </DashboardCard>
      </section>
    </AccountShell>
  );
}
