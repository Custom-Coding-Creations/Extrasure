import { GET, POST } from "@/app/api/admin/triage-webhooks/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
}));

jest.mock("@/lib/triage-webhook-notifications", () => ({
  createWebhookEndpoint: jest.fn(),
  getWebhookEndpoints: jest.fn(),
  deleteWebhookEndpoint: jest.fn(),
  getWebhookStats: jest.fn(),
  getWebhookDeliveryHistory: jest.fn(),
}));

jest.mock("@/lib/audit-log", () => ({
  recordAuditEvent: jest.fn(),
}));

const { requireAdminApiSession } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
};

const { createWebhookEndpoint, getWebhookEndpoints, deleteWebhookEndpoint, getWebhookStats, getWebhookDeliveryHistory } =
  jest.requireMock("@/lib/triage-webhook-notifications") as {
    createWebhookEndpoint: jest.Mock;
    getWebhookEndpoints: jest.Mock;
    deleteWebhookEndpoint: jest.Mock;
    getWebhookStats: jest.Mock;
    getWebhookDeliveryHistory: jest.Mock;
  };

describe("GET /api/admin/triage-webhooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Owner", role: "owner" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/triage-webhooks") as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns webhook endpoints list", async () => {
    const endpoints = [
      {
        id: "webhook_1",
        url: "https://example.com/webhook",
        eventTypes: ["triage_anomaly_detected"],
        isActive: true,
        createdAt: new Date(),
      },
    ];
    getWebhookEndpoints.mockResolvedValue(endpoints);

    const response = await GET(new Request("http://localhost/api/admin/triage-webhooks?action=list") as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.endpoints.length).toBe(1);
    expect(data.endpoints[0].id).toBe("webhook_1");
    expect(data.endpoints[0].url).toBe("https://example.com/webhook");
  });

  it("returns webhook statistics", async () => {
    const stats = {
      totalEndpoints: 1,
      successfulDeliveries: 10,
      failedDeliveries: 2,
      successRate: 0.83,
    };
    getWebhookStats.mockResolvedValue(stats);

    const response = await GET(new Request("http://localhost/api/admin/triage-webhooks?action=stats&hoursBack=24") as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.stats).toEqual(stats);
    expect(getWebhookStats).toHaveBeenCalledWith(24);
  });

  it("returns delivery history for endpoint", async () => {
    const deliveries = [
      {
        id: "delivery_1",
        webhookEndpointId: "webhook_1",
        eventType: "triage_anomaly_detected",
        statusCode: 200,
        success: true,
        createdAt: new Date(),
      },
    ];
    getWebhookDeliveryHistory.mockResolvedValue(deliveries);

    const response = await GET(
      new Request("http://localhost/api/admin/triage-webhooks?action=deliveries&endpointId=webhook_1&limit=20") as never,
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
      expect(data.deliveries.length).toBe(1);
      expect(data.deliveries[0].id).toBe("delivery_1");
      expect(data.deliveries[0].statusCode).toBe(200);
      expect(data.deliveries[0].success).toBe(true);
    expect(getWebhookDeliveryHistory).toHaveBeenCalledWith("webhook_1", 20);
  });

  it("returns error for invalid action", async () => {
    const response = await GET(new Request("http://localhost/api/admin/triage-webhooks?action=invalid") as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid action" });
  });
});

describe("POST /api/admin/triage-webhooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ name: "Admin User", role: "owner" });
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdminApiSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({}),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when non-owner user", async () => {
    requireAdminApiSession.mockResolvedValue({ name: "Accountant", role: "accountant" });

    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({}),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("creates webhook endpoint", async () => {
    const endpoint = {
      id: "webhook_1",
      url: "https://example.com/webhook",
      eventTypes: ["triage_anomaly_detected"],
      isActive: true,
      createdAt: new Date(),
    };
    createWebhookEndpoint.mockResolvedValue(endpoint);

    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/webhook",
        eventTypes: ["triage_anomaly_detected"],
      }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
      expect(data.endpoint.id).toBe("webhook_1");
      expect(data.endpoint.url).toBe("https://example.com/webhook");
      expect(data.endpoint.isActive).toBe(true);
  });

  it("deletes webhook endpoint", async () => {
    deleteWebhookEndpoint.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        endpointId: "webhook_1",
      }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(deleteWebhookEndpoint).toHaveBeenCalledWith("webhook_1");
  });

  it("returns error when required fields missing", async () => {
    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/webhook" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("returns error when delete missing endpointId", async () => {
    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({ action: "delete" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing endpointId");
  });

  it("handles webhook creation errors", async () => {
    createWebhookEndpoint.mockRejectedValue(new Error("Invalid URL"));

    const request = new Request("http://localhost/api/admin/triage-webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "not-a-url",
        eventTypes: ["triage_anomaly_detected"],
      }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid URL");
  });
});
