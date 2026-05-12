import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export type OAuthProvider = "google" | "microsoft";
export type OAuthFlow = "customer" | "admin";

export type OAuthUserProfile = {
  email: string;
  name: string;
  subject: string;
};

const OAUTH_STATE_COOKIE = "extrasure_oauth_state";
const OAUTH_FLOW_COOKIE = "extrasure_oauth_flow";
const OAUTH_STATE_TTL_SECONDS = 60 * 10;

type OAuthStatePayload = {
  state: string;
  provider: OAuthProvider;
  flow: OAuthFlow;
  exp: number;
};

function getOAuthStateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET ?? process.env.ADMIN_AUTH_SECRET ?? process.env.CUSTOMER_AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing OAUTH_STATE_SECRET, ADMIN_AUTH_SECRET, or CUSTOMER_AUTH_SECRET environment variable");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getOAuthStateSecret()).update(payload).digest("hex");
}

function encodeStatePayload(payload: OAuthStatePayload) {
  const payloadText = JSON.stringify(payload);
  const signature = signPayload(payloadText);
  const token = `${payloadText}.${signature}`;

  return Buffer.from(token, "utf8").toString("base64url");
}

function decodeStatePayload(token: string): OAuthStatePayload | null {
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

    const parsed = JSON.parse(payload) as OAuthStatePayload;

    if (!parsed.state || !parsed.provider || !parsed.flow || !parsed.exp) {
      return null;
    }

    if (Date.now() >= parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getBaseUrl(request: NextRequest) {
  return process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
}

function getGoogleRedirectUri(request: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${getBaseUrl(request)}/api/auth/callback/google`;
}

function getMicrosoftRedirectUri(request: NextRequest) {
  return process.env.MICROSOFT_REDIRECT_URI ?? `${getBaseUrl(request)}/api/auth/callback/microsoft`;
}

function getMicrosoftTenantId() {
  const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();

  if (tenantId && tenantId.length > 0) {
    return tenantId;
  }

  return "common";
}

function getProviderClientId(provider: OAuthProvider) {
  if (provider === "google") {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

    if (!clientId) {
      throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID environment variable");
    }

    return clientId;
  }

  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;

  if (!clientId) {
    throw new Error("Missing MICROSOFT_OAUTH_CLIENT_ID environment variable");
  }

  return clientId;
}

function getProviderClientSecret(provider: OAuthProvider) {
  if (provider === "google") {
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientSecret) {
      throw new Error("Missing GOOGLE_OAUTH_CLIENT_SECRET environment variable");
    }

    return clientSecret;
  }

  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;

  if (!clientSecret) {
    throw new Error("Missing MICROSOFT_OAUTH_CLIENT_SECRET environment variable");
  }

  return clientSecret;
}

export function parseOAuthProvider(input: string | null): OAuthProvider | null {
  if (input === "google" || input === "microsoft") {
    return input;
  }

  return null;
}

export function parseOAuthFlow(input: string | null): OAuthFlow | null {
  if (input === "customer" || input === "admin") {
    return input;
  }

  return null;
}

export function getOAuthLoginPath(flow: OAuthFlow) {
  return flow === "customer" ? "/account/login" : "/owner-login";
}

export function redirectWithOAuthError(request: NextRequest, flow: OAuthFlow, code: string) {
  const destination = new URL(getOAuthLoginPath(flow), request.url);
  destination.searchParams.set("oauth_error", code);

  return NextResponse.redirect(destination);
}

export function setOAuthCookies(response: NextResponse, stateToken: string, flow: OAuthFlow) {
  response.cookies.set(OAUTH_STATE_COOKIE, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });

  response.cookies.set(OAUTH_FLOW_COOKIE, flow, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
}

export function beginOAuth(request: NextRequest, provider: OAuthProvider, flow: OAuthFlow) {
  const state = randomUUID();
  const payload: OAuthStatePayload = {
    state,
    provider,
    flow,
    exp: Date.now() + OAUTH_STATE_TTL_SECONDS * 1000,
  };
  const stateToken = encodeStatePayload(payload);

  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", getProviderClientId("google"));
    url.searchParams.set("redirect_uri", getGoogleRedirectUri(request));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");

    return {
      authorizationUrl: url,
      stateToken,
    };
  }

  const microsoftTenantId = getMicrosoftTenantId();
  const url = new URL(`https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", getProviderClientId("microsoft"));
  url.searchParams.set("redirect_uri", getMicrosoftRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return {
    authorizationUrl: url,
    stateToken,
  };
}

export function consumeOAuthState(request: NextRequest, expectedState: string) {
  const token = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeStatePayload(token);

  if (!payload || payload.state !== expectedState) {
    return null;
  }

  return payload;
}

export function consumeOAuthFlowHint(request: NextRequest): OAuthFlow | null {
  return parseOAuthFlow(request.cookies.get(OAUTH_FLOW_COOKIE)?.value ?? null);
}

export function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.delete(OAUTH_FLOW_COOKIE);
}

function decodeJwtPayload<T>(token: string | undefined): T | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

async function exchangeGoogleCode(request: NextRequest, code: string): Promise<OAuthUserProfile> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getProviderClientId("google"),
    client_secret: getProviderClientSecret("google"),
    redirect_uri: getGoogleRedirectUri(request),
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!tokenResponse.ok) {
    throw new Error("Google token exchange failed");
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };

  if (!tokenData.access_token) {
    throw new Error("Google token response missing access_token");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error("Google userinfo request failed");
  }

  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
  };

  if (!profile.sub || !profile.email) {
    throw new Error("Google profile missing required identity fields");
  }

  const resolvedEmail = profile.email.trim().toLowerCase();
  const resolvedName = profile.name?.trim() || resolvedEmail;
  const resolvedSubject = profile.sub;

  return {
    email: resolvedEmail,
    name: resolvedName,
    subject: resolvedSubject,
  };
}

async function exchangeMicrosoftCode(request: NextRequest, code: string): Promise<OAuthUserProfile> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getProviderClientId("microsoft"),
    client_secret: getProviderClientSecret("microsoft"),
    redirect_uri: getMicrosoftRedirectUri(request),
  });

  const microsoftTenantId = getMicrosoftTenantId();
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok) {
    const detail = tokenData.error ? `${tokenData.error}${tokenData.error_description ? `: ${tokenData.error_description}` : ""}` : "unknown_error";
    throw new Error(`Microsoft token exchange failed (${detail})`);
  }

  const tokenClaims = decodeJwtPayload<{
    sub?: string;
    oid?: string;
    email?: string;
    preferred_username?: string;
    upn?: string;
    unique_name?: string;
    name?: string;
  }>(tokenData.id_token);

  let profile: {
    sub?: string;
    id?: string;
    email?: string;
    preferred_username?: string;
    upn?: string;
    unique_name?: string;
    name?: string;
  } = {};

  if (tokenData.access_token) {
    try {
      const profileResponse = await fetch("https://graph.microsoft.com/oidc/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (profileResponse.ok) {
        profile = (await profileResponse.json()) as {
          sub?: string;
          id?: string;
          email?: string;
          preferred_username?: string;
          upn?: string;
          unique_name?: string;
          name?: string;
        };
      }
    } catch {
      // Fall back to id_token claims when userinfo is unavailable.
    }
  }

  const subjectCandidate = profile.sub ?? profile.id ?? tokenClaims?.sub ?? tokenClaims?.oid;
  const emailCandidate = profile.email
    ?? profile.preferred_username
    ?? profile.upn
    ?? profile.unique_name
    ?? tokenClaims?.email
    ?? tokenClaims?.preferred_username
    ?? tokenClaims?.upn
    ?? tokenClaims?.unique_name;
  const nameCandidate = profile.name?.trim() || tokenClaims?.name?.trim() || emailCandidate;

  if (!subjectCandidate || !emailCandidate) {
    throw new Error("Microsoft profile missing required identity fields");
  }

  const resolvedSubject = subjectCandidate;
  const resolvedEmail = emailCandidate.trim().toLowerCase();
  const resolvedName = nameCandidate?.trim() || resolvedEmail;

  return {
    email: resolvedEmail,
    name: resolvedName,
    subject: resolvedSubject,
  };
}

export async function completeOAuthSignIn(request: NextRequest, provider: OAuthProvider, code: string): Promise<OAuthUserProfile> {
  if (provider === "google") {
    return exchangeGoogleCode(request, code);
  }

  return exchangeMicrosoftCode(request, code);
}
