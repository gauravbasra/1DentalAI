import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { listLedger } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await listLedger(auth.session.tenantId) });
}
