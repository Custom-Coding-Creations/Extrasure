import { AdminShell } from "@/components/admin/admin-shell";
import { inventory } from "@/lib/admin-data";

export default function AdminInventoryPage() {
  return (
    <AdminShell
      title="Inventory and Chemical Tracking"
      subtitle="Track stock levels, reorder thresholds, and field readiness for treatment materials and compliance logs."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {inventory.map((item) => {
          const needsReorder = item.quantity <= item.reorderPoint;

          return (
            <article key={item.id} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">{item.id}</p>
              <h2 className="mt-1 text-xl text-[#1b2f25]">{item.name}</h2>
              <p className="mt-2 text-3xl text-[#153126]">
                {item.quantity} <span className="text-sm text-[#445349]">{item.unit}</span>
              </p>
              <p className="mt-1 text-sm text-[#445349]">Reorder at {item.reorderPoint} {item.unit}</p>
              <p className={`mt-3 text-xs uppercase tracking-[0.1em] ${needsReorder ? "text-red-700" : "text-emerald-700"}`}>
                {needsReorder ? "Reorder Needed" : "Sufficient"}
              </p>
            </article>
          );
        })}
      </div>
    </AdminShell>
  );
}
