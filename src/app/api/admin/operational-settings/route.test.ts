import { GET, POST } from "@/app/api/admin/operational-settings/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
  requireAdminApiRole: jest.fn(),
}));

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

jest.mock("@/lib/admin-operational-settings", () => ({
  getOperationalSettings: jest.fn(),
  setTriageKillSwitch: jest.fn(),
  setTriageHumanReviewThreshold: jest.fn(),
}));

jest.mock("@/lib/triage-runtime", () => ({
  logTriageOperationalEvent: jest.fn(),
}));

const { requireAdminApiSession, requireAdminApiRole } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
  requireAdminApiRole: jest.Mock;
};

const { getOperationalSettings, setTriageKillSwitch, setTriageHumanReviewThreshold } = jest.requireMock(
  "@/lib/admin-operational-settings",
) as {
  getOperationalSettings: jest.Mock;
  setTriageKillSwitch: jest.Mock;
  setTriageHumanReviewThreshold: jest.Mock;
};

describe("admin operational settings route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
    requireAdminApiRole.mockResolvedValue({ name: "Owner", role: "owner" });
    getOperationalSettings.mockResolvedValue({
      triageKillSwitchDisabled: false,
      triageHumanReviewThreshold: 0.7,
      updatedAt: new Date(),
      updatedBy: null,
    });
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      requireAdminApiSession.mockResolvedValue(null);

      const response = await GET(new Request("http://localhost/api/admin/operational-settings") as never);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 403 when unauthorized role", async () => {
      requireAdminApiRole.mockResolvedValue(null);

      const response = await GET(new Request("http://localhost/api/admin/operational-settings") as never);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Forbidden" });
    });

    it("returns current operational settings", async () => {
      const response = await GET(new Request("http://localhost/api/admin/operational-settings") as never);

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
      expect(payload.settings).toBeDefined();
      expect(payload.settings.triageKillSwitchDisabled).toBe(false);
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      requireAdminApiSession.mockResolvedValue(null);

      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "disable" }),
        }) as never,
      );

      expect(response.status).toBe(401);
    });

    it("returns 403 when not owner", async () => {
      requireAdminApiRole.mockResolvedValue(null);

      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "disable" }),
        }) as never,
      );

      expect(response.status).toBe(403);
    });

    it("returns 400 for invalid JSON", async () => {
      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "invalid json",
        }) as never,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid JSON payload" });
    });

    it("returns 400 for unsupported action", async () => {
      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "nope" }),
        }) as never,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Unsupported action" });
    });

    it("disables triage via kill switch", async () => {
      setTriageKillSwitch.mockResolvedValue({
        triageKillSwitchDisabled: true,
        triageHumanReviewThreshold: 0.7,
        updatedAt: new Date(),
        updatedBy: "Owner",
      });

      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "disable" }),
        }) as never,
      );

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
      expect(payload.settings.triageKillSwitchDisabled).toBe(true);
      expect(setTriageKillSwitch).toHaveBeenCalledWith(true, "Owner");
    });

    it("enables triage (clears kill switch)", async () => {
      setTriageKillSwitch.mockResolvedValue({
        triageKillSwitchDisabled: false,
        triageHumanReviewThreshold: 0.7,
        updatedAt: new Date(),
        updatedBy: "Owner",
      });

      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "enable" }),
        }) as never,
      );

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
      expect(payload.settings.triageKillSwitchDisabled).toBe(false);
      expect(setTriageKillSwitch).toHaveBeenCalledWith(false, "Owner");
    });

    it("adjusts threshold", async () => {
      setTriageHumanReviewThreshold.mockResolvedValue({
        triageKillSwitchDisabled: false,
        triageHumanReviewThreshold: 0.85,
        updatedAt: new Date(),
        updatedBy: "Owner",
      });

      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "set_threshold", threshold: 0.85 }),
        }) as never,
      );

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.ok).toBe(true);
      expect(payload.settings.triageHumanReviewThreshold).toBe(0.85);
      expect(setTriageHumanReviewThreshold).toHaveBeenCalledWith(0.85, "Owner");
    });

    it("rejects set_threshold without threshold parameter", async () => {
      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "set_threshold" }),
        }) as never,
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(
        expect.objectContaining({
          error: expect.stringContaining("threshold parameter"),
        }),
      );
    });

    it("clamps threshold to 0-1 range", async () => {
      setTriageHumanReviewThreshold.mockResolvedValue({
        triageKillSwitchDisabled: false,
        triageHumanReviewThreshold: 1.0,
        updatedAt: new Date(),
        updatedBy: "Owner",
      });

      const response = await POST(
        new Request("http://localhost/api/admin/operational-settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "set_threshold", threshold: 1.5 }),
        }) as never,
      );

      expect(response.status).toBe(200);
      expect(setTriageHumanReviewThreshold).toHaveBeenCalledWith(1.5, "Owner");
    });
  });
});
