import { GET } from "@/app/api/ai/triage/[assessmentId]/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerApiSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    triageAssessment: {
      findUnique: jest.fn(),
    },
  },
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
      findUnique: jest.Mock;
    };
  };
};

describe("GET /api/ai/triage/[assessmentId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_TRIAGE_ENABLED = "true";
    requireAdminApiSession.mockResolvedValue(null);
    requireCustomerApiSession.mockResolvedValue(null);
    prisma.triageAssessment.findUnique.mockResolvedValue(null);
  });

  it("returns 503 when kill switch is disabled", async () => {
    process.env.AI_TRIAGE_ENABLED = "0";

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ assessmentId: "triage_1" }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Triage is temporarily unavailable" });
  });

  it("returns 401 without admin/customer auth", async () => {
    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ assessmentId: "triage_1" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns assessment for customer owner", async () => {
    requireCustomerApiSession.mockResolvedValue({ customerId: "c_1" });
    prisma.triageAssessment.findUnique.mockResolvedValue({
      id: "triage_1",
      customerId: "c_1",
      guidedAnswersJson: JSON.stringify([{ question: "Q", answer: "A" }]),
      photosJson: JSON.stringify(["https://blob.example/photo.jpg"]),
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ assessmentId: "triage_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.assessment.guidedAnswers).toEqual([{ question: "Q", answer: "A" }]);
    expect(payload.assessment.photos).toEqual(["https://blob.example/photo.jpg"]);
  });
});
