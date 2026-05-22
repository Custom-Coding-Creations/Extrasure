"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ChatbotOperationAction =
  | "list_appointments"
  | "list_technicians"
  | "get_availability"
  | "schedule_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "assign_technician";

type ChatbotOperationResult = {
  action: ChatbotOperationAction;
  status: "success" | "error" | "requires_confirmation";
  requiresConfirmation: boolean;
  message: string;
  result?: Record<string, unknown>;
  confirmationToken?: string;
};

type ApiChatResponse = {
  ok: true;
  sessionId: string;
  operation?: ChatbotOperationResult;
};

type PendingOperation = {
  action: ChatbotOperationAction;
  payload?: Record<string, unknown>;
  confirmationToken: string;
};

export function ChatbotOperationsConsole() {
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [lastOperation, setLastOperation] = useState<ChatbotOperationResult | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);

  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityServiceId, setAvailabilityServiceId] = useState("");

  const [scheduleServiceId, setScheduleServiceId] = useState("");
  const [scheduleCustomerId, setScheduleCustomerId] = useState("");
  const [scheduleContactName, setScheduleContactName] = useState("");
  const [scheduleContactEmail, setScheduleContactEmail] = useState("");
  const [scheduleContactPhone, setScheduleContactPhone] = useState("");
  const [schedulePreferredDate, setSchedulePreferredDate] = useState("");
  const [schedulePreferredWindow, setSchedulePreferredWindow] = useState("morning");
  const [scheduleAddressLine1, setScheduleAddressLine1] = useState("");
  const [scheduleCity, setScheduleCity] = useState("");

  const [rescheduleBookingId, setRescheduleBookingId] = useState("");
  const [rescheduleScheduledAt, setRescheduleScheduledAt] = useState("");
  const [rescheduleTechnicianId, setRescheduleTechnicianId] = useState("");

  const [cancelBookingId, setCancelBookingId] = useState("");
  const [assignBookingId, setAssignBookingId] = useState("");
  const [assignTechnicianId, setAssignTechnicianId] = useState("");

  async function invokeOperation(action: ChatbotOperationAction, payload?: Record<string, unknown>, confirmationToken?: string) {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setToast("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId || undefined,
          operation: {
            action,
            payload,
            confirmationToken,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please sign in again.");
        }
        if (response.status === 403) {
          throw new Error("Your role does not allow this action.");
        }
        throw new Error("Unable to complete the operation right now.");
      }

      const data = (await response.json()) as ApiChatResponse;
      setSessionId(data.sessionId);

      if (data.operation) {
        setLastOperation(data.operation);
        setToast(`${data.operation.action}: ${data.operation.message}`);

        if (data.operation.status === "requires_confirmation" && data.operation.confirmationToken) {
          setPendingOperation({
            action,
            payload,
            confirmationToken: data.operation.confirmationToken,
          });
        } else {
          setPendingOperation(null);
        }
      }
    } catch (invocationError) {
      setError(invocationError instanceof Error ? invocationError.message : "Unable to complete this operation.");
    } finally {
      setLoading(false);
    }
  }

  const resultJson = useMemo(() => JSON.stringify(lastOperation?.result ?? {}, null, 2), [lastOperation]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c8a4] bg-[#fff7e8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Operations Console</p>
            <h2 className="mt-1 text-xl text-[#15281f]">Customer-safe scheduling tools</h2>
            <p className="mt-1 text-sm text-[#3c4e43]">
              Use the quick actions for everyday work. All write actions still require confirmation before changes are made.
            </p>
          </div>
          <Link
            href="/admin/chat-operations/history"
            className="rounded-full border border-[#c7b38a] bg-[#f5e6c8] px-3 py-1 text-xs font-semibold text-[#4f3f20] hover:bg-[#edd8af]"
          >
            Open Operations History
          </Link>
        </div>

        {error ? <p className="mt-3 rounded-md border border-[#d9a39b] bg-[#feeceb] px-3 py-2 text-sm text-[#7d2b20]">{error}</p> : null}
        {toast ? <p className="mt-3 rounded-md border border-[#9fc6ac] bg-[#edf8f0] px-3 py-2 text-sm text-[#235234]">{toast}</p> : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void invokeOperation("list_appointments", { limit: 20 })}
            disabled={loading}
            className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] hover:bg-[#f2dbad] disabled:opacity-60"
          >
            View appointments
          </button>
          <button
            type="button"
            onClick={() => void invokeOperation("list_technicians")}
            disabled={loading}
            className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] hover:bg-[#f2dbad] disabled:opacity-60"
          >
            View technicians
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Check Availability</p>
        <form
          className="mt-2 grid gap-2 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!availabilityDate || !availabilityServiceId) {
              setError("Availability requires both date and service ID.");
              return;
            }
            void invokeOperation("get_availability", {
              date: availabilityDate,
              serviceCatalogItemId: availabilityServiceId,
            });
          }}
        >
          <input type="date" className="field" value={availabilityDate} onChange={(event) => setAvailabilityDate(event.target.value)} />
          <input className="field" value={availabilityServiceId} onChange={(event) => setAvailabilityServiceId(event.target.value)} placeholder="Service ID" />
          <button type="submit" disabled={loading} className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Working..." : "Check"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Schedule Appointment</p>
        <form
          className="mt-2 grid gap-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();

            if (
              !scheduleServiceId ||
              !scheduleCustomerId ||
              !scheduleContactName ||
              !scheduleContactEmail ||
              !scheduleContactPhone ||
              !schedulePreferredDate ||
              !scheduleAddressLine1 ||
              !scheduleCity
            ) {
              setError("Schedule requires all customer and address fields.");
              return;
            }

            void invokeOperation("schedule_appointment", {
              serviceCatalogItemId: scheduleServiceId,
              customerId: scheduleCustomerId,
              contactName: scheduleContactName,
              contactEmail: scheduleContactEmail,
              contactPhone: scheduleContactPhone,
              preferredDate: schedulePreferredDate,
              preferredWindow: schedulePreferredWindow,
              addressLine1: scheduleAddressLine1,
              city: scheduleCity,
            });
          }}
        >
          <input className="field" value={scheduleServiceId} onChange={(event) => setScheduleServiceId(event.target.value)} placeholder="Service ID" />
          <input className="field" value={scheduleCustomerId} onChange={(event) => setScheduleCustomerId(event.target.value)} placeholder="Customer ID" />
          <input className="field" value={scheduleContactName} onChange={(event) => setScheduleContactName(event.target.value)} placeholder="Contact name" />
          <input className="field" type="email" value={scheduleContactEmail} onChange={(event) => setScheduleContactEmail(event.target.value)} placeholder="Contact email" />
          <input className="field" value={scheduleContactPhone} onChange={(event) => setScheduleContactPhone(event.target.value)} placeholder="Contact phone" />
          <input className="field" type="date" value={schedulePreferredDate} onChange={(event) => setSchedulePreferredDate(event.target.value)} />
          <input className="field" value={schedulePreferredWindow} onChange={(event) => setSchedulePreferredWindow(event.target.value)} placeholder="Preferred window" />
          <input className="field" value={scheduleAddressLine1} onChange={(event) => setScheduleAddressLine1(event.target.value)} placeholder="Address line 1" />
          <input className="field sm:col-span-2" value={scheduleCity} onChange={(event) => setScheduleCity(event.target.value)} placeholder="City" />
          <button type="submit" disabled={loading} className="sm:col-span-2 rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {loading ? "Working..." : "Schedule appointment"}
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <form
          className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!rescheduleBookingId || !rescheduleScheduledAt) {
              setError("Reschedule needs booking ID and date/time.");
              return;
            }

            const payload: Record<string, unknown> = {
              bookingId: rescheduleBookingId,
              scheduledAt: rescheduleScheduledAt,
            };

            if (rescheduleTechnicianId) {
              payload.technicianId = rescheduleTechnicianId;
            }

            void invokeOperation("reschedule_appointment", payload);
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Reschedule</p>
          <div className="mt-2 grid gap-2">
            <input className="field" value={rescheduleBookingId} onChange={(event) => setRescheduleBookingId(event.target.value)} placeholder="Booking ID" />
            <input className="field" type="datetime-local" value={rescheduleScheduledAt} onChange={(event) => setRescheduleScheduledAt(event.target.value)} />
            <input className="field" value={rescheduleTechnicianId} onChange={(event) => setRescheduleTechnicianId(event.target.value)} placeholder="Optional technician ID" />
            <button type="submit" disabled={loading} className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Working..." : "Reschedule"}
            </button>
          </div>
        </form>

        <form
          className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!cancelBookingId) {
              setError("Cancel needs a booking ID.");
              return;
            }

            void invokeOperation("cancel_appointment", {
              bookingId: cancelBookingId,
            });
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Cancel</p>
          <div className="mt-2 grid gap-2">
            <input className="field" value={cancelBookingId} onChange={(event) => setCancelBookingId(event.target.value)} placeholder="Booking ID" />
            <button type="submit" disabled={loading} className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Working..." : "Cancel appointment"}
            </button>
          </div>
        </form>

        <form
          className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!assignBookingId || !assignTechnicianId) {
              setError("Assign needs booking ID and technician ID.");
              return;
            }

            void invokeOperation("assign_technician", {
              bookingId: assignBookingId,
              technicianId: assignTechnicianId,
            });
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Assign technician</p>
          <div className="mt-2 grid gap-2">
            <input className="field" value={assignBookingId} onChange={(event) => setAssignBookingId(event.target.value)} placeholder="Booking ID" />
            <input className="field" value={assignTechnicianId} onChange={(event) => setAssignTechnicianId(event.target.value)} placeholder="Technician ID" />
            <button type="submit" disabled={loading} className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? "Working..." : "Assign"}
            </button>
          </div>
        </form>
      </section>

      {pendingOperation ? (
        <section className="rounded-2xl border border-[#dac8a0] bg-[#fff7e6] p-4">
          <p className="text-sm font-semibold text-[#3f3524]">Pending confirmation: {pendingOperation.action}</p>
          <p className="mt-1 text-xs text-[#6a5b3b]">
            Please confirm before the change is applied to live customer records.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void invokeOperation(pendingOperation.action, pendingOperation.payload, pendingOperation.confirmationToken)}
              disabled={loading}
              className="rounded-md bg-[#163526] px-3 py-1 text-sm font-semibold text-white disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setPendingOperation(null)}
              disabled={loading}
              className="rounded-md border border-[#c8b48e] px-3 py-1 text-sm font-semibold text-[#4f4227] disabled:opacity-60"
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      {lastOperation ? (
        <section className="rounded-2xl border border-[#d6c8a4] bg-[#fffdf7] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#496053]">Latest operation</p>
          <p className="mt-1 text-sm text-[#2b3f34]">
            {lastOperation.action} ({lastOperation.status})
          </p>
          <p className="mt-1 text-sm text-[#3d5145]">{lastOperation.message}</p>
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-[#dfd4be] bg-[#fff8ea] p-3 text-xs text-[#4e4531]">
            {resultJson}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
