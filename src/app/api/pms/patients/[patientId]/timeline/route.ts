import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { getPatient } from "@/lib/pms-repository";
import { getPatientTimeline } from "@/lib/patient-timeline-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { patientId } = await params;
  const url = new URL(request.url);
  const patient = await getPatient(patientId, auth.session.tenantId);
  if (!patient) return NextResponse.json({ ok: false, error: "Patient not found." }, { status: 404 });

  const timeline = await getPatientTimeline({
    tenantId: auth.session.tenantId,
    patientId,
    filters: {
      source: url.searchParams.get("source") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    },
    limit: Number(url.searchParams.get("limit") ?? 100),
  });

  return NextResponse.json({
    ok: true,
    data: {
      patient,
      timeline,
      count: timeline.length,
      filters: {
        source: url.searchParams.get("source") ?? "ALL",
        status: url.searchParams.get("status") ?? "ALL",
        from: url.searchParams.get("from") ?? null,
        to: url.searchParams.get("to") ?? null,
      },
    },
  });
}
