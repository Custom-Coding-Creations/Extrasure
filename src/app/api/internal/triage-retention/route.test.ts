import { GET, POST } from "@/app/api/internal/triage-retention/route";

jest.mock("@/lib/triage-retention", () => ({
  executeTriageRetention: jest.fn(),
}));

jest.mock("@/lib/triage-runtime", () => ({
  logTriageOperationalEvent: jest.fn(),
}));

const { executeTriageRetention } = jest.requireMock("@/lib/triage-retention") as {
  executeTriageRetention: jest.Mock;
};

describe("internal triage retention route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRIAGE_RETENTION_CRON_SECRET = "secret_123";

    executeTriageRetention.mockResolvedValue({
      ok: true,
      dryRun: true,
      photoRetentionDays: 30,
      recordRetentionDays: 120,
      matchedPhotoAssessmentCount: 1,
      matchedBlobUrlCount: 2,
      deletedBlobCount: 0,
      clearedPhotoReferenceCount: 0,
      deletedRecordCount: 0,
    });
  });

  it("returns 503 when secret is not configured", async () => {
    delete process.env.TRIAGE_RETENTION_CRON_SECRET;

    const response = await POST(new Request("http://localhost/api/internal/triage-retention", { method: "POST" }) as never);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Retention endpoint is not configured" });
  });

  it("returns 401 for invalid secret", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/triage-retention", {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong_secret",
        },
      }) as never,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("supports dry-run", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/triage-retention?dryRun=1", {
        method: "POST",
        headers: {
          Authorization: "Bearer secret_123",
        },
      }) as never,
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.dryRun).toBe(true);
    expect(executeTriageRetention).toHaveBeenCalledWith({ dryRun: true });
  });

  it("executes purge with valid secret", async () => {
    executeTriageRetention.mockResolvedValue({
      ok: true,
      dryRun: false,
      photoRetentionDays: 30,
      recordRetentionDays: 120,
      matchedPhotoAssessmentCount: 1,
      matchedBlobUrlCount: 2,
      deletedBlobCount: 2,
      clearedPhotoReferenceCount: 1,
      deletedRecordCount: 4,
    });

    const response = await POST(
      new Request("http://localhost/api/internal/triage-retention", {
        method: "POST",
        headers: {
          "x-triage-retention-secret": "secret_123",
        },
      }) as never,
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.deletedBlobCount).toBe(2);
    expect(payload.deletedRecordCount).toBe(4);
    expect(executeTriageRetention).toHaveBeenCalledWith({ dryRun: false });
  });

  it("supports GET for cron invocation", async () => {
    const response = await GET(
      new Request("http://localhost/api/internal/triage-retention", {
        method: "GET",
        headers: {
          Authorization: "Bearer secret_123",
        },
      }) as never,
    );

    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });
});
