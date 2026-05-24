import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createClinicalWorkflowRecommendation, listClinicalProcessTemplates, upsertCoreClinicalProcessTemplates } from "@/lib/pms-clinical-workflows";
import type { ClinicalRoleKey } from "@/lib/pms-clinical-workflows";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await listClinicalProcessTemplates(auth.session.tenantId) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json();
  const actorRole = auth.session.roleKey as ClinicalRoleKey;

  if (body.action === "seed_core_templates") {
    return NextResponse.json({ data: await upsertCoreClinicalProcessTemplates(auth.session.tenantId, actorRole) }, { status: 201 });
  }

  if (!body.patientId || !body.recommendationType || !body.summary || !body.rationale || !Array.isArray(body.mappedProcedureCodes)) {
    return NextResponse.json({ error: "patientId, recommendationType, summary, rationale, and mappedProcedureCodes are required" }, { status: 400 });
  }

  const recommendation = await createClinicalWorkflowRecommendation({
    tenantId: auth.session.tenantId,
    actorRole,
    patientId: String(body.patientId),
    treatmentPlanId: body.treatmentPlanId ? String(body.treatmentPlanId) : undefined,
    templateKey: body.templateKey ? String(body.templateKey) : undefined,
    sourceModule: normalizeSourceModule(body.sourceModule),
    sourceRecordId: body.sourceRecordId ? String(body.sourceRecordId) : undefined,
    recommendationType: String(body.recommendationType),
    summary: String(body.summary),
    rationale: String(body.rationale),
    mappedProcedureCodes: body.mappedProcedureCodes.map(String),
    confidenceScore: Number(body.confidenceScore ?? 0),
  });

  return NextResponse.json({ data: recommendation }, { status: 201 });
}

function normalizeSourceModule(value: unknown) {
  const source = String(value ?? "manual_clinical_review");
  if (source === "scribe" || source === "chart" || source === "perio" || source === "imaging" || source === "referral" || source === "insurance" || source === "treatment_plan") return source;
  return "manual_clinical_review";
}
