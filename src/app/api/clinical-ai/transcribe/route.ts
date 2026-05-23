import { NextResponse } from "next/server";

const prompt = [
  "Transcribe concise dental periodontal charting dictation.",
  "Preserve tooth numbers, surfaces, pocket depth, gingival margin, CAL, MGJ, mobility, furcation, bleeding, suppuration, plaque, calculus.",
  "Common command examples: tooth fourteen pocket depth three two three; tooth fifteen gingival margin one one two; bleeding on tooth four buccal; mobility grade two.",
].join(" ");

export async function GET() {
  return NextResponse.json({
    serverTranscription: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe",
  });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured. Server transcription is disabled." },
      { status: 503 },
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing audio file." }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append("model", process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe");
  outbound.append("prompt", prompt);
  outbound.append("response_format", "json");
  outbound.append("file", file, file.name || "clinical-voice.webm");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: outbound,
  });

  const text = await response.text();
  if (!response.ok) {
    return NextResponse.json({ ok: false, error: text.slice(0, 800) }, { status: 502 });
  }

  const payload = JSON.parse(text) as { text?: string };
  return NextResponse.json({ ok: true, transcript: payload.text ?? "" });
}
