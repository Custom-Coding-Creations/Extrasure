import Link from "next/link";
import { TrackedContactLink } from "@/components/tracked-contact-link";
import { company } from "@/lib/site";

const links = [
  { href: "/services", label: "Services" },
  { href: "/service-area", label: "Service Area" },
  { href: "/commercial", label: "Commercial" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/admin", label: "Owner Dashboard" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[#0f2a1e]/95 text-stone-100 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="font-serif text-lg tracking-wide text-[#efdcb7]">
          {company.name}
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[#efdcb7]">
              {link.label}
            </Link>
          ))}
        </nav>
        <TrackedContactLink
          href={company.phoneHref}
          eventName="call_click"
          eventPayload={{ source: "site_header" }}
          className="rounded-full bg-[#d48534] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b86d22]"
        >
          {company.ctaPrimary}
        </TrackedContactLink>
      </div>
    </header>
  );
}
