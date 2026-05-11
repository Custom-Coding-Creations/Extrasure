import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminDataNotice } from "@/components/admin/admin-data-notice";
import { TechnicianScheduleManager } from "@/components/admin/technician-schedule-manager";
import { loadAdminPageData } from "@/lib/admin-page-data";
import { getTechnicianSchedule } from "@/lib/admin-store";

export const dynamic = "force-dynamic";

type SchedulesPageProps = {
  searchParams?: Promise<{ technicianId?: string }>;
};

export default async function AdminTechnicianSchedulesPage({ searchParams }: SchedulesPageProps) {
  const { state, dataError } = await loadAdminPageData();
  const params = searchParams ? await searchParams : undefined;
  const selectedTechnicianId = params?.technicianId;

  const technician = state
    ? state.technicians.find((t) => t.id === selectedTechnicianId)
    : null;

  let scheduleData = null;
  if (selectedTechnicianId) {
    try {
      scheduleData = await getTechnicianSchedule(selectedTechnicianId);
    } catch (error) {
      // Schedule data might not exist yet for this technician
      scheduleData = { schedules: [], exceptions: [] };
    }
  }

  return (
    <AdminShell
      title="Technician Schedules"
      subtitle="Configure work hours and availability for each technician"
    >
      {!state ? (
        <AdminDataNotice message={dataError} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Technician List */}
          <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5 lg:col-span-1">
            <h2 className="text-lg font-semibold text-[#1b2f25]">Technicians</h2>
            <div className="mt-4 space-y-2">
              {state.technicians.length === 0 ? (
                <p className="text-xs text-[#5d7267]">
                  No technicians found. Create technicians first in the Technician Management page.
                </p>
              ) : (
                state.technicians.map((tech) => (
                  <Link
                    key={tech.id}
                    href={`/admin/technicians/schedules?technicianId=${tech.id}`}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                      selectedTechnicianId === tech.id
                        ? "bg-[#163526] text-white"
                        : "border border-[#deceb0] bg-white text-[#1d2f25] hover:bg-[#f4e7cb]"
                    }`}
                  >
                    {tech.name}
                  </Link>
                ))
              )}
            </div>
            <Link
              href="/admin/technicians"
              className="mt-4 inline-flex rounded-lg border border-[#163526] px-3 py-2 text-xs font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white"
            >
              Manage Technicians
            </Link>
          </section>

          {/* Schedule Manager */}
          <section className="lg:col-span-3">
            {!selectedTechnicianId || !technician ? (
              <div className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-8 text-center">
                <p className="text-sm text-[#5d7267]">
                  Select a technician from the list to configure their schedule.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
                  <h2 className="text-2xl font-semibold text-[#1b2f25]">{technician.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[#5d7267]">
                    Status: {technician.status.replace(/_/g, " ")} • Utilization: {technician.utilizationPercent}%
                  </p>
                </div>

                <TechnicianScheduleManager
                  technicianId={selectedTechnicianId}
                  initialSchedules={scheduleData?.schedules || []}
                  initialExceptions={scheduleData?.exceptions || []}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
