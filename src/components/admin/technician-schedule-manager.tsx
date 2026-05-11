"use client";

import { useState } from "react";
import { updateTechnicianScheduleAction, addScheduleExceptionAction, removeScheduleExceptionAction } from "@/app/admin/technicians/schedule-actions";

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

type ScheduleData = {
  [key: string]: {
    start: string;
    end: string;
    breakStart: string;
    breakEnd: string;
  };
};

export function TechnicianScheduleManager({
  technicianId,
  initialSchedules,
  initialExceptions,
}: {
  technicianId: string;
  initialSchedules: any[];
  initialExceptions: any[];
}) {
  const [scheduleData, setScheduleData] = useState<ScheduleData>(() => {
    const data: ScheduleData = {};
    DAYS_OF_WEEK.forEach((day) => {
      const existing = initialSchedules.find((s) => s.dayOfWeek === day.id);
      data[day.id] = {
        start: existing?.startTime || "08:00",
        end: existing?.endTime || "17:00",
        breakStart: existing?.breakStartTime || "",
        breakEnd: existing?.breakEndTime || "",
      };
    });
    return data;
  });

  const [exceptions, setExceptions] = useState(initialExceptions || []);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [newException, setNewException] = useState({
    date: "",
    isDayOff: true,
    startTime: "",
    endTime: "",
  });

  const handleScheduleChange = (day: string, field: string, value: string) => {
    setScheduleData((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("technicianId", technicianId);

    Object.entries(scheduleData).forEach(([day, times]) => {
      formData.set(`${day}_start`, times.start);
      formData.set(`${day}_end`, times.end);
      if (times.breakStart) formData.set(`${day}_break_start`, times.breakStart);
      if (times.breakEnd) formData.set(`${day}_break_end`, times.breakEnd);
    });

    await updateTechnicianScheduleAction(formData);
  };

  const handleAddException = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("technicianId", technicianId);
    formData.set("exceptionDate", newException.date);
    formData.set("isDayOff", newException.isDayOff ? "on" : "off");
    if (newException.startTime) formData.set("startTime", newException.startTime);
    if (newException.endTime) formData.set("endTime", newException.endTime);

    await addScheduleExceptionAction(formData);
    setNewException({ date: "", isDayOff: true, startTime: "", endTime: "" });
    setShowExceptionForm(false);
  };

  const handleRemoveException = async (exceptionId: string) => {
    const formData = new FormData();
    formData.set("exceptionId", exceptionId);
    formData.set("technicianId", technicianId);
    await removeScheduleExceptionAction(formData);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h3 className="text-xl font-semibold text-[#1b2f25]">Recurring Weekly Schedule</h3>
        <p className="mt-1 text-xs text-[#5d7267]">Set default hours for each day of the week</p>

        <form onSubmit={handleSaveSchedule} className="mt-4 space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.id} className="rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-[#20372c]">{day.label}</label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5d7267]">Start:</span>
                  <input
                    type="time"
                    value={scheduleData[day.id]?.start || "08:00"}
                    onChange={(e) => handleScheduleChange(day.id, "start", e.target.value)}
                    className="rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5d7267]">End:</span>
                  <input
                    type="time"
                    value={scheduleData[day.id]?.end || "17:00"}
                    onChange={(e) => handleScheduleChange(day.id, "end", e.target.value)}
                    className="rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                  />
                </div>
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                <div />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5d7267]">Break Start:</span>
                  <input
                    type="time"
                    value={scheduleData[day.id]?.breakStart || ""}
                    onChange={(e) => handleScheduleChange(day.id, "breakStart", e.target.value)}
                    className="rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5d7267]">Break End:</span>
                  <input
                    type="time"
                    value={scheduleData[day.id]?.breakEnd || ""}
                    onChange={(e) => handleScheduleChange(day.id, "breakEnd", e.target.value)}
                    className="rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="mt-4 rounded-xl bg-[#163526] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10271d]"
          >
            Save Schedule
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#1b2f25]">Schedule Exceptions</h3>
            <p className="mt-1 text-xs text-[#5d7267]">Mark days off, or specify different hours for specific dates</p>
          </div>
          <button
            type="button"
            onClick={() => setShowExceptionForm(!showExceptionForm)}
            className="rounded-full border border-[#163526] px-3 py-1 text-xs font-semibold text-[#163526] transition hover:bg-[#163526] hover:text-white"
          >
            {showExceptionForm ? "Cancel" : "Add Exception"}
          </button>
        </div>

        {showExceptionForm && (
          <form onSubmit={handleAddException} className="mt-4 rounded-xl border border-[#deceb0] bg-[#fff4df] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#20372c]">Date</label>
                <input
                  type="date"
                  required
                  value={newException.date}
                  onChange={(e) => setNewException((prev) => ({ ...prev, date: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#20372c]">
                  <input
                    type="checkbox"
                    checked={newException.isDayOff}
                    onChange={(e) => setNewException((prev) => ({ ...prev, isDayOff: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  Full day off
                </label>
              </div>
            </div>

            {!newException.isDayOff && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#20372c]">Start Time (optional)</label>
                  <input
                    type="time"
                    value={newException.startTime}
                    onChange={(e) => setNewException((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#20372c]">End Time (optional)</label>
                  <input
                    type="time"
                    value={newException.endTime}
                    onChange={(e) => setNewException((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[#cbbd9f] bg-white px-3 py-2 text-sm text-[#1d2f25]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="mt-3 rounded-lg bg-[#163526] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#10271d]"
            >
              Add Exception
            </button>
          </form>
        )}

        {exceptions.length > 0 && (
          <div className="mt-4 space-y-2">
            {exceptions.map((exception) => (
              <div key={exception.id} className="flex items-center justify-between rounded-lg border border-[#deceb0] bg-[#fff4df] p-3">
                <div className="text-sm text-[#33453a]">
                  <span className="font-semibold text-[#20372c]">
                    {new Date(exception.exceptionDate).toLocaleDateString()}
                  </span>
                  {exception.isDayOff ? (
                    <span className="ml-2 text-xs text-[#5d7267]">• Day off</span>
                  ) : (
                    <span className="ml-2 text-xs text-[#5d7267]">
                      • {exception.startTime || "flexible"} to {exception.endTime || "flexible"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveException(exception.id)}
                  className="rounded-full border border-[#8a3d22] px-2 py-1 text-xs font-semibold text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
