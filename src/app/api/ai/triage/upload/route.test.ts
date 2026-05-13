import { POST } from "@/app/api/ai/triage/upload/route";

jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
}));

jest.mock("@/lib/customer-auth", () => ({
  requireCustomerApiSession: jest.fn(),
}));

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  getRequestIp: jest.fn(() => "127.0.0.1"),
  checkRateLimit: jest.fn(() => ({ ok: true, remaining: 5, resetAt: Date.now() + 60_000 })),
}));

const { put } = jest.requireMock("@vercel/blob") as {
  put: jest.Mock;
};

const { requireCustomerApiSession } = jest.requireMock("@/lib/customer-auth") as {
  requireCustomerApiSession: jest.Mock;
};

describe("POST /api/ai/triage/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_TRIAGE_ENABLED = "true";
    process.env.BLOB_READ_WRITE_TOKEN = "blob_test_token";
    requireCustomerApiSession.mockResolvedValue({
      customerId: "c_1",
      email: "customer@example.com",
    });
    put.mockResolvedValue({
      url: "https://blob.example.com/file.jpg",
      pathname: "triage/c_1/file.jpg",
    });
  });

  it("returns 401 when no customer session", async () => {
    requireCustomerApiSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/ai/triage/upload", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects unsupported mime types", async () => {
    const formData = new FormData();
    formData.append("files", new File(["malware"], "script.exe", { type: "application/x-msdownload" }));

    const request = new Request("http://localhost/api/ai/triage/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported file type: application/x-msdownload" });
  });

  it("uploads image files and returns customer-scoped blobs", async () => {
    const formData = new FormData();
    formData.append("files", new File(["abc"], "evidence.jpg", { type: "image/jpeg" }));

    const request = new Request("http://localhost/api/ai/triage/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.customerId).toBe("c_1");
    expect(payload.files).toHaveLength(1);
    expect(put).toHaveBeenCalled();
  });

  it("returns 503 when triage kill switch is disabled", async () => {
    process.env.AI_TRIAGE_ENABLED = "off";

    const request = new Request("http://localhost/api/ai/triage/upload", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Triage is temporarily unavailable" });
  });
});
