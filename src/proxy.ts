import { NextResponse, type NextRequest } from "next/server";

function canonicalizeHost(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostname = host.split(":")[0]?.toLowerCase();
  const appOnlyPath =
    request.nextUrl.pathname === "/app" ||
    request.nextUrl.pathname.startsWith("/app/") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/logout";
  if (appOnlyPath && hostname && !["app.1dentalai.com", "localhost", "127.0.0.1", "162.243.186.191"].includes(hostname)) {
    return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, "https://app.1dentalai.com"), 308);
  }
  const allowedHosts = new Set(["1dentalai.com", "www.1dentalai.com", "app.1dentalai.com", "go.1dentalai.com", "localhost", "127.0.0.1", "162.243.186.191"]);
  if (!hostname || allowedHosts.has(hostname)) {
    return null;
  }
  return NextResponse.redirect(new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, "https://app.1dentalai.com"), 308);
}

export async function proxy(request: NextRequest) {
  const canonicalRedirect = canonicalizeHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/login", "/logout", "/signup"],
};
