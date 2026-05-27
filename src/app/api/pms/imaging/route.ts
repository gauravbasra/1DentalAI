import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createImagingStudy, listImagingStudies } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await listImagingStudies(auth.session.tenantId) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  if (!body.patientId || typeof body.patientId !== "string") {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!body.studyType || typeof body.studyType !== "string") {
    return NextResponse.json({ error: "studyType is required" }, { status: 400 });
  }

  try {
    const study = await createImagingStudy({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      patientId: body.patientId,
      providerId: typeof body.providerId === "string" && body.providerId ? body.providerId : undefined,
      appointmentId: typeof body.appointmentId === "string" && body.appointmentId ? body.appointmentId : undefined,
      studyType: body.studyType,
      acquisitionStatus: typeof body.acquisitionStatus === "string" ? body.acquisitionStatus : undefined,
      tooth: typeof body.tooth === "string" ? body.tooth : undefined,
      region: typeof body.region === "string" ? body.region : undefined,
      dicomStudyUid: typeof body.dicomStudyUid === "string" ? body.dicomStudyUid : undefined,
      storageUri: typeof body.storageUri === "string" ? body.storageUri : undefined,
      findings: typeof body.findings === "string" ? body.findings : undefined,
      aiReviewStatus: typeof body.aiReviewStatus === "string" ? body.aiReviewStatus : undefined,
      takenAt: typeof body.takenAt === "string" ? body.takenAt : undefined,
    });
    revalidatePath("/app/pms/imaging");
    revalidatePath(`/app/pms/chart/${body.patientId}`);
    if (body.appointmentId) revalidatePath(`/app/pms/appointments/${body.appointmentId}`);
    return NextResponse.json({ data: study }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create imaging study." }, { status: 400 });
  }
}
