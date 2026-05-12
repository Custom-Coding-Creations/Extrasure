import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StripeCheckoutElementsForm } from "@/components/stripe-checkout-elements-form";
import { requireAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminInvoiceCheckoutPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function AdminInvoiceCheckoutPage({ params }: AdminInvoiceCheckoutPageProps) {
  await requireAdminRole(["owner", "dispatch", "accountant"]);
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  if (invoice.status === "paid" || invoice.status === "refunded") {
    redirect(`/admin/payments?stripe=cancelled&invoice=${invoice.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.14em] text-[#6a5f49]">Admin collection</p>
      <h1 className="mt-2 font-serif text-3xl text-[#1d2f25] sm:text-4xl">Collect invoice payment</h1>
      <p className="mt-3 text-sm text-[#4e5e54] sm:text-base">
        Use embedded Checkout Elements to collect payment without leaving the admin dashboard workflow.
      </p>

      <section className="paper-panel mt-8 rounded-2xl border border-[#d3c7ad] p-6">
        <dl className="grid gap-3 text-sm text-[#33453a] sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Invoice</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">{invoice.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Customer</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">{invoice.customer?.name ?? invoice.customerId}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Billing cycle</dt>
            <dd className="mt-1 capitalize text-[#1b2f25]">{invoice.billingCycle.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Amount due</dt>
            <dd className="mt-1 text-base text-[#1b2f25]">${invoice.amount}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <StripeCheckoutElementsForm
            initUrl="/api/admin/payments/checkout-elements"
            initPayload={{ invoiceId: invoice.id }}
            successPath={`/admin/payments?stripe=success&invoice=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`}
            amount={invoice.amount}
            title="Payment Details"
          />
        </div>
      </section>

      <p className="mt-6 text-sm text-[#445349]">
        Need to return to invoice list? <Link href="/admin/payments" className="font-semibold text-[#163526] underline decoration-[#d48534] underline-offset-4">Back to Payments</Link>.
      </p>
    </div>
  );
}
