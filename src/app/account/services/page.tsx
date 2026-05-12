import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { logoutCustomer } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";

export const dynamic = "force-dynamic";

export default async function AccountServicesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  return (
    <AccountShell
      title="Service History"
      subtitle="Track completed, in-progress, and scheduled services for your property."
      activePath="/account/services"
      logoutAction={logoutCustomer}
    >
      <section className="paper-panel rounded-2xl border border-[#d3c7ad] p-6">
        <h2 className="text-xl text-[#1b2f25]">Upcoming Booking Requests</h2>
        <div className="mt-3 space-y-3">
          {snapshot.bookings.length ? (
            snapshot.bookings.map((booking) => (
              <article key={booking.id} className="rounded-xl border border-[#d8cbaf] bg-[#fffdf6] p-3 text-sm">
                <p className="font-semibold text-[#1b2f25]">{new Date(booking.preferredDate).toLocaleDateString()} · {booking.preferredWindow}</p>
                <p className="mt-1 capitalize text-[#33453a]">{booking.status.replace("_", " ")}</p>
                <p className="mt-1 text-xs text-[#5d7267]">{booking.addressLine1}, {booking.city}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#5d7267]">No booking requests yet.</p>
          )}
        </div>

        <h2 className="mt-6 text-xl text-[#1b2f25]">Service History</h2>
        <div className="space-y-3">
          {snapshot.jobs.length ? (
            snapshot.jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-[#d8cbaf] bg-[#fffdf6] p-3 text-sm">
                <p className="font-semibold text-[#1b2f25]">{job.service}</p>
                <p className="mt-1 capitalize text-[#33453a]">{job.status.replace("_", " ")}</p>
                <p className="mt-1 text-xs text-[#5d7267]">{new Date(job.scheduledAt).toLocaleString()}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[#5d7267]">No service history yet.</p>
          )}
        </div>
      </section>
    </AccountShell>
  );
}
