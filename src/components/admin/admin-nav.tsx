"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/customers", label: "CRM" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/technicians", label: "Technicians" },
  { href: "/admin/estimates", label: "Estimates" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/payments/ach-analytics", label: "ACH Analytics" },
  { href: "/admin/reporting", label: "Reporting" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/automations", label: "Automations" },
  { href: "/admin/settings", label: "Security" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-2">
      {links.map((link) => {
        const active = isActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              active
                ? "text-white"
                : "hover:bg-[#eef3f7]"
            }`}
            style={active ? { background: "#14212e" } : { background: "#ffffff", color: "#22364a", border: "1px solid rgba(20,33,46,0.08)" }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
