import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { logoutCustomer, openCustomerBillingPortal, updateCustomerSubscriptionAction } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams?: Promise<{ stripe?: string }>;
};

function subscriptionLabel(status: string | null) {
  if (!status) {
    return "No Stripe subscription on file";
  }

  return status.replace("_", " ");
}

export default async function AccountBillingPage({ searchParams }: BillingPageProps) {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const params = searchParams ? await searchParams : undefined;

  return (
    <AccountShell
      title="Billing"
      subtitle="Manage your subscription and payment methods securely through Stripe."
      activePath="/account/billing"
      logoutAction={logoutCustomer}
    >
      {params?.stripe === "portal_return" ? (
        <section className="mb-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4 text-sm text-[#33453a]">
          You returned from the billing portal.
        </section>
      ) : null}
      {params?.stripe === "subscription_pause" ? (
        <section className="mb-4 rounded-2xl border border-[#b8d8c6] bg-[#ecf9f0] p-4 text-sm text-[#1f4b33]">
          Subscription payments are paused.
        </section>
      ) : null}
      {params?.stripe === "subscription_resume" ? (
        <section className="mb-4 rounded-2xl border border-[#b8d8c6] bg-[#ecf9f0] p-4 text-sm text-[#1f4b33]">
          Subscription is active again.
        </section>
      ) : null}
      {params?.stripe === "subscription_cancel" ? (
        <section className="mb-4 rounded-2xl border border-[#dec3a9] bg-[#fff4e8] p-4 text-sm text-[#7b3d13]">
          Subscription will cancel at period end.
        </section>
      ) : null}
      {params?.stripe === "subscription_error" ? (
        <section className="mb-4 rounded-2xl border border-[#dec3a9] bg-[#fff4e8] p-4 text-sm text-[#7b3d13]">
          Unable to update subscription right now.
        </section>
      ) : null}

      <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
        <h2 className="text-2xl text-[#1b2f25]">Subscription Details</h2>
        <p className="mt-3 text-sm text-[#33453a]">
          Plan: <span className="capitalize text-[#1b2f25]">{snapshot.customer.activePlan.replace("_", " ")}</span>
        </p>
        <p className="mt-2 text-sm text-[#33453a]">
          Status: <span className="capitalize text-[#1b2f25]">{subscriptionLabel(snapshot.customer.stripeSubscriptionStatus)}</span>
        </p>
        <p className="mt-2 text-sm text-[#33453a]">
          Customer ID: <span className="text-[#1b2f25]">{snapshot.customer.stripeCustomerId ?? "Not linked"}</span>
        </p>

        <form action={openCustomerBillingPortal} className="mt-5">
          <button
            type="submit"
            className="rounded-full bg-[#163526] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Open Billing Portal
          </button>
        </form>

        {snapshot.customer.stripeSubscriptionId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={updateCustomerSubscriptionAction}>
              <input type="hidden" name="action" value="pause" />
              <button
                type="submit"
                className="rounded-full border border-[#8c693f] px-4 py-2 text-sm font-semibold text-[#8c693f] transition hover:bg-[#8c693f] hover:text-white"
              >
                Pause
              </button>
            </form>
            <form action={updateCustomerSubscriptionAction}>
              <input type="hidden" name="action" value="resume" />
              <button
                type="submit"
                className="rounded-full border border-[#4f6f49] px-4 py-2 text-sm font-semibold text-[#3e5a37] transition hover:bg-[#3e5a37] hover:text-white"
              >
                Resume
              </button>
            </form>
            <form action={updateCustomerSubscriptionAction}>
              <input type="hidden" name="action" value="cancel" />
              <button
                type="submit"
                className="rounded-full border border-[#8a3d22] px-4 py-2 text-sm font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
              >
                Cancel at End of Term
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </AccountShell>
  );
}
