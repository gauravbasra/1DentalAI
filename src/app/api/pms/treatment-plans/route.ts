import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { addTreatmentPlanItem, buildTreatmentBenefitCase, createTreatmentPlan, listTreatmentPlans } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await listTreatmentPlans(auth.session.tenantId) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    treatmentPlanId?: string;
    patientId?: string;
    providerId?: string;
    name?: string;
    presentationNote?: string;
    procedureCodeId?: string;
    phase?: number | string;
    tooth?: string;
    surface?: string;
  };
  if (body.action === "buildBenefitCase") {
    if (!body.treatmentPlanId) {
      return NextResponse.json({ error: "treatmentPlanId is required" }, { status: 400 });
    }
    const packet = await buildTreatmentBenefitCase({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      treatmentPlanId: body.treatmentPlanId,
    });
    revalidatePath("/app/pms/treatment-plans");
    return NextResponse.json({ data: packet });
  }
  if (body.action === "createPlan") {
    if (!body.patientId || typeof body.patientId !== "string") {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const plan = await createTreatmentPlan({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      patientId: body.patientId,
      providerId: typeof body.providerId === "string" && body.providerId ? body.providerId : undefined,
      name: body.name,
      presentationNote: typeof body.presentationNote === "string" ? body.presentationNote : undefined,
    });
    revalidatePath("/app/pms/treatment-plans");
    return NextResponse.json({ data: plan }, { status: 201 });
  }
  if (body.action === "addItem") {
    if (!body.treatmentPlanId || typeof body.treatmentPlanId !== "string") {
      return NextResponse.json({ error: "treatmentPlanId is required" }, { status: 400 });
    }
    if (!body.procedureCodeId || typeof body.procedureCodeId !== "string") {
      return NextResponse.json({ error: "procedureCodeId is required" }, { status: 400 });
    }
    const item = await addTreatmentPlanItem({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      treatmentPlanId: body.treatmentPlanId,
      procedureCodeId: body.procedureCodeId,
      phase: Number.isFinite(Number(body.phase)) ? Number(body.phase) : undefined,
      tooth: typeof body.tooth === "string" ? body.tooth : undefined,
      surface: typeof body.surface === "string" ? body.surface : undefined,
    });
    revalidatePath("/app/pms/treatment-plans");
    return NextResponse.json({ data: item }, { status: 201 });
  }
  return NextResponse.json({ error: "Unsupported treatment plan action." }, { status: 400 });
}
