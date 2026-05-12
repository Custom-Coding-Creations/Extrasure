import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { logoutCustomer } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";
import { getCustomerStripeInvoiceDocumentLinks } from "@/lib/stripe-billing";

export const dynamic = "force-dynamic";

export default async function AccountInvoicesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const invoiceLinks = await Promise.all(
    snapshot.invoices.map(async (invoice) => {
      try {
        const links = await getCustomerStripeInvoiceDocumentLinks(session.customerId, invoice.id);
        return [invoice.id, links] as const;
      } catch {
        return [
          invoice.id,
          {
            stripeInvoiceId: null,
            hostedInvoiceUrl: null,
            pdfUrl: null,
          },
        ] as const;
      }
    }),
  );

  const invoiceLinkMap = new Map(invoiceLinks);

  return (
    <AccountShell
      title="Invoices"
      subtitle="Review invoice history, due dates, and payment states."
      activePath="/account/invoices"
      logoutAction={logoutCustomer}
    >
      <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
        <div className="space-y-3">
          {snapshot.invoices.length ? (
            snapshot.invoices.map((invoice) => (
              <article key={invoice.id} className="rounded-xl border border-[#d8cbaf] bg-[#fffdf6] p-3 text-sm">
                <p className="font-semibold text-[#1b2f25]">{invoice.id}</p>
                <p className="mt-1 text-[#33453a]">
                  ${invoice.amount} · <span className="capitalize">{invoice.status.replace("_", " ")}</span>
                </p>
                <p className="mt-1 text-xs text-[#5d7267]">
                  Due {new Date(invoice.dueDate).toLocaleDateString()} · {invoice.billingCycle.replace("_", " ")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {invoiceLinkMap.get(invoice.id)?.hostedInvoiceUrl ? (
                    <a
                      href={invoiceLinkMap.get(invoice.id)?.hostedInvoiceUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[#4f6f49] px-3 py-1 text-xs font-semibold text-[#3e5a37] transition hover:bg-[#3e5a37] hover:text-white"
                    >
                      View Hosted Invoice
                    </a>
                  ) : null}
                  {invoiceLinkMap.get(invoice.id)?.pdfUrl ? (
                    <a
                      href={invoiceLinkMap.get(invoice.id)?.pdfUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[#6e6c4f] px-3 py-1 text-xs font-semibold text-[#545237] transition hover:bg-[#545237] hover:text-white"
                    >
                      Download PDF
                    </a>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#5d7267]">No invoices found for this account.</p>
          )}
        </div>
      </section>
    </AccountShell>
  );
}
