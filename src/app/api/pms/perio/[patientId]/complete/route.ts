import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { completePerioExam } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { patientId } = await params;
  const body = await request.json();
  const diagnosis = String(body.diagnosis ?? "").trim();
  if (diagnosis.length < 3) {
    return NextResponse.json({ error: "diagnosis is required" }, { status: 400 });
  }

  try {
    const exam = await completePerioExam(patientId, {
      diagnosis,
      providerId: auth.session.userId,
      actorRole: auth.session.roleKey,
    }, auth.session.tenantId);
    if (!exam) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    return NextResponse.json({ data: exam });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete perio exam." }, { status: 400 });
  }
}
