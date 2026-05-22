/** @jest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { ChatbotOperationsHistory } from "@/components/admin/chatbot-operations-history";

describe("ChatbotOperationsHistory", () => {
  beforeEach(() => {
    (globalThis as { fetch?: jest.Mock }).fetch = jest.fn();
  });

  afterEach(() => {
    (globalThis as { fetch?: jest.Mock }).fetch?.mockReset();
  });

  it("loads and renders operation history entries", async () => {
    const fetchMock = (globalThis as { fetch: jest.Mock }).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        entries: [
          {
            id: "op_1",
            createdAt: "2026-05-20T10:00:00.000Z",
            action: "list_appointments",
            status: "success",
            message: "list_appointments completed",
            source: "audit",
          },
        ],
        capabilities: {
          canViewAllScope: false,
          viewerRole: "dispatch",
        },
      }),
    } as Response);

    render(<ChatbotOperationsHistory />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText(/list_appointments \(success\)/i)).not.toBeNull();
    expect(await screen.findByText(/list_appointments completed/i)).not.toBeNull();
  });
});
