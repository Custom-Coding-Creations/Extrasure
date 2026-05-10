import { createInvoiceAccessToken, decodeInvoiceAccessToken } from "@/lib/customer-billing-access";

describe("customer-billing-access", () => {
  beforeEach(() => {
    process.env.BILLING_ACCESS_SECRET = "test-billing-secret";
    process.env.NODE_ENV = "test";
  });

  it("creates and validates a token", () => {
    const token = createInvoiceAccessToken("inv_123");
    const payload = decodeInvoiceAccessToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.invoiceId).toBe("inv_123");
  });

  it("rejects tampered token", () => {
    const token = createInvoiceAccessToken("inv_123");
    const tampered = `${token.slice(0, -1)}${token.slice(-1) === "a" ? "b" : "a"}`;

    expect(decodeInvoiceAccessToken(tampered)).toBeNull();
  });

  it("rejects expired token", () => {
    const token = createInvoiceAccessToken("inv_123", -1);

    expect(decodeInvoiceAccessToken(token)).toBeNull();
  });
});
