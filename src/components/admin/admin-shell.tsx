import { AdminNav } from "@/components/admin/admin-nav";
import { logoutOwner } from "@/app/owner-login/actions";
import { getAdminSession } from "@/lib/admin-auth";

type AdminShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export async function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const session = await getAdminSession();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-[#d6c8a4] bg-[#fff7e8] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[#496053]">Owner Operations Console</p>
          <div className="flex items-center gap-2">
            <p className="rounded-full bg-[#ece2ca] px-3 py-1 text-xs text-[#33453a]">
              {session?.name ?? "Signed in"} • {session?.role ?? "owner"}
            </p>
            <form action={logoutOwner}>
              <button
                type="submit"
                className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
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
