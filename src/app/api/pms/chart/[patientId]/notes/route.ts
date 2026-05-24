import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { addClinicalNote, addClinicalNoteAddendum, signClinicalNote } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { patientId } = await params;
  const body = await request.json();
  if (!body.body || String(body.body).trim().length < 3) {
    return NextResponse.json({ error: "Clinical note body is required" }, { status: 400 });
  }
  const note = await addClinicalNote(patientId, body.body, body.noteType ?? "PROGRESS", auth.session.tenantId, auth.session.roleKey, {
    appointmentId: typeof body.appointmentId === "string" ? body.appointmentId : undefined,
    noteTemplateKey: typeof body.noteTemplateKey === "string" ? body.noteTemplateKey : undefined,
    sourceModule: "chart_api",
  });
  if (!note) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ data: note }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json();
  const noteId = typeof body.noteId === "string" ? body.noteId : "";
  if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });

  if (body.action === "sign") {
    const note = await signClinicalNote({ noteId, tenantId: auth.session.tenantId, actorRole: auth.session.roleKey });
    return NextResponse.json({ data: note });
  }

  if (body.action === "addendum") {
    if (!body.body || String(body.body).trim().length < 3) {
      return NextResponse.json({ error: "Addendum body is required" }, { status: 400 });
    }
    if (!body.reason || String(body.reason).trim().length < 3) {
      return NextResponse.json({ error: "Addendum reason is required" }, { status: 400 });
    }
    const note = await addClinicalNoteAddendum({
      noteId,
      body: body.body,
      reason: body.reason,
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
    });
    return NextResponse.json({ data: note }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported note action" }, { status: 400 });
}
