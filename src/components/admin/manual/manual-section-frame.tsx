type ManualSectionFrameProps = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function ManualSectionFrame({
  id,
  eyebrow,
  title,
  description,
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
      <summary className="list-none cursor-pointer p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#587164]">{eyebrow}</p>
            <h2 className="mt-2 text-2xl leading-tight text-[#1a2f25] sm:text-[1.8rem]">{title}</h2>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#3f5648]">{description}</p> : null}
          </div>
          <span className="rounded-full border border-[#35506b] bg-[#f6f0e2] px-3 py-1 text-xs font-semibold text-[#284260] transition group-open:bg-[#284260] group-open:text-white">
            <span className="group-open:hidden">Expand</span>
            <span className="hidden group-open:inline">Collapse</span>
          </span>
        </div>
      </summary>
      <div className="border-t border-[#d8c9ac] bg-[#fffdf6] p-5 sm:p-6">{children}</div>
    </details>
  );
}
