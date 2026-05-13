import {
  sendWebhookNotification,
  createWebhookEndpoint,
  getWebhookEndpoints,
  deleteWebhookEndpoint,
  getWebhookStats,
} from "@/lib/triage-webhook-notifications";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    webhookEndpoint: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    webhookDelivery: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    webhookEndpoint: {
      findMany: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    webhookDelivery: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };
};

describe("triage webhook notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("createWebhookEndpoint", () => {
    it("creates a webhook endpoint with valid URL", async () => {
      const endpoint = {
        id: "webhook_1",
        url: "https://example.com/webhook",
        eventTypes: ["triage_anomaly_detected"],
        isActive: true,
        createdAt: new Date(),
      };
      prisma.webhookEndpoint.create.mockResolvedValue(endpoint);

      const result = await createWebhookEndpoint("https://example.com/webhook", ["triage_anomaly_detected"]);

      expect(result).toEqual(endpoint);
      expect(prisma.webhookEndpoint.create).toHaveBeenCalled();
    });

    it("rejects invalid URL", async () => {
      await expect(createWebhookEndpoint("not-a-url", ["triage_anomaly_detected"])).rejects.toThrow(
        "Invalid webhook URL",
      );
    });
  });

  describe("getWebhookEndpoints", () => {
    it("returns all active webhook endpoints", async () => {
      const endpoints = [
        {
          id: "webhook_1",
          url: "https://example.com/webhook",
          eventTypes: ["triage_anomaly_detected"],
          isActive: true,
          createdAt: new Date(),
        },
      ];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);

      const result = await getWebhookEndpoints();

      expect(result).toEqual(endpoints);
      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("deleteWebhookEndpoint", () => {
    it("deletes a webhook endpoint", async () => {
      await deleteWebhookEndpoint("webhook_1");

      expect(prisma.webhookEndpoint.delete).toHaveBeenCalledWith({
        where: { id: "webhook_1" },
      });
    });
  });

  describe("getWebhookStats", () => {
    it("calculates webhook statistics", async () => {
      prisma.webhookEndpoint.count.mockResolvedValue(2);
      prisma.webhookDelivery.findMany.mockResolvedValue([
        {
          id: "delivery_1",
          webhookEndpointId: "webhook_1",
          eventType: "triage_anomaly_detected",
          statusCode: 200,
          success: true,
          error: null,
          payload: {},
          attemptNumber: 1,
          nextRetryAt: null,
          deliveredAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: "delivery_2",
          webhookEndpointId: "webhook_1",
          eventType: "triage_anomaly_detected",
          statusCode: null,
          success: false,
          error: "Timeout",
          payload: {},
          attemptNumber: 1,
          nextRetryAt: null,
          deliveredAt: null,
          createdAt: new Date(),
        },
      ]);

      const stats = await getWebhookStats(24);

      expect(stats.totalEndpoints).toBe(2);
      expect(stats.successfulDeliveries).toBe(1);
      expect(stats.failedDeliveries).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.5, 1);
    });

    it("handles zero deliveries", async () => {
      prisma.webhookEndpoint.count.mockResolvedValue(1);
      prisma.webhookDelivery.findMany.mockResolvedValue([]);

      const stats = await getWebhookStats(24);

      expect(stats.totalEndpoints).toBe(1);
      expect(stats.successfulDeliveries).toBe(0);
      expect(stats.failedDeliveries).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe("sendWebhookNotification", () => {
    it("sends webhook to all matching endpoints", async () => {
      const endpoints = [
        {
          id: "webhook_1",
          url: "https://example.com/webhook",
          eventTypes: ["triage_anomaly_detected"],
          isActive: true,
          createdAt: new Date(),
        },
      ];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      prisma.webhookDelivery.create.mockResolvedValue({
        id: "delivery_1",
        webhookEndpointId: "webhook_1",
        eventType: "triage_anomaly_detected",
        statusCode: 200,
        success: true,
      });

      await sendWebhookNotification({
        event: "triage_anomaly_detected",
        timestamp: new Date().toISOString(),
        data: { anomalies: 1 },
      });

      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          eventTypes: {
            has: "triage_anomaly_detected",
          },
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.com/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      expect(prisma.webhookDelivery.create).toHaveBeenCalled();
    });

    it("handles failed webhook deliveries", async () => {
      const endpoints = [
        {
          id: "webhook_1",
          url: "https://example.com/webhook",
          eventTypes: ["triage_anomaly_detected"],
          isActive: true,
          createdAt: new Date(),
        },
      ];
      prisma.webhookEndpoint.findMany.mockResolvedValue(endpoints);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });
      prisma.webhookDelivery.create.mockResolvedValue({
        id: "delivery_1",
        webhookEndpointId: "webhook_1",
        eventType: "triage_anomaly_detected",
        statusCode: 500,
        success: false,
      });

      await sendWebhookNotification({
        event: "triage_anomaly_detected",
        timestamp: new Date().toISOString(),
        data: { anomalies: 1 },
      });

      expect(prisma.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            success: false,
            statusCode: 500,
          }),
        }),
      );
    });

    it("skips inactive endpoints", async () => {
      prisma.webhookEndpoint.findMany.mockResolvedValue([]);

      await sendWebhookNotification({
        event: "triage_anomaly_detected",
        timestamp: new Date().toISOString(),
        data: { anomalies: 1 },
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
