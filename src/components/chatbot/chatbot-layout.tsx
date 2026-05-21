"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useChatbot } from "./chatbot-provider";
import { TriageForm } from "./triage-form";
import { LeadCaptureForm } from "./lead-capture-form";
import { isChatbotOperationsUiEnabled } from "@/lib/chatbot-operations-runtime";
import type { ChatbotOperationAction } from "./chatbot-provider";

type ChatbotLayoutProps = {
  onClose: () => void;
  suggestedPromptsButton?: React.ReactNode;
};

type OperationHistoryStatusFilter = "all" | "success" | "error" | "requires_confirmation";
const OPERATION_HISTORY_FILTER_STORAGE_KEY = "ai_chat_operation_history_status_filter";

const OPERATION_ROLE_HINTS: Record<ChatbotOperationAction, string> = {
  list_appointments: "Required roles: owner, dispatch, accountant",
  list_technicians: "Required roles: owner, dispatch",
  get_availability: "Required roles: owner, dispatch",
  schedule_appointment: "Required roles: owner, dispatch",
  reschedule_appointment: "Required roles: owner, dispatch",
  cancel_appointment: "Required roles: owner, dispatch",
  assign_technician: "Required roles: owner, dispatch",
};

function formatRoles(roles: string[]) {
  if (roles.length === 0) {
    return "";
  }

  return roles.join(", ");
}

function getResultCode(result: Record<string, unknown> | undefined) {
  return typeof result?.code === "string" ? result.code : null;
}

function formatHistoryTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHistoryRelativeAge(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "unknown age";
  }

  const deltaMs = Date.now() - parsed.getTime();
  const future = deltaMs < 0;
  const absoluteMs = Math.abs(deltaMs);
  const minutes = Math.floor(absoluteMs / 60_000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return future ? `in ${minutes}m` : `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return future ? `in ${hours}h` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return future ? `in ${days}d` : `${days}d ago`;
}

function getHistoryStatusChipClasses(status: "success" | "error" | "requires_confirmation") {
  if (status === "success") {
    return "border-[#95bca0] bg-[#e8f6eb] text-[#1f5d35]";
  }

  if (status === "error") {
    return "border-[#d8a9a2] bg-[#fcebe8] text-[#7b2f24]";
  }

  return "border-[#d7bf8a] bg-[#fbf1dd] text-[#6a4f1f]";
}

function parseOperationHistoryStatusFilter(value: string | null): OperationHistoryStatusFilter | null {
  if (value === "all" || value === "success" || value === "error" || value === "requires_confirmation") {
    return value;
  }

  return null;
}

export function ChatbotLayout({ onClose, suggestedPromptsButton }: ChatbotLayoutProps) {
  const operationsEnabled = isChatbotOperationsUiEnabled();
  const [operationUiError, setOperationUiError] = useState("");
  const [operationToast, setOperationToast] = useState<{ tone: "success" | "warning" | "error"; message: string } | null>(null);
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
  const [scheduleScheduledAt, setScheduleScheduledAt] = useState("");
  const [scheduleTechnicianId, setScheduleTechnicianId] = useState("");
  const [rescheduleBookingId, setRescheduleBookingId] = useState("");
  const [rescheduleScheduledAt, setRescheduleScheduledAt] = useState("");
  const [rescheduleTechnicianId, setRescheduleTechnicianId] = useState("");
  const [cancelBookingId, setCancelBookingId] = useState("");
  const [assignBookingId, setAssignBookingId] = useState("");
  const [assignTechnicianId, setAssignTechnicianId] = useState("");
  const [selectedOperationHistoryId, setSelectedOperationHistoryId] = useState<string | null>(null);
  const [operationHistoryStatusFilter, setOperationHistoryStatusFilter] =
    useState<OperationHistoryStatusFilter>("all");
  const {
    viewMode,
    toggleFullscreen,
    triageEnabled,
    showTriage,
    setShowTriage,
    showLeadForm,
    accountContext,
    suggestedPrompts,
    sendMessage,
    sending,
    input,
    setInput,
    handoffLinks,
    operationLoading,
    lastOperation,
    pendingOperation,
    runOperation,
    confirmPendingOperation,
    clearPendingOperation,
    operationHistoryScope,
    canViewTeamOperationHistory,
    operationHistoryViewerRole,
    setOperationHistoryScope,
    refreshOperationHistory,
    messages,
    operationHistory,
  } = useChatbot();

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && viewMode === "fullscreen") {
        toggleFullscreen();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [viewMode, toggleFullscreen]);

  useEffect(() => {
    const storedFilter = parseOperationHistoryStatusFilter(window.sessionStorage.getItem(OPERATION_HISTORY_FILTER_STORAGE_KEY));

    if (storedFilter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOperationHistoryStatusFilter(storedFilter);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(OPERATION_HISTORY_FILTER_STORAGE_KEY, operationHistoryStatusFilter);
  }, [operationHistoryStatusFilter]);

  const isFullscreen = viewMode === "fullscreen";
  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    : "";
  
  const panelClass = isFullscreen
    ? "flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.4)]"
    : "flex max-h-[min(85vh,48rem)] w-[min(94vw,24rem)] flex-col overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.25)]";

  const chatHeightClass = isFullscreen ? "max-h-[60vh]" : "max-h-80";

  const lastOperationPrefill = useMemo(() => {
    if (!lastOperation || lastOperation.status !== "success") {
      return null;
    }

    const result = lastOperation.result as Record<string, unknown> | undefined;
    if (!result) {
      return null;
    }

    const prefill: {
      bookingId?: string;
      technicianId?: string;
      serviceCatalogItemId?: string;
      customerId?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      city?: string;
    } = {};

    if (typeof result.bookingId === "string") {
      prefill.bookingId = result.bookingId;
    }

    if (typeof result.technicianId === "string") {
      prefill.technicianId = result.technicianId;
    }

    if (typeof result.serviceCatalogItemId === "string") {
      prefill.serviceCatalogItemId = result.serviceCatalogItemId;
    }

    if (typeof result.customerId === "string") {
      prefill.customerId = result.customerId;
    }

    if (typeof result.contactName === "string") {
      prefill.contactName = result.contactName;
    }

    if (typeof result.contactEmail === "string") {
      prefill.contactEmail = result.contactEmail;
    }

    if (typeof result.contactPhone === "string") {
      prefill.contactPhone = result.contactPhone;
    }

    if (typeof result.city === "string") {
      prefill.city = result.city;
    }

    const technicians = Array.isArray(result.technicians) ? result.technicians : [];
    const firstTechnician = technicians[0] as Record<string, unknown> | undefined;
    if (!prefill.technicianId && firstTechnician && typeof firstTechnician.id === "string") {
      prefill.technicianId = firstTechnician.id;
    }

    const serviceBookings = Array.isArray(result.serviceBookings) ? result.serviceBookings : [];
    const firstServiceBooking = serviceBookings[0] as Record<string, unknown> | undefined;
    if (firstServiceBooking) {
      if (!prefill.bookingId && typeof firstServiceBooking.id === "string") {
        prefill.bookingId = firstServiceBooking.id;
      }
      if (!prefill.serviceCatalogItemId && typeof firstServiceBooking.serviceCatalogItemId === "string") {
        prefill.serviceCatalogItemId = firstServiceBooking.serviceCatalogItemId;
      }
      if (typeof firstServiceBooking.customerId === "string") {
        prefill.customerId = firstServiceBooking.customerId;
      }
      if (typeof firstServiceBooking.contactName === "string") {
        prefill.contactName = firstServiceBooking.contactName;
      }
      if (typeof firstServiceBooking.contactPhone === "string") {
        prefill.contactPhone = firstServiceBooking.contactPhone;
      }
      if (typeof firstServiceBooking.city === "string") {
        prefill.city = firstServiceBooking.city;
      }
    }

    return prefill;
  }, [lastOperation]);

  const hasPrefillData = Boolean(lastOperationPrefill && Object.values(lastOperationPrefill).some(Boolean));

  const forbiddenActionInfo = useMemo(() => {
    if (!lastOperation || lastOperation.status !== "error") {
      return null;
    }

    const result = lastOperation.result as Record<string, unknown> | undefined;
    if (getResultCode(result) !== "forbidden") {
      return null;
    }

    const allowedRoles = Array.isArray(result?.allowedRoles)
      ? result.allowedRoles.filter((value): value is string => typeof value === "string")
      : [];

    return {
      action: lastOperation.action,
      allowedRoles,
    };
  }, [lastOperation]);

  const isActionBlocked = useCallback(
    (action: ChatbotOperationAction) => forbiddenActionInfo?.action === action,
    [forbiddenActionInfo],
  );

  const operationResultSummary = useMemo(() => {
    if (!lastOperation?.result) {
      return null;
    }

    const result = lastOperation.result as Record<string, unknown>;
    const summaryRows: Array<{ label: string; value: string }> = [];

    const knownKeys: Array<[string, string]> = [
      ["bookingId", "Booking ID"],
      ["status", "Status"],
      ["technicianId", "Technician ID"],
      ["serviceCatalogItemId", "Service ID"],
      ["slotCount", "Slot Count"],
      ["serviceBookingCount", "Service Bookings"],
      ["jobCount", "Jobs"],
      ["code", "Code"],
    ];

    for (const [key, label] of knownKeys) {
      const value = result[key];
      if (typeof value === "string" || typeof value === "number") {
        summaryRows.push({ label, value: String(value) });
      }
    }

    return {
      rows: summaryRows,
      raw: JSON.stringify(result, null, 2),
    };
  }, [lastOperation]);

  const selectedOperationHistoryEntry = useMemo(
    () => operationHistory.find((entry) => entry.id === selectedOperationHistoryId) ?? null,
    [operationHistory, selectedOperationHistoryId],
  );

  const operationResultCards = useMemo(() => {
    if (!lastOperation?.result) {
      return null;
    }

    const result = lastOperation.result as Record<string, unknown>;

    if (lastOperation.action === "list_appointments") {
      const summary = result.summary as Record<string, unknown> | undefined;
      const serviceBookingCount = typeof summary?.serviceBookingCount === "number" ? summary.serviceBookingCount : 0;
      const jobCount = typeof summary?.jobCount === "number" ? summary.jobCount : 0;
      const serviceBookings = Array.isArray(result.serviceBookings)
        ? result.serviceBookings.slice(0, 3).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];

      return (
        <div className="mt-2 rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
          <p className="font-semibold">Appointments Snapshot</p>
          <p className="mt-1">Service bookings: {serviceBookingCount}</p>
          <p>Jobs: {jobCount}</p>
          {serviceBookings.length > 0 ? (
            <div className="mt-1 space-y-1">
              {serviceBookings.map((booking, index) => (
                <p key={String(booking.id ?? booking.bookingId ?? `booking_${index}`)}>
                  #{String(booking.id ?? "-")} {typeof booking.status === "string" ? booking.status : "unknown"}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (lastOperation.action === "list_technicians") {
      const technicians = Array.isArray(result.technicians)
        ? result.technicians.slice(0, 5).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];

      return (
        <div className="mt-2 rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
          <p className="font-semibold">Technician Snapshot</p>
          <p className="mt-1">Count: {technicians.length}</p>
          {technicians.map((technician, index) => (
            <p key={String(technician.id ?? `technician_${index}`)}>
              {String(technician.name ?? technician.id ?? "Unknown")} ({String(technician.status ?? "unknown")})
            </p>
          ))}
        </div>
      );
    }

    if (lastOperation.action === "get_availability") {
      const slotCount = typeof result.slotCount === "number" ? result.slotCount : 0;
      const slots = Array.isArray(result.slots)
        ? result.slots.slice(0, 4).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];

      return (
        <div className="mt-2 rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
          <p className="font-semibold">Availability Snapshot</p>
          <p className="mt-1">Slots found: {slotCount}</p>
          {slots.map((slot, index) => (
            <p key={String(slot.start ?? index)}>
              {typeof slot.start === "string" ? slot.start : "-"} {typeof slot.technicianName === "string" ? `· ${slot.technicianName}` : ""}
            </p>
          ))}
        </div>
      );
    }

    if (
      lastOperation.action === "schedule_appointment" ||
      lastOperation.action === "reschedule_appointment" ||
      lastOperation.action === "cancel_appointment" ||
      lastOperation.action === "assign_technician"
    ) {
      const bookingId = typeof result.bookingId === "string" ? result.bookingId : "-";
      const status = typeof result.status === "string" ? result.status : "unknown";
      const technicianId = typeof result.technicianId === "string" ? result.technicianId : "unassigned";
      const scheduledAt = typeof result.scheduledAt === "string" ? result.scheduledAt : "not set";

      const verb =
        lastOperation.action === "schedule_appointment"
          ? "Appointment scheduled"
          : lastOperation.action === "reschedule_appointment"
            ? "Appointment rescheduled"
            : lastOperation.action === "cancel_appointment"
              ? "Appointment cancelled"
              : "Technician assignment updated";

      return (
        <div className="mt-2 rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
          <p className="font-semibold">Write Outcome</p>
          <p className="mt-1">{verb}</p>
          <p>Booking: {bookingId}</p>
          <p>Status: {status}</p>
          <p>Technician: {technicianId}</p>
          <p>Scheduled: {scheduledAt}</p>
        </div>
      );
    }

    return null;
  }, [lastOperation]);

  const filteredRecentOperationHistory = useMemo(() => {
    const recent = operationHistory.slice(0, 6);
    if (operationHistoryStatusFilter === "all") {
      return recent;
    }

    return recent.filter((entry) => entry.status === operationHistoryStatusFilter);
  }, [operationHistory, operationHistoryStatusFilter]);

  useEffect(() => {
    if (!lastOperation) {
      return;
    }

    const tone =
      lastOperation.status === "success"
        ? "success"
        : lastOperation.status === "requires_confirmation"
          ? "warning"
          : "error";

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOperationToast({
      tone,
      message: `${lastOperation.action}: ${lastOperation.message}`,
    });

    const timeoutId = setTimeout(() => {
      setOperationToast(null);
    }, 4500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [lastOperation]);

  const applyLastOperationPrefill = useCallback(() => {
    if (!lastOperationPrefill) {
      return;
    }

    if (lastOperationPrefill.bookingId) {
      if (!rescheduleBookingId) {
        setRescheduleBookingId(lastOperationPrefill.bookingId);
      }
      if (!cancelBookingId) {
        setCancelBookingId(lastOperationPrefill.bookingId);
      }
      if (!assignBookingId) {
        setAssignBookingId(lastOperationPrefill.bookingId);
      }
    }

    if (lastOperationPrefill.technicianId) {
      if (!scheduleTechnicianId) {
        setScheduleTechnicianId(lastOperationPrefill.technicianId);
      }
      if (!rescheduleTechnicianId) {
        setRescheduleTechnicianId(lastOperationPrefill.technicianId);
      }
      if (!assignTechnicianId) {
        setAssignTechnicianId(lastOperationPrefill.technicianId);
      }
    }

    if (lastOperationPrefill.serviceCatalogItemId && !scheduleServiceId) {
      setScheduleServiceId(lastOperationPrefill.serviceCatalogItemId);
    }

    if (lastOperationPrefill.customerId && !scheduleCustomerId) {
      setScheduleCustomerId(lastOperationPrefill.customerId);
    }

    if (lastOperationPrefill.contactName && !scheduleContactName) {
      setScheduleContactName(lastOperationPrefill.contactName);
    }

    if (lastOperationPrefill.contactEmail && !scheduleContactEmail) {
      setScheduleContactEmail(lastOperationPrefill.contactEmail);
    }

    if (lastOperationPrefill.contactPhone && !scheduleContactPhone) {
      setScheduleContactPhone(lastOperationPrefill.contactPhone);
    }

    if (lastOperationPrefill.city && !scheduleCity) {
      setScheduleCity(lastOperationPrefill.city);
    }

    setOperationUiError("");
  }, [
    assignBookingId,
    assignTechnicianId,
    cancelBookingId,
    lastOperationPrefill,
    rescheduleBookingId,
    rescheduleTechnicianId,
    scheduleCity,
    scheduleContactEmail,
    scheduleContactName,
    scheduleContactPhone,
    scheduleCustomerId,
    scheduleServiceId,
    scheduleTechnicianId,
  ]);

  const getRoleHint = useCallback(
    (action: ChatbotOperationAction) => {
      if (lastOperation && lastOperation.action === action && lastOperation.status === "error") {
        const result = lastOperation.result as Record<string, unknown> | undefined;
        const allowedRoles = Array.isArray(result?.allowedRoles)
          ? result.allowedRoles.filter((value): value is string => typeof value === "string")
          : [];

        if (allowedRoles.length > 0) {
          return `Required roles: ${formatRoles(allowedRoles)}`;
        }
      }

      return OPERATION_ROLE_HINTS[action];
    },
    [lastOperation],
  );

  const content = (
    <section className={panelClass}>
      <header className="flex shrink-0 items-center justify-between bg-[#163526] px-4 py-3 text-white">
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {accountContext?.currentPage ? `ExtraSure AI Assistant - ${accountContext.currentPage}` : "ExtraSure AI Assistant"}
          </p>
          <p className="text-[11px] text-[#d8eadf]">Answers, estimates, and fast human handoff</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md border border-[#c8ddcf] px-2 py-1 text-xs text-[#ecf7f0] hover:bg-[#1e4a32]"
            aria-label={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
          >
            {isFullscreen ? "Exit Fullscreen" : "Expand"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#c8ddcf] px-2 py-1 text-xs text-[#ecf7f0] hover:bg-[#1e4a32]"
            aria-label="Close chatbot"
          >
            Close
          </button>
        </div>
      </header>

      {/* Message display with dynamic height */}
      <div className={`${chatHeightClass} shrink-0 space-y-3 overflow-y-auto px-3 py-3`} aria-live="polite" aria-label="Chat conversation">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`rounded-xl px-3 py-2 text-sm leading-6 ${
              message.role === "assistant"
                ? "border border-[#d9c8a8] bg-[#fff3dc] text-[#253a2f]"
                : "ml-8 bg-[#1f3f2f] text-[#f4fff8]"
            }`}
          >
            {message.content}
          </article>
        ))}
      </div>

      {/* Input and controls area */}
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#dbc9a9] bg-[#fffdf6] p-3">
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void sendMessage(input); }}>
          <input
            className="field flex-1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about pests, pricing range, or scheduling"
            aria-label="Chat message"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <a
            href={handoffLinks.callHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
          >
            Call Team
          </a>
          <a
            href={handoffLinks.smsHref}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
          >
            Text Team
          </a>
          <a
            href={handoffLinks.contactPath}
            className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-[#294236]"
          >
            Contact Form
          </a>
        </div>

        {/* Suggested prompts */}
        {suggestedPrompts.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#536359]">Suggested prompts</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={sending}
                  className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad] disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {operationsEnabled ? (
        <div className="mt-3 rounded-xl border border-[#dcc8a5] bg-[#fff2d8] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5a4b29]">Operations Beta</p>
          <p className="mt-1 text-xs text-[#5f553f]">
            Admin session required. Write operations require explicit confirmation.
          </p>
          {hasPrefillData ? (
            <button
              type="button"
              onClick={applyLastOperationPrefill}
              disabled={operationLoading || sending}
              className="mt-2 rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad] disabled:opacity-60"
            >
              Prefill Forms From Last Result
            </button>
          ) : null}
          {operationUiError ? <p className="mt-2 text-xs font-semibold text-[#8a2e1c]">{operationUiError}</p> : null}
          {operationToast ? (
            <div
              className={`mt-2 rounded-md border px-2 py-1 text-xs font-semibold ${
                operationToast.tone === "success"
                  ? "border-[#8dc0a0] bg-[#edf8f0] text-[#1f4f31]"
                  : operationToast.tone === "warning"
                    ? "border-[#dbc58e] bg-[#fff8e3] text-[#6f5b26]"
                    : "border-[#d8a39a] bg-[#fdeeee] text-[#7a2317]"
              }`}
              role="status"
              aria-live="polite"
            >
              {operationToast.message}
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void runOperation("list_appointments", {
                  limit: 20,
                })
              }
              disabled={operationLoading || sending || isActionBlocked("list_appointments")}
              className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad] disabled:opacity-60"
            >
              View Appointments
            </button>
            <button
              type="button"
              onClick={() => void runOperation("list_technicians")}
              disabled={operationLoading || sending || isActionBlocked("list_technicians")}
              className="rounded-full border border-[#ccb68b] bg-[#f8e7c4] px-3 py-1 text-xs font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad] disabled:opacity-60"
            >
              View Technicians
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#6a5b3b]">{getRoleHint("list_appointments")}</p>

          <form
            className="mt-3 grid grid-cols-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();

              if (!availabilityDate || !availabilityServiceId) {
                setOperationUiError("Availability requires both date and service ID.");
                return;
              }

              setOperationUiError("");
              void runOperation("get_availability", {
                date: availabilityDate,
                serviceCatalogItemId: availabilityServiceId,
              });
            }}
          >
            <input
              type="date"
              className="field"
              value={availabilityDate}
              onChange={(event) => setAvailabilityDate(event.target.value)}
              aria-label="Availability date"
            />
            <input
              type="text"
              className="field"
              value={availabilityServiceId}
              onChange={(event) => setAvailabilityServiceId(event.target.value)}
              placeholder="Service ID (serviceCatalogItemId)"
              aria-label="Service catalog item ID"
            />
            <button
              type="submit"
              disabled={operationLoading || sending || !availabilityDate || !availabilityServiceId}
              className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {operationLoading ? "Running..." : "Check Availability"}
            </button>
          </form>

          <div className="mt-4 rounded-lg border border-[#dac39c] bg-[#fff8e8] p-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5a4b29]">Schedule Appointment</p>
            <p className="mt-1 text-[11px] text-[#6a5b3b]">{getRoleHint("schedule_appointment")}</p>
            {isActionBlocked("schedule_appointment") ? (
              <p className="mt-1 text-[11px] font-semibold text-[#8a2e1c]">Action disabled for your current role.</p>
            ) : null}
            <form
              className="mt-2 grid grid-cols-1 gap-2"
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
                  setOperationUiError("Schedule form is missing one or more required fields.");
                  return;
                }

                const payload: Record<string, unknown> = {
                  serviceCatalogItemId: scheduleServiceId,
                  customerId: scheduleCustomerId,
                  contactName: scheduleContactName,
                  contactEmail: scheduleContactEmail,
                  contactPhone: scheduleContactPhone,
                  preferredDate: schedulePreferredDate,
                  preferredWindow: schedulePreferredWindow,
                  addressLine1: scheduleAddressLine1,
                  city: scheduleCity,
                };

                if (scheduleScheduledAt && scheduleTechnicianId) {
                  payload.scheduledAt = scheduleScheduledAt;
                  payload.technicianId = scheduleTechnicianId;
                }

                setOperationUiError("");
                void runOperation("schedule_appointment", payload);
              }}
            >
              <input className="field" value={scheduleServiceId} onChange={(event) => setScheduleServiceId(event.target.value)} placeholder="Service ID" aria-label="Schedule service ID" />
              <input className="field" value={scheduleCustomerId} onChange={(event) => setScheduleCustomerId(event.target.value)} placeholder="Customer ID" aria-label="Schedule customer ID" />
              <input className="field" value={scheduleContactName} onChange={(event) => setScheduleContactName(event.target.value)} placeholder="Contact name" aria-label="Schedule contact name" />
              <input className="field" type="email" value={scheduleContactEmail} onChange={(event) => setScheduleContactEmail(event.target.value)} placeholder="Contact email" aria-label="Schedule contact email" />
              <input className="field" value={scheduleContactPhone} onChange={(event) => setScheduleContactPhone(event.target.value)} placeholder="Contact phone" aria-label="Schedule contact phone" />
              <input className="field" type="date" value={schedulePreferredDate} onChange={(event) => setSchedulePreferredDate(event.target.value)} aria-label="Preferred date" />
              <input className="field" value={schedulePreferredWindow} onChange={(event) => setSchedulePreferredWindow(event.target.value)} placeholder="Preferred window (morning/afternoon/evening)" aria-label="Preferred window" />
              <input className="field" value={scheduleAddressLine1} onChange={(event) => setScheduleAddressLine1(event.target.value)} placeholder="Address line 1" aria-label="Schedule address line 1" />
              <input className="field" value={scheduleCity} onChange={(event) => setScheduleCity(event.target.value)} placeholder="City" aria-label="Schedule city" />
              <input className="field" type="datetime-local" value={scheduleScheduledAt} onChange={(event) => setScheduleScheduledAt(event.target.value)} placeholder="Optional scheduled datetime" aria-label="Optional scheduled datetime" />
              <input className="field" value={scheduleTechnicianId} onChange={(event) => setScheduleTechnicianId(event.target.value)} placeholder="Optional technician ID" aria-label="Optional technician ID" />
              <button
                type="submit"
                disabled={operationLoading || sending || isActionBlocked("schedule_appointment")}
                className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {operationLoading ? "Running..." : "Schedule Appointment"}
              </button>
            </form>
          </div>

          <div className="mt-3 rounded-lg border border-[#dac39c] bg-[#fff8e8] p-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5a4b29]">Reschedule Appointment</p>
            <p className="mt-1 text-[11px] text-[#6a5b3b]">{getRoleHint("reschedule_appointment")}</p>
            {isActionBlocked("reschedule_appointment") ? (
              <p className="mt-1 text-[11px] font-semibold text-[#8a2e1c]">Action disabled for your current role.</p>
            ) : null}
            <form
              className="mt-2 grid grid-cols-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault();

                if (!rescheduleBookingId || !rescheduleScheduledAt) {
                  setOperationUiError("Reschedule requires booking ID and new datetime.");
                  return;
                }

                const payload: Record<string, unknown> = {
                  bookingId: rescheduleBookingId,
                  scheduledAt: rescheduleScheduledAt,
                };

                if (rescheduleTechnicianId) {
                  payload.technicianId = rescheduleTechnicianId;
                }

                setOperationUiError("");
                void runOperation("reschedule_appointment", payload);
              }}
            >
              <input className="field" value={rescheduleBookingId} onChange={(event) => setRescheduleBookingId(event.target.value)} placeholder="Booking ID" aria-label="Reschedule booking ID" />
              <input className="field" type="datetime-local" value={rescheduleScheduledAt} onChange={(event) => setRescheduleScheduledAt(event.target.value)} aria-label="Reschedule datetime" />
              <input className="field" value={rescheduleTechnicianId} onChange={(event) => setRescheduleTechnicianId(event.target.value)} placeholder="Optional technician ID" aria-label="Reschedule optional technician ID" />
              <button
                type="submit"
                disabled={operationLoading || sending || isActionBlocked("reschedule_appointment")}
                className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {operationLoading ? "Running..." : "Reschedule"}
              </button>
            </form>
          </div>

          <div className="mt-3 rounded-lg border border-[#dac39c] bg-[#fff8e8] p-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5a4b29]">Cancel Appointment</p>
            <p className="mt-1 text-[11px] text-[#6a5b3b]">{getRoleHint("cancel_appointment")}</p>
            {isActionBlocked("cancel_appointment") ? (
              <p className="mt-1 text-[11px] font-semibold text-[#8a2e1c]">Action disabled for your current role.</p>
            ) : null}
            <form
              className="mt-2 grid grid-cols-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault();

                if (!cancelBookingId) {
                  setOperationUiError("Cancel requires booking ID.");
                  return;
                }

                setOperationUiError("");
                void runOperation("cancel_appointment", {
                  bookingId: cancelBookingId,
                });
              }}
            >
              <input className="field" value={cancelBookingId} onChange={(event) => setCancelBookingId(event.target.value)} placeholder="Booking ID" aria-label="Cancel booking ID" />
              <button
                type="submit"
                disabled={operationLoading || sending || isActionBlocked("cancel_appointment")}
                className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {operationLoading ? "Running..." : "Cancel Appointment"}
              </button>
            </form>
          </div>

          <div className="mt-3 rounded-lg border border-[#dac39c] bg-[#fff8e8] p-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5a4b29]">Assign Technician</p>
            <p className="mt-1 text-[11px] text-[#6a5b3b]">{getRoleHint("assign_technician")}</p>
            {isActionBlocked("assign_technician") ? (
              <p className="mt-1 text-[11px] font-semibold text-[#8a2e1c]">Action disabled for your current role.</p>
            ) : null}
            <form
              className="mt-2 grid grid-cols-1 gap-2"
              onSubmit={(event) => {
                event.preventDefault();

                if (!assignBookingId || !assignTechnicianId) {
                  setOperationUiError("Assign requires booking ID and technician ID.");
                  return;
                }

                setOperationUiError("");
                void runOperation("assign_technician", {
                  bookingId: assignBookingId,
                  technicianId: assignTechnicianId,
                });
              }}
            >
              <input className="field" value={assignBookingId} onChange={(event) => setAssignBookingId(event.target.value)} placeholder="Booking ID" aria-label="Assign booking ID" />
              <input className="field" value={assignTechnicianId} onChange={(event) => setAssignTechnicianId(event.target.value)} placeholder="Technician ID" aria-label="Assign technician ID" />
              <button
                type="submit"
                disabled={operationLoading || sending || isActionBlocked("assign_technician")}
                className="rounded-xl bg-[#163526] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {operationLoading ? "Running..." : "Assign Technician"}
              </button>
            </form>
          </div>

          {pendingOperation ? (
            <div className="mt-3 rounded-lg border border-[#d2be98] bg-[#fff8ea] p-2 text-xs text-[#3f3524]">
              <p className="font-semibold">Pending confirmation: {pendingOperation.action}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void confirmPendingOperation()}
                  disabled={operationLoading || sending}
                  className="rounded-md bg-[#163526] px-2 py-1 font-semibold text-white disabled:opacity-60"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={clearPendingOperation}
                  disabled={operationLoading || sending}
                  className="rounded-md border border-[#c8b48e] px-2 py-1 font-semibold text-[#4f4227] disabled:opacity-60"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

          {lastOperation ? (
            <div className="mt-2 rounded-lg border border-[#d8c7a5] bg-[#fff8ea] p-2 text-xs text-[#4c432f]">
              <p>
                Last operation: {lastOperation.action} ({lastOperation.status})
              </p>
              {operationResultSummary ? (
                <div className="mt-2">
                  <p className="font-semibold">Operation Result</p>
                  {operationResultCards}
                  {operationResultSummary.rows.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {operationResultSummary.rows.map((row) => (
                        <p key={`${row.label}:${row.value}`}>
                          {row.label}: {row.value}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <pre className="mt-1 max-h-32 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                    {operationResultSummary.raw}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}

          {operationHistory.length > 0 ? (
            <div className="mt-2 rounded-lg border border-[#d8c7a5] bg-[#fff8ea] p-2 text-xs text-[#4c432f]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">Recent Operations</p>
                <div className="flex flex-col items-end gap-1">
                  <p className="rounded-full border border-[#d6c39c] bg-[#fdf2dd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#5f4b22]">
                    Role: {operationHistoryViewerRole ?? "unknown"}
                  </p>
                  {canViewTeamOperationHistory ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setOperationHistoryScope("self")}
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          operationHistoryScope === "self"
                            ? "border-[#c79f55] bg-[#efd39e] text-[#533d1d]"
                            : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                        }`}
                      >
                        My Activity
                      </button>
                      <button
                        type="button"
                        onClick={() => setOperationHistoryScope("all")}
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                          operationHistoryScope === "all"
                            ? "border-[#c79f55] bg-[#efd39e] text-[#533d1d]"
                            : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                        }`}
                      >
                        Team Activity
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#776846]">Team Activity requires owner role.</p>
                  )}
                </div>
              </div>
              <div className="mt-1 space-y-1">
                <div className="mb-1 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setOperationHistoryStatusFilter("all")}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      operationHistoryStatusFilter === "all"
                        ? "border-[#c79f55] bg-[#efd39e] text-[#533d1d]"
                        : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationHistoryStatusFilter("success")}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      operationHistoryStatusFilter === "success"
                        ? "border-[#95bca0] bg-[#e8f6eb] text-[#1f5d35]"
                        : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                    }`}
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationHistoryStatusFilter("error")}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      operationHistoryStatusFilter === "error"
                        ? "border-[#d8a9a2] bg-[#fcebe8] text-[#7b2f24]"
                        : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                    }`}
                  >
                    Errors
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperationHistoryStatusFilter("requires_confirmation")}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      operationHistoryStatusFilter === "requires_confirmation"
                        ? "border-[#d7bf8a] bg-[#fbf1dd] text-[#6a4f1f]"
                        : "border-[#ccb68b] bg-[#f8e7c4] text-[#5d4a24]"
                    }`}
                  >
                    Needs Confirmation
                  </button>
                </div>
                {filteredRecentOperationHistory.length > 0 ? filteredRecentOperationHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <p>
                          {entry.action} ({entry.status})
                        </p>
                        <p className="text-[10px] text-[#776846]">
                          Created: {formatHistoryTimestamp(entry.createdAt)} ({formatHistoryRelativeAge(entry.createdAt)})
                        </p>
                      </div>
                      <span className="rounded-full border border-[#d6c39c] bg-[#fdf2dd] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#5f4b22]">
                        {entry.source === "audit" ? "Audit" : "Live"}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ${getHistoryStatusChipClasses(entry.status)}`}
                      >
                        Status: {entry.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOperationHistoryId(entry.id)}
                      className="rounded-md border border-[#ccb68b] bg-[#f8e7c4] px-2 py-0.5 text-[11px] font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad]"
                    >
                      Details
                    </button>
                  </div>
                )) : <p className="text-[11px] text-[#776846]">No operations match this filter.</p>}
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    void refreshOperationHistory();
                  }}
                  className="rounded-md border border-[#ccb68b] bg-[#f8e7c4] px-2 py-0.5 text-[11px] font-semibold text-[#5d4a24] transition hover:bg-[#f2dbad]"
                >
                  Refresh
                </button>
              </div>
            </div>
          ) : null}
        </div>
        ) : null}

        {/* Triage toggle button */}
        {triageEnabled && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowTriage(!showTriage)}
              className="rounded-full border border-[#b8a57f] bg-[#f3e4c7] px-3 py-1 text-xs text-[#294236] transition hover:bg-[#ead5b5]"
            >
              {showTriage ? "Hide triage" : "Start AI pest triage"}
            </button>
          </div>
        )}

        {/* Triage form */}
        {triageEnabled && showTriage && <TriageForm />}

        {/* Custom suggestion button slot */}
        {suggestedPromptsButton}

        {/* Lead capture form */}
        {showLeadForm && <LeadCaptureForm />}
      </div>

      {selectedOperationHistoryEntry ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#c9b797] bg-[#fff8ea] shadow-[0_18px_40px_rgba(17,35,28,0.35)]">
            <header className="flex items-center justify-between border-b border-[#dcc8a5] bg-[#fff2d8] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#3f3524]">Operation Details</p>
                <p className="text-xs text-[#6a5b3b]">
                  {selectedOperationHistoryEntry.action} ({selectedOperationHistoryEntry.status})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOperationHistoryId(null)}
                className="rounded-md border border-[#c8b48e] px-2 py-1 text-xs font-semibold text-[#4f4227]"
              >
                Close
              </button>
            </header>
            <div className="space-y-2 overflow-y-auto p-4 text-xs text-[#4c432f]">
              <p>
                <span className="font-semibold">Created:</span> {selectedOperationHistoryEntry.createdAt}
              </p>
              <p>
                <span className="font-semibold">Message:</span> {selectedOperationHistoryEntry.message}
              </p>
              {selectedOperationHistoryEntry.source === "audit" ? (
                <>
                  <p>
                    <span className="font-semibold">Source:</span> Audit log
                  </p>
                  {selectedOperationHistoryEntry.auditAction ? (
                    <p>
                      <span className="font-semibold">Audit Action:</span> {selectedOperationHistoryEntry.auditAction}
                    </p>
                  ) : null}
                  {selectedOperationHistoryEntry.actor ? (
                    <p>
                      <span className="font-semibold">Actor:</span> {selectedOperationHistoryEntry.actor}
                    </p>
                  ) : null}
                  {selectedOperationHistoryEntry.entityId ? (
                    <p>
                      <span className="font-semibold">Chat Session:</span> {selectedOperationHistoryEntry.entityId}
                    </p>
                  ) : null}
                </>
              ) : null}
              <div>
                <p className="font-semibold">Payload</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                  {JSON.stringify(selectedOperationHistoryEntry.payload ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="font-semibold">Result</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                  {JSON.stringify(selectedOperationHistoryEntry.result ?? {}, null, 2)}
                </pre>
              </div>
              {(selectedOperationHistoryEntry.before || selectedOperationHistoryEntry.after) ? (
                <div>
                  <p className="font-semibold">Before / After Snapshot</p>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-[#e0d3bb] bg-[#fffdf6] p-2 text-[11px] text-[#5b4d34]">
                    {JSON.stringify(
                      {
                        before: selectedOperationHistoryEntry.before ?? null,
                        after: selectedOperationHistoryEntry.after ?? null,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );

  // Wrap in fullscreen overlay if needed
  if (isFullscreen) {
    return <div className={containerClass}>{content}</div>;
  }

  return content;
}
