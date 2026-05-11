import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { convertBookingToJobAction, createJobAction, deleteJobAction, updateJobAction } from "@/app/admin/schedule/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const { state, dataError } = await loadAdminPageData();
  const bookings = state
    ? await prisma.serviceBooking.findMany({
        where: {
          status: {
            in: ["checkout_pending", "checkout_completed", "requested"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const invoiceIds = bookings.map((booking) => booking.invoiceId).filter((value): value is string => Boolean(value));
  const catalogIds = bookings.map((booking) => booking.serviceCatalogItemId);

  const [invoices, catalogItems] = state
    ? await Promise.all([
        invoiceIds.length
          ? prisma.invoice.findMany({
              where: {
                id: {
                  in: invoiceIds,
                },
              },
            })
          : Promise.resolve([]),
        catalogIds.length
          ? prisma.serviceCatalogItem.findMany({
              where: {
                id: {
                  in: catalogIds,
                },
              },
            })
          : Promise.resolve([]),
      ])
    : [[], []];

  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));

  return (
    <AdminShell
      title="Scheduling and Dispatch"
      subtitle="Coordinate appointments, emergency slots, and technician assignment with a route-aware daily queue."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Create Job</h2>
        <form action={createJobAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select name="customerId" defaultValue="" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="" disabled>Select customer</option>
            {state.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <input name="service" required placeholder="Service" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="scheduledAt" type="datetime-local" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <select name="technicianId" defaultValue="" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="" disabled>Select technician</option>
            {state.technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>{tech.name}</option>
            ))}
          </select>
          <select name="status" defaultValue="scheduled" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="reschedule_needed">Reschedule Needed</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <input name="emergency" type="checkbox" className="h-4 w-4" /> Emergency
          </label>
          <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">Create job</button>
        </form>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5 lg:col-span-2">
          <h2 className="text-2xl text-[#1b2f25]">Upcoming Jobs</h2>
          <div className="mt-4 space-y-3">
            {state.jobs.map((job) => {
              const customer = state.customers.find((item) => item.id === job.customerId);
              const tech = state.technicians.find((item) => item.id === job.technicianId);
              const formId = `job-form-${job.id}`;

              return (
                <article key={job.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4 text-sm text-[#33453a]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input form={formId} name="service" defaultValue={job.service} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                    <select form={formId} name="customerId" defaultValue={job.customerId} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                      {state.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input form={formId} name="scheduledAt" type="datetime-local" defaultValue={job.scheduledAt.slice(0, 16)} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                    <select form={formId} name="technicianId" defaultValue={job.technicianId} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                      {state.technicians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select form={formId} name="status" defaultValue={job.status} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="reschedule_needed">Reschedule Needed</option>
                    </select>
                    <label className="flex items-center gap-2 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                      <input form={formId} name="emergency" type="checkbox" defaultChecked={job.emergency} className="h-4 w-4" /> Emergency
                    </label>
                  </div>
                  <p className="mt-3 font-semibold text-[#20372c]">{customer?.name ?? "Unknown customer"}</p>
                  <p className="text-xs text-[#5d7267]">{new Date(job.scheduledAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#5d7267]">
                    {job.status.replaceAll("_", " ")} • {tech?.name ?? "Unassigned"}
                    {job.emergency ? " • emergency" : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form id={formId} action={updateJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">Save</button>
                    </form>
                    <form action={deleteJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">Delete</button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-2xl text-[#1b2f25]">Technician Capacity</h2>
          <p className="mt-2 text-xs text-[#5d7267]">
            Status values are managed in the Technicians module, and utilization is derived from active scheduled and in-progress jobs.
          </p>
          <ul className="mt-4 space-y-3">
            {state.technicians.map((tech) => (
              <li key={tech.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3 text-sm">
                <p className="font-semibold text-[#20372c]">{tech.name}</p>
                <p className="text-[#445349]">{tech.status.replaceAll("_", " ")}</p>
                <p className="text-xs text-[#5d7267]">Utilization: {tech.utilizationPercent}%</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Incoming Booking Requests</h2>
        <p className="mt-2 text-xs text-[#5d7267]">
          Bookings are created from the public checkout flow. Paid bookings can be converted into jobs for dispatch.
        </p>
        <div className="mt-4 space-y-3">
          {bookings.length ? (
            bookings.map((booking) => {
              const customer = state.customers.find((item) => item.id === booking.customerId);
              const invoice = booking.invoiceId ? invoiceById.get(booking.invoiceId) : null;
              const item = catalogById.get(booking.serviceCatalogItemId);
              const isPaid = invoice?.status === "paid";

              return (
                <article key={booking.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4 text-sm text-[#33453a]">
                  <p className="font-semibold text-[#20372c]">{item?.name ?? "Service request"}</p>
                  <p className="mt-1 text-xs text-[#5d7267]">{customer?.name ?? booking.contactName} • {booking.contactEmail}</p>
                  <p className="mt-1 text-xs text-[#5d7267]">
                    Preferred: {new Date(booking.preferredDate).toLocaleDateString()} • {booking.preferredWindow}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[#5d7267]">
                    Booking: {booking.status.replaceAll("_", " ")} • Payment: {invoice?.status ?? "open"}
                  </p>
                  <form action={convertBookingToJobAction} className="mt-3 grid gap-2 md:grid-cols-4">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input
                      name="scheduledAt"
                      type="datetime-local"
                      defaultValue={new Date(booking.preferredDate).toISOString().slice(0, 16)}
                      required
                      className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                    />
                    <select
                      name="technicianId"
                      defaultValue=""
                      required
                      className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                    >
                      <option value="" disabled>Select technician</option>
                      {state.technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>{tech.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!isPaid}
                      className="rounded-lg bg-[#163526] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Convert to Job
                    </button>
                    {!isPaid ? <p className="text-xs text-[#8a3d22]">Awaiting successful payment</p> : <span />}
                  </form>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-[#5d7267]">No incoming booking requests.</p>
          )}
        </div>
      </section>
      </>
      )}
    </AdminShell>
  );
}
