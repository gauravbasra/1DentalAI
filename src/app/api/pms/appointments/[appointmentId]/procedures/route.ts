import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { addAppointmentProcedure } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set(["PROPOSED", "ACCEPTED", "PLANNED", "IN_PROGRESS", "COMPLETED", "BILLED"]);

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { appointmentId } = await params;
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status.toUpperCase() : "PLANNED";
  if (!body.procedureCodeId || typeof body.procedureCodeId !== "string") {
    return NextResponse.json({ error: "procedureCodeId is required" }, { status: 400 });
  }
  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Invalid procedure status" }, { status: 400 });
  }

  try {
    const procedure = await addAppointmentProcedure({
      appointmentId,
      procedureCodeId: body.procedureCodeId,
      tooth: typeof body.tooth === "string" ? body.tooth : undefined,
      surface: typeof body.surface === "string" ? body.surface : undefined,
      feeCents: Number.isFinite(Number(body.feeCents)) ? Number(body.feeCents) : undefined,
      status,
      actorRole: auth.session.roleKey,
      tenantId: auth.session.tenantId,
    });
    revalidatePath(`/app/pms/appointments/${appointmentId}`);
    revalidatePath("/app/pms/schedule");
    return NextResponse.json({ data: procedure }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add appointment procedure." }, { status: 400 });
  }
}
