import { GET } from "@/app/api/admin/audit-events/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    auditEvent: {
      findMany: jest.fn(),
    },
  },
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    auditEvent: {
      findMany: jest.Mock;
    };
  };
};

describe("GET /api/admin/audit-events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
    prisma.auditEvent.findMany.mockResolvedValue([]);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/audit-events?action=test") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when action parameter is missing", async () => {
    const response = await GET(new Request("http://localhost/api/admin/audit-events") as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing 'action' parameter" });
  });

  it("returns audit events filtered by action", async () => {
    prisma.auditEvent.findMany.mockResolvedValue([
      {
        id: "audit_1",
        actor: "Owner",
        action: "triage_retention_run",
        timestamp: new Date("2026-05-13T10:00:00Z"),
        after: JSON.stringify({
          action: "dry_run",
          dryRun: true,
          deletedBlobCount: 0,
          deletedRecordCount: 0,
          matchedPhotoAssessmentCount: 5,
        }),
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/admin/audit-events?action=triage_retention_run") as never,
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.events).toHaveLength(1);
    expect(payload.events[0].actor).toBe("Owner");
    expect(payload.events[0].after.dryRun).toBe(true);
  });

  it("respects limit parameter", async () => {
    prisma.auditEvent.findMany.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/admin/audit-events?action=test&limit=10") as never,
    );

    expect(response.status).toBe(200);
    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      }),
    );
  });

  it("caps limit parameter at 100", async () => {
    prisma.auditEvent.findMany.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/admin/audit-events?action=test&limit=500") as never,
    );

    expect(response.status).toBe(200);
    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      }),
    );
  });

  it("orders events by timestamp descending", async () => {
    prisma.auditEvent.findMany.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/admin/audit-events?action=test") as never,
    );

    expect(response.status).toBe(200);
    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          timestamp: "desc",
        },
      }),
    );
  });
});
