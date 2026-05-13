function SkeletonBlock({ className }: { className: string }) {
  return <div className={`shimmer-line animate-pulse rounded-2xl bg-[rgba(22,53,38,0.08)] dark:bg-[rgba(239,220,183,0.08)] ${className}`} />;
}

export default function AccountLoading() {
  return (
    <div className="dashboard-shell mx-auto w-full max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-12">
      <div className="relative z-10 rounded-3xl border border-[#d8ccb1] bg-[rgba(255,250,240,0.78)] p-5 backdrop-blur-sm dark:border-[#4c6651] dark:bg-[rgba(29,48,38,0.78)] sm:p-7">
        <SkeletonBlock className="h-3 w-44" />
        <SkeletonBlock className="mt-4 h-10 w-full max-w-2xl" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-3xl" />
        <div className="mt-6 flex flex-wrap gap-2">
          <SkeletonBlock className="h-8 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 mt-6 hidden gap-2 rounded-2xl border border-[#d8ccb1] bg-[rgba(255,250,240,0.72)] p-3 lg:flex">
        <SkeletonBlock className="h-10 w-36 rounded-full" />
        <SkeletonBlock className="h-10 w-36 rounded-full" />
        <SkeletonBlock className="h-10 w-36 rounded-full" />
      </div>

      <section className="relative z-10 mt-4 lg:hidden">
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SkeletonBlock className="h-20 min-w-[14.5rem] snap-start rounded-[1.4rem]" />
          <SkeletonBlock className="h-20 min-w-[14.5rem] snap-start rounded-[1.4rem]" />
          <SkeletonBlock className="h-20 min-w-[14.5rem] snap-start rounded-[1.4rem]" />
        </div>
      </section>

      <section className="relative z-10 mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="premium-card rounded-[2rem] p-6 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-8 w-40 rounded-full" />
                <SkeletonBlock className="h-8 w-36 rounded-full" />
              </div>
              <SkeletonBlock className="mt-4 h-12 w-full max-w-xl" />
              <SkeletonBlock className="mt-3 h-4 w-full max-w-2xl" />
              <SkeletonBlock className="mt-2 h-4 w-full max-w-xl" />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SkeletonBlock className="h-28 w-full rounded-[1.5rem]" />
                <SkeletonBlock className="h-28 w-full rounded-[1.5rem]" />
                <SkeletonBlock className="h-28 w-full rounded-[1.5rem]" />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <SkeletonBlock className="h-11 w-48 rounded-full" />
                <SkeletonBlock className="h-11 w-40 rounded-full" />
              </div>
            </div>
            <div className="grid gap-4">
              <SkeletonBlock className="mx-auto h-44 w-44 rounded-full" />
              <SkeletonBlock className="h-40 w-full rounded-[1.7rem]" />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="premium-card rounded-3xl p-5">
            <SkeletonBlock className="h-6 w-52" />
            <SkeletonBlock className="mt-3 h-4 w-full max-w-sm" />
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-36 w-full rounded-[1.6rem]" />
              <SkeletonBlock className="h-36 w-full rounded-[1.6rem]" />
              <SkeletonBlock className="h-36 w-full rounded-[1.6rem]" />
            </div>
          </div>
          <div className="premium-card rounded-3xl p-5">
            <SkeletonBlock className="h-6 w-44" />
            <SkeletonBlock className="mt-3 h-4 w-full max-w-xs" />
            <SkeletonBlock className="mt-4 h-56 w-full rounded-[1.75rem]" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="premium-card rounded-3xl p-6">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-lg" />
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            <SkeletonBlock className="h-40 w-full rounded-[1.55rem]" />
            <SkeletonBlock className="h-40 w-full rounded-[1.55rem]" />
            <SkeletonBlock className="h-40 w-full rounded-[1.55rem]" />
            <SkeletonBlock className="h-40 w-full rounded-[1.55rem]" />
            <SkeletonBlock className="h-40 w-full rounded-[1.55rem]" />
          </div>
        </div>
        <div className="premium-card rounded-3xl p-6">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-sm" />
          <SkeletonBlock className="mt-4 h-64 w-full rounded-[1.8rem]" />
        </div>
      </section>

      <section className="relative z-10 mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card rounded-3xl p-6">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-md" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-28 w-full rounded-[1.7rem]" />
            <SkeletonBlock className="h-28 w-full rounded-[1.7rem]" />
            <SkeletonBlock className="h-28 w-full rounded-[1.7rem]" />
            <SkeletonBlock className="h-28 w-full rounded-[1.7rem]" />
          </div>
        </div>
        <div className="grid gap-4">
          <SkeletonBlock className="h-64 w-full rounded-3xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-40 w-full rounded-3xl" />
            <SkeletonBlock className="h-40 w-full rounded-3xl" />
            <SkeletonBlock className="h-40 w-full rounded-3xl" />
            <SkeletonBlock className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-4">
        <SkeletonBlock className="h-80 w-full rounded-3xl" />
      </section>
    </div>
  );
}