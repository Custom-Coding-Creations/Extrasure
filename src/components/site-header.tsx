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
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[#0f2a1e]/96 text-stone-100 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="font-serif text-lg tracking-wide text-[#efdcb7] sm:text-xl">
            {company.name}
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/book"
              className="hidden rounded-full bg-[#efdcb7] px-4 py-2 text-sm font-semibold text-[#183224] transition hover:bg-[#f4e7cb] md:inline-flex"
            >
              Book Service
            </Link>
            <Link
              href="/account"
              className="hidden rounded-full border border-[#efdcb7]/30 px-4 py-2 text-sm font-semibold text-[#efdcb7] transition hover:border-[#efdcb7]/60 hover:bg-[#efdcb7]/10 md:inline-flex"
            >
              My Account
            </Link>
            <Link
              href="/pay"
              className="hidden rounded-full border border-[#efdcb7]/30 px-4 py-2 text-sm font-semibold text-[#efdcb7] transition hover:border-[#efdcb7]/60 hover:bg-[#efdcb7]/10 md:inline-flex"
            >
              Pay Bill
            </Link>
            <TrackedContactLink
              href={company.phoneHref}
              eventName="call_click"
              eventPayload={{ source: "site_header" }}
              className="rounded-full bg-[#d48534] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b86d22]"
            >
              {company.ctaPrimary}
            </TrackedContactLink>
          </div>
        </div>

        <nav className="hidden items-center gap-4 overflow-x-auto text-sm text-stone-200 md:flex lg:gap-6">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap transition hover:text-[#efdcb7]">
              {link.label}
            </Link>
          ))}
          <Link href="/admin" className="whitespace-nowrap text-stone-400 transition hover:text-stone-200">
            Owner Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
