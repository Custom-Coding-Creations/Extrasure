import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "success" | "warning" | "danger" | "info";

type StatusBadgeProps = {
  tone: Tone;
  label: string;
};

const toneClassMap: Record<Tone, string> = {
  success: "status-badge-success",
  warning: "status-badge-warning",
  danger: "status-badge-danger",
  info: "status-badge-info",
};

const toneDotClassMap: Record<Tone, string> = {
  success: "bg-[var(--status-success)]",
  warning: "bg-[var(--status-warning)]",
  danger: "bg-[var(--status-danger)]",
  info: "bg-[var(--status-info)]",
};

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${toneClassMap[tone]}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${toneDotClassMap[tone]}`} />
      {label}
    </span>
  );
}

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  className?: string;
};

export function DashboardCard({ title, subtitle, children, ctaHref, ctaLabel, className }: DashboardCardProps) {
  return (
    <section className={`premium-card animated-entry rounded-3xl p-5 sm:p-6 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl text-[#173127] dark:text-[#f2e8d2]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#43584b] dark:text-[#d9ccb1]">{subtitle}</p> : null}
        </div>
        {ctaHref && ctaLabel ? (
          <Link
            href={ctaHref}
            className="elevated-action rounded-full border border-[#d0c4aa] bg-[#fffcf5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#173127] hover:bg-[#f8efdc] dark:border-[#4a644f] dark:bg-[#1f3328] dark:text-[#f0e8d4]"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type StatKpiProps = {
  label: string;
  value: string;
  detail?: string;
};

export function StatKpi({ label, value, detail }: StatKpiProps) {
  return (
    <div className="rounded-2xl border border-[#dbcfb4] bg-[#fffdf7] p-4 dark:border-[#49624d] dark:bg-[#1f3228]">
      <p className="text-xs uppercase tracking-[0.14em] text-[#587166] dark:text-[#c9bc9f]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#163526] dark:text-[#f2ead7]">{value}</p>
      {detail ? <p className="mt-1 text-sm text-[#42594a] dark:text-[#d3c6aa]">{detail}</p> : null}
    </div>
  );
}

type QuickActionCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export function QuickActionCard({ href, eyebrow, title, description, icon }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="premium-card elevated-action block rounded-3xl p-5 focus-visible:focus-ring"
      aria-label={`${title}. ${description}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d5c8ad] bg-[#fff9ea] text-[#163526] dark:border-[#4e6851] dark:bg-[#22382c] dark:text-[#efe6d0]">
        {icon}
      </span>
      <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#5c7368] dark:text-[#cabca0]">{eyebrow}</p>
      <p className="mt-2 text-xl text-[#152d23] dark:text-[#f2e8d2]">{title}</p>
      <p className="mt-2 text-sm text-[#43584b] dark:text-[#d4c7aa]">{description}</p>
    </Link>
  );
}

type InsightItem = {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
};

type InsightListProps = {
  items: InsightItem[];
};

export function InsightList({ items }: InsightListProps) {
  return (
    <ul className="space-y-3" aria-label="AI recommendations and insights">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-2xl border border-[#d7cab0] bg-[#fffaf0] p-4 dark:border-[#4c6550] dark:bg-[#22372c]"
        >
          <div className="flex items-center gap-2">
            <StatusBadge tone={item.tone} label={item.title} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#30493b] dark:text-[#d8ccb2]">{item.detail}</p>
        </li>
      ))}
    </ul>
  );
}

type SignalMeterProps = {
  label: string;
  value: number;
  tone: Tone;
  summary: string;
};

const toneMeterClassMap: Record<Tone, string> = {
  success: "from-[#2c6f45] via-[#3f8457] to-[#65a76f]",
  warning: "from-[#8f5522] via-[#b26b2b] to-[#d48534]",
  danger: "from-[#7b2f25] via-[#994236] to-[#be5a4d]",
  info: "from-[#22533a] via-[#2c6a4a] to-[#4a8a62]",
};

export function SignalMeter({ label, value, tone, summary }: SignalMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4 dark:border-[#4d6751] dark:bg-[#22382d]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#cabda2]">{label}</p>
        <StatusBadge tone={tone} label={`${clamped}/100`} />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8cfbc] dark:bg-[#3b5142]">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneMeterClassMap[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
      <p className="mt-3 text-sm text-[#3f5648] dark:text-[#d4c7ac]">{summary}</p>
    </div>
  );
}

type AssuranceRibbonItem = {
  id: string;
  title: string;
  detail: string;
};

type AssuranceRibbonProps = {
  items: AssuranceRibbonItem[];
};

export function AssuranceRibbon({ items }: AssuranceRibbonProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-[#d7cab0] bg-[#fffaf0] px-4 py-3 dark:border-[#4c6550] dark:bg-[#22372c]">
          <p className="text-sm font-semibold text-[#1d3429] dark:text-[#efe5ce]">{item.title}</p>
          <p className="mt-1 text-sm text-[#42594a] dark:text-[#d1c4a8]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

type TimelineEvent = {
  id: string;
  title: string;
  detail: string;
  badge: string;
  tone: Tone;
};

type TimelinePanelProps = {
  events: TimelineEvent[];
};

export function TimelinePanel({ events }: TimelinePanelProps) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] px-4 py-3 dark:border-[#4d6751] dark:bg-[#22382d]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#1b3126] dark:text-[#efe5cf]">{event.title}</p>
            <StatusBadge tone={event.tone} label={event.badge} />
          </div>
          <p className="mt-2 text-sm text-[#42594a] dark:text-[#d3c6aa]">{event.detail}</p>
        </li>
      ))}
    </ol>
  );
}

type PremiumEmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryText?: string;
};

export function PremiumEmptyState({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  secondaryText,
}: PremiumEmptyStateProps) {
  return (
    <div className="rounded-3xl border border-[#d8ccaf] bg-[#fffaf0] p-5 text-sm text-[#486052] dark:border-[#4d6751] dark:bg-[#22382d] dark:text-[#d8ccb0]">
      <p className="text-xs uppercase tracking-[0.14em] text-[#60766b] dark:text-[#cabda2]">{eyebrow}</p>
      <p className="mt-2 text-lg font-semibold text-[#183126] dark:text-[#efe5cf]">{title}</p>
      <p className="mt-2 leading-relaxed">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="elevated-action mt-4 inline-flex rounded-full bg-[#163526] px-4 py-2 font-semibold text-white hover:bg-[#1f4936]"
        >
          {actionLabel}
        </Link>
      ) : null}
      {secondaryText ? <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#667c71] dark:text-[#cbbda2]">{secondaryText}</p> : null}
    </div>
  );
}

export function IconShield() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-2.7 7.6-7 9-4.3-1.4-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconWave() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    </svg>
  );
}
