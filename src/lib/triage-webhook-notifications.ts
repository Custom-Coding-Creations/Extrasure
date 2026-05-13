import { prisma } from "@/lib/prisma";

export type WebhookEventType = "triage_anomaly_detected";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  eventTypes: WebhookEventType[];
  isActive: boolean;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookEndpointId: string;
  eventType: WebhookEventType;
  statusCode?: number;
  success: boolean;
  error?: string;
  payload: WebhookPayload;
  attemptNumber: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 5000, 30000]; // 1s, 5s, 30s

/**
 * Send a webhook notification with automatic retry logic
 */
export async function sendWebhookNotification(
  payload: WebhookPayload,
  attemptNumber: number = 1,
): Promise<void> {
  try {
    // Find all active endpoints that accept this event type
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        isActive: true,
        eventTypes: {
          has: payload.event,
        },
      },
    });

    for (const endpoint of endpoints) {
      await deliverWebhookToEndpoint(endpoint, payload, attemptNumber);
    }
  } catch (err) {
    console.error("Error sending webhook notifications:", err);
  }
}

/**
 * Deliver webhook to a specific endpoint with retry tracking
 */
async function deliverWebhookToEndpoint(
  endpoint: { id: string; url: string },
  payload: WebhookPayload,
  attemptNumber: number,
): Promise<void> {
  let success = false;
  let statusCode: number | undefined;
  let error: string | undefined;

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Extrasure-Triage-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    statusCode = response.status;
    success = response.ok;

    if (!response.ok) {
      error = `HTTP ${response.status}`;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  // Record delivery attempt
  let nextRetryAt: Date | null = null;
  if (!success && attemptNumber < MAX_RETRIES) {
    const delayMs = RETRY_DELAYS_MS[attemptNumber - 1];
    nextRetryAt = new Date(Date.now() + delayMs);
  }

  await prisma.webhookDelivery.create({
    data: {
      webhookEndpointId: endpoint.id,
      eventType: payload.event,
      statusCode,
      success,
      error,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: payload as any,
      attemptNumber,
      nextRetryAt,
      deliveredAt: success ? new Date() : null,
    },
  });

  // Schedule retry if needed
  if (!success && attemptNumber < MAX_RETRIES && nextRetryAt) {
    // In production, this would be handled by a background job queue
    // For now, we schedule a simple delayed retry
    setTimeout(() => {
      void sendWebhookNotificationRetry(endpoint.id, payload, attemptNumber + 1);
    }, RETRY_DELAYS_MS[attemptNumber - 1]);
  }
}

/**
 * Internal retry handler for failed deliveries
 */
async function sendWebhookNotificationRetry(
  endpointId: string,
  payload: WebhookPayload,
  attemptNumber: number,
): Promise<void> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    return;
  }

  await deliverWebhookToEndpoint(endpoint, payload, attemptNumber);
}

/**
 * Create a new webhook endpoint
 */
export async function createWebhookEndpoint(
  url: string,
  eventTypes: WebhookEventType[],
): Promise<WebhookEndpoint> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid webhook URL");
  }

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      url,
      eventTypes,
      isActive: true,
    },
  });

  return endpoint;
}

/**
 * Get all webhook endpoints
 */
export async function getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  return prisma.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await prisma.webhookEndpoint.delete({
    where: { id },
  });
}

/**
 * Get delivery history for an endpoint
 */
export async function getWebhookDeliveryHistory(endpointId: string, limit: number = 50): Promise<WebhookDelivery[]> {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookEndpointId: endpointId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

    return deliveries.map((d: typeof deliveries[number]) => ({
    id: d.id,
    webhookEndpointId: d.webhookEndpointId,
    eventType: d.eventType as WebhookEventType,
    statusCode: d.statusCode ?? undefined,
    success: d.success,
    error: d.error ?? undefined,
      payload: d.payload as unknown as WebhookPayload,
    attemptNumber: d.attemptNumber,
    nextRetryAt: d.nextRetryAt ?? undefined,
    deliveredAt: d.deliveredAt ?? undefined,
    createdAt: d.createdAt,
  }));
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(hoursBack: number = 24): Promise<{
  totalEndpoints: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageResponseTime: number;
}> {
  const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const [endpoints, deliveries] = await Promise.all([
    prisma.webhookEndpoint.count({ where: { isActive: true } }),
    prisma.webhookDelivery.findMany({
      where: {
        createdAt: { gte: startDate },
      },
    }),
  ]);

  const successful = deliveries.filter((d: typeof deliveries[number]) => d.success).length;
  const failed = deliveries.filter((d: typeof deliveries[number]) => !d.success).length;
  const total = successful + failed;

  return {
    totalEndpoints: endpoints,
    successfulDeliveries: successful,
    failedDeliveries: failed,
    successRate: total > 0 ? successful / total : 0,
    averageResponseTime: 0, // TODO: track response times in future
  };
}
