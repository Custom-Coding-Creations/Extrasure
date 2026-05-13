import { GET, POST } from "@/app/api/admin/triage-assessment-override/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/triage-assessment-override", () => ({
  overrideTriageAssessment: jest.fn(),
  getRecentOverrides: jest.fn(),
  getOverrideStats: jest.fn(),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { overrideTriageAssessment, getRecentOverrides, getOverrideStats } = jest.requireMock(
  "@/lib/triage-assessment-override",
) as {
  overrideTriageAssessment: jest.Mock;
  getRecentOverrides: jest.Mock;
  getOverrideStats: jest.Mock;
};

describe("GET /api/admin/triage-assessment-override", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/admin/triage-assessment-override") as never,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns recent overrides when action is recent", async () => {
    const mockOverrides = [
      {
        id: "override_1",
        triageAssessmentId: "triage_1",
        previousConfidence: 0.6,
        newConfidence: 0.8,
        reason: "incorrect_confidence",
        createdAt: new Date(),
      },
    ];
    getRecentOverrides.mockResolvedValue(mockOverrides);

    const response = await GET(
      new Request("http://localhost/api/admin/triage-assessment-override?action=recent&limit=20") as never,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.overrides).toHaveLength(1);
    expect(data.overrides[0].id).toBe("override_1");
    expect(getRecentOverrides).toHaveBeenCalledWith(20);
  });

  it("returns statistics when action is stats", async () => {
    const stats = {
      totalOverrides: 5,
      reasonBreakdown: { incorrect_confidence: 3, model_misclassification: 2 },
      averageConfidenceChange: 0.15,
    };
    getOverrideStats.mockResolvedValue(stats);

    const response = await GET(
      new Request("http://localhost/api/admin/triage-assessment-override?action=stats&hoursBack=24") as never,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.stats).toEqual(stats);
    expect(getOverrideStats).toHaveBeenCalledWith(24);
  });

  it("clamps hoursBack to 1-168 range", async () => {
    getOverrideStats.mockResolvedValue({
      totalOverrides: 0,
      reasonBreakdown: {},
      averageConfidenceChange: 0,
    });

    await GET(new Request("http://localhost/api/admin/triage-assessment-override?action=stats&hoursBack=0") as never);
    expect(getOverrideStats).toHaveBeenCalledWith(1);

    jest.clearAllMocks();
    getOverrideStats.mockResolvedValue({
      totalOverrides: 0,
      reasonBreakdown: {},
      averageConfidenceChange: 0,
    });

    await GET(
      new Request("http://localhost/api/admin/triage-assessment-override?action=stats&hoursBack=500") as never,
    );
    expect(getOverrideStats).toHaveBeenCalledWith(168);
  });

  it("returns error for invalid action", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/triage-assessment-override?action=invalid") as never,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid action" });
  });
});

describe("POST /api/admin/triage-assessment-override", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Admin User", role: "owner" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/triage-assessment-override", {
      method: "POST",
      body: JSON.stringify({}),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when non-owner user", async () => {
    requireAdminApiSession.mockResolvedValue({ name: "Accountant", role: "accountant" });

    const request = new Request("http://localhost/api/admin/triage-assessment-override", {
      method: "POST",
      body: JSON.stringify({}),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("creates an override successfully", async () => {
    const override = {
      id: "override_1",
      triageAssessmentId: "triage_123",
      previousConfidence: 0.6,
      newConfidence: 0.85,
      reason: "incorrect_confidence",
      notes: "Model underestimated",
      overriddenBy: "Admin User",
      createdAt: new Date(),
    };
    overrideTriageAssessment.mockResolvedValue({ success: true, override });

    const request = new Request("http://localhost/api/admin/triage-assessment-override", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "triage_123",
        newConfidence: 0.85,
        reason: "incorrect_confidence",
        notes: "Model underestimated",
      }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.override?.newConfidence).toBe(0.85);
  });

  it("returns error when required fields missing", async () => {
    const request = new Request("http://localhost/api/admin/triage-assessment-override", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "triage_123" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("returns error when override fails", async () => {
    overrideTriageAssessment.mockResolvedValue({
      success: false,
      error: "Assessment not found",
    });

    const request = new Request("http://localhost/api/admin/triage-assessment-override", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "nonexistent",
        newConfidence: 0.8,
        reason: "incorrect_confidence",
      }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("not found");
  });
});
