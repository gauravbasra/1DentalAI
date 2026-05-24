import { buildVoiceAiStartTwiML } from "@/lib/voice-ai-repository";
import { formPayload, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = await formPayload(request);
  return twiml(await buildVoiceAiStartTwiML({
    conversationId: url.searchParams.get("conversationId"),
    scenario: url.searchParams.get("scenario"),
    reason: url.searchParams.get("reason"),
    payload,
  }));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return twiml(await buildVoiceAiStartTwiML({
    conversationId: url.searchParams.get("conversationId"),
    scenario: url.searchParams.get("scenario"),
    reason: url.searchParams.get("reason"),
  }));
}
