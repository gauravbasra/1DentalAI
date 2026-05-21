import { formPayload, ingestTranscription, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ingestTranscription(await formPayload(request));
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response />`);
}
