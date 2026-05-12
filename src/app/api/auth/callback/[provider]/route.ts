import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, findAdminByEmail, setAdminSession } from "@/lib/admin-auth";
import { createCustomerSession, setCustomerSession, upsertCustomerOAuthIdentity } from "@/lib/customer-auth";
import {
  clearOAuthCookies,
  completeOAuthSignIn,
  consumeOAuthFlowHint,
  consumeOAuthState,
  parseOAuthProvider,
  redirectWithOAuthError,
  type OAuthFlow,
} from "@/lib/oauth";

function getSuccessPath(flow: OAuthFlow) {
  return flow === "customer" ? "/account" : "/admin";
}

function withClearedOAuthCookies(response: NextResponse) {
  clearOAuthCookies(response);
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await context.params;
  const provider = parseOAuthProvider(providerParam);

  if (!provider) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");

  const flowHint = consumeOAuthFlowHint(request) ?? "customer";

  if (!state) {
    return withClearedOAuthCookies(redirectWithOAuthError(request, flowHint, "invalid_state"));
  }

  const statePayload = consumeOAuthState(request, state);

  if (!statePayload) {
    return withClearedOAuthCookies(redirectWithOAuthError(request, flowHint, "invalid_state"));
  }

  const flow = statePayload.flow;

  if (providerError) {
    return withClearedOAuthCookies(redirectWithOAuthError(request, flow, "provider_denied"));
  }

  if (!code) {
    return withClearedOAuthCookies(redirectWithOAuthError(request, flow, "missing_code"));
  }

  if (statePayload.provider !== provider) {
    return withClearedOAuthCookies(redirectWithOAuthError(request, flow, "provider_mismatch"));
  }

  try {
    const profile = await completeOAuthSignIn(request, provider, code);

    if (flow === "customer") {
      const result = await upsertCustomerOAuthIdentity({
        email: profile.email,
        name: profile.name,
        provider,
        subject: profile.subject,
      });

      if (!result.ok) {
        return withClearedOAuthCookies(redirectWithOAuthError(request, flow, "account_disabled"));
      }

      const token = await createCustomerSession({
        customerId: result.identity.customerId,
        email: result.identity.email,
        name: result.identity.name,
      });

      await setCustomerSession(token);
    } else {
      const adminUser = await findAdminByEmail(profile.email);

      if (!adminUser) {
        return withClearedOAuthCookies(redirectWithOAuthError(request, flow, "not_authorized"));
      }

      const token = await createAdminSession(adminUser.name, adminUser.role);
      await setAdminSession(token);
    }

    return withClearedOAuthCookies(NextResponse.redirect(new URL(getSuccessPath(flow), request.url)));
  } catch (error) {
    console.error("[oauth/callback] failed", error);
    return withClearedOAuthCookies(redirectWithOAuthError(request, flow, "callback_failed"));
  }
}
