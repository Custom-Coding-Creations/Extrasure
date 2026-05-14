"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { company } from "@/lib/site";

const links = [
  { href: "/book", label: "Book Now" },
  { href: "/services", label: "Services" },
  { href: "/service-area", label: "Service Area" },
  { href: "/commercial", label: "Commercial" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur" style={{ borderColor: "var(--site-header-border)", background: "var(--site-header-bg)", color: "var(--site-header-fg)" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-serif text-lg tracking-[0.08em] sm:text-xl" style={{ color: "var(--brand-sand)" }}>
            {company.name}
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/book"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-90 md:inline-flex"
              style={{ background: "var(--brand-sand)", color: "var(--brand-forest)" }}
            >
              Book Service
            </Link>
            <Link
              href="/account"
              className="hidden rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-white/10 md:inline-flex"
              style={{ borderColor: "color-mix(in srgb, var(--brand-sand) 35%, transparent)", color: "var(--brand-sand)" }}
            >
              My Account
            </Link>
            <Link
              href="/pay"
              className="hidden rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-white/10 md:inline-flex"
              style={{ borderColor: "color-mix(in srgb, var(--brand-sand) 35%, transparent)", color: "var(--brand-sand)" }}
            >
              Pay Bill
            </Link>
            <TrackedContactLink
              href={company.phoneHref}
              eventName="call_click"
              eventPayload={{ source: "site_header" }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              style={{ background: "var(--brand-accent)" }}
            >
              {company.ctaPrimary}
            </TrackedContactLink>
          </div>
        </div>

        <nav className="hidden items-center gap-4 overflow-x-auto text-sm md:flex lg:gap-6" style={{ color: "color-mix(in srgb, var(--site-header-fg) 82%, transparent)" }}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap transition hover:opacity-100" style={{ opacity: 0.86 }}>
              {link.label}
            </Link>
          ))}
          <Link href="/admin" className="whitespace-nowrap transition hover:opacity-100" style={{ opacity: 0.62 }}>
            Owner Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
