import { NextResponse } from "next/server";
import { deployVoiceAgentCampaign } from "@/lib/voice-ai-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries((await request.formData()).entries());
  try {
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    const result = await deployVoiceAgentCampaign({
      agentId,
      mode: body.mode === "CALL_NOW" ? "CALL_NOW" : "QUEUE_ONLY",
      limit: Number(body.limit || 10),
      actorRole: typeof body.actorRole === "string" ? body.actorRole : "front_desk",
    });
    return NextResponse.json({
      ok: true,
      result,
      semantics: result.mode === "CALL_NOW"
        ? "Voice agent campaign runs were created and live Twilio calls were requested for callable PMS targets."
        : "Voice agent campaign runs were queued from PMS targets. No fake calls were claimed.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Voice agent campaign launch failed.",
    }, { status: 400 });
  }
}
