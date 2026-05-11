import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/payments/route";

jest.mock("@/lib/admin-auth", () => ({
  requireAdminApiSession: jest.fn(),
  requireAdminApiRole: jest.fn(),
}));

jest.mock("@/lib/admin-store", () => ({
  getAdminState: jest.fn(),
}));

jest.mock("@/lib/stripe-billing", () => ({
  createCustomerPaymentLink: jest.fn(),
  createBillingPortalSession: jest.fn(),
  createInvoiceCheckoutSession: jest.fn(),
  createStripeInvoiceForLocalInvoice: jest.fn(),
  finalizeStripeInvoiceForLocalInvoice: jest.fn(),
  getStripeInvoiceDocumentLinks: jest.fn(),
  replayLatestWebhookForInvoice: jest.fn(),
  replayWebhookEventById: jest.fn(),
  reconcileInvoiceFromStripe: jest.fn(),
  setCustomerSubscriptionLifecycle: jest.fn(),
  refundPaymentById: jest.fn(),
}));

const { requireAdminApiSession, requireAdminApiRole } = jest.requireMock("@/lib/admin-auth") as {
  requireAdminApiSession: jest.Mock;
  requireAdminApiRole: jest.Mock;
};

const {
  replayLatestWebhookForInvoice,
  replayWebhookEventById,
  setCustomerSubscriptionLifecycle,
  finalizeStripeInvoiceForLocalInvoice,
  getStripeInvoiceDocumentLinks,
} = jest.requireMock("@/lib/stripe-billing") as {
  replayLatestWebhookForInvoice: jest.Mock;
  replayWebhookEventById: jest.Mock;
  setCustomerSubscriptionLifecycle: jest.Mock;
  finalizeStripeInvoiceForLocalInvoice: jest.Mock;
  getStripeInvoiceDocumentLinks: jest.Mock;
};

function createJsonRequest(payload: unknown) {
  return new NextRequest("https://example.com/api/admin/payments", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("POST /api/admin/payments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminApiSession.mockResolvedValue({ id: "u_1" });
    requireAdminApiRole.mockResolvedValue({ id: "u_1", role: "owner" });
  });

  it("replays by event id", async () => {
    replayWebhookEventById.mockResolvedValue({
      ok: true,
      eventId: "evt_1",
      eventType: "invoice.paid",
    });

    const response = await POST(createJsonRequest({ action: "replay", eventId: "evt_1" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(replayWebhookEventById).toHaveBeenCalledWith("evt_1");
    expect(replayLatestWebhookForInvoice).not.toHaveBeenCalled();
    expect(payload).toEqual(
      expect.objectContaining({
        action: "replay",
        eventId: "evt_1",
      }),
    );
  });

  it("replays latest invoice-linked event when invoice id is provided", async () => {
    replayLatestWebhookForInvoice.mockResolvedValue({
      ok: true,
      eventId: "evt_2",
      eventType: "checkout.session.completed",
    });

    const response = await POST(createJsonRequest({ action: "replay", invoiceId: "inv_1" }));

    expect(response.status).toBe(200);
    expect(replayLatestWebhookForInvoice).toHaveBeenCalledWith("inv_1");
    expect(replayWebhookEventById).not.toHaveBeenCalled();
  });

  it("returns 400 for replay when identifiers are missing", async () => {
    const response = await POST(createJsonRequest({ action: "replay" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "eventId or invoiceId is required" });
  });

  it("updates subscription lifecycle", async () => {
    setCustomerSubscriptionLifecycle.mockResolvedValue({
      ok: true,
      customerId: "c_1",
      subscriptionId: "sub_123",
      status: "paused",
    });

    const response = await POST(
      createJsonRequest({ action: "subscription", customerId: "c_1", subscriptionAction: "pause" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(setCustomerSubscriptionLifecycle).toHaveBeenCalledWith("c_1", "pause");
    expect(payload).toEqual(
      expect.objectContaining({
        action: "subscription",
        customerId: "c_1",
        status: "paused",
      }),
    );
  });

  it("returns 400 when subscription action is incomplete", async () => {
    const response = await POST(createJsonRequest({ action: "subscription", customerId: "c_1" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "customerId and subscriptionAction are required" });
    expect(setCustomerSubscriptionLifecycle).not.toHaveBeenCalled();
  });

  it("returns 410 when retry action is used", async () => {
    const response = await POST(createJsonRequest({ action: "retry", invoiceId: "inv_1" }));
    const payload = await response.json();

    expect(response.status).toBe(410);
    expect(payload).toEqual({
      error: "Manual retries are deprecated. Stripe Billing dunning and Smart Retries are now the source of truth.",
    });
  });

  it("finalizes linked stripe invoice", async () => {
    finalizeStripeInvoiceForLocalInvoice.mockResolvedValue({
      id: "in_123",
      status: "open",
    });

    const response = await POST(createJsonRequest({ action: "invoice_finalize", invoiceId: "inv_1" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(finalizeStripeInvoiceForLocalInvoice).toHaveBeenCalledWith("inv_1");
    expect(payload).toEqual(
      expect.objectContaining({
        action: "invoice_finalize",
        stripeInvoiceId: "in_123",
      }),
    );
  });

  it("returns pdf link when stripe invoice pdf exists", async () => {
    getStripeInvoiceDocumentLinks.mockResolvedValue({
      stripeInvoiceId: "in_456",
      hostedInvoiceUrl: "https://example.test/hosted",
      pdfUrl: "https://example.test/invoice.pdf",
    });

    const response = await POST(createJsonRequest({ action: "invoice_pdf", invoiceId: "inv_2" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getStripeInvoiceDocumentLinks).toHaveBeenCalledWith("inv_2");
    expect(payload).toEqual(
      expect.objectContaining({
        action: "invoice_pdf",
        pdfUrl: "https://example.test/invoice.pdf",
      }),
    );
  });
});
