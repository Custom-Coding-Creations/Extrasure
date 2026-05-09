import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/admin-data";

const SESSION_COOKIE = "extrasure_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type AdminSession = {
  name: string;
  role: Role;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing ADMIN_AUTH_SECRET environment variable");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

function encodeSession(session: AdminSession) {
  const payload = JSON.stringify(session);
  const signature = signPayload(payload);
  const token = `${payload}.${signature}`;

  return Buffer.from(token, "utf8").toString("base64url");
}

function decodeSession(token: string): AdminSession | null {
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

    const session = JSON.parse(payload) as AdminSession;

    if (!session.exp || Date.now() >= session.exp) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function parseRole(input: string | undefined): Role {
  if (input === "dispatch" || input === "technician" || input === "accountant") {
    return input;
  }

  return "owner";
}

export async function createAdminSession(name: string, roleInput?: string) {
  const role = parseRole(roleInput);
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;

  return encodeSession({ name, role, exp });
}

export async function setAdminSession(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/owner-login");
  }

  return session;
}

export async function requireAdminApiSession() {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  return session;
}

export async function requireAdminRole(roles: Role[]) {
  const session = await requireAdminSession();

  if (!roles.includes(session.role)) {
    redirect("/admin");
  }

  return session;
}

export async function requireAdminApiRole(roles: Role[]) {
  const session = await requireAdminApiSession();

  if (!session || !roles.includes(session.role)) {
    return null;
  }

  return session;
}

export function validateOwnerCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_LOGIN_EMAIL;
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD;

  if (!expectedEmail || !expectedPassword) {
    return {
      ok: false,
      message: "Owner login is not configured yet. Set ADMIN_LOGIN_EMAIL and ADMIN_LOGIN_PASSWORD.",
    };
  }

  const emailMatches = email.toLowerCase() === expectedEmail.toLowerCase();
  const passwordMatches = password === expectedPassword;

  if (!emailMatches || !passwordMatches) {
    return {
      ok: false,
      message: "Invalid email or password.",
    };
  }

  return {
    ok: true,
    role: (process.env.ADMIN_LOGIN_ROLE as Role) ?? "owner",
    name: process.env.ADMIN_LOGIN_NAME ?? "Owner",
  };
}
