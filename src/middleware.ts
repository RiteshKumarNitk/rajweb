import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit } from "@/security/rate-limit";
import { apiError } from "@/core/api/api-response";
import { generateRequestId } from "@/core/api/request-context";
import { ErrorCodes } from "@/core/errors/error-codes";
import { ROLES } from "@/security/rbac/permissions";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

const isDev = process.env.NODE_ENV === "development";

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy": isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

function applySecurityHeaders(response: NextResponse) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set("X-Request-Id", generateRequestId());
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function getSessionToken(request: NextRequest) {
  if (!authSecret) return null;

  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const candidateCookieNames = isHttps
    ? [
        "__Secure-authjs.session-token",
        "authjs.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.session-token",
      ]
    : [
        "authjs.session-token",
        "next-auth.session-token",
        "__Secure-authjs.session-token",
        "__Secure-next-auth.session-token",
      ];

  for (const cookieName of candidateCookieNames) {
    if (request.cookies.has(cookieName)) {
      try {
        const token = await getToken({
          req: request,
          secret: authSecret,
          cookieName,
          secureCookie: cookieName.startsWith("__Secure-"),
        });
        if (token) return token;
      } catch {
        // try next candidate
      }
    }
  }

  try {
    return await getToken({
      req: request,
      secret: authSecret,
      secureCookie: isHttps,
    });
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /account/login itself must stay reachable while logged out; every other
  // /account/* route requires a session.
  const isProtectedAccountPath = pathname.startsWith("/account") && pathname !== "/account/login" && !pathname.startsWith("/account/login/");

  // Public static pages: skip all async middleware work for fastest navigation.
  if (
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/login") &&
    !isProtectedAccountPath
  ) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  const ip = getClientIp(request);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const allowed = await checkRateLimit(`global:${ip}`, 120, 60000);
    if (!allowed) {
      const requestId = generateRequestId();
      return NextResponse.json(
        apiError(ErrorCodes.RATE_LIMITED, "Too many requests", requestId),
        { status: 429 }
      );
    }
  }

  if (request.nextUrl.pathname.startsWith("/login")) {
    const loginAllowed = await checkRateLimit(`login-page:${ip}`, 20, 60000);
    if (!loginAllowed) {
      return new NextResponse("Too many login attempts. Please try again later.", {
        status: 429,
      });
    }
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = await getSessionToken(request);

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Coarse gate only: any authenticated, non-public-user role may attempt
    // /admin — a brand-new dynamic role a Super Admin just created must not
    // be locked out here. The real, per-module gating happens server-side on
    // each page (requireAdminScope) and each API route (requirePermission),
    // which check the specific permission, not just "is this role allowed in
    // the building at all".
    const role = token.role as string | undefined;
    if (!role || role === ROLES.PUBLIC_USER) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (isProtectedAccountPath) {
    const token = await getSessionToken(request);

    if (!token) {
      const loginUrl = new URL("/account/login", request.url);
      loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|images).*)"],
};
