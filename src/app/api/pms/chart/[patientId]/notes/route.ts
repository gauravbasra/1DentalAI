import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { addClinicalNote } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { patientId } = await params;
  const body = await request.json();
  if (!body.body || String(body.body).trim().length < 3) {
    return NextResponse.json({ error: "Clinical note body is required" }, { status: 400 });
  }
  const note = await addClinicalNote(patientId, body.body, body.noteType ?? "PROGRESS", auth.session.tenantId);
  if (!note) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ data: note }, { status: 201 });
}
