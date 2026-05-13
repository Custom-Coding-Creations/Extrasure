import { GET, POST } from "@/app/api/admin/triage-export/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/triage-assessment-export", () => ({
  exportAssessmentsAsCSV: jest.fn(),
  exportAssessmentsAsJSON: jest.fn(),
  getExportStats: jest.fn(),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { exportAssessmentsAsCSV, exportAssessmentsAsJSON, getExportStats } = jest.requireMock(
  "@/lib/triage-assessment-export",
) as {
  exportAssessmentsAsCSV: jest.Mock;
  exportAssessmentsAsJSON: jest.Mock;
  getExportStats: jest.Mock;
};

describe("GET /api/admin/triage-export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/triage-export") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns export statistics", async () => {
    const stats = {
      totalAssessments: 100,
      dateRange: { earliest: new Date("2026-01-01"), latest: new Date("2026-05-13") },
      averageConfidence: 0.85,
      severityBreakdown: { high: 30, medium: 50, low: 20 },
      urgencyBreakdown: { immediate: 20, urgent: 40, routine: 40 },
    };
    getExportStats.mockResolvedValue(stats);

    const response = await GET(new Request("http://localhost/api/admin/triage-export?action=stats") as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.stats.totalAssessments).toBe(100);
    expect(data.stats.averageConfidence).toBe(0.85);
    expect(data.stats.severityBreakdown).toEqual({ high: 30, medium: 50, low: 20 });
  });

  it("parses filter parameters from query", async () => {
    getExportStats.mockResolvedValue({
      totalAssessments: 50,
      dateRange: { earliest: null, latest: null },
      averageConfidence: 0.9,
      severityBreakdown: {},
      urgencyBreakdown: {},
    });

    await GET(
      new Request(
        "http://localhost/api/admin/triage-export?action=stats&startDate=2026-05-01&minConfidence=0.8",
      ) as never,
    );

    expect(getExportStats).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        minConfidence: 0.8,
      }),
    );
  });

  it("returns error for invalid action", async () => {
    const response = await GET(new Request("http://localhost/api/admin/triage-export?action=invalid") as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid action" });
  });
});

describe("POST /api/admin/triage-export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "csv" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for non-accountant users", async () => {
    requireAdminApiSession.mockResolvedValue({ name: "Tech", role: "technician" });

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "csv" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("exports assessments as CSV", async () => {
    exportAssessmentsAsCSV.mockResolvedValue("id,customer\n1,c1\n2,c2");

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "csv" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain(".csv");
    expect(await response.text()).toBe("id,customer\n1,c1\n2,c2");
  });

  it("exports assessments as JSON", async () => {
    const jsonData = { exportedAt: "2026-05-13", assessments: [] };
    exportAssessmentsAsJSON.mockResolvedValue(JSON.stringify(jsonData));

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "json" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain(".json");
  });

  it("applies filters from request body", async () => {
    exportAssessmentsAsCSV.mockResolvedValue("data");

    const filters = {
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      minConfidence: 0.5,
      maxConfidence: 1.0,
    };

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "csv", filters }),
    }) as never;

    await POST(request);

    expect(exportAssessmentsAsCSV).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        minConfidence: 0.5,
        maxConfidence: 1.0,
      }),
    );
  });

  it("returns error for invalid format", async () => {
    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "xml" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid format");
  });

  it("handles export errors", async () => {
    exportAssessmentsAsCSV.mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "csv" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Export failed" });
  });

  it("allows accountant role to export", async () => {
    requireAdminApiSession.mockResolvedValue({ name: "Accountant", role: "accountant" });
    exportAssessmentsAsCSV.mockResolvedValue("data");

    const request = new Request("http://localhost/api/admin/triage-export", {
      method: "POST",
      body: JSON.stringify({ format: "csv" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
