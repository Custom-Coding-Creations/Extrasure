import { redirect } from "next/navigation";
import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";
import { logoutCustomer } from "@/app/account/actions";

export const dynamic = "force-dynamic";

type AccountPageProps = {
  searchParams?: Promise<{
    stripe?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const params = searchParams ? await searchParams : undefined;
  const stripeState = params?.stripe;

  return (
    <AccountShell
      title={`Welcome back, ${snapshot.customer.name}`}
      subtitle="Your account hub with billing, invoices, activity, messages, and service history."
      activePath="/account"
      logoutAction={logoutCustomer}
    >
      {stripeState === "portal_return" ? (
        <section className="mb-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-4 text-sm text-[#33453a]">
          You returned from the billing portal.
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/account/profile" className="paper-panel rounded-2xl border border-[#d3c7ad] p-5 transition hover:shadow-md">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Profile</p>
          <p className="mt-2 text-2xl text-[#153126]">{snapshot.customer.name}</p>
          <p className="mt-2 text-sm text-[#445349]">Contact details and customer lifecycle profile.</p>
        </Link>

        <Link href="/account/billing" className="paper-panel rounded-2xl border border-[#d3c7ad] p-5 transition hover:shadow-md">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Billing</p>
          <p className="mt-2 text-2xl capitalize text-[#153126]">{snapshot.customer.activePlan.replace("_", " ")}</p>
          <p className="mt-2 text-sm text-[#445349]">Manage subscription and payment methods.</p>
        </Link>

        <Link href="/account/invoices" className="paper-panel rounded-2xl border border-[#d3c7ad] p-5 transition hover:shadow-md">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Invoices</p>
          <p className="mt-2 text-2xl text-[#153126]">{snapshot.invoices.length}</p>
          <p className="mt-2 text-sm text-[#445349]">View due dates, statuses, and amounts.</p>
        </Link>

        <Link href="/account/activity" className="paper-panel rounded-2xl border border-[#d3c7ad] p-5 transition hover:shadow-md">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Activity</p>
          <p className="mt-2 text-2xl text-[#153126]">{snapshot.timeline.length}</p>
          <p className="mt-2 text-sm text-[#445349]">Recent account events across billing and service.</p>
        </Link>

        <Link href="/account/notes" className="paper-panel rounded-2xl border border-[#d3c7ad] p-5 transition hover:shadow-md">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Messages</p>
          <p className="mt-2 text-2xl text-[#153126]">{snapshot.notes.length}</p>
          <p className="mt-2 text-sm text-[#445349]">Customer-visible notes and support messages.</p>
        </Link>

        <Link href="/account/services" className="paper-panel rounded-2xl border border-[#d3c7ad] p-5 transition hover:shadow-md">
          <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">Services</p>
          <p className="mt-2 text-2xl text-[#153126]">{snapshot.jobs.length}</p>
          <p className="mt-2 text-sm text-[#445349]">Track past and upcoming service visits.</p>
        </Link>
      </section>
    </AccountShell>
  );
}
