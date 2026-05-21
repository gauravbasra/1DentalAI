import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

function publicLoginUrl(request: Request) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostOnly = hostHeader.split(":")[0]?.toLowerCase();
  const isFirstParty = hostOnly === "1dentalai.com" || hostOnly === "www.1dentalai.com" || hostOnly === "app.1dentalai.com";
  const host = isFirstParty ? hostHeader : "1dentalai.com";
  const proto = isFirstParty ? "https" : "https";
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
