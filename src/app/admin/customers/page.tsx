import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/app/admin/customers/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const { state, dataError } = await loadAdminPageData();

  return (
    <AdminShell
      title="CRM and Account Health"
      subtitle="Track customers, properties, lifecycle stage, and recurring plan status to improve retention and collections."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Add Customer</h2>
        <form action={createCustomerAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="name"
            required
            placeholder="Customer name"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          />
          <input
            name="phone"
            required
            placeholder="Phone"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          />
          <input
            name="city"
            required
            placeholder="City"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          />
          <select
            name="activePlan"
            defaultValue="none"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          >
            <option value="none">No plan</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <select
            name="lifecycle"
            defaultValue="lead"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          >
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
          </select>
          <input
            name="lastServiceDate"
            type="date"
            required
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25] outline-none transition focus:border-[#163526]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Create customer
          </button>
        </form>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3">Last Service</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.customers.map((customer) => {
              const formId = `customer-form-${customer.id}`;

              return (
              <tr key={customer.id} className="border-b border-[#ecdfc3] last:border-0">
                <td className="px-4 py-3 align-top font-semibold text-[#1b2f25]">
                  <input
                    form={formId}
                    name="name"
                    defaultValue={customer.name}
                    required
                    className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                  />
                  <input
                    form={formId}
                    name="city"
                    defaultValue={customer.city}
                    required
                    className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-xs font-normal text-[#33453a]"
                  />
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <input
                    form={formId}
                    name="phone"
                    defaultValue={customer.phone}
                    required
                    className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                  />
                  <input
                    form={formId}
                    name="email"
                    type="email"
                    defaultValue={customer.email}
                    required
                    className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-xs text-[#33453a]"
                  />
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <select
                    form={formId}
                    name="activePlan"
                    defaultValue={customer.activePlan}
                    className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm capitalize text-[#1d2f25]"
                  >
                    <option value="none">No plan</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <select
                    form={formId}
                    name="lifecycle"
                    defaultValue={customer.lifecycle}
                    className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm capitalize text-[#1d2f25]"
                  >
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                  </select>
                </td>
                <td className="px-4 py-3 align-top text-[#33453a]">
                  <input
                    form={formId}
                    name="lastServiceDate"
                    type="date"
                    defaultValue={customer.lastServiceDate}
                    required
                    className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                  />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <form id={formId} action={updateCustomerAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]"
                      >
                        Save
                      </button>
                    </form>
                    <form action={deleteCustomerAction}>
                      <input type="hidden" name="customerId" value={customer.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </AdminShell>
  );
}
