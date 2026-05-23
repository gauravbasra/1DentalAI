import { NextResponse } from "next/server";
import { getOpenAiWebchatConfig } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";
import { getWebchatAiRuntimeSettings } from "@/lib/webchat/repository";

const prompt = [
  "Transcribe concise dental periodontal charting dictation.",
  "Preserve tooth numbers, surfaces, pocket depth, gingival margin, CAL, MGJ, mobility, furcation, bleeding, suppuration, plaque, calculus.",
  "Common command examples: tooth fourteen pocket depth three two three; tooth fifteen gingival margin one one two; bleeding on tooth four buccal; mobility grade two.",
].join(" ");

export async function GET() {
  const [openAi, settings] = await Promise.all([
    getOpenAiWebchatConfig(defaultTenantId),
    getWebchatAiRuntimeSettings(defaultTenantId),
  ]);

  return NextResponse.json({
    serverTranscription: Boolean(openAi.apiKey),
    model: transcriptionModel(settings.voiceSettings.transcriptionModel),
    source: openAi.source,
    blockedReason: openAi.apiKey ? null : openAi.blockedReason,
    credentialStatus: openAi.credentialStatus,
    approvalStatus: openAi.approvalStatus,
    healthStatus: openAi.healthStatus,
  });
}

export async function POST(request: Request) {
  const incoming = await request.formData();
  const tenantId = String(incoming.get("tenantId") ?? defaultTenantId);
  const [openAi, settings] = await Promise.all([
    getOpenAiWebchatConfig(tenantId),
    getWebchatAiRuntimeSettings(tenantId),
  ]);

  if (!openAi.apiKey) {
    return NextResponse.json(
      { ok: false, error: openAi.blockedReason ?? "OpenAI credential is not configured. Server transcription is disabled." },
      { status: 503 },
    );
  }

  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing audio file." }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append("model", transcriptionModel(settings.voiceSettings.transcriptionModel));
  outbound.append("prompt", prompt);
  outbound.append("response_format", "json");
  outbound.append("file", file, file.name || "clinical-voice.webm");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAi.apiKey}` },
    body: outbound,
  });

  const text = await response.text();
  if (!response.ok) {
    return NextResponse.json({ ok: false, error: text.slice(0, 800) }, { status: 502 });
  }

  const payload = JSON.parse(text) as { text?: string };
  return NextResponse.json({ ok: true, transcript: payload.text ?? "" });
}

function transcriptionModel(value?: string) {
  const model = value?.trim() || process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe";
  if (model === "whisper-1" || /transcribe/i.test(model)) return model;
  return "gpt-4o-transcribe";
}
