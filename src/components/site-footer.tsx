import Link from "next/link";
import { company } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--site-footer-border)", background: "var(--site-footer-bg)", color: "var(--site-footer-fg)" }}>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-serif text-lg tracking-[0.06em]" style={{ color: "var(--brand-sand)" }}>{company.name}</h3>
          <p className="mt-2 text-sm" style={{ color: "color-mix(in srgb, var(--site-footer-fg) 80%, transparent)" }}>Reliable local pest protection for Syracuse and surrounding communities.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--brand-sand)" }}>Contact</h4>
          <ul className="mt-3 space-y-2 text-sm" style={{ color: "color-mix(in srgb, var(--site-footer-fg) 80%, transparent)" }}>
            <li>
              <a href={company.phoneHref}>{company.phoneDisplay}</a>
            </li>
            <li>
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </li>
            <li>{company.city}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--brand-sand)" }}>Hours</h4>
          <ul className="mt-3 space-y-2 text-sm" style={{ color: "color-mix(in srgb, var(--site-footer-fg) 80%, transparent)" }}>
            {company.hours.map((hour) => (
              <li key={hour}>{hour}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--brand-sand)" }}>Company</h4>
          <ul className="mt-3 space-y-2 text-sm" style={{ color: "color-mix(in srgb, var(--site-footer-fg) 80%, transparent)" }}>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
