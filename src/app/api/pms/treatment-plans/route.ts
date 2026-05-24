import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { buildTreatmentBenefitCase, listTreatmentPlans } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await listTreatmentPlans(auth.session.tenantId) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = (await request.json().catch(() => ({}))) as { action?: string; treatmentPlanId?: string };
  if (body.action !== "buildBenefitCase" || !body.treatmentPlanId) {
    return NextResponse.json({ error: "Unsupported treatment plan action." }, { status: 400 });
  }
  const packet = await buildTreatmentBenefitCase({
    tenantId: auth.session.tenantId,
    actorRole: auth.session.roleKey,
    treatmentPlanId: body.treatmentPlanId,
  });
  return NextResponse.json({ data: packet });
}
