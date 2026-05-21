import { NextResponse } from "next/server";
import { listSchedule } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schedule = await listSchedule(undefined, searchParams.get("date") ?? undefined);
  return NextResponse.json({ data: schedule });
}
