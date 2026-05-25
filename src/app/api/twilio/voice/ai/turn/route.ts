import { handleVoiceAiTurn } from "@/lib/voice-ai-repository";
import { formPayload, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = await formPayload(request);
  try {
    return twiml(await handleVoiceAiTurn({
      conversationId: url.searchParams.get("conversationId"),
      agentId: url.searchParams.get("agentId"),
      agentRunId: url.searchParams.get("agentRunId"),
      scenario: cleanScenario(url.searchParams.get("scenario")),
      payload,
    }));
  } catch (error) {
    console.error("Voice AI turn failed", { error });
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" timeout="5" speechTimeout="auto"><Say voice="Polly.Joanna-Neural">I’m still here to help. I can collect your request for the front desk or try scheduling again.</Say></Gather><Say voice="Polly.Joanna-Neural">I can’t stay on this line right now. I’ve put this in the front desk queue and someone will follow up quickly.</Say></Response>`);
  }
}

function cleanScenario(value: string | null) {
  return value?.split("&")[0] ?? null;
}
