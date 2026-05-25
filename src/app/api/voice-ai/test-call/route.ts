import { NextResponse } from "next/server";
import { createVoiceAiTestCall } from "@/lib/voice-ai-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  const toNumber = typeof body.toNumber === "string" ? body.toNumber : "";
  try {
    const result = await createVoiceAiTestCall({
      toNumber,
      scenario: typeof body.scenario === "string" ? body.scenario : "event_greeting",
      agentId: typeof body.agentId === "string" ? body.agentId : undefined,
      actorRole: typeof body.actorRole === "string" ? body.actorRole : "front_desk",
    });
    return NextResponse.json({
      ok: result.providerStatus === "PROVIDER_ACCEPTED",
      result,
      semantics: result.providerStatus === "PROVIDER_ACCEPTED"
        ? "Twilio accepted the live Voice AI call. Conversation, active call, audit, and transcript events will update from webhooks."
        : "The call attempt was recorded, but the carrier did not accept it. No fake success was claimed.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Voice AI test call failed.",
    }, { status: 400 });
  }
}
