import { NextResponse } from "next/server";
import { addPerioMeasure } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const body = await request.json();
  if (!body.tooth || !body.site || Number(body.probingDepth) < 1) {
    return NextResponse.json({ error: "tooth, site, and probingDepth are required" }, { status: 400 });
  }
  const measure = await addPerioMeasure(patientId, {
    tooth: body.tooth,
    site: body.site,
    probingDepth: Number(body.probingDepth),
    bleeding: Boolean(body.bleeding),
    recession: body.recession ? Number(body.recession) : undefined,
  });
  return NextResponse.json({ data: measure }, { status: 201 });
}
