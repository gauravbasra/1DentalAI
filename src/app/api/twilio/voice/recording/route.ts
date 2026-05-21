import { formPayload, ingestRecording, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ingestRecording(await formPayload(request));
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response />`);
}
