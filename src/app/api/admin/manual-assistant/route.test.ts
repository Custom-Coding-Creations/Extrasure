import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/manual-assistant/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/admin-manual-knowledge", () => ({
  buildAdminManualKnowledgeContext: jest.fn(),
}));

jest.mock("@/lib/admin-manual-retrieval", () => ({
  retrieveAdminManualContext: jest.fn(),
}));

jest.mock("@/lib/admin-manual-assistant-analytics", () => ({
  recordAdminManualAssistantResponseMode: jest.fn(() => ({
    modeCount: 1,
    totalResponses: 1,
    modeCounts: { "dns-clarifier": 1 },
  })),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { buildAdminManualKnowledgeContext } = jest.requireMock("@/lib/admin-manual-knowledge") as {
  buildAdminManualKnowledgeContext: jest.Mock;
};

const { retrieveAdminManualContext } = jest.requireMock("@/lib/admin-manual-retrieval") as {
  retrieveAdminManualContext: jest.Mock;
};

const { recordAdminManualAssistantResponseMode } = jest.requireMock("@/lib/admin-manual-assistant-analytics") as {
  recordAdminManualAssistantResponseMode: jest.Mock;
};

describe("POST /api/admin/manual-assistant", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;

    requireAdminApiSession.mockResolvedValue({
      adminId: "owner_1",
      role: "owner",
    });

    recordAdminManualAssistantResponseMode.mockClear();
    global.fetch = originalFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns a balanced clarification when request is in-scope but weakly grounded", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "I need to change my dns records",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      ok: boolean;
      answer: string;
      mode: string;
      scope: { inScope: boolean };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.scope.inScope).toBe(true);
    expect(payload.mode).toBe("dns-clarifier");
    expect(recordAdminManualAssistantResponseMode).toHaveBeenCalledWith("dns-clarifier");
    expect(payload.answer).toContain("Extrasure-specific DNS sequence");
    expect(payload.answer).toContain("Vercel project domain routing");
  });

  it("returns grounded fallback context when retrieval confidence is strong", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "medium",
      contextText: "1. DNS and domain basics\nSummary: Use Vercel project domain settings.",
      sourceTitles: ["DNS and domain basics"],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [
        {
          id: "docs/1",
          path: "README.md",
          title: "README.md",
          text: "Confirm SITE_URL and NEXT_PUBLIC_SITE_URL.",
          score: 7,
        },
      ],
      contextText: "1. [README.md] Confirm SITE_URL and NEXT_PUBLIC_SITE_URL.",
      sourcePaths: ["README.md"],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "How should I handle a domain routing change?",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
      scope: { inScope: boolean };
      sourcePaths: string[];
    };

    expect(response.status).toBe(200);
    expect(payload.scope.inScope).toBe(true);
    expect(payload.mode).toBe("grounded-fallback");
    expect(recordAdminManualAssistantResponseMode).toHaveBeenCalledWith("grounded-fallback");
    expect(payload.sourcePaths).toEqual(["README.md"]);
    expect(payload.answer).toContain("Here is what the internal operations manual says");
    expect(payload.answer).toContain("SITE_URL and NEXT_PUBLIC_SITE_URL");
  });

  it("returns out-of-scope guidance for unrelated questions", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "write me a haiku about sunsets",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
      scope: { inScope: boolean };
    };

    expect(response.status).toBe(200);
    expect(payload.scope.inScope).toBe(false);
    expect(payload.mode).toBe("out-of-scope");
    expect(recordAdminManualAssistantResponseMode).toHaveBeenCalledWith("out-of-scope");
    expect(payload.answer).toContain("outside this assistant's scope");
  });

  it("returns response even when mode telemetry recording fails", async () => {
    recordAdminManualAssistantResponseMode.mockRejectedValueOnce(new Error("telemetry offline"));

    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "I need to change my dns records",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      ok: boolean;
      mode: string;
      modeCount: number;
      totalResponses: number;
      modeCounts: Record<string, number>;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.mode).toBe("dns-clarifier");
    expect(payload.modeCount).toBe(0);
    expect(payload.totalResponses).toBe(0);
    expect(payload.modeCounts).toEqual({});
  });

  it("falls back cleanly when OpenAI request throws", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("network timeout")) as unknown as typeof fetch;

    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "medium",
      contextText: "1. System architecture overview\nSummary: Core routes are in src/app/api.",
      sourceTitles: ["System architecture overview"],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [
        {
          id: "docs/1",
          path: "README.md",
          title: "README.md",
          text: "Admin API routes live under src/app/api/admin.",
          score: 8,
        },
      ],
      contextText: "1. [README.md] Admin API routes live under src/app/api/admin.",
      sourcePaths: ["README.md"],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Where do I find the code for admin API routes?",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      ok: boolean;
      answer: string;
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.mode).toBe("grounded-fallback");
    expect(payload.answer).toContain("Here is what the internal operations manual says");
  });

  it("uses Extrasure-specific clarification for DNS conversation and avoids generic registrar playbooks", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "I need to change my dns records",
        history: [
          {
            role: "assistant",
            content: "Hi, I am your operations helper. Ask me how this system works in plain language, and I will explain step by step.",
          },
          {
            role: "user",
            content: "I need to change my dns records",
          },
        ],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("dns-clarifier");
    expect(payload.answer).toContain("Extrasure-specific DNS sequence");
    expect(payload.answer).toContain("Vercel project domain routing");
    expect(payload.answer).toContain("SITE_URL or NEXT_PUBLIC_SITE_URL");
    expect(payload.answer).not.toContain("GoDaddy");
    expect(payload.answer).not.toContain("Namecheap");
    expect(payload.answer).not.toContain("WhatsMyDNS");
  });

  it("uses deployment-specific clarification when deployment context is weak", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "our deployment failed after merge",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("deploy-clarifier");
    expect(payload.answer).toContain("Extrasure deployment runbook");
    expect(payload.answer).toContain("failed Vercel build");
    expect(payload.answer).toContain("latest Vercel deployment logs");
  });

  it("uses payment and webhook specific clarification when billing context is weak", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "our stripe webhook updates are missing",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("billing-clarifier");
    expect(payload.answer).toContain("Extrasure payment troubleshooting sequence");
    expect(payload.answer).toContain("missing Stripe webhook update");
    expect(payload.answer).toContain("webhook processing as source of truth");
  });

  it("uses auth-specific clarification when sign-in context is weak", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "admin login keeps failing after oauth change",
        history: [],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("auth-clarifier");
    expect(payload.answer).toContain("Extrasure auth flow");
    expect(payload.answer).toContain("Google/Microsoft OAuth callback");
    expect(payload.answer).toContain("ADMIN_AUTH_SECRET or CUSTOMER_AUTH_SECRET");
  });

  it("does not repeat the same DNS clarifier after the user already provided routing context", async () => {
    buildAdminManualKnowledgeContext.mockReturnValue({
      confidence: "low",
      contextText: "",
      sourceTitles: [],
    });

    retrieveAdminManualContext.mockResolvedValue({
      matches: [],
      contextText: "",
      sourcePaths: [],
    });

    const req = new NextRequest("https://example.com/api/admin/manual-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "I need to change my dns records",
        history: [
          {
            role: "assistant",
            content: "Are you updating Vercel project domain routing, or only DNS records at your registrar/provider?",
          },
          {
            role: "user",
            content: "I am updating Vercel domain routing on production.",
          },
        ],
      }),
    });

    const response = await POST(req);
    const payload = (await response.json()) as {
      answer: string;
      mode: string;
    };

    expect(response.status).toBe(200);
    expect(payload.mode).toBe("dns-guided");
    expect(payload.answer).toContain("Thanks, that detail is enough to proceed");
    expect(payload.answer).not.toContain("Are you updating Vercel project domain routing");
  });
});
