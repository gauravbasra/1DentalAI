import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { listSchedule } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  const schedule = await listSchedule(auth.session.tenantId, searchParams.get("date") ?? undefined);
  return NextResponse.json({ data: schedule });
}
