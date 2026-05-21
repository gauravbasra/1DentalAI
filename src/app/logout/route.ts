import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { logout } from "@/lib/auth";

async function publicLoginUrl(request: Request) {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host") || headerList.get("host");
  const forwardedProto = headerList.get("x-forwarded-proto") || "https";
  if (forwardedHost && !forwardedHost.startsWith("0.0.0.0")) {
    return new URL("/app?loggedOut=1", `${forwardedProto}://${forwardedHost}`);
  }
  return new URL("/app?loggedOut=1", request.url);
}

export async function GET(request: Request) {
  await logout();
  return NextResponse.redirect(await publicLoginUrl(request));
}

export async function POST(request: Request) {
  await logout();
  return NextResponse.redirect(await publicLoginUrl(request));
}
