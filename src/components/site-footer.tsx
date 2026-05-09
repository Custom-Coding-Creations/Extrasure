import Link from "next/link";
import { company } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-emerald-900/10 bg-[#10271d] text-stone-200">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-serif text-lg text-[#efdcb7]">{company.name}</h3>
          <p className="mt-2 text-sm text-stone-300">Reliable local pest protection for Syracuse and surrounding communities.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-100">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-stone-300">
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
          <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-100">Hours</h4>
          <ul className="mt-3 space-y-2 text-sm text-stone-300">
            {company.hours.map((hour) => (
              <li key={hour}>{hour}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-stone-100">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-stone-300">
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
