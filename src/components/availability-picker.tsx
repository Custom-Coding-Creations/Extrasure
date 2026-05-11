"use client";

import { useEffect, useState } from "react";

interface AvailableSlot {
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

export function AvailabilityPicker({ serviceId, onSlotSelected, initialDate }: AvailabilityPickerProps) {
  const [date, setDate] = useState(initialDate || "");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available slots when date or serviceId changes
  useEffect(() => {
    if (!date || !serviceId) {
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

        const data = await response.json();

        if (data.isSameDayBooking && !data.availableSlots.length) {
          setError("Same-day booking is not available for this service.");
          setSlots([]);
          return;
        }

        // Convert ISO strings to Date objects for display
        const parsedSlots = data.availableSlots.map((slot: any) => ({
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

  // Format a date for display
  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      meridiem: "short",
    });
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
            <div className="mt-2 rounded-lg border border-[#d3c7ad] bg-[#fff9eb] px-4 py-3 text-sm text-[#5d7267]">
              Loading available times...
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-lg border border-[#d4a574] bg-[#fff0e8] px-4 py-3 text-sm text-[#7b4d1e]">
              {error}
            </div>
          )}

          {!loading && slots.length > 0 && (
            <div className="mt-2 space-y-2">
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={`${slot.start}-${idx}`}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                      isSelected
                        ? "border-[#163526] bg-[#f0f8f4] text-[#163526]"
                        : "border-[#deceb0] bg-white text-[#33453a] hover:border-[#163526]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {formatTime(slot.start)} – {formatTime(slot.end)}
                      </span>
                      {slot.technicianName && (
                        <span className="text-xs text-[#5d7267]">
                          {slot.technicianName}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && slots.length === 0 && !error && date && (
            <div className="mt-2 rounded-lg border border-[#d3c7ad] bg-[#fff9eb] px-4 py-3 text-sm text-[#5d7267]">
              No available slots for this date. Please try another date.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
