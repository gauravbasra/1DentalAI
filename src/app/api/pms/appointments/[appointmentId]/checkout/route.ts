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
    const status = typeof error === "object" && error && "statusCode" in error && typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 400;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Checkout failed",
        code: typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "CHECKOUT_FAILED") : "CHECKOUT_FAILED",
        details: typeof error === "object" && error && "details" in error ? (error as { details?: unknown }).details : undefined,
      },
      { status },
    );
  }
}
