import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { AppointmentStatusTransitionError, transitionAppointmentStatus } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

const allowed = new Set([
  "SCHEDULED",
  "CONFIRMED",
  "ARRIVED",
  "SEATED",
  "IN_PROGRESS",
  "READY_FOR_CHECKOUT",
  "CHECKED_OUT",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { appointmentId } = await params;
  const body = await request.json();
  if (typeof body.status !== "string" || !allowed.has(body.status)) {
    return NextResponse.json({ error: "Invalid appointment status" }, { status: 400 });
  }

  try {
    const row = await transitionAppointmentStatus({
      appointmentId,
      status: body.status,
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      reason: typeof body.reason === "string" ? body.reason : null,
    });
    if (!row) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    revalidatePath("/app/pms");
    revalidatePath("/app/pms/schedule");
    revalidatePath(`/app/pms/appointments/${appointmentId}`);
    return NextResponse.json({ data: row });
  } catch (error) {
    if (error instanceof AppointmentStatusTransitionError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          appointmentId: error.appointmentId,
          currentStatus: error.currentStatus,
          targetStatus: error.targetStatus,
          allowedStatuses: error.allowedStatuses,
          requiresReason: error.requiresReason,
        },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}
