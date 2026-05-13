function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[rgba(22,53,38,0.08)] dark:bg-[rgba(239,220,183,0.08)] ${className}`} />;
}

export default function AccountLoading() {
  return (
    <div className="dashboard-shell mx-auto w-full max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-12">
      <div className="relative z-10 rounded-3xl border border-[#d8ccb1] bg-[rgba(255,250,240,0.78)] p-5 backdrop-blur-sm dark:border-[#4c6651] dark:bg-[rgba(29,48,38,0.78)] sm:p-7">
        <SkeletonBlock className="h-3 w-44" />
        <SkeletonBlock className="mt-4 h-10 w-full max-w-2xl" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-3xl" />
        <div className="mt-6 flex flex-wrap gap-2">
          <SkeletonBlock className="h-10 w-28 rounded-full" />
          <SkeletonBlock className="h-10 w-28 rounded-full" />
          <SkeletonBlock className="h-10 w-28 rounded-full" />
        </div>
      </div>

      <div className="relative z-10 mt-6 hidden gap-2 rounded-2xl border border-[#d8ccb1] bg-[rgba(255,250,240,0.72)] p-3 lg:flex">
        <SkeletonBlock className="h-10 w-36 rounded-full" />
        <SkeletonBlock className="h-10 w-36 rounded-full" />
        <SkeletonBlock className="h-10 w-36 rounded-full" />
      </div>

      <section className="relative z-10 mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="premium-card rounded-3xl p-6">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-md" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-44 w-full" />
            <div className="grid gap-3">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
            </div>
          </div>
        </div>
        <div className="premium-card rounded-3xl p-6">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="mt-3 h-4 w-full max-w-sm" />
          <div className="mt-5 space-y-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        </div>
      </section>

      <section className="relative z-10 mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock className="h-44 w-full rounded-3xl" />
        <SkeletonBlock className="h-44 w-full rounded-3xl" />
        <SkeletonBlock className="h-44 w-full rounded-3xl" />
        <SkeletonBlock className="h-44 w-full rounded-3xl" />
      </section>
    </div>
  );
}