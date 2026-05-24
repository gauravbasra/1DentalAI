import { NextResponse } from "next/server";
import { createSoftphoneOutboundDial } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());

  const targetNumber = typeof body.targetNumber === "string" ? body.targetNumber : "";
  const mode = body.mode === "VOICE_AI" ? "VOICE_AI" : "OPERATOR_BRIDGE";

  try {
    const result = await createSoftphoneOutboundDial({
      targetNumber,
      operatorNumber: typeof body.operatorNumber === "string" ? body.operatorNumber : undefined,
      fromNumber: typeof body.fromNumber === "string" ? body.fromNumber : undefined,
      fromNumberId: typeof body.fromNumberId === "string" ? body.fromNumberId : undefined,
      mode,
      requestedByRole: typeof body.requestedByRole === "string" ? body.requestedByRole : "front_desk",
    });

    if (!contentType.includes("application/json")) {
      const redirectUrl = new URL("/patient-engagement", "https://app.1dentalai.com");
      redirectUrl.searchParams.set("panel", "phone");
      redirectUrl.searchParams.set("conversationId", result.conversationId);
      redirectUrl.searchParams.set("dial", result.providerStatus);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.json({
      ok: result.providerStatus === "PROVIDER_ACCEPTED",
      result,
      semantics: result.providerStatus === "PROVIDER_ACCEPTED"
        ? "Twilio accepted the live softphone request. The conversation, active call, call-control action, and audit event were written."
        : "The softphone request was written and audited, but carrier success is not claimed unless Twilio accepts it.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Softphone dial failed.",
    }, { status: 400 });
  }
}
