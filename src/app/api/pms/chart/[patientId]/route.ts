import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { getChart } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { patientId } = await params;
  const chart = await getChart(patientId, auth.session.tenantId);
  if (!chart.patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ data: chart });
}
