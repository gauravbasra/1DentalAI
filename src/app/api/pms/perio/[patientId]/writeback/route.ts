import { NextResponse } from "next/server";
import { requestPerioWriteback } from "@/lib/perio-workflow";
import { requirePmsApiSession } from "@/lib/pms-api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { patientId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    providerApprovalId?: string;
    providerApprovalRole?: string;
    providerApprovalNote?: string;
    perioSignoffId?: string;
    connectorInstanceId?: string;
    preferredAction?: "draft" | "request";
  };

  try {
    const providerApprovalId = String(body.providerApprovalId ?? "").trim();
    const perioSignoffId = String(body.perioSignoffId ?? "").trim();

    if (!providerApprovalId) {
      return NextResponse.json({ ok: false, error: "providerApprovalId is required." }, { status: 400 });
    }
    if (!perioSignoffId) {
      return NextResponse.json({ ok: false, error: "perioSignoffId is required." }, { status: 400 });
    }

    const data = await requestPerioWriteback({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      actorUserId: auth.session.userId,
      patientId,
      providerApprovalId,
      providerApprovalRole: String(body.providerApprovalRole ?? auth.session.roleKey).trim() || auth.session.roleKey,
      providerApprovalNote: String(body.providerApprovalNote ?? "").trim() || undefined,
      perioSignoffId,
      connectorInstanceId: body.connectorInstanceId,
      preferredAction: body.preferredAction,
    });

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create perio writeback." }, { status });
  }
}
