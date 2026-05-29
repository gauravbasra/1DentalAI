import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";

function publicUrl(pathname: string, request: Request) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostOnly = hostHeader.split(":")[0]?.toLowerCase();
  const isLocal = /^(0\.0\.0\.0|127\.0\.0\.1|localhost)$/.test(hostOnly);
  const isIpFallback = hostOnly === "162.243.186.191";
  const isAppHost = hostOnly === "app.1dentalai.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1dentalai.com";
  const host = isAppHost || isIpFallback ? hostHeader : isLocal ? "localhost:3001" : new URL(appUrl).host;
  const proto = isIpFallback || isLocal ? "http" : "https";
  return new URL(pathname, `${proto}://${host}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await loginWithPassword(formData);

  if (!result.redirectTo) {
    const url = publicUrl("/app", request);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(publicUrl(result.redirectTo, request));
}

export async function GET(request: Request) {
  return NextResponse.redirect(publicUrl("/app", request));
}
