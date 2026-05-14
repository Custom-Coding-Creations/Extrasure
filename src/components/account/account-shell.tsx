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
  const mobileQuickActions = (shellQuickActions ?? []).slice(0, 3);

  return (
    <div className="dashboard-shell mx-auto w-full max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-12">
      <div className="account-hero-layer relative z-10 overflow-hidden rounded-3xl border p-5 backdrop-blur-sm sm:p-7" style={{ borderColor: "rgba(47, 36, 29, 0.18)", background: "rgba(255, 251, 245, 0.82)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_12%_18%,rgba(174,128,81,0.24),transparent_56%),radial-gradient(circle_at_88%_6%,rgba(47,36,29,0.2),transparent_48%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "rgba(47, 36, 29, 0.62)" }}>ExtraSure Home Platform</p>
          <h1 className="mt-2 text-3xl sm:text-4xl" style={{ color: "#2b211b" }}>{title}</h1>
          <p className="mt-3 text-sm sm:text-base" style={{ color: "rgba(47, 36, 29, 0.72)" }}>{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border bg-[#fffaf0] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "rgba(47, 36, 29, 0.2)", color: "rgba(47, 36, 29, 0.72)" }}>
              {unreadNotifications} active alert{unreadNotifications === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border bg-[#fffaf0] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "rgba(47, 36, 29, 0.2)", color: "rgba(47, 36, 29, 0.72)" }}>
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
                className="elevated-action rounded-full border bg-[#fffaf0] px-5 py-2 text-sm font-semibold transition hover:bg-[#2f241d] hover:text-white"
                style={{ borderColor: "#2f241d", color: "#2f241d" }}
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
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:focus-ring ${
                active
                  ? "text-white"
                  : "border bg-[#fffdf6] hover:bg-[#f4ebd5]"
              }`}
              style={active ? { background: "#2f241d" } : { borderColor: "rgba(47, 36, 29, 0.2)", color: "#2f241d" }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {mobileQuickActions.length ? (
        <section className="relative z-10 mt-4 lg:hidden" aria-label="Mobile smart shortcuts">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(47, 36, 29, 0.58)" }}>Smart shortcuts</p>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(47, 36, 29, 0.52)" }}>Thumb-ready actions</p>
          </div>
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mobileQuickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="premium-card min-w-[15.5rem] snap-start rounded-[1.4rem] px-4 py-3"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em]" style={{ color: "rgba(47, 36, 29, 0.58)" }}>Quick action</p>
                <p className="mt-2 text-sm font-semibold" style={{ color: "#2b211b" }}>{action.label}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="relative z-10 mt-4">{children}</div>

      <nav
        className="glass-panel fixed bottom-4 left-1/2 z-30 flex w-[min(96vw,760px)] -translate-x-1/2 items-center justify-between gap-1 rounded-2xl px-2 py-2 lg:hidden"
        aria-label="Mobile account navigation"
      >
        {accountLinks.slice(0, 5).map((link) => {
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-[0.64rem] font-semibold uppercase tracking-[0.08em] focus-visible:focus-ring ${
                active
                  ? "text-white"
                  : ""
              }`}
              style={active ? { background: "#2f241d" } : { color: "#2f241d" }}
            >
              {link.shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
