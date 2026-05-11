import { AdminShell } from "@/components/admin/admin-shell";
import {
  createServicePlanAction,
  deleteServicePlanAction,
  updateServicePlanAction,
} from "@/app/admin/plans/actions";
import { listServiceCatalogItems } from "@/lib/service-catalog";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await listServiceCatalogItems(true);

  return (
    <AdminShell
      title="Service Plans and Offers"
      subtitle="Create, update, and retire customer-facing one-time services and recurring subscription plans."
    >
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Add Plan or Service</h2>
        <form action={createServicePlanAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="name"
            required
            placeholder="Display name"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <input
            name="serviceType"
            required
            placeholder="Service type key"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <select
            name="kind"
            defaultValue="subscription"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          >
            <option value="subscription">Subscription</option>
            <option value="one_time">One Time</option>
          </select>
          <select
            name="billingCycle"
            defaultValue="monthly"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          >
            <option value="one_time">One Time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          <input
            name="amount"
            type="number"
            min="1"
            required
            placeholder="Price (USD)"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <input
            name="durationMinutes"
            type="number"
            min="15"
            step="15"
            defaultValue="90"
            placeholder="Duration (minutes)"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <input
            name="bookingLookaheadDays"
            type="number"
            min="1"
            max="365"
            defaultValue="30"
            placeholder="Booking lookahead (days)"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <input
            name="sortOrder"
            type="number"
            defaultValue="100"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <input
            name="stripeProductId"
            placeholder="Stripe product id (optional)"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <input
            name="stripePriceId"
            placeholder="Stripe price id (optional)"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <textarea
            name="description"
            required
            placeholder="Customer-facing description"
            className="md:col-span-2 xl:col-span-3 rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <label className="flex items-center gap-2 rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <input name="active" type="checkbox" defaultChecked className="h-4 w-4" />
            Active
          </label>
          <button
            type="submit"
            className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Create
          </button>
        </form>
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-[#d3c7ad] bg-[#fff9eb]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#d8cbaf] bg-[#f4e7cb] text-[#24392d]">
            <tr>
              <th className="px-4 py-3">Offer</th>
              <th className="px-4 py-3">Pricing</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const formId = `plan-${plan.id}`;

              return (
                <tr key={plan.id} className="border-b border-[#ecdfc3] last:border-0">
                  <td className="px-4 py-3 align-top">
                    <input
                      form={formId}
                      name="name"
                      defaultValue={plan.name}
                      required
                      className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 font-semibold text-[#1d2f25]"
                    />
                    <input
                      form={formId}
                      name="serviceType"
                      defaultValue={plan.serviceType}
                      required
                      className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-xs text-[#33453a]"
                    />
                    <textarea
                      form={formId}
                      name="description"
                      defaultValue={plan.description}
                      required
                      className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-xs text-[#33453a]"
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-[#33453a]">
                    <div className="grid gap-2">
                      <select
                        form={formId}
                        name="kind"
                        defaultValue={plan.kind}
                        className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2"
                      >
                        <option value="subscription">Subscription</option>
                        <option value="one_time">One Time</option>
                      </select>
                      <select
                        form={formId}
                        name="billingCycle"
                        defaultValue={plan.billingCycle}
                        className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2"
                      >
                        <option value="one_time">One Time</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                      </select>
                      <input
                        form={formId}
                        name="amount"
                        type="number"
                        min="1"
                        defaultValue={plan.amount}
                        className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2"
                      />
                      <input
                        form={formId}
                        name="sortOrder"
                        type="number"
                        defaultValue={plan.sortOrder}
                        className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#33453a]">
                    <input
                      form={formId}
                      name="stripeProductId"
                      defaultValue={plan.stripeProductId ?? ""}
                      placeholder="Product ID"
                      className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2"
                    />
                    <input
                      form={formId}
                      name="stripePriceId"
                      defaultValue={plan.stripePriceId ?? ""}
                      placeholder="Price ID"
                      className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2"
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-[#33453a]">
                    <label className="flex items-center gap-2 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2">
                      <input form={formId} name="active" type="checkbox" defaultChecked={plan.active} className="h-4 w-4" />
                      {plan.active ? "Active" : "Inactive"}
                    </label>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <form id={formId} action={updateServicePlanAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]"
                        >
                          Save
                        </button>
                      </form>
                      <form action={deleteServicePlanAction}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
                        >
                          Delete/Disable
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
