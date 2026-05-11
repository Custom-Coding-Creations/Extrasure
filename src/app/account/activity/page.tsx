import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { logoutCustomer } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

export default async function AccountActivityPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId);

  if (!snapshot) {
    redirect("/account/login");
  }

  return (
    <AccountShell
      title="Activity"
      subtitle="A timeline of invoice, payment, service, and messaging events on your account."
      activePath="/account/activity"
      logoutAction={logoutCustomer}
    >
      <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
        <div className="space-y-3">
          {snapshot.timeline.length ? (
            snapshot.timeline.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#d8cbaf] bg-[#fffdf6] p-3 text-sm">
                <p className="font-semibold text-[#1b2f25]">{item.title}</p>
                <p className="mt-1 text-[#33453a]">{item.detail}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.09em] text-[#5d7267]">
                  {item.type} · {new Date(item.occurredAt).toLocaleString()}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#5d7267]">No activity recorded yet.</p>
          )}
        </div>
      </section>
    </AccountShell>
  );
}
