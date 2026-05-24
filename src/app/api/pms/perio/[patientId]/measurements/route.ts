import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { addPerioMeasure } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
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
    mobility: body.mobility ? String(body.mobility) : undefined,
    furcation: body.furcation ? String(body.furcation) : undefined,
    actorRole: auth.session.roleKey,
  }, auth.session.tenantId);
  if (!measure) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ data: measure }, { status: 201 });
}
