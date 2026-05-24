import { formPayload, ingestVoiceStatus, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ingestVoiceStatus(await formPayload(request));
  } catch (error) {
    console.error("Twilio voice status ingest failed", { error });
  }
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response />`);
}
