import { formPayload, ingestIncomingVoice, publicWebhookUrl, twiml, xmlEscape } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await formPayload(request);
  await ingestIncomingVoice(payload);
  const origin = new URL(publicWebhookUrl(request)).origin;
  const recordingUrl = `${origin}/api/twilio/voice/recording`;
  const transcriptionUrl = `${origin}/api/twilio/voice/transcription`;
  return twiml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Your call has reached the dental team. Please leave a message after the tone and a staff member will follow up. If this is a medical emergency, please hang up and call 911.</Say>
  <Record maxLength="180" playBeep="true" recordingStatusCallback="${xmlEscape(recordingUrl)}" recordingStatusCallbackMethod="POST" transcribe="true" transcribeCallback="${xmlEscape(transcriptionUrl)}" />
  <Say voice="alice">We did not receive a message. Goodbye.</Say>
</Response>`);
}

export async function GET() {
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">1DentalAI Twilio voice webhook is ready.</Say></Response>`);
}
