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

  // Check if running in test mode (sk_test_* or rk_test_*)
  const isTestMode = 
    process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || 
    process.env.STRIPE_SECRET_KEY?.startsWith("rk_test_");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {isTestMode && (
              <div className="mb-4 rounded-2xl border-2 px-4 py-3" style={{ borderColor: "#d4b48c", background: "#f7ecde" }}>
                <p className="text-sm font-semibold" style={{ color: "#6d4d2a" }}>
                  🔴 TEST MODE — Payments are in test mode. Real charges are disabled.
                </p>
              </div>
            )}
      <div className="mb-6 rounded-2xl border p-5" style={{ borderColor: "rgba(47, 36, 29, 0.18)", background: "linear-gradient(150deg, #fffaf0 0%, #f1e5d3 100%)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(47, 36, 29, 0.62)" }}>Owner Operations Console</p>
          <div className="flex items-center gap-2">
            <p className="rounded-full px-3 py-1 text-xs" style={{ background: "#e9dcc8", color: "#46362b" }}>
              {session?.name ?? "Signed in"} • {session?.role ?? "owner"}
            </p>
            <form action={logoutOwner}>
              <button
                type="submit"
                className="rounded-full px-3 py-1 text-xs font-semibold text-white transition hover:brightness-95"
                style={{ background: "#1f1a18" }}
              >
                Log out
              </button>
            </form>
          </div>
        </div>
        <h1 className="mt-1 text-3xl" style={{ color: "#2b211b" }}>{title}</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: "rgba(47, 36, 29, 0.72)" }}>{subtitle}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border p-4" style={{ borderColor: "rgba(47, 36, 29, 0.2)", background: "#f7ecdc" }}>
          <AdminNav />
        </aside>
        <section className="space-y-5">{children}</section>
      </div>
    </div>
  );
}
