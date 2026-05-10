import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  approveEstimateAction,
  convertEstimateToInvoiceAction,
  convertEstimateToJobAction,
  createEstimateAction,
  declineEstimateAction,
  deleteEstimateAction,
  updateEstimateAction,
} from "@/app/admin/estimates/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

export default async function AdminEstimatesPage() {
  const { state, dataError } = await loadAdminPageData();

  return (
    <AdminShell
      title="Estimate Builder and Approvals"
      subtitle="Generate line-item estimates, monitor approval status, and convert approved work into scheduled jobs and invoices."
    >
      {!state ? <AdminDataNotice message={dataError} /> : (
      <>
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Create Estimate</h2>
        <form action={createEstimateAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select name="customerId" defaultValue="" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="" disabled>Select customer</option>
            {state.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <input name="service" required placeholder="Service" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="amount" type="number" min="0" step="1" required placeholder="Amount" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <input name="createdAt" type="date" required className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]" />
          <select name="status" defaultValue="sent" className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]">
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
          <button type="submit" className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]">Create estimate</button>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {state.estimates.map((estimate) => {
          const customer = state.customers.find((item) => item.id === estimate.customerId);
          const formId = `estimate-form-${estimate.id}`;

          return (
            <article key={estimate.id} className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
              <div className="grid gap-3">
                <input form={formId} name="service" defaultValue={estimate.service} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                <select form={formId} name="customerId" defaultValue={estimate.customerId} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                  {state.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <input form={formId} name="amount" type="number" min="0" step="1" defaultValue={estimate.amount} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                <input form={formId} name="createdAt" type="date" defaultValue={estimate.createdAt} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]" />
                <select form={formId} name="status" defaultValue={estimate.status} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[#5d7267]">{estimate.id}</p>
              <h2 className="mt-1 text-xl text-[#1b2f25]">{estimate.service}</h2>
              <p className="mt-2 text-sm text-[#445349]">{customer?.name ?? "Unknown customer"}</p>
              <p className="mt-1 text-sm text-[#445349]">Created {estimate.createdAt}</p>
              <p className="mt-3 text-2xl text-[#153126]">${estimate.amount}</p>
              <p className="mt-2 inline-block rounded-full bg-[#ece2ca] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[#33453a]">
                {estimate.status}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form id={formId} action={updateEstimateAction}>
                  <input type="hidden" name="estimateId" value={estimate.id} />
                  <button type="submit" className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]">Save</button>
                </form>
                <form action={deleteEstimateAction}>
                  <input type="hidden" name="estimateId" value={estimate.id} />
                  <button type="submit" className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white">Delete</button>
                </form>
                <form action={approveEstimateAction}>
                  <input type="hidden" name="estimateId" value={estimate.id} />
                  <button type="submit" className="rounded-full border border-[#163526] px-3 py-1 text-xs font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white">Approve</button>
                </form>
                <form action={declineEstimateAction}>
                  <input type="hidden" name="estimateId" value={estimate.id} />
                  <button type="submit" className="rounded-full border border-[#6b4d2d] px-3 py-1 text-xs font-semibold text-[#6b4d2d] transition hover:bg-[#6b4d2d] hover:text-white">Decline</button>
                </form>
                <form action={convertEstimateToJobAction}>
                  <input type="hidden" name="estimateId" value={estimate.id} />
                  <button type="submit" className="rounded-full border border-[#30435b] px-3 py-1 text-xs font-semibold text-[#30435b] transition hover:bg-[#30435b] hover:text-white">Convert to Job</button>
                </form>
                <form action={convertEstimateToInvoiceAction}>
                  <input type="hidden" name="estimateId" value={estimate.id} />
                  <button type="submit" className="rounded-full border border-[#2e5a46] px-3 py-1 text-xs font-semibold text-[#2e5a46] transition hover:bg-[#2e5a46] hover:text-white">Convert to Invoice</button>
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
