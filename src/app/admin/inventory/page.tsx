import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  createInventoryAction,
  deleteInventoryAction,
  restockInventoryAction,
  updateInventoryAction,
} from "@/app/admin/inventory/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const { state, dataError } = await loadAdminPageData();

  return (
    <AdminShell
      title="Inventory and Chemical Tracking"
      subtitle="Track stock levels, reorder thresholds, and field readiness for treatment materials and compliance logs."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Add Inventory Item</h2>
        <form action={createInventoryAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input name="name" required placeholder="Item name" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="unit" required placeholder="Unit" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="quantity" type="number" min="0" step="1" required placeholder="Quantity" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="reorderPoint" type="number" min="0" step="1" required placeholder="Reorder point" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="lastUpdated" type="date" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">Create item</button>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {state.inventory.map((item) => {
          const needsReorder = item.quantity <= item.reorderPoint;
          const formId = `inventory-form-${item.id}`;

          return (
            <article key={item.id} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
              <p className="text-xs uppercase tracking-[0.12em] text-[#5d7267]">{item.id}</p>
              <input form={formId} name="name" defaultValue={item.name} className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-xl text-[#1b2f25]" />
              <div className="mt-2 grid gap-2">
                <input form={formId} name="quantity" type="number" min="0" step="1" defaultValue={item.quantity} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-3xl text-[#153126]" />
                <input form={formId} name="unit" defaultValue={item.unit} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#445349]" />
                <input form={formId} name="reorderPoint" type="number" min="0" step="1" defaultValue={item.reorderPoint} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#445349]" />
                <input form={formId} name="lastUpdated" type="date" defaultValue={item.lastUpdated} className="w-full rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#445349]" />
              </div>
              <p className="mt-1 text-sm text-[#445349]">Reorder at {item.reorderPoint} {item.unit}</p>
              <p className={`mt-3 text-xs uppercase tracking-[0.1em] ${needsReorder ? "text-red-700" : "text-emerald-700"}`}>
                {needsReorder ? "Reorder Needed" : "Sufficient"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form id={formId} action={updateInventoryAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">Save</button>
                </form>
                <form action={deleteInventoryAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">Delete</button>
                </form>
                <form action={restockInventoryAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="delta" value="10" />
                  <button type="submit" className="rounded-full border border-[#2e5a46] px-3 py-1 text-xs font-semibold text-[#2e5a46] transition hover:bg-[#2e5a46] hover:text-white">+10</button>
                </form>
                <form action={restockInventoryAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="delta" value="-5" />
                  <button type="submit" className="rounded-full border border-[#6b4d2d] px-3 py-1 text-xs font-semibold text-[#6b4d2d] transition hover:bg-[#6b4d2d] hover:text-white">-5</button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
      </>
      )}
    </AdminShell>
  );
}
