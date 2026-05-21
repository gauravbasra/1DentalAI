import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const result = await loginWithPassword(formData);

  if (!result.redirectTo) {
    const url = new URL("/app", request.url);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(result.redirectTo, request.url));
}
