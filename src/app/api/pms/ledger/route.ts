import { NextResponse } from "next/server";
import { listLedger } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listLedger() });
}
