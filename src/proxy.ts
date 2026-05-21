import { NextResponse, type NextRequest } from "next/server";

const sessionCookieName = "__Host-1dentalai_session";

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
  const cookieValue = request.cookies.get(sessionCookieName)?.value;
  if (!cookieValue) return false;
  const [token, signature] = cookieValue.split(".");
  if (!token || !signature) return false;
  return signature === await hmac(token);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const protectedWorkspace = pathname.startsWith("/app/") && pathname !== "/app/";

  if (!protectedWorkspace) {
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
  matcher: ["/app/:path*"],
};
