import Link from "next/link";
import { AccountShellEnhancements } from "@/components/account/account-shell-enhancements";
import type { AccountShellLink, AccountShellNotification } from "@/components/account/account-shell-types";

const accountLinks: AccountShellLink[] = [
  { href: "/account", label: "Home Protection", shortLabel: "Home" },
  { href: "/account/services", label: "Protection Visits", shortLabel: "Visits" },
  { href: "/account/activity", label: "Protection Timeline", shortLabel: "Timeline" },
  { href: "/account/billing", label: "Protection Plan", shortLabel: "Plan" },
  { href: "/account/invoices", label: "Billing Records", shortLabel: "Records" },
  { href: "/account/profile", label: "Property & Account", shortLabel: "Account" },
  { href: "/account/notes", label: "Support & Guidance", shortLabel: "Support" },
];

type AccountShellProps = {
  title: string;
  subtitle: string;
  activePath: string;
  children: React.ReactNode;
  logoutAction: () => Promise<void>;
  shellQuickActions?: AccountShellLink[];
  shellNotifications?: AccountShellNotification[];
};

export function AccountShell({ title, subtitle, activePath, children, logoutAction, shellQuickActions, shellNotifications }: AccountShellProps) {
  const isActive = (href: string) => {
    if (href === "/account") {
      return activePath === "/account";
    }

    return activePath.startsWith(href);
  };

  const unreadNotifications = (shellNotifications ?? []).filter((notification) => !notification.readAt).length;

  return (
    <div className="dashboard-shell mx-auto w-full max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-12">
      <div className="account-hero-layer relative z-10 overflow-hidden rounded-3xl border border-[#d8ccb1] bg-[rgba(255,250,240,0.82)] p-5 backdrop-blur-sm dark:border-[#4c6651] dark:bg-[rgba(29,48,38,0.82)] sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_12%_18%,rgba(212,133,52,0.24),transparent_56%),radial-gradient(circle_at_88%_6%,rgba(22,53,38,0.25),transparent_48%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[#426151] dark:text-[#c9bba0]">ExtraSure Home Platform</p>
          <h1 className="mt-2 text-3xl text-[#15281f] dark:text-[#f3ead7] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-[#33453a] dark:text-[#d9ccb2] sm:text-base">{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#cdbf9f] bg-[#fffaf0] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#2f473a] dark:border-[#546e58] dark:bg-[#243a2f] dark:text-[#e7dcc7]">
              {unreadNotifications} active alert{unreadNotifications === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-[#cdbf9f] bg-[#fffaf0] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#2f473a] dark:border-[#546e58] dark:bg-[#243a2f] dark:text-[#e7dcc7]">
              {(shellQuickActions ?? []).length} smart shortcut{(shellQuickActions ?? []).length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AccountShellEnhancements
            title={title}
            activePath={activePath}
            links={accountLinks}
            quickActions={shellQuickActions}
            notifications={shellNotifications}
          />
          <form action={logoutAction}>
            <button
              type="submit"
              className="elevated-action rounded-full border border-[#163526] bg-[#fffaf0] px-5 py-2 text-sm font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white dark:border-[#7f9d89] dark:bg-[#1f3328] dark:text-[#e9dfc9]"
            >
              Sign Out
            </button>
          </form>
        </div>
        </div>
      </div>

      <nav
        className="glass-panel relative z-10 mt-6 hidden flex-wrap gap-2 rounded-2xl p-3 lg:flex"
        aria-label="Customer account sections"
      >
        {accountLinks.map((link) => {
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:focus-ring ${
                active
                  ? "bg-[#163526] text-white"
                  : "border border-[#d8cbaf] bg-[#fffdf6] text-[#163526] hover:bg-[#f4ebd5] dark:border-[#4f6953] dark:bg-[#20352a] dark:text-[#e8dfca] dark:hover:bg-[#2b4335]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 mt-4">{children}</div>

      <nav
        className="glass-panel fixed bottom-4 left-1/2 z-30 flex w-[min(96vw,760px)] -translate-x-1/2 items-center justify-between rounded-2xl px-2 py-2 lg:hidden"
        aria-label="Mobile account navigation"
      >
        {accountLinks.slice(0, 5).map((link) => {
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.08em] focus-visible:focus-ring ${
                active
                  ? "bg-[#163526] text-white"
                  : "text-[#163526] dark:text-[#ecdcc0]"
              }`}
            >
              {link.shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
