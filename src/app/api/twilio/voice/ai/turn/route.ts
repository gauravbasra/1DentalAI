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
    return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" timeout="5" speechTimeout="auto"><Say voice="Polly.Joanna-Neural">I’m still here to help. I can collect your request for the team or try scheduling again.</Say></Gather><Say voice="Polly.Joanna-Neural">The AI line is temporarily unavailable. I’ve moved this to the team queue so a staff member can continue with you right away.</Say></Response>`);
  }
}

function cleanScenario(value: string | null) {
  return value?.split("&")[0] ?? null;
}
