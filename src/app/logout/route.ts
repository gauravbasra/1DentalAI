import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

function publicLoginUrl(request: Request) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const isLocal = /^(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?$/.test(hostHeader);
  const host = isLocal ? hostHeader : "1dentalai.com";
  const proto = isLocal ? "http" : "https";
  return new URL("/app?loggedOut=1", `${proto}://${host}`);
}

export async function GET(request: Request) {
  await logout();
  return NextResponse.redirect(publicLoginUrl(request));
}

export async function POST(request: Request) {
  await logout();
  return NextResponse.redirect(publicLoginUrl(request));
}
