import { NextResponse } from "next/server";
import { listInsurance } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listInsurance() });
}
