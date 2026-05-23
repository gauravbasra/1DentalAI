import { NextResponse } from "next/server";
import { getOpenAiWebchatConfig } from "@/lib/connector-control-repository";
import { assertScribeConsent, auditScribe, requireScribeSession, type ScribeConsent } from "@/lib/pms-scribe-server";

export const dynamic = "force-dynamic";

const transcriptionModel = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe";
const maxAudioBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await requireScribeSession();
    const formData = await request.formData();
    const consent = normalizeConsent(formData);
    assertScribeConsent(consent);

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }
    if (file.size > maxAudioBytes) {
      return NextResponse.json({ error: "Audio file exceeds the 25 MB transcription limit." }, { status: 413 });
    }

    const openAi = await getOpenAiWebchatConfig(session.tenantId);
    if (!openAi.apiKey) {
      await auditScribe({
        tenantId: session.tenantId,
        actorRole: session.roleKey,
        eventType: "SCRIBE_AUDIO_TRANSCRIPTION_BLOCKED",
        targetType: "PmsClinicalNote",
        targetId: null,
        outcome: "BLOCKED",
        metadata: { blockedReason: openAi.blockedReason ?? "OpenAI connector is not ready." },
      });
      return NextResponse.json({ error: openAi.blockedReason ?? "OpenAI connector is not ready for PHI transcription." }, { status: 503 });
    }

    const upstream = new FormData();
    upstream.set("model", transcriptionModel);
    upstream.set("file", file, file.name || "scribe-audio.webm");
    upstream.set("prompt", "Transcribe a dental appointment conversation for provider-reviewed clinical documentation. Preserve tooth numbers, CDT references, medications, allergies, patient questions, and provider instructions.");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAi.apiKey}` },
      body: upstream,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof data?.error?.message === "string" ? data.error.message : `OpenAI transcription responded ${response.status}`);
    }

    const transcript = String(data.text ?? "").trim();
    await auditScribe({
      tenantId: session.tenantId,
      actorRole: session.roleKey,
      eventType: "SCRIBE_AUDIO_TRANSCRIBED",
      targetType: "PmsClinicalNote",
      targetId: null,
      outcome: "ALLOWED",
      metadata: { model: transcriptionModel, audioBytes: file.size, consent: { recordingMode: consent.recordingMode, patientAcknowledged: true, providerAttestation: true } },
    });

    return NextResponse.json({ data: { transcript, model: transcriptionModel, source: "openai_audio_transcription" } });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to transcribe scribe audio." }, { status });
  }
}

function normalizeConsent(formData: FormData): ScribeConsent {
  return {
    patientAcknowledged: String(formData.get("patientAcknowledged") ?? "") === "true",
    providerAttestation: String(formData.get("providerAttestation") ?? "") === "true",
    signedByName: String(formData.get("signedByName") ?? "").trim(),
    recordingMode: String(formData.get("recordingMode") ?? "ambient_audio").trim() || "ambient_audio",
  };
}
