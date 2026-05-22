/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatbotOperationsConsole } from "@/components/admin/chatbot-operations-console";

describe("ChatbotOperationsConsole", () => {
  beforeEach(() => {
    (globalThis as { fetch?: jest.Mock }).fetch = jest.fn();
  });

  afterEach(() => {
    (globalThis as { fetch?: jest.Mock }).fetch?.mockReset();
  });

  it("submits list appointments operation", async () => {
    const fetchMock = (globalThis as { fetch: jest.Mock }).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        sessionId: "chat_1",
        operation: {
          action: "list_appointments",
          status: "success",
          requiresConfirmation: false,
          message: "done",
          result: { serviceBookingCount: 2 },
        },
      }),
    } as Response);

    render(<ChatbotOperationsConsole />);

    fireEvent.click(screen.getByRole("button", { name: /view appointments/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0]).toBe("/api/ai/chat");
    expect(String(firstCall?.[1]?.body)).toContain('"action":"list_appointments"');
    expect(await screen.findByText(/list_appointments: done/i)).not.toBeNull();
  });
});
