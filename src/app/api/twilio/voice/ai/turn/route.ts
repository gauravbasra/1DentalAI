import { handleVoiceAiTurn } from "@/lib/voice-ai-repository";
import { formPayload, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const payload = await formPayload(request);
  return twiml(await handleVoiceAiTurn({
    conversationId: url.searchParams.get("conversationId"),
    scenario: url.searchParams.get("scenario"),
    payload,
  }));
}
