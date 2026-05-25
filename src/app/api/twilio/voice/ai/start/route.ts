import { buildVoiceAiStartTwiML } from "@/lib/voice-ai-repository";
import { formPayload, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = await formPayload(request);
  try {
    return twiml(await buildVoiceAiStartTwiML({
      conversationId: url.searchParams.get("conversationId"),
      agentId: url.searchParams.get("agentId"),
      agentRunId: url.searchParams.get("agentRunId"),
      scenario: cleanScenario(url.searchParams.get("scenario")),
      reason: url.searchParams.get("reason"),
      payload,
    }));
  } catch (error) {
    console.error("Voice AI start failed", { error });
    return twiml(fallbackVoiceTwiML());
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    return twiml(await buildVoiceAiStartTwiML({
      conversationId: url.searchParams.get("conversationId"),
      agentId: url.searchParams.get("agentId"),
      agentRunId: url.searchParams.get("agentRunId"),
      scenario: cleanScenario(url.searchParams.get("scenario")),
      reason: url.searchParams.get("reason"),
    }));
  } catch (error) {
    console.error("Voice AI start failed", { error });
    return twiml(fallbackVoiceTwiML());
  }
}

function cleanScenario(value: string | null) {
  return value?.split("&")[0] ?? null;
}

function fallbackVoiceTwiML() {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" timeout="5" speechTimeout="auto"><Say voice="Polly.Joanna-Neural">Hi, this is one dental AI. I can help with appointments, reminders, and follow up requests. How can I help today?</Say></Gather><Say voice="Polly.Joanna-Neural">The AI line is unavailable right now. I’m transferring you to our team queue so someone can continue with you in one-touch support.</Say></Response>`;
}
