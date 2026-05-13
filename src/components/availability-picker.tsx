"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getNextSlotIndex } from "@/lib/availability-navigation";

export interface AvailableSlot {
  start: string; // ISO date string
  end: string; // ISO date string
  technicianId: string | null;
  technicianName: string | null;
  estimatedDriveTimeMinutes: number;
}

interface AvailabilityPickerProps {
  serviceId: string;
  onSlotSelected: (slot: AvailableSlot | null) => void;
  initialDate?: string;
}

type AvailabilityResponse = {
  isSameDayBooking: boolean;
  availableSlots: AvailableSlot[];
};

export function AvailabilityPicker({ serviceId, onSlotSelected, initialDate }: AvailabilityPickerProps) {
  const [date, setDate] = useState(initialDate || "");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slotButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Fetch available slots when date or serviceId changes
  useEffect(() => {
    if (!date || !serviceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlots([]);
      return;
    }

    async function fetchSlots() {
      setLoading(true);
      setError(null);
      setSelectedSlot(null);

      try {
        const response = await fetch(
          `/api/availability?date=${date}&serviceId=${serviceId}`
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch availability");
        }

        const data = (await response.json()) as AvailabilityResponse;

        if (data.isSameDayBooking && !data.availableSlots.length) {
          setError("Same-day booking is not available for this service.");
          setSlots([]);
          return;
        }

        const parsedSlots = data.availableSlots.map((slot) => ({
          ...slot,
          start: slot.start,
          end: slot.end,
        }));

        setSlots(parsedSlots);

        if (parsedSlots.length === 0) {
          setError("No available slots for the selected date.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch availability");
        setSlots([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSlots();
  }, [date, serviceId]);

  // Notify parent when slot is selected
  useEffect(() => {
    onSlotSelected(selectedSlot);
  }, [selectedSlot, onSlotSelected]);

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getDayPart(dateString: string): "Morning" | "Midday" | "Afternoon" | "Evening" {
    const hour = new Date(dateString).getHours();

    if (hour < 11) {
      return "Morning";
    }

    if (hour < 14) {
      return "Midday";
    }

    if (hour < 18) {
      return "Afternoon";
    }

    return "Evening";
  }

  function getSlotBadge(slot: AvailableSlot, sortedSlots: AvailableSlot[], groupIndex: number) {
    const firstSlot = sortedSlots[0];

    if (slot.start === firstSlot?.start) {
      return "Fastest";
    }

    if (groupIndex === 0) {
      return "Recommended";
    }

    if (slot.technicianName) {
      return "Technician match";
    }

    return null;
  }

  // Get minimum date (today + minimum notice hours)
  function getMinDate(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString().split("T")[0];
  }

  // Get maximum date (today + booking lookahead)
  function getMaxDate(): string {
    const max = new Date();
    max.setDate(max.getDate() + 30); // Default lookahead
    return max.toISOString().split("T")[0];
  }

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [slots],
  );

  useEffect(() => {
    slotButtonRefs.current = [];
  }, [sortedSlots]);

  const groupedSlots = sortedSlots.reduce<Record<string, AvailableSlot[]>>((accumulator, slot) => {
    const dayPart = getDayPart(slot.start);

    if (!accumulator[dayPart]) {
      accumulator[dayPart] = [];
    }

    accumulator[dayPart].push(slot);
    return accumulator;
  }, {});

  const dayPartOrder: Array<"Morning" | "Midday" | "Afternoon" | "Evening"> = [
    "Morning",
    "Midday",
    "Afternoon",
    "Evening",
  ];

  function handleSlotKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    const nextIndex = getNextSlotIndex(index, sortedSlots.length, event.key);

    if (nextIndex === index || nextIndex === -1) {
      return;
    }

    event.preventDefault();
    slotButtonRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div>
        <label className="block text-sm font-semibold text-[#20372c]">
          Preferred Date
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={getMinDate()}
          max={getMaxDate()}
          className="mt-2 w-full rounded-xl border border-[#cfbf9f] bg-white px-4 py-3 text-sm text-[#1e3026]"
        />
      </div>

      {/* Hidden input for selected time (for form submission) */}
      <input
        type="hidden"
        name="preferredDateTime"
        value={selectedSlot ? selectedSlot.start : ""}
      />
      <input
        type="hidden"
        name="preferredTechnicianId"
        value={selectedSlot?.technicianId || ""}
      />

      {/* Time slot selection */}
      {date && (
        <div>
          <label className="block text-sm font-semibold text-[#20372c]">
            Available Times
          </label>

          {loading && (
            <div className="mt-3 space-y-2">
              <div className="h-12 animate-pulse rounded-xl border border-[#d3c7ad] bg-[#fff7e5]" />
              <div className="h-12 animate-pulse rounded-xl border border-[#d3c7ad] bg-[#fff7e5]" />
              <div className="h-12 animate-pulse rounded-xl border border-[#d3c7ad] bg-[#fff7e5]" />
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-lg border border-[#d4a574] bg-[#fff0e8] px-4 py-3 text-sm text-[#7b4d1e]">
              {error}
            </div>
          )}

          {!loading && sortedSlots.length > 0 && (
            <div className="mt-3 space-y-3">
              {dayPartOrder.map((dayPart) => {
                const dayPartSlots = groupedSlots[dayPart] ?? [];

                if (dayPartSlots.length === 0) {
                  return null;
                }

                return (
                  <section key={dayPart} className="space-y-2 rounded-2xl border border-[#dfd1b4] bg-[#fffaf0] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#173226]">{dayPart}</p>
                      <p className="text-xs text-[#5d7267]">
                        {dayPartSlots.length} slot{dayPartSlots.length > 1 ? "s" : ""} available
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2" role="listbox" aria-label={`${dayPart} appointment times`}>
                      {dayPartSlots.map((slot, idx) => {
                        const overallIndex = sortedSlots.findIndex((candidate) => candidate.start === slot.start && candidate.technicianId === slot.technicianId);
                        const isSelected = selectedSlot?.start === slot.start;
                        const badge = getSlotBadge(slot, sortedSlots, idx);

                        return (
                          <button
                            key={`${slot.start}-${idx}`}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            onKeyDown={(event) => handleSlotKeyDown(overallIndex, event)}
                            ref={(element) => {
                              slotButtonRefs.current[overallIndex] = element;
                            }}
                            aria-selected={isSelected}
                            role="option"
                            className={`rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? "border-[#163526] bg-[#eff8f2] shadow-[0_6px_18px_rgba(22,53,38,0.16)]"
                                : "border-[#deceb0] bg-white hover:border-[#275740] hover:shadow-[0_6px_16px_rgba(22,53,38,0.1)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-[#1e3026]">
                                {formatTime(slot.start)} - {formatTime(slot.end)}
                              </span>
                              {badge ? (
                                <span className="rounded-full border border-[#c9b488] bg-[#f8e8c8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5b4928]">
                                  {badge}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-xs text-[#506257]">
                                {slot.technicianName || "Next available technician"}
                              </span>
                              <span className="text-[11px] text-[#617469]">~{slot.estimatedDriveTimeMinutes}m away</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {!loading && sortedSlots.length === 0 && !error && date && (
            <div className="mt-2 rounded-lg border border-[#d3c7ad] bg-[#fff9eb] px-4 py-3 text-sm text-[#5d7267]">
              No available slots for this date. Please try another date.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
