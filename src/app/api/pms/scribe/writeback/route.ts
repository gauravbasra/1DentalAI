import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createScribeWritebackJobs, type ScribeWritebackPackage } from "@/lib/clinical-scribe-workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<ScribeWritebackPackage>;
    const packageInput: ScribeWritebackPackage = {
      patientId: String(body.patientId ?? "").trim(),
      clinicalNoteId: String(body.clinicalNoteId ?? "").trim() || undefined,
      treatmentPlanId: String(body.treatmentPlanId ?? "").trim() || undefined,
      providerApprovalId: String(body.providerApprovalId ?? "").trim(),
      providerApprovalRole: String(body.providerApprovalRole ?? "").trim() || auth.session.roleKey,
      providerApprovalNote: String(body.providerApprovalNote ?? "").trim() || undefined,
      connectorInstanceId: typeof body.connectorInstanceId === "string" ? body.connectorInstanceId.trim() : undefined,
    };

    if (!packageInput.patientId) return NextResponse.json({ ok: false, error: "patientId is required." }, { status: 400 });
    if (!packageInput.providerApprovalId) return NextResponse.json({ ok: false, error: "providerApprovalId is required." }, { status: 400 });
    if (!packageInput.clinicalNoteId && !packageInput.treatmentPlanId) {
      return NextResponse.json({ ok: false, error: "At least one clinicalNoteId or treatmentPlanId is required." }, { status: 400 });
    }

    const result = await createScribeWritebackJobs({ ...packageInput, session: auth.session });
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create scribe writeback jobs." }, { status });
  }
}
