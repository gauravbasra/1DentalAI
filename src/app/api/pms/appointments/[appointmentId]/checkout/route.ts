import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { completeAppointmentCheckout } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { appointmentId } = await params;
  const body = await request.json();
  try {
    const result = await completeAppointmentCheckout({
      appointmentId,
      procedureIds: Array.isArray(body.procedureIds) ? body.procedureIds : undefined,
      paymentCents: Number(body.paymentCents ?? 0),
      paymentType: body.paymentType,
      paymentReference: body.paymentReference,
      createClaimDraft: Boolean(body.createClaimDraft),
      overrideBlockers: Boolean(body.overrideBlockers),
      checkoutNote: body.checkoutNote,
      actorRole: auth.session.roleKey,
      tenantId: auth.session.tenantId,
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 400 });
  }
}
