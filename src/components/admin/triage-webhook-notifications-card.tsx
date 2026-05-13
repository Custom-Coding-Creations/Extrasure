"use client";

import { useEffect, useState } from "react";

interface WebhookEndpoint {
  id: string;
  url: string;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookEndpointId: string;
  eventType: string;
  statusCode?: number;
  success: boolean;
  error?: string;
  attemptNumber: number;
  deliveredAt?: string;
  createdAt: string;
}

interface WebhookStats {
  totalEndpoints: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
}

export function TriageWebhookNotificationsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [endpointsRes, statsRes] = await Promise.all([
          fetch("/api/admin/triage-webhooks?action=list"),
          fetch("/api/admin/triage-webhooks?action=stats&hoursBack=24"),
        ]);

        if (!endpointsRes.ok || !statsRes.ok) {
          throw new Error("Failed to load webhook data");
        }

        const endpointsData = (await endpointsRes.json()) as { ok: boolean; endpoints: WebhookEndpoint[] };
        const statsData = (await statsRes.json()) as { ok: boolean; stats: WebhookStats };

        setEndpoints(endpointsData.endpoints);
        setStats(statsData.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load webhook data");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const loadDeliveries = async (endpointId: string) => {
    setLoadingDeliveries(true);
    try {
      const response = await fetch(`/api/admin/triage-webhooks?action=deliveries&endpointId=${endpointId}&limit=20`);
      if (!response.ok) {
        throw new Error("Failed to load deliveries");
      }
      const data = (await response.json()) as { ok: boolean; deliveries: WebhookDelivery[] };
      setDeliveries(data.deliveries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/admin/triage-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          eventTypes: ["triage_anomaly_detected"],
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to create webhook");
      }

      // Reset form and reload data
      setUrl("");
      setShowForm(false);

      const endpointsRes = await fetch("/api/admin/triage-webhooks?action=list");
      if (endpointsRes.ok) {
        const data = (await endpointsRes.json()) as { ok: boolean; endpoints: WebhookEndpoint[] };
        setEndpoints(data.endpoints);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (endpointId: string) => {
    if (!confirm("Delete this webhook endpoint?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/triage-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          endpointId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete webhook");
      }

      const endpointsRes = await fetch("/api/admin/triage-webhooks?action=list");
      if (endpointsRes.ok) {
        const data = (await endpointsRes.json()) as { ok: boolean; endpoints: WebhookEndpoint[] };
        setEndpoints(data.endpoints);
      }

      if (selectedEndpoint === endpointId) {
        setSelectedEndpoint(null);
        setDeliveries([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Webhook Notifications</h2>
        <p className="mt-4 text-sm text-[#5d7267]">Loading webhook configuration...</p>
      </section>
    );
  }

  if (error && endpoints.length === 0 && !showForm) {
    return (
      <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
        <h2 className="text-2xl text-[#1b2f25]">Webhook Notifications</h2>
        <p className="mt-4 text-sm text-[#8a3d22]">{error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#d3c7ad] bg-[#fff9eb] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-[#1b2f25]">Webhook Notifications</h2>
          <p className="mt-1 text-sm text-[#445349]">Alert external systems when anomalies detected</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] hover:bg-[#142420]"
        >
          {showForm ? "Cancel" : "Add Webhook"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
          {submitError && (
            <div className="rounded-lg border border-[#f8d7da] bg-[#f8d7da] p-3 text-sm text-[#8a3d22]">{submitError}</div>
          )}

          <div>
            <label htmlFor="webhook-url" className="block text-xs font-semibold text-[#5d7267]">
              Webhook URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              className="mt-1 w-full rounded-lg border border-[#cbbd9f] px-3 py-2 text-sm text-[#1b2f25] placeholder-[#a8a6a0]"
            />
            <p className="mt-1 text-xs text-[#5d7267]">Must be a valid HTTPS endpoint. Receives POST requests with anomaly data.</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !url}
            className="w-full rounded-lg border border-[#1b2f25] bg-[#1b2f25] px-4 py-2 text-sm font-semibold text-[#fff9eb] hover:bg-[#142420] disabled:bg-[#d3c7ad] disabled:text-[#8a8580]"
          >
            {submitting ? "Creating..." : "Create Webhook"}
          </button>
        </form>
      )}

      {stats && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
            <p className="text-xs font-semibold text-[#5d7267]">Active Endpoints</p>
            <p className="mt-1 text-3xl font-bold text-[#20372c]">{stats.totalEndpoints}</p>
          </div>

          <div className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
            <p className="text-xs font-semibold text-[#5d7267]">Delivery Success Rate (24h)</p>
            <p className="mt-1 text-3xl font-bold text-[#20372c]">{Math.round(stats.successRate * 100)}%</p>
            <p className="mt-1 text-xs text-[#445349]">
              {stats.successfulDeliveries} successful, {stats.failedDeliveries} failed
            </p>
          </div>
        </div>
      )}

      {endpoints.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-[#1b2f25]">Configured Endpoints ({endpoints.length})</p>
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="rounded-lg border border-[#cbbd9f] bg-[#fffdf6] p-4">
              <div className="flex items-baseline justify-between">
                <div className="flex-1">
                  <p className="font-mono text-xs text-[#445349]">{endpoint.url}</p>
                  <p className="mt-1 text-xs text-[#5d7267]">
                    Events: {endpoint.eventTypes.join(", ")}
                    {endpoint.isActive ? (
                      <span className="ml-2 inline-block rounded-full bg-[#d4e8e8] px-2 py-0.5 text-[#1b5a56]">
                        active
                      </span>
                    ) : (
                      <span className="ml-2 inline-block rounded-full bg-[#f5ede0] px-2 py-0.5 text-[#5d5349]">
                        inactive
                      </span>
                    )}
                  </p>
                </div>
                <div className="ml-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEndpoint === endpoint.id) {
                        setSelectedEndpoint(null);
                      } else {
                        setSelectedEndpoint(endpoint.id);
                        void loadDeliveries(endpoint.id);
                      }
                    }}
                    className="rounded px-2 py-1 text-xs font-semibold text-[#1b2f25] hover:underline"
                  >
                    {selectedEndpoint === endpoint.id ? "Hide" : "View"} History
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(endpoint.id)}
                    className="rounded px-2 py-1 text-xs font-semibold text-[#8a3d22] hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {selectedEndpoint === endpoint.id && (
                <div className="mt-3 border-t border-[#cbbd9f] pt-3">
                  {loadingDeliveries ? (
                    <p className="text-xs text-[#5d7267]">Loading deliveries...</p>
                  ) : deliveries.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#5d7267]">Recent Deliveries</p>
                      {deliveries.slice(0, 5).map((delivery) => (
                        <div
                          key={delivery.id}
                          className={`rounded px-2 py-1 text-xs ${
                            delivery.success
                              ? "border border-[#d4e8e8] bg-[#e8f4f4] text-[#1b5a56]"
                              : "border border-[#f8d7da] bg-[#f8d7da] text-[#8a3d22]"
                          }`}
                        >
                          {delivery.success ? "✓" : "✗"} Attempt {delivery.attemptNumber} -{" "}
                          {delivery.statusCode ? `HTTP ${delivery.statusCode}` : delivery.error || "Network error"}
                          <span className="ml-2 text-[#5d7267]">{new Date(delivery.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#5d7267]">No deliveries yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {endpoints.length === 0 && !showForm && (
        <p className="mt-6 rounded-lg border border-[#d4e8e8] bg-[#e8f4f4] p-3 text-sm text-[#1b5a56]">
          No webhooks configured. Add a webhook endpoint above to receive notifications when anomalies are detected.
        </p>
      )}
    </section>
  );
}
