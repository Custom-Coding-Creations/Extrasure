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
                : "hover:bg-[#eef3ff]"
            }`}
            style={active ? { background: "linear-gradient(135deg, #6f7cff 0%, #00c2ff 100%)" } : { background: "#ffffff", color: "#24326c", border: "1px solid rgba(73,102,255,0.12)" }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
