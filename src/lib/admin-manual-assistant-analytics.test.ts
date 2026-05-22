jest.mock("@/lib/audit-log", () => ({
  getAuditEvents: jest.fn(),
  parseAuditSnapshot: jest.fn((value: string | null) => (value ? JSON.parse(value) : null)),
  recordAuditEvent: jest.fn(),
}));

import { getAdminManualAssistantModeCounts, recordAdminManualAssistantResponseMode } from "@/lib/admin-manual-assistant-analytics";

const { getAuditEvents, recordAuditEvent } = jest.requireMock("@/lib/audit-log") as {
  getAuditEvents: jest.Mock;
  recordAuditEvent: jest.Mock;
};

describe("admin-manual-assistant-analytics", () => {
  beforeEach(() => {
    getAuditEvents.mockReset();
    recordAuditEvent.mockReset();
  });

  it("aggregates mode counts from persisted audit events", async () => {
    getAuditEvents.mockResolvedValue([
      { after: JSON.stringify({ mode: "dns-clarifier" }) },
      { after: JSON.stringify({ mode: "dns-clarifier" }) },
      { after: JSON.stringify({ mode: "grounded-fallback" }) },
      { after: JSON.stringify({ mode: "auth-guided" }) },
    ]);

    const counts = await getAdminManualAssistantModeCounts();

    expect(counts).toEqual({
      "dns-clarifier": 2,
      "grounded-fallback": 1,
      "auth-guided": 1,
    });
  });

  it("records mode event and returns aggregate snapshot", async () => {
    getAuditEvents.mockResolvedValue([
      { after: JSON.stringify({ mode: "dns-clarifier" }) },
      { after: JSON.stringify({ mode: "grounded-fallback" }) },
      { after: JSON.stringify({ mode: "dns-clarifier" }) },
    ]);

    const result = await recordAdminManualAssistantResponseMode("dns-clarifier");

    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "system",
        role: "system",
        action: "manual_assistant_mode_recorded",
        entity: "admin_manual_assistant_mode",
        entityId: "dns-clarifier",
      }),
    );

    expect(result).toEqual({
      mode: "dns-clarifier",
      modeCount: 2,
      totalResponses: 3,
      modeCounts: {
        "dns-clarifier": 2,
        "grounded-fallback": 1,
      },
    });
  });
});
