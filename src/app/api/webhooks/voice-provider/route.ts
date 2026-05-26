import { NextResponse } from "next/server";
import { VoiceAgentOrchestrator } from "@/lib/voice-agent/orchestrator";
import { MockSchedulingAdapter } from "@/lib/voice-agent/scheduling/adapters";

export const dynamic = "force-dynamic";

// Provider-agnostic webhook: supports mock providers now; Vapi/Retell/Twilio adapters plug in here.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const eventType = typeof body.event === "string" ? body.event : "";
  const callId = typeof body.call_id === "string" ? body.call_id : "";
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : undefined;
  const practiceId = typeof body.practice_id === "string" ? body.practice_id : null;

  const orchestrator = new VoiceAgentOrchestrator(new MockSchedulingAdapter());

  if (eventType === "call.started") {
    const result = await orchestrator.startCall({
      tenantId,
      practiceId,
      callerPhone: String(body.caller_phone || ""),
      callProvider: String(body.call_provider || "MOCK"),
      providerCallId: typeof body.provider_call_id === "string" ? body.provider_call_id : null,
    });
    return NextResponse.json({ ok: true, result });
  }

  if (eventType === "transcript.delta") {
    const result = await orchestrator.handleMessage({
      tenantId,
      practiceId,
      callId,
      text: String(body.text || ""),
    });
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ ok: false, error: "Unsupported voice-provider event" }, { status: 400 });
}

