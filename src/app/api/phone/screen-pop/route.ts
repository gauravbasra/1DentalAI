import { NextResponse } from "next/server";
import { getPhoneScreenPop } from "@/lib/twilio-webhooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const screenPop = await getPhoneScreenPop({
    conversationId: url.searchParams.get("conversationId") || undefined,
    activeCallId: url.searchParams.get("activeCallId") || undefined,
    callerNumber: url.searchParams.get("callerNumber") || undefined,
  });
  if (!screenPop) return NextResponse.json({ error: "No phone screen pop found." }, { status: 404 });
  return NextResponse.json({ screenPop });
}
