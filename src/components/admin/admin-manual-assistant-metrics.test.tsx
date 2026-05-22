/** @jest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { AdminManualAssistantMetrics } from "@/components/admin/admin-manual-assistant-metrics";

describe("AdminManualAssistantMetrics", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("loads and renders metrics summary", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        lookbackHours: 24,
        totalResponses: 12,
        modeCounts: {
          "grounded-fallback": 6,
          "dns-clarifier": 3,
          "grounded-ai": 3,
        },
        timeline: [
          {
            hourStartIso: "2026-05-22T10:00:00.000Z",
            total: 4,
            modeCounts: {
              "grounded-fallback": 2,
              "dns-clarifier": 2,
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    render(<AdminManualAssistantMetrics />);

    await waitFor(() => {
      expect(screen.queryByText(/loading assistant metrics/i)).toBeNull();
    });

    expect(screen.getByText(/assistant performance snapshot/i)).not.toBeNull();
    expect(screen.getByText("12")).not.toBeNull();
    expect(screen.getByText(/mode breakdown/i)).not.toBeNull();
    expect(screen.getAllByText(/grounded fallback/i).length).toBeGreaterThan(0);
  });

  it("shows an error state when metrics request fails", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    }) as unknown as typeof fetch;

    render(<AdminManualAssistantMetrics />);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).not.toBeNull();
    });
  });
});
