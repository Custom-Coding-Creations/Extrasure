import "server-only";

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const CUSTOMER_SESSION_COOKIE = "extrasure_customer_session";
const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const KEY_LENGTH = 64;

type CustomerAccountStatus = "invited" | "active" | "disabled";

export type CustomerSession = {
  customerId: string;
  email: string;
  name: string;
  exp: number;
};

export type CustomerIdentity = {
  customerId: string;
  email: string;
  name: string;
  status: CustomerAccountStatus;
};

export type CustomerAccountSummary = {
  customerId: string;
  email: string;
  status: CustomerAccountStatus;
  invitedAt: Date | null;
  claimedAt: Date | null;
  lastLoginAt: Date | null;
};

export type CustomerSignupInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
};

function getAuthSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET ?? process.env.ADMIN_AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing CUSTOMER_AUTH_SECRET or ADMIN_AUTH_SECRET environment variable");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

function encodeSession(session: CustomerSession) {
  const payload = JSON.stringify(session);
  const signature = signPayload(payload);
  const token = `${payload}.${signature}`;

  return Buffer.from(token, "utf8").toString("base64url");
}

function decodeSession(token: string): CustomerSession | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const splitIndex = decoded.lastIndexOf(".");

    if (splitIndex <= 0) {
      return null;
    }

    const payload = decoded.slice(0, splitIndex);
    const signature = decoded.slice(splitIndex + 1);
    const expectedSignature = signPayload(payload);

    const provided = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const session = JSON.parse(payload) as CustomerSession;

    if (!session.exp || Date.now() >= session.exp) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function signResetPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(`reset:${payload}`).digest("hex");
}

function encodeResetToken(payload: { email: string; exp: number }) {
  const payloadJson = JSON.stringify(payload);
  const signature = signResetPayload(payloadJson);
  const token = `${payloadJson}.${signature}`;

  return Buffer.from(token, "utf8").toString("base64url");
}

function decodeResetToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const splitIndex = decoded.lastIndexOf(".");

    if (splitIndex <= 0) {
      return null;
    }

    const payloadText = decoded.slice(0, splitIndex);
    const signature = decoded.slice(splitIndex + 1);
    const expectedSignature = signResetPayload(payloadText);

    const provided = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null;
    }

    const payload = JSON.parse(payloadText) as { email?: string; exp?: number };

    if (!payload.email || !payload.exp || Date.now() >= payload.exp) {
      return null;
    }

    return {
      email: normalizeEmail(payload.email),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function validateNewPassword(password: string) {
  return password.trim().length >= 8;
}

export function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyCustomerPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split("$");

  if (algorithm !== "scrypt" || !salt || !expectedHex) {
    return false;
  }

  const computed = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(expectedHex, "hex");

  if (computed.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(computed, expected);
}

export async function createCustomerSession(identity: Omit<CustomerSession, "exp">) {
  const exp = Date.now() + CUSTOMER_SESSION_TTL_SECONDS * 1000;

  return encodeSession({
    ...identity,
    exp,
  });
}

export function createPasswordResetToken(email: string, ttlSeconds = 60 * 30) {
  return encodeResetToken({
    email: normalizeEmail(email),
    exp: Date.now() + ttlSeconds * 1000,
  });
}

export async function createCustomerAccountFromSignup(input: CustomerSignupInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = input.phone.trim();
  const normalizedCity = input.city.trim();
  const name = input.name.trim();

  const existingAccount = await prisma.customerAccount.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingAccount) {
    return {
      ok: false,
      message: "An account already exists for this email. Sign in instead.",
    } as const;
  }

  let customer = await prisma.customer.findFirst({
    where: { email: normalizedEmail },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        id: `cust_${randomBytes(8).toString("hex")}`,
        name,
        phone: normalizedPhone,
        email: normalizedEmail,
        city: normalizedCity,
        activePlan: "none",
        lifecycle: "lead",
        lastServiceDate: new Date(),
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name,
        phone: normalizedPhone,
        city: normalizedCity,
      },
    });
  }

  const now = new Date();

  const account = await prisma.customerAccount.create({
    data: {
      id: `acct_${randomBytes(8).toString("hex")}`,
      customerId: customer.id,
      email: normalizedEmail,
      passwordHash: hashCustomerPassword(input.password),
      authMethod: "password",
      status: "active",
      invitedAt: now,
      claimedAt: now,
    },
  });

  return {
    ok: true,
    identity: {
      customerId: account.customerId,
      email: account.email,
      name: customer.name,
      status: account.status,
    },
  } as const;
}

export async function setCustomerSession(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CUSTOMER_SESSION_TTL_SECONDS,
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export async function requireCustomerSession() {
  const session = await getCustomerSession();

  if (!session) {
    redirect("/account/login");
  }

  return session;
}

export async function requireCustomerApiSession() {
  const session = await getCustomerSession();
  return session ?? null;
}

export async function findCustomerByEmail(email: string) {
  const normalized = normalizeEmail(email);

  return prisma.customer.findFirst({
    where: {
      email: normalized,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      city: true,
    },
  });
}

export async function createCustomerAccountForExistingCustomer(email: string, password: string) {
  const customer = await findCustomerByEmail(email);

  if (!customer) {
    return {
      ok: false,
      message: "No customer record found for this email.",
    } as const;
  }

  return createCustomerAccountFromSignup({
    name: customer.name,
    email: customer.email,
    password,
    phone: customer.phone,
    city: customer.city,
  });
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const account = await prisma.customerAccount.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, status: true },
  });

  if (!account || account.status === "disabled") {
    return {
      ok: true,
      token: null,
    } as const;
  }

  return {
    ok: true,
    token: createPasswordResetToken(account.email),
  } as const;
}

export async function resetCustomerPassword(token: string, password: string) {
  const payload = decodeResetToken(token);

  if (!payload) {
    return {
      ok: false,
      message: "This reset link is invalid or expired.",
    } as const;
  }

  const account = await prisma.customerAccount.findUnique({
    where: { email: payload.email },
    select: { id: true, status: true },
  });

  if (!account || account.status === "disabled") {
    return {
      ok: false,
      message: "This reset link is invalid or expired.",
    } as const;
  }

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: hashCustomerPassword(password),
      status: "active",
      claimedAt: new Date(),
    },
  });

  return {
    ok: true,
  } as const;
}

export async function validateCustomerCredentials(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  const account = await prisma.customerAccount.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!account) {
    return {
      ok: false,
      message: "Invalid email or password.",
    } as const;
  }

  if (account.status === "disabled") {
    return {
      ok: false,
      message: "This account is disabled. Contact support.",
    } as const;
  }

  if (!account.passwordHash) {
    return {
      ok: false,
      message: "This account uses social sign-in. Use your provider to continue.",
    } as const;
  }

  if (!verifyCustomerPassword(password, account.passwordHash)) {
    return {
      ok: false,
      message: "Invalid email or password.",
    } as const;
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: account.customerId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!customer) {
    return {
      ok: false,
      message: "Customer record was not found for this account.",
    } as const;
  }

  await prisma.customerAccount.update({
    where: {
      id: account.id,
    },
    data: {
      lastLoginAt: new Date(),
      status: account.status === "invited" ? "active" : account.status,
      claimedAt: account.claimedAt ?? new Date(),
    },
  });

  return {
    ok: true,
    identity: {
      customerId: customer.id,
      email: account.email,
      name: customer.name,
      status: account.status,
    },
  } as const;
}

export async function getCustomerAccountSummaries(customerIds: string[]): Promise<Map<string, CustomerAccountSummary>> {
  if (!customerIds.length) {
    return new Map<string, CustomerAccountSummary>();
  }

  const accounts = await prisma.customerAccount.findMany({
    where: {
      customerId: {
        in: customerIds,
      },
    },
    select: {
      customerId: true,
      email: true,
      status: true,
      invitedAt: true,
      claimedAt: true,
      lastLoginAt: true,
    },
  });

  return new Map(
    accounts.map((account) => [
      account.customerId,
      {
        customerId: account.customerId,
        email: account.email,
        status: account.status,
        invitedAt: account.invitedAt,
        claimedAt: account.claimedAt,
        lastLoginAt: account.lastLoginAt,
      },
    ]),
  );
}

export async function inviteCustomerAccountByCustomerId(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!customer) {
    return {
      ok: false,
      message: "Customer not found.",
    } as const;
  }

  const normalizedEmail = normalizeEmail(customer.email);
  const now = new Date();
  const tempPassword = randomBytes(12).toString("base64url");
  const passwordHash = hashCustomerPassword(tempPassword);

  const existing = await prisma.customerAccount.findFirst({
    where: {
      OR: [{ customerId: customer.id }, { email: normalizedEmail }],
    },
  });

  if (existing) {
    await prisma.customerAccount.update({
      where: {
        id: existing.id,
      },
      data: {
        email: normalizedEmail,
        status: "invited",
        invitedAt: now,
        passwordHash,
      },
    });
  } else {
    await prisma.customerAccount.create({
      data: {
        id: `acct_${randomBytes(8).toString("hex")}`,
        customerId: customer.id,
        email: normalizedEmail,
        passwordHash,
        status: "invited",
        invitedAt: now,
      },
    });
  }

  return {
    ok: true,
    message: `Invite prepared for ${customer.name} (${normalizedEmail}).`,
  } as const;
}

export async function setCustomerAccountStatusByCustomerId(customerId: string, status: CustomerAccountStatus) {
  const account = await prisma.customerAccount.findUnique({
    where: {
      customerId,
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    return {
      ok: false,
      message: "Customer account does not exist yet.",
    } as const;
  }

  await prisma.customerAccount.update({
    where: {
      id: account.id,
    },
    data: {
      status,
    },
  });

  return {
    ok: true,
    message: `Customer account status set to ${status}.`,
  } as const;
}
