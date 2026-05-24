import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { synthesizeElevenLabsSpeech } from "@/lib/elevenlabs-provider";
import { defaultTenantId } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const result = await query<{ tenantId: string; metadata: unknown }>(
    `select "tenantId", "metadata"
     from "PhoneCallAiAssistEvent"
     where "id" = $1
     limit 1`,
    [eventId],
  );
  const row = result.rows[0];
  const metadata = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : {};
  const text = typeof metadata.voiceText === "string" ? metadata.voiceText : "";
  if (!row || !text.trim()) return new NextResponse("Voice prompt not found.", { status: 404 });
  const audio = await synthesizeElevenLabsSpeech({
    tenantId: row.tenantId || defaultTenantId,
    text,
  });
  if (!audio.ok) {
    return NextResponse.json({ error: audio.error, status: audio.status }, { status: 503 });
  }
  return new Response(audio.audio, {
    headers: {
      "Content-Type": audio.contentType,
      "Cache-Control": "private, max-age=300",
      "X-Voice-Provider": "ELEVENLABS",
    },
  });
}
