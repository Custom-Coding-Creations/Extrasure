import { GET, POST } from "@/app/api/admin/triage-retention/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
  requireAdminApiRole: jest.fn(),
}));

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock("@/lib/triage-retention", () => ({
  executeTriageRetention: jest.fn(),
}));

jest.mock("@/lib/triage-runtime", () => ({
  getTriageRuntimeSnapshot: jest.fn(() => ({
    triageEnabled: true,
    triageUiEnabled: true,
    humanReviewThreshold: 0.7,
    photoRetentionDays: 30,
    recordRetentionDays: 120,
  })),
  logTriageOperationalEvent: jest.fn(),
}));

const { requireAdminApiSession, requireAdminApiRole } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
  requireAdminApiRole: jest.Mock;
};

const { executeTriageRetention } = jest.requireMock("@/lib/triage-retention") as {
  executeTriageRetention: jest.Mock;
};

describe("admin triage retention route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
    requireAdminApiRole.mockResolvedValue({ name: "Owner", role: "owner" });
    executeTriageRetention.mockResolvedValue({
      ok: true,
      dryRun: true,
      photoRetentionDays: 30,
      recordRetentionDays: 120,
      matchedPhotoAssessmentCount: 2,
      matchedBlobUrlCount: 3,
      deletedBlobCount: 0,
      clearedPhotoReferenceCount: 0,
      deletedRecordCount: 0,
    });
  });

  it("returns runtime snapshot for authorized users", async () => {
    const response = await GET(new Request("http://localhost/api/admin/triage-retention") as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.runtime).toBeDefined();
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/triage-retention") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("runs dry-run action", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/triage-retention", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "dry_run" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(executeTriageRetention).toHaveBeenCalledWith({ dryRun: true });
  });

  it("runs execute action", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/triage-retention", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "execute" }),
      }) as never,
    );

    expect(response.status).toBe(200);
    expect(executeTriageRetention).toHaveBeenCalledWith({ dryRun: false });
  });

  it("rejects unsupported action", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/triage-retention", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "nope" }),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported action" });
  });
});
