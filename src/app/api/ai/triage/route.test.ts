import { POST } from "@/app/api/ai/triage/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerApiSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    triageAssessment: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/admin-store", () => ({
  queueTriageRetentionAutomationEvents: jest.fn(),
}));

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock("@/lib/ai-triage-routing", () => ({
  routeTriageTranscript: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  getRequestIp: jest.fn(() => "127.0.0.1"),
  checkRateLimit: jest.fn(() => ({ ok: true, remaining: 5, resetAt: Date.now() + 60_000 })),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { requireCustomerApiSession } = jest.requireMock("@/lib/customer-auth") as {
  requireCustomerApiSession: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    triageAssessment: {
      create: jest.Mock;
    };
  };
};

const { queueTriageRetentionAutomationEvents } = jest.requireMock("@/lib/admin-store") as {
  queueTriageRetentionAutomationEvents: jest.Mock;
};

describe("POST /api/ai/triage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    process.env.AI_TRIAGE_ENABLED = "true";
    requireAdminApiSession.mockResolvedValue(null);
    requireCustomerApiSession.mockResolvedValue(null);
    prisma.triageAssessment.create.mockResolvedValue({
      id: "triage_1",
      urgency: "urgent",
      severity: "high",
      needsFollowUp: true,
    });
    queueTriageRetentionAutomationEvents.mockResolvedValue([]);
  });

  it("returns 400 for missing message", async () => {
    const request = new Request("http://localhost/api/ai/triage", {
      method: "POST",
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "message is required" });
  });

  it("returns deterministic fallback output when unauthenticated", async () => {
    const request = new Request("http://localhost/api/ai/triage", {
      method: "POST",
      body: JSON.stringify({
        message: "I saw droppings near the stove and walls last night",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.persisted).toBe(false);
    expect(payload.assessmentId).toBeNull();
    expect(payload.triage.likelyPest).toContain("Rodent");
    expect(payload.requiresHumanReview).toBe(true);
    expect(payload.humanReviewThreshold).toBe(0.7);
  });

  it("persists triage output when customer session exists", async () => {
    requireCustomerApiSession.mockResolvedValue({
      customerId: "c_1",
      email: "customer@example.com",
    });

    const request = new Request("http://localhost/api/ai/triage", {
      method: "POST",
      body: JSON.stringify({
        message: "urgent bites overnight in bedroom",
        answers: [{ question: "Where", answer: "bedroom" }],
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.persisted).toBe(true);
    expect(payload.assessmentId).toBe("triage_1");
    expect(prisma.triageAssessment.create).toHaveBeenCalled();
    expect(queueTriageRetentionAutomationEvents).toHaveBeenCalled();
  });

  it("returns 503 when triage kill switch is disabled", async () => {
    process.env.AI_TRIAGE_ENABLED = "false";

    const request = new Request("http://localhost/api/ai/triage", {
      method: "POST",
      body: JSON.stringify({
        message: "test",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await POST(request as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Triage is temporarily unavailable" });
  });
});
