import { buildInboundVoiceTwiML, formPayload, ingestIncomingVoice, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await formPayload(request);
    const call = await ingestIncomingVoice(payload);
    return twiml(await buildInboundVoiceTwiML({ request, payload, conversationId: call.conversationId }));
  } catch (error) {
    console.error("Twilio inbound voice webhook failed", { error });
    return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" timeout="5" speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna-Neural">Hi, thank you for calling. The front desk is helping another patient, but I can still collect your request. Please say appointment, billing, forms, or staff.</Say>
  </Gather>
  <Say voice="Polly.Joanna-Neural">Thank you. If this is urgent, I have moved this to the team queue and someone will continue with you in this call path.</Say>
</Response>`);
  }
}

export async function GET() {
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">1DentalAI Twilio voice webhook is ready.</Say></Response>`);
}
