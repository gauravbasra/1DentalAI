import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createZoomMeetingForAppointment } from "@/lib/zoom-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { appointmentId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const visit = await createZoomMeetingForAppointment({
      appointmentId,
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      agenda: typeof body.agenda === "string" ? body.agenda : undefined,
    });
    return NextResponse.json({ ok: true, visit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom meeting could not be created.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
