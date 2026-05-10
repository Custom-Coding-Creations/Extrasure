import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import {
  createTechnicianAction,
  deleteTechnicianAction,
  setTechnicianStatusAction,
  updateTechnicianAction,
} from "@/app/admin/technicians/actions";
import { loadAdminPageData } from "@/lib/admin-page-data";

export const dynamic = "force-dynamic";

export default async function AdminTechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { state, dataError } = await loadAdminPageData();
  const { error: actionError } = await searchParams;

  if (!state) {
    return (
      <AdminShell
        title="Technician Management"
        subtitle="Create technician profiles, manage availability, and track utilization for scheduling and route optimization."
      >
        <AdminDataNotice message={dataError} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Technician Management"
      subtitle="Create technician profiles, manage availability, and track utilization for scheduling and route optimization."
    >
      {actionError && (
        <div className="rounded-xl border border-[#c0392b] bg-[#fdecea] px-4 py-3 text-sm text-[#c0392b]">
          {actionError}
        </div>
      )}
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Create Technician</h2>
        <form action={createTechnicianAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="name"
            required
            placeholder="Technician name"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          />
          <select
            name="status"
            defaultValue="available"
            className="rounded-xl border border-[#cbbd9f] bg-[#fffdf6] px-4 py-3 text-sm text-[#1d2f25]"
          >
            <option value="available">Available</option>
            <option value="in_route">In Route</option>
            <option value="on_job">On Job</option>
            <option value="off_shift">Off Shift</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Create technician
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Technician Roster</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {state.technicians.map((tech) => {
            const formId = `technician-form-${tech.id}`;

            return (
              <li key={tech.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                  <input
                    form={formId}
                    name="name"
                    defaultValue={tech.name}
                    className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                  />
                  <select
                    form={formId}
                    name="status"
                    defaultValue={tech.status}
                    className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]"
                  >
                    <option value="available">Available</option>
                    <option value="in_route">In Route</option>
                    <option value="on_job">On Job</option>
                    <option value="off_shift">Off Shift</option>
                  </select>
                  <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] px-3 py-2 text-sm text-[#1d2f25]">
                    Util: {tech.utilizationPercent}%
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form id={formId} action={updateTechnicianAction}>
                      <input type="hidden" name="technicianId" value={tech.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-[#163526] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#10271d]"
                      >
                        Save
                      </button>
                    </form>
                    <form action={deleteTechnicianAction}>
                      <input type="hidden" name="technicianId" value={tech.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <p className="mt-3 font-semibold text-[#20372c]">{tech.name}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-[#5d7267]">
                  <span className="capitalize">Status: {tech.status.replace("_", " ")}</span>
                  <span>Utilization: {tech.utilizationPercent}%</span>
                </div>
              </li>
            );
          })}
          {state.technicians.length === 0 && (
            <p className="text-[#5d7267]">No technicians added yet. Create one above to get started.</p>
          )}
        </ul>
      </section>
    </AdminShell>
  );
}
