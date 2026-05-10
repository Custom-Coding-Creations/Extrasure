import { NextRequest } from "next/server";
import { POST } from "@/app/pay/access/route";

jest.mock("@/lib/stripe-billing", () => ({
  getCustomerInvoiceSnapshot: jest.fn(),
}));

jest.mock("@/lib/customer-billing-access", () => ({
  createInvoiceAccessToken: jest.fn(() => "signed-token"),
}));

const { getCustomerInvoiceSnapshot } = jest.requireMock("@/lib/stripe-billing") as {
  getCustomerInvoiceSnapshot: jest.Mock;
};

describe("POST /pay/access", () => {
  it("redirects to tokenized payment route on valid invoice/email", async () => {
    getCustomerInvoiceSnapshot.mockResolvedValue({
      invoice: { id: "inv_1" },
      customer: { email: "client@example.com" },
    });

    const formData = new FormData();
    formData.set("invoiceId", "inv_1");
    formData.set("email", "client@example.com");

    const req = new NextRequest("https://example.com/pay/access", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay/signed-token");
  });

  it("redirects to not_found on invalid match", async () => {
    getCustomerInvoiceSnapshot.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("invoiceId", "inv_missing");
    formData.set("email", "client@example.com");

    const req = new NextRequest("https://example.com/pay/access", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay?error=not_found");
  });

  it("redirects to expired renewal path when prior token is supplied", async () => {
    getCustomerInvoiceSnapshot.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("invoiceId", "inv_missing");
    formData.set("email", "client@example.com");
    formData.set("token", "expired-token");

    const req = new NextRequest("https://example.com/pay/access", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/pay?error=expired&token=expired-token");
  });
});
