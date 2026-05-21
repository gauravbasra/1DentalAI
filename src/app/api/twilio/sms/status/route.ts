import { formPayload, ingestSmsStatus, twiml } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ingestSmsStatus(await formPayload(request));
  } catch (error) {
    console.error("Twilio SMS status webhook failed", error);
  }
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response />`);
}
