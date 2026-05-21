import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";

export async function GET(request: Request) {
  await logout();
  return NextResponse.redirect(new URL("/app?loggedOut=1", request.url));
}

export async function POST(request: Request) {
  await logout();
  return NextResponse.redirect(new URL("/app?loggedOut=1", request.url));
}
