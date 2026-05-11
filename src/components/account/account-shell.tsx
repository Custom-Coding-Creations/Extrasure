import Link from "next/link";

const accountLinks = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/billing", label: "Billing" },
  { href: "/account/invoices", label: "Invoices" },
  { href: "/account/activity", label: "Activity" },
  { href: "/account/notes", label: "Messages" },
  { href: "/account/services", label: "Services" },
];

type AccountShellProps = {
  title: string;
  subtitle: string;
  activePath: string;
  children: React.ReactNode;
  logoutAction: () => Promise<void>;
};

export function AccountShell({ title, subtitle, activePath, children, logoutAction }: AccountShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#3f5a49]">Customer Account</p>
          <h1 className="mt-2 text-4xl text-[#15281f]">{title}</h1>
          <p className="mt-3 max-w-2xl text-[#33453a]">{subtitle}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full border border-[#163526] px-5 py-2 text-sm font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white"
          >
            Sign Out
          </button>
        </form>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-3">
        {accountLinks.map((link) => {
          const active = activePath === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[#163526] text-white"
                  : "border border-[#d8cbaf] bg-[#fffdf6] text-[#163526] hover:bg-[#f4ebd5]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">{children}</div>
    </div>
  );
}
