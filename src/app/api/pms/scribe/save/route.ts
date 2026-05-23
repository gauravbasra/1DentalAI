import { NextResponse } from "next/server";
import { requireScribeSession, saveApprovedScribePackage, type ScribeConsent } from "@/lib/pms-scribe-server";
import type { ScribeDraft, ScribeSuggestion, ScribeTaskDraft } from "@/lib/pms-scribe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireScribeSession();
    const body = await request.json();
    const patientId = String(body.patientId ?? "").trim();
    const noteBody = String(body.noteBody ?? "").trim();

    if (!patientId || noteBody.length < 3) {
      return NextResponse.json({ error: "patientId and noteBody are required" }, { status: 400 });
    }

    const data = await saveApprovedScribePackage({
      session,
      patientId,
      noteType: String(body.noteType ?? "PROGRESS").trim() || "PROGRESS",
      noteBody,
      treatmentPlanName: String(body.treatmentPlanName ?? "").trim(),
      treatmentPlanNote: String(body.treatmentPlanNote ?? "").trim(),
      treatmentSuggestions: Array.isArray(body.treatmentSuggestions) ? (body.treatmentSuggestions as ScribeSuggestion[]) : [],
      taskDrafts: Array.isArray(body.taskDrafts) ? (body.taskDrafts as ScribeTaskDraft[]) : [],
      consent: normalizeConsent(body.consent),
      generation: normalizeGeneration(body.generation),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save approved scribe package." }, { status });
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

function normalizeGeneration(value: unknown): ScribeDraft["generation"] | undefined {
  const generation = value as Partial<ScribeDraft["generation"]> | undefined;
  if (!generation?.source || !generation.model) return undefined;
  return {
    source: generation.source === "openai_structured" ? "openai_structured" : "rules_fallback",
    model: String(generation.model),
    blockedReason: generation.blockedReason ? String(generation.blockedReason) : undefined,
  };
}
