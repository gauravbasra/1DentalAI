import { NextResponse } from "next/server";
import { generateProductionScribeDraft, requireScribeSession, type ScribeConsent } from "@/lib/pms-scribe-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireScribeSession();
    const body = await request.json();
    const transcript = String(body.transcript ?? "").trim();
    if (transcript.length < 3) {
      return NextResponse.json({ error: "Transcript or dictation is required" }, { status: 400 });
    }

    const consent = normalizeConsent(body.consent);
    const draft = await generateProductionScribeDraft({
      session,
      transcript,
      templateKey: body.templateKey,
      patientName: body.patientName,
      useAi: body.useAi !== false,
      consent,
    });

    return NextResponse.json({ data: draft });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate scribe draft." }, { status });
  }
}

function normalizeConsent(value: unknown): ScribeConsent {
  const consent = (value ?? {}) as Partial<ScribeConsent>;
  return {
    patientAcknowledged: consent.patientAcknowledged === true,
    providerAttestation: consent.providerAttestation === true,
    signedByName: String(consent.signedByName ?? "").trim(),
    recordingMode: String(consent.recordingMode ?? "manual_dictation").trim() || "manual_dictation",
  };
}
