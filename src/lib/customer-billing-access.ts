import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

type BillingAccessPayload = {
  invoiceId: string;
  exp: number;
};

type InvoiceAccessTokenResult = {
  ok: true;
  payload: BillingAccessPayload;
} | {
  ok: false;
  reason: "malformed" | "invalid_signature" | "expired";
};

function getAccessSecret() {
  if (process.env.NODE_ENV === "production") {
    const productionSecret = process.env.BILLING_ACCESS_SECRET;

    if (!productionSecret) {
      throw new Error("Missing BILLING_ACCESS_SECRET environment variable");
    }

    return productionSecret;
  }

  const secret = process.env.BILLING_ACCESS_SECRET ?? process.env.ADMIN_AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing BILLING_ACCESS_SECRET or ADMIN_AUTH_SECRET environment variable");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAccessSecret()).update(payload).digest("hex");
}

export function createInvoiceAccessToken(invoiceId: string, ttlSeconds = TOKEN_TTL_SECONDS) {
  const payload: BillingAccessPayload = {
    invoiceId,
    exp: Date.now() + ttlSeconds * 1000,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = signPayload(payloadJson);
  const token = `${payloadJson}.${signature}`;

  return Buffer.from(token, "utf8").toString("base64url");
}

export function decodeInvoiceAccessToken(token: string): BillingAccessPayload | null {
  const result = inspectInvoiceAccessToken(token);

  if (!result.ok) {
    return null;
  }

  return result.payload;
}

export function inspectInvoiceAccessToken(token: string): InvoiceAccessTokenResult {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const splitIndex = decoded.lastIndexOf(".");

    if (splitIndex <= 0) {
      return { ok: false, reason: "malformed" };
    }

    const payloadText = decoded.slice(0, splitIndex);
    const signature = decoded.slice(splitIndex + 1);
    const expectedSignature = signPayload(payloadText);
    const provided = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return { ok: false, reason: "invalid_signature" };
    }

    const payload = JSON.parse(payloadText) as BillingAccessPayload;

    if (!payload.invoiceId || !payload.exp) {
      return { ok: false, reason: "malformed" };
    }

    if (Date.now() >= payload.exp) {
      return { ok: false, reason: "expired" };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
