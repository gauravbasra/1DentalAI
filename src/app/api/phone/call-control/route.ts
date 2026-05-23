import { NextResponse } from "next/server";
import { createPhoneCallControlAction } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  const actionType = typeof body.actionType === "string" ? body.actionType : "";
  if (!actionType) return NextResponse.json({ error: "actionType is required." }, { status: 400 });
  const result = await createPhoneCallControlAction({
    activeCallId: typeof body.activeCallId === "string" ? body.activeCallId : undefined,
    conversationId: typeof body.conversationId === "string" ? body.conversationId : undefined,
    actionType,
    requestedByRole: typeof body.requestedByRole === "string" ? body.requestedByRole : "front_desk",
    targetExtensionId: typeof body.targetExtensionId === "string" ? body.targetExtensionId : undefined,
    targetNumber: typeof body.targetNumber === "string" ? body.targetNumber : undefined,
    targetParkSlot: typeof body.targetParkSlot === "string" ? body.targetParkSlot : undefined,
  });
  if (!contentType.includes("application/json")) {
    const redirectUrl = new URL("/patient-engagement/phone", "https://app.1dentalai.com");
    redirectUrl.searchParams.set("control", actionType);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
  return NextResponse.json({
    status: result.providerStatus,
    actionType,
    result,
    semantics: result.providerStatus === "PROVIDER_ACCEPTED"
      ? "Twilio accepted the live call-control request."
      : "Call-control request recorded and audited. Carrier success is not claimed unless provider execution returns success.",
  });
}
