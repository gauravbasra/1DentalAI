import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createTreatmentPlanWriteback } from "@/lib/clinical-scribe-workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { id } = params;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      patientId?: string;
      providerApprovalId?: string;
      providerApprovalRole?: string;
      providerApprovalNote?: string;
      connectorInstanceId?: string;
    };

    const patientId = String(body.patientId ?? "").trim();
    const providerApprovalId = String(body.providerApprovalId ?? "").trim();
    if (!patientId) return NextResponse.json({ ok: false, error: "patientId is required." }, { status: 400 });
    if (!providerApprovalId) return NextResponse.json({ ok: false, error: "providerApprovalId is required." }, { status: 400 });

    const data = await createTreatmentPlanWriteback({
      session: auth.session,
      patientId,
      treatmentPlanId: id,
      providerApprovalId,
      providerApprovalRole: String(body.providerApprovalRole ?? "").trim() || auth.session.roleKey,
      providerApprovalNote: String(body.providerApprovalNote ?? "").trim() || undefined,
      connectorInstanceId: body.connectorInstanceId,
    });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create treatment plan writeback." }, { status });
  }
}
