import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";

function publicUrl(pathname: string, request: Request) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const hostOnly = hostHeader.split(":")[0]?.toLowerCase();
  const isLocal = /^(0\.0\.0\.0|127\.0\.0\.1|localhost)$/.test(hostOnly);
  const isFirstParty = hostOnly === "1dentalai.com" || Boolean(hostOnly?.endsWith(".1dentalai.com"));
  const host = isFirstParty ? hostHeader : isLocal ? "1dentalai.com" : "1dentalai.com";
  const proto = isFirstParty || !isLocal ? "https" : "http";
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
