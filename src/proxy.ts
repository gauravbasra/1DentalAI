import { NextResponse, type NextRequest } from "next/server";

const sessionCookieNames = ["__Secure-1dentalai_session", "__Host-1dentalai_session"];
const canonicalHost = "1dentalai.com";

function canonicalizeHost(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname || hostname === canonicalHost || hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }
  if (hostname === "www.1dentalai.com" || hostname === "app.1dentalai.com" || hostname === "162.243.186.191") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }
  return null;
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(value: string) {
  const secret = process.env.ONE_DENTAL_AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL || "local-1dentalai-development-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function hasValidSignedCookie(request: NextRequest) {
  for (const cookieName of sessionCookieNames) {
    const cookieValue = request.cookies.get(cookieName)?.value;
    if (!cookieValue) continue;
    const [token, signature] = cookieValue.split(".");
    if (token && signature && signature === await hmac(token)) return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const canonicalRedirect = canonicalizeHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  const { pathname, search } = request.nextUrl;
  const protectedWorkspace = pathname.startsWith("/app/") && pathname !== "/app/";
  const protectedAdmin = pathname.startsWith("/admin");

  if (!protectedWorkspace && !protectedAdmin) {
    return NextResponse.next();
  }

  if (await hasValidSignedCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/app";
  loginUrl.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/login", "/logout", "/signup"],
};
