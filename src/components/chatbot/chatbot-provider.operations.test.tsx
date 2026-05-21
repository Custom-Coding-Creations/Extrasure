/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatbotProvider, useChatbot } from "@/components/chatbot/chatbot-provider";

jest.mock("@/lib/triage-runtime", () => ({
  isTriageUiEnabled: () => false,
}));

function OperationHarness() {
  const { runOperation, confirmPendingOperation, pendingOperation, lastOperation, operationHistory } = useChatbot();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void runOperation("schedule_appointment", {
            serviceCatalogItemId: "svc_1",
            customerId: "c_1",
            contactName: "Megan R",
            contactEmail: "megan@example.com",
            contactPhone: "315-555-0100",
            preferredDate: "2030-01-02",
            preferredWindow: "morning",
            addressLine1: "123 Main St",
            city: "Syracuse",
          })
        }
      >
        Run Schedule
      </button>
      <button type="button" onClick={() => void confirmPendingOperation()}>
        Confirm Pending
      </button>
      <p>Pending Action: {pendingOperation?.action ?? "none"}</p>
      <p>Pending Token: {pendingOperation?.confirmationToken ?? "none"}</p>
      <p>Last Status: {lastOperation?.status ?? "none"}</p>
      <p>Last Action: {lastOperation?.action ?? "none"}</p>
      <p>Last Message: {lastOperation?.message ?? "none"}</p>
      <p>History Count: {operationHistory.length}</p>
    </div>
  );
}

describe("chatbot-provider operations lifecycle", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("handles requires-confirmation then executes confirmed operation", async () => {
    let operationCallCount = 0;
    const fetchMock = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/ai/chat/operations-history")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            entries: [],
            capabilities: {
              canViewAllScope: true,
              viewerRole: "owner",
            },
          }),
        };
      }

      operationCallCount += 1;
      if (operationCallCount === 1) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            sessionId: "chat_1",
            answer: "Operation schedule_appointment result: confirmation required",
            language: "en",
            confidence: "medium",
            escalateToHuman: true,
            policyReferences: [],
            suggestLeadCapture: false,
            handoff: {
              callHref: "tel:+15169432318",
              smsHref: "sms:+15169432318",
              contactPath: "/contact",
            },
            operation: {
              action: "schedule_appointment",
              status: "requires_confirmation",
              requiresConfirmation: true,
              message: "Confirmation required",
              confirmationToken: "token_1",
              result: {
                pendingAction: "schedule_appointment",
              },
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          ok: true,
          sessionId: "chat_1",
          answer: "Operation schedule_appointment result: success",
          language: "en",
          confidence: "high",
          escalateToHuman: false,
          policyReferences: [],
          suggestLeadCapture: false,
          handoff: {
            callHref: "tel:+15169432318",
            smsHref: "sms:+15169432318",
            contactPath: "/contact",
          },
          operation: {
            action: "schedule_appointment",
            status: "success",
            requiresConfirmation: false,
            message: "schedule_appointment completed successfully.",
            result: {
              bookingId: "book_1",
              status: "requested",
            },
          },
        }),
      };
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <ChatbotProvider>
        <OperationHarness />
      </ChatbotProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /run schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/pending action: schedule_appointment/i)).not.toBeNull();
    });

    expect(screen.getByText(/pending token: token_1/i)).not.toBeNull();
    expect(screen.getByText(/last status: requires_confirmation/i)).not.toBeNull();
    expect(screen.getByText(/history count: 1/i)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /confirm pending/i }));

    await waitFor(() => {
      expect(screen.getByText(/last status: success/i)).not.toBeNull();
      expect(screen.getByText(/pending action: none/i)).not.toBeNull();
      expect(screen.getByText(/history count: 2/i)).not.toBeNull();
    });

    const operationRequests = fetchMock.mock.calls.filter((call) => call[1]?.method === "POST");

    const firstRequestBody = JSON.parse(String(operationRequests[0]?.[1]?.body));
    const secondRequestBody = JSON.parse(String(operationRequests[1]?.[1]?.body));

    expect(firstRequestBody.operation.action).toBe("schedule_appointment");
    expect(firstRequestBody.operation.confirmationToken).toBeUndefined();
    expect(secondRequestBody.operation.action).toBe("schedule_appointment");
    expect(secondRequestBody.operation.confirmationToken).toBe("token_1");
  });

  it("handles 429 operation responses with retry context", async () => {
    const retryAt = new Date(Date.now() + 15_000).toISOString();

    const fetchMock = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/ai/chat/operations-history")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            entries: [],
            capabilities: {
              canViewAllScope: true,
              viewerRole: "owner",
            },
          }),
        };
      }

      return {
        ok: false,
        status: 429,
        json: async () => ({
          error: "Rate limit exceeded for operations",
          retryAt,
        }),
      };
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <ChatbotProvider>
        <OperationHarness />
      </ChatbotProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /run schedule/i }));

    await waitFor(() => {
      expect(screen.getByText(/last status: error/i)).not.toBeNull();
      expect(screen.getByText(/history count: 1/i)).not.toBeNull();
    });

    expect(screen.getByText(/last action: schedule_appointment/i)).not.toBeNull();
    expect(screen.getByText(/last message: rate limit exceeded for operations/i)).not.toBeNull();
    expect(screen.getByText(/retry in about/i)).not.toBeNull();
  });
});
