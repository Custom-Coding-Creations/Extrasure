jest.mock("@/lib/audit-log", () => ({
  getAuditEvents: jest.fn().mockResolvedValue([]),
  parseAuditSnapshot: jest.fn((value: string | null) => (value ? JSON.parse(value) : null)),
  recordAuditEvent: jest.fn(),
}));

import { getAdminManualAssistantModeCounts } from "@/lib/admin-manual-assistant-analytics";

const { getAuditEvents } = jest.requireMock("@/lib/audit-log") as {
  getAuditEvents: jest.Mock;
};

describe("admin-manual-assistant-analytics lookback", () => {
  beforeEach(() => {
    getAuditEvents.mockClear();
  });

  it("passes explicit lookback window to persisted audit query", async () => {
    await getAdminManualAssistantModeCounts({ lookbackHours: 12 });

    expect(getAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "admin_manual_assistant_mode",
        action: "manual_assistant_mode_recorded",
      }),
      1000,
    );

    const [firstCallFilters] = getAuditEvents.mock.calls[0] as [{ fromDate: Date }];
    const elapsedMs = Date.now() - new Date(firstCallFilters.fromDate).getTime();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    expect(Math.abs(elapsedMs - twelveHoursMs)).toBeLessThan(10000);
  });

  it("uses default lookback when not specified", async () => {
    await getAdminManualAssistantModeCounts();

    const [filters] = getAuditEvents.mock.calls[0] as [{ fromDate: Date }];
    const elapsedMs = Date.now() - new Date(filters.fromDate).getTime();
    const defaultHoursMs = 24 * 60 * 60 * 1000;
    expect(Math.abs(elapsedMs - defaultHoursMs)).toBeLessThan(10000);
  });
});
