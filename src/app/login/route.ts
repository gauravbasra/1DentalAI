import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";

function publicUrl(pathname: string, request: Request) {
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host") || "1dentalai.com";
  const host = /^(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?$/.test(hostHeader) ? "1dentalai.com" : hostHeader;
  const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
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
