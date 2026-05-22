import { POST } from "@/app/api/ai/chat/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/chatbot-operations", () => ({
  executeChatbotOperation: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  getRequestIp: jest.fn(),
  checkRateLimit: jest.fn(),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { executeChatbotOperation } = jest.requireMock("@/lib/chatbot-operations") as {
  executeChatbotOperation: jest.Mock;
};

const { getRequestIp, checkRateLimit } = jest.requireMock("@/lib/rate-limit") as {
  getRequestIp: jest.Mock;
  checkRateLimit: jest.Mock;
};

describe("POST /api/ai/chat operation mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_TRANSCRIPT_WEBHOOK_URL;

    requireAdminApiSession.mockResolvedValue({
      name: "Owner",
      role: "owner",
      exp: Date.now() + 60_000,
    });
    getRequestIp.mockReturnValue("127.0.0.1");
    checkRateLimit.mockReturnValue({ ok: true, remaining: 10, resetAt: Date.now() + 60_000 });

    executeChatbotOperation.mockResolvedValue({
      action: "list_technicians",
      status: "success",
      requiresConfirmation: false,
      message: "list_technicians completed successfully.",
      result: {
        technicians: [],
      },
    });
  });

  it("accepts operation-only payload without message", async () => {
    const request = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "chat_1",
        operation: {
          action: "list_technicians",
        },
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.operation).toEqual(
      expect.objectContaining({
        action: "list_technicians",
        status: "success",
      }),
    );
    expect(requireAdminApiSession).toHaveBeenCalled();
    expect(executeChatbotOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: expect.objectContaining({
          action: "list_technicians",
        }),
      }),
    );
  });

  it("returns 400 when both message and operation are missing", async () => {
    const request = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "chat_2",
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "Message is required when operation is not provided",
    });
  });

  it("returns 429 when operation rate limit is exceeded", async () => {
    checkRateLimit.mockReturnValue({ ok: false, remaining: 0, resetAt: Date.now() + 60_000 });

    const request = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "chat_3",
        operation: {
          action: "list_technicians",
        },
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toEqual(
      expect.objectContaining({
        error: "Too many operation requests. Please try again shortly.",
      }),
    );
    expect(executeChatbotOperation).not.toHaveBeenCalled();
  });

  it("returns 401 when operation mode has no admin session", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "chat_4",
        operation: {
          action: "list_technicians",
        },
      }),
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
    expect(executeChatbotOperation).not.toHaveBeenCalled();
  });
});
