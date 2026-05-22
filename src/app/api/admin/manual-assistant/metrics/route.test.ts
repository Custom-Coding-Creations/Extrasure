import { GET } from "@/app/api/admin/manual-assistant/metrics/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/admin-manual-assistant-analytics", () => ({
  getAdminManualAssistantModeCounts: jest.fn(),
  getAdminManualAssistantModeTimeline: jest.fn(),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { getAdminManualAssistantModeCounts, getAdminManualAssistantModeTimeline } = jest.requireMock("@/lib/admin-manual-assistant-analytics") as {
  getAdminManualAssistantModeCounts: jest.Mock;
  getAdminManualAssistantModeTimeline: jest.Mock;
};

describe("GET /api/admin/manual-assistant/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
    getAdminManualAssistantModeCounts.mockResolvedValue({
      "dns-clarifier": 2,
      "grounded-fallback": 3,
    });
    getAdminManualAssistantModeTimeline.mockResolvedValue([
      {
        hourStartIso: "2026-05-21T00:00:00.000Z",
        total: 2,
        modeCounts: { "dns-clarifier": 1, "grounded-fallback": 1 },
      },
    ]);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/manual-assistant/metrics") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns mode counts and timeline with default lookback", async () => {
    const response = await GET(new Request("http://localhost/api/admin/manual-assistant/metrics") as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.lookbackHours).toBe(24);
    expect(payload.totalResponses).toBe(5);
    expect(payload.modeCounts).toEqual({
      "dns-clarifier": 2,
      "grounded-fallback": 3,
    });
    expect(payload.timeline).toHaveLength(1);

    expect(getAdminManualAssistantModeCounts).toHaveBeenCalledWith({ lookbackHours: 24 });
    expect(getAdminManualAssistantModeTimeline).toHaveBeenCalledWith({ lookbackHours: 24 });
  });

  it("caps lookback to 168 hours and floors to at least 1", async () => {
    await GET(new Request("http://localhost/api/admin/manual-assistant/metrics?lookbackHours=500") as never);
    expect(getAdminManualAssistantModeCounts).toHaveBeenLastCalledWith({ lookbackHours: 168 });

    await GET(new Request("http://localhost/api/admin/manual-assistant/metrics?lookbackHours=0") as never);
    expect(getAdminManualAssistantModeCounts).toHaveBeenLastCalledWith({ lookbackHours: 1 });
  });
});
