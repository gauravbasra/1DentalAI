import { NextResponse } from "next/server";
import { listTreatmentPlans } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listTreatmentPlans() });
}
