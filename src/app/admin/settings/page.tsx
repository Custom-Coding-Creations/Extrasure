import { AdminShell } from "@/components/admin/admin-shell";
import { adminUsers } from "@/lib/admin-data";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="Security and Access Controls"
      subtitle="Manage role-based permissions, 2FA readiness, and audit controls for owner-level operations."
    >
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Role and MFA Status</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {adminUsers.map((user) => (
            <li key={user.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
              <p className="font-semibold text-[#20372c]">{user.name}</p>
              <p className="capitalize text-[#445349]">Role: {user.role.replace("_", " ")}</p>
              <p className="text-xs text-[#5d7267]">
                2FA: {user.twoFactorEnabled ? "enabled" : "pending enrollment"}
              </p>
            </li>
          ))}
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
    </AdminShell>
  );
}
