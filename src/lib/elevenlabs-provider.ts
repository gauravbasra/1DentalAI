import { getElevenLabsVoiceConfig } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";

let cachedDefaultVoiceId: string | null = null;

export async function synthesizeElevenLabsSpeech(input: {
  tenantId?: string;
  text: string;
  voiceId?: string | null;
  stability?: number;
  similarityBoost?: number;
  speed?: number;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const config = await getElevenLabsVoiceConfig(tenantId);
  if (!config.apiKey) {
    return {
      ok: false as const,
      status: "BLOCKED_CONNECTOR_REQUIRED",
      error: config.blockedReason || "ElevenLabs API key is not configured.",
    };
  }
  const voiceId = input.voiceId || process.env.ELEVENLABS_VOICE_ID || await resolveDefaultVoiceId(config.apiKey);
  if (!voiceId) {
    return {
      ok: false as const,
      status: "BLOCKED_CONNECTOR_REQUIRED",
      error: "No ElevenLabs voice is available for this tenant.",
    };
  }
  const text = input.text.trim().slice(0, 2400);
  if (!text) {
    return { ok: false as const, status: "BLOCKED_EMPTY_TEXT", error: "Voice text is empty." };
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "xi-api-key": config.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5",
      voice_settings: {
        stability: clampNumber(input.stability ?? Number(process.env.ELEVENLABS_STABILITY || 0.47), 0, 1),
        similarity_boost: clampNumber(input.similarityBoost ?? Number(process.env.ELEVENLABS_SIMILARITY_BOOST || 0.78), 0, 1),
        speed: clampNumber(input.speed ?? Number(process.env.ELEVENLABS_SPEED || 1), 0.7, 1.2),
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false as const,
      status: "PROVIDER_ERROR",
      error: `ElevenLabs rejected synthesis: ${detail.slice(0, 400) || `HTTP ${response.status}`}`,
    };
  }
  return {
    ok: true as const,
    status: "PROVIDER_ACCEPTED",
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/mpeg",
    voiceId,
  };
}

async function resolveDefaultVoiceId(apiKey: string) {
  if (cachedDefaultVoiceId) return cachedDefaultVoiceId;
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  const voices = Array.isArray(data?.voices) ? data.voices as Array<Record<string, unknown>> : [];
  const preferred = voices.find((voice) => /rachel|sarah|aria|jessica/i.test(String(voice.name || ""))) ?? voices[0];
  cachedDefaultVoiceId = typeof preferred?.voice_id === "string" ? preferred.voice_id : null;
  return cachedDefaultVoiceId;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
