import { AdminNav } from "@/components/admin/admin-nav";

type AdminShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-[#d6c8a4] bg-[#fff7e8] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[#496053]">Owner Operations Console</p>
        <h1 className="mt-1 text-3xl text-[#15281f]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#3c4e43]">{subtitle}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-[#d6c8a4] bg-[#f9f0dc] p-4">
          <AdminNav />
        </aside>
        <section className="space-y-5">{children}</section>
      </div>
    </div>
  );
}
