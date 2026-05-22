type ManualSectionFrameProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  summary?: string;
  stats?: string[];
  actionLabel?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function ManualSectionFrame({
  id,
  eyebrow,
  title,
  description,
  summary,
  stats,
  actionLabel = "Open section",
  children,
  defaultOpen = true,
}: ManualSectionFrameProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      data-manual-section="true"
      className="group scroll-mt-28 rounded-3xl border border-[#cdbf9e] bg-[linear-gradient(180deg,#fff9eb_0%,#fff4df_100%)] shadow-[0_10px_30px_rgba(47,54,38,0.08)] transition-shadow duration-200 hover:shadow-[0_14px_34px_rgba(47,54,38,0.12)]"
    >
      <summary className="list-none cursor-pointer p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#587164]">{eyebrow}</p>
              {stats ? (
                <div className="flex flex-wrap gap-2">
                  {stats.map((stat) => (
                    <span
                      key={stat}
                      className="rounded-full border border-[#d0c4a7] bg-[#faf3e2] px-2.5 py-1 text-[0.68rem] font-semibold text-[#5d6b61]"
                    >
                      {stat}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <h2 className="text-[1.55rem] leading-tight text-[#1a2f25] sm:text-[1.85rem]">{title}</h2>
            <div className="space-y-1.5">
              {summary ? <p className="max-w-3xl text-sm font-medium leading-6 text-[#30473d]">{summary}</p> : null}
              {description ? <p className="max-w-3xl text-sm leading-6 text-[#3f5648]">{description}</p> : null}
            </div>
          </div>
          <span className="rounded-full border border-[#35506b] bg-[#f6f0e2] px-3 py-1 text-xs font-semibold text-[#284260] transition group-open:bg-[#284260] group-open:text-white">
            <span className="group-open:hidden">{actionLabel}</span>
            <span className="hidden group-open:inline">Collapse</span>
          </span>
        </div>
      </summary>
      <div className="border-t border-[#d8c9ac] bg-[#fffdf6] p-4 sm:p-5">{children}</div>
    </details>
  );
}
