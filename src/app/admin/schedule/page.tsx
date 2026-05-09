import { AdminShell } from "@/components/admin/admin-shell";
import { getCustomerById, getTechnicianById, jobs, technicians } from "@/lib/admin-data";

export default function AdminSchedulePage() {
  return (
    <AdminShell
      title="Scheduling and Dispatch"
      subtitle="Coordinate appointments, emergency slots, and technician assignment with a route-aware daily queue."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5 lg:col-span-2">
          <h2 className="text-2xl text-[#1b2f25]">Upcoming Jobs</h2>
          <ul className="mt-4 space-y-3">
            {jobs.map((job) => {
              const customer = getCustomerById(job.customerId);
              const tech = getTechnicianById(job.technicianId);

              return (
                <li key={job.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4 text-sm text-[#33453a]">
                  <p className="font-semibold text-[#20372c]">{job.service}</p>
                  <p className="mt-1">{customer?.name ?? "Unknown customer"}</p>
                  <p className="text-xs text-[#5d7267]">{new Date(job.scheduledAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#5d7267]">
                    {job.status.replaceAll("_", " ")} • {tech?.name ?? "Unassigned"}
                    {job.emergency ? " • emergency" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
          <h2 className="text-2xl text-[#1b2f25]">Technician Capacity</h2>
          <ul className="mt-4 space-y-3">
            {technicians.map((tech) => (
              <li key={tech.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-3 text-sm">
                <p className="font-semibold text-[#20372c]">{tech.name}</p>
                <p className="text-[#445349]">{tech.status.replaceAll("_", " ")}</p>
                <p className="text-xs text-[#5d7267]">Utilization: {tech.utilizationPercent}%</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
