"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/account/protection-ui";
import type { AccountHomeIntelligence } from "@/lib/account-home-intelligence";

type TimelineProps = {
  filters: AccountHomeIntelligence["timeline"]["filters"];
  items: AccountHomeIntelligence["timeline"]["items"];
};

export function filterTimelineItems(
  items: TimelineProps["items"],
  activeFilter: TimelineProps["filters"][number]["id"],
) {
  return items.filter((item) => activeFilter === "all" || item.category === activeFilter);
}

function TimelineIcon({ icon }: { icon: AccountHomeIntelligence["timeline"]["items"][number]["icon"] }) {
  if (icon === "receipt") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }

  if (icon === "message") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 5v-5H7.5A2.5 2.5 0 0 1 5 12.5z" />
      </svg>
    );
  }

  if (icon === "spark") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l7 3v6c0 4.5-2.7 7.6-7 9-4.3-1.4-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function formatOccurredAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AccountHomeTimeline({ filters, items }: TimelineProps) {
  const [activeFilter, setActiveFilter] = useState<TimelineProps["filters"][number]["id"]>("all");
  const visibleItems = filterTimelineItems(items, activeFilter);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Protection timeline filters">
        {filters.map((filter) => {
          const active = filter.id === activeFilter;

          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                active
                  ? "border-[#163526] bg-[#163526] text-white shadow-[0_10px_24px_rgba(20,40,30,0.16)]"
                  : "border-[#d9ccb1] bg-[#fffaf0] text-[#2d4639] hover:border-[#c5b690] hover:bg-[#f7ecd8] dark:border-[#526c56] dark:bg-[#22382d] dark:text-[#eadfc9]"
              }`}
            >
              {filter.label}
              <span className="ml-2 opacity-70">{filter.count}</span>
            </button>
          );
        })}
      </div>

      {visibleItems.length ? (
        <ol className="grid gap-3" aria-live="polite">
          {visibleItems.map((item, index) => (
            <li
              key={item.id}
              className="group rounded-[1.75rem] border border-[#dccfb5] bg-[linear-gradient(180deg,rgba(255,251,242,0.96),rgba(247,238,219,0.92))] p-4 shadow-[0_14px_32px_rgba(20,40,30,0.08)] transition hover:-translate-y-[1px] hover:shadow-[0_16px_36px_rgba(20,40,30,0.12)] dark:border-[#516b55] dark:bg-[linear-gradient(180deg,rgba(31,49,39,0.98),rgba(27,43,34,0.92))]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d5c7aa] bg-[#fff7e5] text-[#193427] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-[#4c6650] dark:bg-[#22382d] dark:text-[#efe4cf]">
                    <TimelineIcon icon={item.icon} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#183126] dark:text-[#f1e8d3]">{item.title}</p>
                      {index === 0 ? <span className="rounded-full bg-[#f0e1be] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#745018] dark:bg-[#3d3422] dark:text-[#f4ddaa]">Latest</span> : null}
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#3f5849] dark:text-[#d3c7ab]">{item.detail}</p>
                  </div>
                </div>

                <div className="grid justify-items-end gap-2">
                  <StatusBadge tone={item.tone} label={item.badge} />
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#698073] dark:text-[#c4b89d]">{formatOccurredAt(item.occurredAt)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <section className="rounded-[1.5rem] border border-[#dccfb5] bg-[#fffaf0] p-4 text-sm text-[#3f5849] dark:border-[#516b55] dark:bg-[#22382d] dark:text-[#d3c7ab]">
          <p className="font-semibold text-[#173126] dark:text-[#f1e8d3]">No events match this filter yet.</p>
          <p className="mt-2">Try another category to review recent service, billing, support, or AI activity.</p>
        </section>
      )}
    </div>
  );
}