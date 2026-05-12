import { NextRequest, NextResponse } from "next/server";
import { beginOAuth, parseOAuthFlow, parseOAuthProvider, redirectWithOAuthError, setOAuthCookies } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const provider = parseOAuthProvider(request.nextUrl.searchParams.get("provider"));
  const flow = parseOAuthFlow(request.nextUrl.searchParams.get("flow"));

  if (!provider || !flow) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const { authorizationUrl, stateToken } = beginOAuth(request, provider, flow);
    const redirectResponse = NextResponse.redirect(authorizationUrl);
    setOAuthCookies(redirectResponse, stateToken, flow);

    return redirectResponse;
  } catch (error) {
    console.error("[oauth/start] failed", error);
    return redirectWithOAuthError(request, flow, "provider_config");
  }
}
