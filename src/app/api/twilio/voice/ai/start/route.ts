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
    return twiml(fallbackVoiceTwiML({
      conversationId: url.searchParams.get("conversationId"),
      agentId: url.searchParams.get("agentId"),
      agentRunId: url.searchParams.get("agentRunId"),
      scenario: cleanScenario(url.searchParams.get("scenario")),
    }));
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
    return twiml(fallbackVoiceTwiML({
      conversationId: url.searchParams.get("conversationId"),
      agentId: url.searchParams.get("agentId"),
      agentRunId: url.searchParams.get("agentRunId"),
      scenario: cleanScenario(url.searchParams.get("scenario")),
    }));
  }
}

function cleanScenario(value: string | null) {
  return value?.split("&")[0] ?? null;
}

function fallbackVoiceTwiML(input: { conversationId: string | null; agentId: string | null; agentRunId: string | null; scenario: string | null }) {
  const origin = process.env.ONE_DENTAL_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.1dentalai.com";
  const scenario = input.scenario || "inbound_takeover";
  const params = new URLSearchParams({
    scenario,
    reason: "start_fallback",
  });
  if (input.conversationId) params.set("conversationId", input.conversationId);
  if (input.agentId) params.set("agentId", input.agentId);
  if (input.agentRunId) params.set("agentRunId", input.agentRunId);
  const redirectUrl = `${origin}/api/twilio/voice/ai/turn?${params.toString()}`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech dtmf" timeout="6" speechTimeout="auto"><Say voice="Polly.Joanna-Neural">Hi, you’ve reached 1DentalAI. I’m here with you. Tell me what you need help with today, like booking an appointment, rescheduling, or a billing question.</Say></Gather><Redirect method="POST">${redirectUrl}</Redirect></Response>`;
}
