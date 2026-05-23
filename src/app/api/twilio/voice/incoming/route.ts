import { buildInboundVoiceTwiML, formPayload, ingestIncomingVoice, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await formPayload(request);
  const call = await ingestIncomingVoice(payload);
  return twiml(await buildInboundVoiceTwiML({ request, payload, conversationId: call.conversationId }));
}

export async function GET() {
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">1DentalAI Twilio voice webhook is ready.</Say></Response>`);
}
