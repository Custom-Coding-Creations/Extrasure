import { notFound, redirect } from "next/navigation";
import { inspectInvoiceAccessToken } from "@/lib/customer-billing-access";
import { getCustomerInvoiceSnapshot } from "@/lib/stripe-billing";

export const dynamic = "force-dynamic";

type TokenPayPageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ stripe?: string }>;
};

function statusMessage(invoiceStatus: string, stripeState: string | undefined) {
  if (invoiceStatus === "paid") {
    return {
      tone: "success",
      text: "Payment confirmed. Your invoice is now marked as paid.",
    } as const;
  }

  if (invoiceStatus === "refunded") {
    return {
      tone: "neutral",
      text: "This invoice was refunded. Contact support if you need additional documentation.",
    } as const;
  }

  if (invoiceStatus === "past_due") {
    return {
      tone: "warning",
      text: "A previous payment attempt failed. You can retry payment now or update your billing method in the portal.",
    } as const;
  }

  if (stripeState === "success") {
    return {
      tone: "neutral",
      text: "Payment was submitted. We are waiting for webhook confirmation from Stripe.",
    } as const;
  }

  if (stripeState === "cancelled") {
    return {
      tone: "warning",
      text: "Payment was canceled before completion. You can retry anytime.",
    } as const;
  }

  if (stripeState === "portal_return") {
    return {
      tone: "neutral",
      text: "You returned from the billing portal.",
    } as const;
  }

  if (stripeState === "rate_limited") {
    return {
      tone: "warning",
      text: "Too many billing actions were attempted. Please wait a minute and try again.",
    } as const;
  }

  if (stripeState === "subscription_pause") {
    return {
      tone: "success",
      text: "Subscription payments are now paused.",
    } as const;
  }

  if (stripeState === "subscription_resume") {
    return {
      tone: "success",
      text: "Subscription has resumed.",
    } as const;
  }

  if (stripeState === "subscription_cancel") {
    return {
      tone: "warning",
      text: "Subscription will cancel at the end of the current period.",
    } as const;
  }

  if (stripeState === "subscription_error") {
    return {
      tone: "warning",
      text: "Unable to update subscription right now. Please contact support if this persists.",
    } as const;
  }

  return null;
}

export default async function TokenPayPage({ params, searchParams }: TokenPayPageProps) {
  const { token } = await params;
  const tokenResult = inspectInvoiceAccessToken(token);

  if (!tokenResult.ok) {
    if (tokenResult.reason === "expired") {
      redirect(`/pay?error=expired&token=${encodeURIComponent(token)}`);
    }

    notFound();
  }

  const payload = tokenResult.payload;

  const snapshot = await getCustomerInvoiceSnapshot(payload.invoiceId);

  if (!snapshot) {
    notFound();
  }

  const paramsData = searchParams ? await searchParams : undefined;
  const message = statusMessage(snapshot.invoice.status, paramsData?.stripe);
  const isPaid = snapshot.invoice.status === "paid";
  const isRefunded = snapshot.invoice.status === "refunded";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Customer Billing</p>
      <h1 className="mt-2 text-4xl text-[#15281f]">Invoice {snapshot.invoice.id}</h1>
      <p className="mt-4 max-w-2xl text-[#33453a]">
        Review your invoice details and continue to secure Stripe checkout.
      </p>

      {message ? (
        <section
          className={`mt-6 rounded-2xl p-4 text-sm ${
            message.tone === "success"
              ? "border border-[#b8d8c6] bg-[#ecf9f0] text-[#1f4b33]"
              : message.tone === "warning"
                ? "border border-[#dec3a9] bg-[#fff4e8] text-[#7b3d13]"
                : "border border-[#d3c7ad] bg-[#fff9eb] text-[#33453a]"
          }`}
        >
          {message.text}
        </section>
      ) : null}

      <section className="paper-panel mt-8 rounded-2xl border border-[#d3c7ad] p-6">
        <dl className="grid gap-3 text-sm text-[#33453a] sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Customer</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">{snapshot.customer.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Amount Due</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">${snapshot.invoice.amount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Billing Cycle</dt>
            <dd className="mt-1 capitalize text-[#1b2f25]">{snapshot.invoice.billingCycle.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Status</dt>
            <dd className="mt-1 capitalize text-[#1b2f25]">{snapshot.invoice.status.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Last Billing Update</dt>
            <dd className="mt-1 text-[#1b2f25]">
              {snapshot.invoice.paymentStatusUpdatedAt
                ? new Date(snapshot.invoice.paymentStatusUpdatedAt).toLocaleString()
                : "No updates yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Latest Attempt</dt>
            <dd className="mt-1 capitalize text-[#1b2f25]">
              {snapshot.latestPayment ? snapshot.latestPayment.status.replace("_", " ") : "No attempts yet"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {!isPaid && !isRefunded ? (
            <form action={`/pay/${token}/checkout`} method="post">
              <button
                type="submit"
                className="rounded-full bg-[#163526] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
              >
                Pay Securely
              </button>
            </form>
          ) : null}

          <form action={`/pay/${token}/portal`} method="post">
            <button
              type="submit"
              className="rounded-full border border-[#163526] px-6 py-3 text-sm font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white"
            >
              Manage Billing
            </button>
          </form>
            {snapshot.customer.stripeSubscriptionId && snapshot.invoice.billingCycle !== "one_time" ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={`/pay/${token}/subscription`} method="post">
                  <input type="hidden" name="action" value="pause" />
                  <button
                    type="submit"
                    className="rounded-full border border-[#8c693f] px-4 py-2 text-sm font-semibold text-[#8c693f] transition hover:bg-[#8c693f] hover:text-white"
                  >
                    Pause Subscription
                  </button>
                </form>
                <form action={`/pay/${token}/subscription`} method="post">
                  <input type="hidden" name="action" value="resume" />
                  <button
                    type="submit"
                    className="rounded-full border border-[#3e5f91] px-4 py-2 text-sm font-semibold text-[#3e5f91] transition hover:bg-[#3e5f91] hover:text-white"
                  >
                    Resume Subscription
                  </button>
                </form>
                <form action={`/pay/${token}/subscription`} method="post">
                  <input type="hidden" name="action" value="cancel" />
                  <button
                    type="submit"
                    className="rounded-full border border-[#8a3d22] px-4 py-2 text-sm font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
                  >
                    Cancel At Period End
                  </button>
                </form>
              </div>
            ) : null}
        </div>
      </section>
    </div>
  );
}
