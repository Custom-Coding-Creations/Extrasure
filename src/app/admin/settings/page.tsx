import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  createAdminUserAction,
  deleteAdminUserAction,
  toggleAdminUserTwoFactorAction,
  updateAdminUserAction,
  updateSchedulingConfigAction,
} from "@/app/admin/settings/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";
import { getSchedulingConfig } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { state, dataError } = await loadAdminPageData();
  const schedulingConfig = await getSchedulingConfig();

  return (
    <AdminShell
      title="Security and Access Controls"
      subtitle="Manage role-based permissions, 2FA readiness, and audit controls for owner-level operations."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Create Admin User</h2>
        <form action={createAdminUserAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input name="name" required placeholder="Name" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <select name="role" defaultValue="owner" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="owner">Owner</option>
            <option value="dispatch">Dispatch</option>
            <option value="technician">Technician</option>
            <option value="accountant">Accountant</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <input name="twoFactorEnabled" type="checkbox" className="h-4 w-4" /> 2FA enabled
          </label>
          <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">Create admin user</button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Role and MFA Status</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {state.adminUsers.map((user) => {
            const formId = `admin-user-form-${user.id}`;

            return (
            <li key={user.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <input form={formId} name="name" defaultValue={user.name} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                <select form={formId} name="role" defaultValue={user.role} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                  <option value="owner">Owner</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="technician">Technician</option>
                  <option value="accountant">Accountant</option>
                </select>
                <label className="flex items-center gap-2 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                  <input form={formId} name="twoFactorEnabled" type="checkbox" defaultChecked={user.twoFactorEnabled} className="h-4 w-4" /> 2FA enabled
                </label>
                <div className="flex flex-wrap gap-2">
                  <form id={formId} action={updateAdminUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">Save</button>
                  </form>
                  <form action={toggleAdminUserTwoFactorAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="rounded-full border border-[#30435b] px-3 py-1 text-xs font-semibold text-[#30435b] transition hover:bg-[#30435b] hover:text-white">Toggle 2FA</button>
                  </form>
                  <form action={deleteAdminUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">Delete</button>
                  </form>
                </div>
              </div>
              <p className="mt-3 font-semibold text-[#20372c]">{user.name}</p>
              <p className="capitalize text-[#445349]">Role: {user.role.replace("_", " ")}</p>
              <p className="text-xs text-[#5d7267]">
                2FA: {user.twoFactorEnabled ? "enabled" : "pending enrollment"}
              </p>
            </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Operational Security Checklist</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[#445349]">
          <li>Require 2FA for all owner and accounting roles before enabling live refunds.</li>
          <li>Maintain immutable audit trails for invoice edits, refunds, and role changes.</li>
          <li>Review failed authentication attempts weekly and rotate privileged credentials quarterly.</li>
          <li>Confirm webhook signature validation for payment and accounting integrations.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Booking and Scheduling Configuration</h2>
        <form action={updateSchedulingConfigAction} className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#20372c]">Allow Same-Day Booking</label>
              <label className="mt-2 flex items-center gap-2 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
                <input
                  name="allowSameDayBooking"
                  type="checkbox"
                  defaultChecked={schedulingConfig.allowSameDayBooking}
                  className="h-4 w-4"
                />
                Customers can book services today if slots available
              </label>
              <p className="mt-2 text-xs text-[#5d7267]">
                When unchecked, customers can only book services at least 24 hours in advance.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#20372c]">Same-Day Booking Surcharge (%)</label>
              <input
                name="sameDaySurchargePercent"
                type="number"
                min="0"
                max="100"
                step="5"
                defaultValue={schedulingConfig.sameDaySurchargePercent}
                className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
              />
              <p className="mt-2 text-xs text-[#5d7267]">Percentage increase to invoice total for same-day bookings (0-100%)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#20372c]">Default Booking Lookahead (days)</label>
              <input
                name="globalBookingLookaheadDays"
                type="number"
                min="1"
                max="365"
                defaultValue={schedulingConfig.globalBookingLookaheadDays}
                className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
              />
              <p className="mt-2 text-xs text-[#5d7267]">How many days ahead customers can book (used if service doesn't specify)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#20372c]">Minimum Notice Required (hours)</label>
              <input
                name="minimumNoticeHours"
                type="number"
                min="0"
                max="72"
                step="1"
                defaultValue={schedulingConfig.minimumNoticeHours}
                className="mt-2 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
              />
              <p className="mt-2 text-xs text-[#5d7267]">Customers must book at least this many hours in advance (0-72 hours)</p>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Save Configuration
          </button>
        </form>
      </section>
      </>
      )}
    </AdminShell>
  );
}
