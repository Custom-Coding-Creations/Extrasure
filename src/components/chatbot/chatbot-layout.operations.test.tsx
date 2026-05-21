/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { ChatbotLayout } from "@/components/chatbot/chatbot-layout";

jest.mock("@/components/chatbot/triage-form", () => ({
  TriageForm: () => null,
}));

jest.mock("@/components/chatbot/lead-capture-form", () => ({
  LeadCaptureForm: () => null,
}));

const mockUseChatbot = jest.fn();

jest.mock("@/components/chatbot/chatbot-provider", () => ({
  useChatbot: () => mockUseChatbot(),
}));

function makeChatbotContext(overrides?: Record<string, unknown>) {
  return {
    viewMode: "panel",
    toggleFullscreen: jest.fn(),
    triageEnabled: false,
    showTriage: false,
    setShowTriage: jest.fn(),
    showLeadForm: false,
    accountContext: null,
    suggestedPrompts: [],
    sendMessage: jest.fn(),
    sending: false,
    input: "",
    setInput: jest.fn(),
    handoffLinks: {
      callHref: "tel:+15169432318",
      smsHref: "sms:+15169432318",
      contactPath: "/contact",
    },
    operationLoading: false,
    lastOperation: null,
    pendingOperation: null,
    runOperation: jest.fn(),
    confirmPendingOperation: jest.fn(),
    clearPendingOperation: jest.fn(),
    operationHistoryScope: "self",
    canViewTeamOperationHistory: false,
    operationHistoryViewerRole: "dispatch",
    setOperationHistoryScope: jest.fn(),
    refreshOperationHistory: jest.fn().mockResolvedValue(undefined),
    operationHistory: [],
    messages: [
      {
        id: "m_1",
        role: "assistant",
        content: "Hello",
      },
    ],
    ...overrides,
  };
}

describe("chatbot-layout operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED;
    window.sessionStorage.clear();
  });

  it("renders operations controls by default and runs view appointments", () => {
    const runOperation = jest.fn();
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        runOperation,
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /view appointments/i }));

    expect(runOperation).toHaveBeenCalledWith("list_appointments", { limit: 20 });
  });

  it("hides operations controls when feature flag is disabled", () => {
    process.env.NEXT_PUBLIC_AI_CHATBOT_OPERATIONS_ENABLED = "off";
    mockUseChatbot.mockReturnValue(makeChatbotContext());

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.queryByText(/operations beta/i)).toBeNull();
  });

  it("shows inline validation error for incomplete schedule form", () => {
    const runOperation = jest.fn();
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        runOperation,
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /^schedule appointment$/i }));

    expect(screen.getByText(/schedule form is missing/i)).not.toBeNull();
    expect(runOperation).not.toHaveBeenCalledWith("schedule_appointment", expect.anything());
  });

  it("triggers pending confirmation actions", () => {
    const confirmPendingOperation = jest.fn();
    const clearPendingOperation = jest.fn();

    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        pendingOperation: {
          action: "cancel_appointment",
          payload: {
            bookingId: "book_1",
          },
          confirmationToken: "token",
        },
        confirmPendingOperation,
        clearPendingOperation,
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^dismiss$/i }));

    expect(confirmPendingOperation).toHaveBeenCalled();
    expect(clearPendingOperation).toHaveBeenCalled();
  });

  it("prefills write form fields from last successful operation result", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "schedule_appointment",
          status: "success",
          requiresConfirmation: false,
          message: "ok",
          result: {
            bookingId: "book_99",
            technicianId: "tech_7",
            serviceCatalogItemId: "svc_11",
            customerId: "c_22",
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /prefill forms from last result/i }));

    expect((screen.getByLabelText(/schedule service id/i) as HTMLInputElement).value).toBe("svc_11");
    expect((screen.getByLabelText(/schedule customer id/i) as HTMLInputElement).value).toBe("c_22");
    expect((screen.getByLabelText(/cancel booking id/i) as HTMLInputElement).value).toBe("book_99");
    expect((screen.getByLabelText(/assign technician id/i) as HTMLInputElement).value).toBe("tech_7");
  });

  it("shows allowed roles from last forbidden operation when available", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "cancel_appointment",
          status: "error",
          requiresConfirmation: false,
          message: "forbidden",
          result: {
            code: "forbidden",
            allowedRoles: ["owner", "dispatch"],
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getAllByText(/required roles: owner, dispatch/i).length).toBeGreaterThan(0);
  });

  it("disables denied action submit button after forbidden response", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "cancel_appointment",
          status: "error",
          requiresConfirmation: false,
          message: "forbidden",
          result: {
            code: "forbidden",
            allowedRoles: ["owner", "dispatch"],
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect((screen.getByRole("button", { name: /^cancel appointment$/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders structured operation result details", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "schedule_appointment",
          status: "success",
          requiresConfirmation: false,
          message: "ok",
          result: {
            bookingId: "book_123",
            status: "scheduled",
            technicianId: "tech_5",
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByText(/operation result/i)).not.toBeNull();
    expect(screen.getByText(/booking id: book_123/i)).not.toBeNull();
    expect(screen.getByText(/technician id: tech_5/i)).not.toBeNull();
  });

  it("renders toast status message for latest operation", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "cancel_appointment",
          status: "error",
          requiresConfirmation: false,
          message: "Booking not found",
          result: {
            code: "operation_failed",
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByRole("status")).not.toBeNull();
    expect(screen.getByText(/cancel_appointment: booking not found/i)).not.toBeNull();
  });

  it("renders appointments snapshot card for list_appointments results", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "list_appointments",
          status: "success",
          requiresConfirmation: false,
          message: "ok",
          result: {
            summary: {
              serviceBookingCount: 2,
              jobCount: 1,
            },
            serviceBookings: [
              { id: "book_1", status: "scheduled" },
              { id: "book_2", status: "requested" },
            ],
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByText(/appointments snapshot/i)).not.toBeNull();
    expect(screen.getByText(/service bookings: 2/i)).not.toBeNull();
    expect(screen.getByText(/jobs: 1/i)).not.toBeNull();
  });

  it("renders write outcome card for write-action results", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        lastOperation: {
          action: "reschedule_appointment",
          status: "success",
          requiresConfirmation: false,
          message: "ok",
          result: {
            bookingId: "book_77",
            status: "scheduled",
            technicianId: "tech_9",
            scheduledAt: "2030-01-03T14:00:00.000Z",
          },
        },
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByText(/write outcome/i)).not.toBeNull();
    expect(screen.getByText(/appointment rescheduled/i)).not.toBeNull();
    expect(screen.getByText(/booking: book_77/i)).not.toBeNull();
    expect(screen.getByText(/technician: tech_9/i)).not.toBeNull();
  });

  it("renders recent operations history list", () => {
    const setOperationHistoryScope = jest.fn();
    const refreshOperationHistory = jest.fn().mockResolvedValue(undefined);

    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        canViewTeamOperationHistory: true,
        operationHistoryViewerRole: "owner",
        operationHistoryScope: "self",
        setOperationHistoryScope,
        refreshOperationHistory,
        operationHistory: [
          {
            id: "op_1",
            createdAt: "2026-05-14T00:00:00.000Z",
            action: "schedule_appointment",
            status: "success",
            message: "done",
            payload: {
              bookingId: "book_1",
            },
            result: {
              status: "requested",
            },
          },
          {
            id: "op_2",
            createdAt: "2026-05-14T00:01:00.000Z",
            action: "list_technicians",
            status: "success",
            message: "done",
            source: "audit",
            auditAction: "chatbot_operation_executed",
            actor: "Owner",
            entityId: "chat_2",
            before: {
              operationAction: "list_technicians",
            },
            after: {
              operationAction: "list_technicians",
            },
            payload: {
              includeInactive: false,
            },
            result: {
              technicianCount: 2,
            },
          },
        ],
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByText(/recent operations/i)).not.toBeNull();
    expect(screen.getByText(/role: owner/i)).not.toBeNull();
    expect(screen.getByText(/schedule_appointment \(success\)/i)).not.toBeNull();
    expect(screen.getByText(/list_technicians \(success\)/i)).not.toBeNull();
    expect(screen.getAllByText(/created:/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^live$/i)).not.toBeNull();
    expect(screen.getByText(/^audit$/i)).not.toBeNull();
    expect(screen.getAllByText(/^status: success$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /my activity/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /team activity/i })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /team activity/i }));
    expect(setOperationHistoryScope).toHaveBeenCalledWith("all");

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(refreshOperationHistory).toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: /details/i })[0] as HTMLButtonElement);

    expect(screen.getByText(/operation details/i)).not.toBeNull();
    expect(screen.getByText(/"bookingId": "book_1"/i)).not.toBeNull();
    expect(screen.getByText(/"status": "requested"/i)).not.toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /details/i })[1] as HTMLButtonElement);

    expect(screen.getByText(/source:/i)).not.toBeNull();
    expect(screen.getByText(/audit log/i)).not.toBeNull();
    expect(screen.getByText(/audit action:/i)).not.toBeNull();
    expect(screen.getByText(/chatbot_operation_executed/i)).not.toBeNull();
    expect(screen.getByText(/actor:/i)).not.toBeNull();
    expect(screen.getByText(/^owner$/i)).not.toBeNull();
    expect(screen.getByText(/before \/ after snapshot/i)).not.toBeNull();
  });

  it("shows role hint and hides team toggle for non-owner history capability", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        canViewTeamOperationHistory: false,
        operationHistoryViewerRole: "dispatch",
        operationHistory: [
          {
            id: "op_3",
            createdAt: "2026-05-14T00:02:00.000Z",
            action: "list_appointments",
            status: "success",
            message: "done",
          },
        ],
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByText(/role: dispatch/i)).not.toBeNull();
    expect(screen.getByText(/team activity requires owner role/i)).not.toBeNull();
    expect(screen.queryByRole("button", { name: /team activity/i })).toBeNull();
  });

  it("filters recent operations by status", () => {
    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        canViewTeamOperationHistory: true,
        operationHistoryViewerRole: "owner",
        operationHistory: [
          {
            id: "op_4",
            createdAt: "2026-05-14T00:03:00.000Z",
            action: "schedule_appointment",
            status: "success",
            message: "done",
          },
          {
            id: "op_5",
            createdAt: "2026-05-14T00:04:00.000Z",
            action: "cancel_appointment",
            status: "error",
            message: "failed",
          },
          {
            id: "op_6",
            createdAt: "2026-05-14T00:05:00.000Z",
            action: "assign_technician",
            status: "requires_confirmation",
            message: "pending",
          },
        ],
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /^errors$/i }));
    expect(screen.getByText(/cancel_appointment \(error\)/i)).not.toBeNull();
    expect(screen.queryByText(/schedule_appointment \(success\)/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /needs confirmation/i }));
    expect(screen.getByText(/assign_technician \(requires_confirmation\)/i)).not.toBeNull();
    expect(screen.queryByText(/cancel_appointment \(error\)/i)).toBeNull();

    expect(window.sessionStorage.getItem("ai_chat_operation_history_status_filter")).toBe("requires_confirmation");
  });

  it("restores status filter from session storage", () => {
    window.sessionStorage.setItem("ai_chat_operation_history_status_filter", "error");

    mockUseChatbot.mockReturnValue(
      makeChatbotContext({
        operationHistory: [
          {
            id: "op_7",
            createdAt: "2026-05-14T00:06:00.000Z",
            action: "list_appointments",
            status: "success",
            message: "done",
          },
          {
            id: "op_8",
            createdAt: "2026-05-14T00:07:00.000Z",
            action: "cancel_appointment",
            status: "error",
            message: "failed",
          },
        ],
      }),
    );

    render(<ChatbotLayout onClose={() => undefined} />);

    expect(screen.getByText(/cancel_appointment \(error\)/i)).not.toBeNull();
    expect(screen.queryByText(/list_appointments \(success\)/i)).toBeNull();
  });
});
