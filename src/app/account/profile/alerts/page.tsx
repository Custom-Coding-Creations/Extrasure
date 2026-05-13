import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { AccountNotificationPreferences } from "@/components/account/account-notification-preferences";
import { DashboardCard } from "@/components/account/protection-ui";
import { logoutCustomer } from "@/app/account/actions";
import { requireCustomerSession } from "@/lib/customer-auth";
import { buildAccountShellState } from "@/lib/account-shell-data";
import { getCustomerAccountSnapshot } from "@/lib/customer-account-data";
import { getCustomerAccountNotificationPreferences } from "@/lib/account-notifications";

export const dynamic = "force-dynamic";

export default async function AccountAlertPreferencesPage() {
  const session = await requireCustomerSession();
  const snapshot = await getCustomerAccountSnapshot(session.customerId, session.email);

  if (!snapshot) {
    redirect("/account/login");
  }

  const [shellState, preferences] = await Promise.all([
    buildAccountShellState(snapshot, "profile"),
    getCustomerAccountNotificationPreferences(session.customerId),
  ]);

  return (
    <AccountShell
      title="Alert Preferences"
      subtitle="Control which proactive account signals appear in your dashboard notification center."
      activePath="/account/profile"
      logoutAction={logoutCustomer}
      shellQuickActions={shellState.quickActions}
      shellNotifications={shellState.notifications}
    >
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <DashboardCard title="Notification Controls" subtitle="Enable or mute individual alert sources for your account">
          <AccountNotificationPreferences initialPreferences={preferences} />
        </DashboardCard>

        <DashboardCard title="How this works" subtitle="Your dashboard still monitors all core conditions behind the scenes">
          <div className="grid gap-3 text-sm text-[#40584a] dark:text-[#d5c8ad]">
            <p className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
              Muting an alert source hides future notifications for that source in the alert center.
            </p>
            <p className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
              You can re-enable any source at any time, and matching alerts will return automatically when conditions apply.
            </p>
            <Link
              href="/account/profile"
              className="elevated-action inline-flex w-fit rounded-full bg-[#163526] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
            >
              Back to Property &amp; Account
            </Link>
          </div>
        </DashboardCard>
      </section>
    </AccountShell>
  );
}