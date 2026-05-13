import { GET } from "@/app/api/admin/triage-anomaly-detection/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/triage-anomaly-detection", () => ({
  detectTriageAnomalies: jest.fn(),
}));

jest.mock("@/lib/triage-webhook-notifications", () => ({
  sendWebhookNotification: jest.fn(),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { detectTriageAnomalies } = jest.requireMock("@/lib/triage-anomaly-detection") as {
  detectTriageAnomalies: jest.Mock;
};

describe("GET /api/admin/triage-anomaly-detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
    detectTriageAnomalies.mockResolvedValue({
      ok: true,
      hasAnomalies: false,
      anomalies: [],
      metrics: {
        totalAssessments: 50,
        autoApprovedCount: 30,
        humanReviewFlaggedCount: 20,
        autoApproveRate: 0.6,
        averageConfidence: 0.75,
        assessmentsByConfidenceBucket: {
          "0.0-0.25": 5,
          "0.25-0.50": 10,
          "0.50-0.75": 15,
          "0.75-0.90": 15,
          "0.90-1.00": 5,
        },
        timeWindow: {
          startDate: new Date(),
          endDate: new Date(),
          hoursSpanned: 24,
        },
      },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/admin/triage-anomaly-detection") as never,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns anomaly detection with default 24 hours", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/triage-anomaly-detection") as never,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.metrics).toBeDefined();
    expect(detectTriageAnomalies).toHaveBeenCalledWith(24);
  });

  it("accepts custom hoursBack parameter", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/triage-anomaly-detection?hoursBack=48") as never,
    );

    expect(response.status).toBe(200);
    expect(detectTriageAnomalies).toHaveBeenCalledWith(48);
  });

  it("clamps hoursBack to 1-168 range", async () => {
    // Test minimum clamping
    await GET(new Request("http://localhost/api/admin/triage-anomaly-detection?hoursBack=0") as never);
    expect(detectTriageAnomalies).toHaveBeenCalledWith(1);

    jest.clearAllMocks();
    detectTriageAnomalies.mockResolvedValue({
      ok: true,
      hasAnomalies: false,
      anomalies: [],
      metrics: {
        totalAssessments: 50,
        autoApprovedCount: 30,
        humanReviewFlaggedCount: 20,
        autoApproveRate: 0.6,
        averageConfidence: 0.75,
        assessmentsByConfidenceBucket: {
          "0.0-0.25": 5,
          "0.25-0.50": 10,
          "0.50-0.75": 15,
          "0.75-0.90": 15,
          "0.90-1.00": 5,
        },
        timeWindow: {
          startDate: new Date(),
          endDate: new Date(),
          hoursSpanned: 168,
        },
      },
    });

    // Test maximum clamping
    await GET(
      new Request("http://localhost/api/admin/triage-anomaly-detection?hoursBack=500") as never,
    );
    expect(detectTriageAnomalies).toHaveBeenCalledWith(168);
  });

  it("returns anomalies when detected", async () => {
    detectTriageAnomalies.mockResolvedValue({
      ok: true,
      hasAnomalies: true,
      anomalies: [
        {
          type: "low_auto_approve_rate",
          severity: "warning",
          message: "Auto-approve rate is very low (< 10%)",
          value: 5,
          threshold: 10,
        },
      ],
      metrics: {
        totalAssessments: 50,
        autoApprovedCount: 2,
        humanReviewFlaggedCount: 48,
        autoApproveRate: 0.04,
        averageConfidence: 0.75,
        assessmentsByConfidenceBucket: {
          "0.0-0.25": 0,
          "0.25-0.50": 0,
          "0.50-0.75": 15,
          "0.75-0.90": 25,
          "0.90-1.00": 10,
        },
        timeWindow: {
          startDate: new Date(),
          endDate: new Date(),
          hoursSpanned: 24,
        },
      },
    });

    const response = await GET(
      new Request("http://localhost/api/admin/triage-anomaly-detection") as never,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasAnomalies).toBe(true);
    expect(data.anomalies).toHaveLength(1);
    expect(data.anomalies[0].type).toBe("low_auto_approve_rate");
  });
});
