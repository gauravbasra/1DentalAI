import { NextResponse } from "next/server";
import { generateScribeDraft } from "@/lib/pms-scribe";
import { listProcedureCodes } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const transcript = String(body.transcript ?? "").trim();
  if (transcript.length < 3) {
    return NextResponse.json({ error: "Transcript or dictation is required" }, { status: 400 });
  }

  const procedureCodes = await listProcedureCodes();
  const draft = generateScribeDraft({
    transcript,
    templateKey: body.templateKey,
    procedureCodes,
    patientName: body.patientName,
  });

  return NextResponse.json({ data: draft });
}
