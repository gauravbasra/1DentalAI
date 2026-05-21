import { NextResponse } from "next/server";
import { addClinicalNote } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const body = await request.json();
  if (!body.body || String(body.body).trim().length < 3) {
    return NextResponse.json({ error: "Clinical note body is required" }, { status: 400 });
  }
  const note = await addClinicalNote(patientId, body.body, body.noteType ?? "PROGRESS");
  return NextResponse.json({ data: note }, { status: 201 });
}
