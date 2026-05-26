import { NextResponse } from "next/server";
import { applyPerioVoiceCommand } from "@/lib/perio-workflow";
import { requirePmsApiSession } from "@/lib/pms-api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { patientId } = await params;
  const body = (await request.json().catch(() => ({}))) as { rawText?: string };
  const rawText = String(body.rawText ?? "").trim();

  if (!rawText) {
    return NextResponse.json({ ok: false, error: "rawText is required." }, { status: 400 });
  }

  try {
    const result = await applyPerioVoiceCommand({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      actorUserId: auth.session.userId,
      patientId,
      rawText,
    });
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to process perio voice command." }, { status });
  }
}
