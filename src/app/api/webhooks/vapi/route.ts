import { NextResponse } from "next/server";
import { handleVapiWebhook } from "@/lib/vapi-webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await handleVapiWebhook({ request, body });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vapi webhook failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

