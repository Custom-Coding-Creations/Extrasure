import { NextRequest } from "next/server";
import { POST } from "@/app/pay/[token]/subscription/route";

jest.mock("@/lib/customer-billing-access", () => ({
  inspectInvoiceAccessToken: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: jest.fn(() => ({ ok: true })),
  getRequestIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@/lib/stripe-billing", () => ({
  getCustomerInvoiceSnapshot: jest.fn(),
  setCustomerSubscriptionLifecycle: jest.fn(),
}));

const { inspectInvoiceAccessToken } = jest.requireMock("@/lib/customer-billing-access") as {
  inspectInvoiceAccessToken: jest.Mock;
};

const { getCustomerInvoiceSnapshot, setCustomerSubscriptionLifecycle } = jest.requireMock("@/lib/stripe-billing") as {
  getCustomerInvoiceSnapshot: jest.Mock;
  setCustomerSubscriptionLifecycle: jest.Mock;
};

describe("POST /pay/[token]/subscription", () => {
  it("redirects with success flag when lifecycle action succeeds", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1", exp: Date.now() + 60_000 } });
    getCustomerInvoiceSnapshot.mockResolvedValue({
      customer: {
        id: "c_1",
        stripeSubscriptionId: "sub_123",
      },
    });
    setCustomerSubscriptionLifecycle.mockResolvedValue({ ok: true, status: "paused" });

    const body = new URLSearchParams({ action: "pause" });
    const req = new NextRequest("https://example.com/pay/token123/subscription", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    const response = await POST(req, {
      params: Promise.resolve({ token: "token123" }),
    });

    expect(setCustomerSubscriptionLifecycle).toHaveBeenCalledWith("c_1", "pause");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay/token123?stripe=subscription_pause");
  });

  it("redirects to error state when action is invalid", async () => {
    inspectInvoiceAccessToken.mockReturnValue({ ok: true, payload: { invoiceId: "inv_1", exp: Date.now() + 60_000 } });
    getCustomerInvoiceSnapshot.mockResolvedValue({
      customer: {
        id: "c_1",
        stripeSubscriptionId: "sub_123",
      },
    });

    const body = new URLSearchParams({ action: "noop" });
    const req = new NextRequest("https://example.com/pay/token123/subscription", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    const response = await POST(req, {
      params: Promise.resolve({ token: "token123" }),
    });

    expect(setCustomerSubscriptionLifecycle).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay/token123?stripe=subscription_error");
  });
});
