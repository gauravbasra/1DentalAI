import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { createZoomMeetingForAppointment } from "@/lib/zoom-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  const { appointmentId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const visit = await createZoomMeetingForAppointment({
      appointmentId,
      actorRole: typeof body.actorRole === "string" ? body.actorRole : session.roleKey,
      agenda: typeof body.agenda === "string" ? body.agenda : undefined,
    });
    return NextResponse.json({ ok: true, visit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom meeting could not be created.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
