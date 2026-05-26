import { NextResponse } from "next/server";
import { createRcmEvidence, type RcmEvidenceSourceType } from "@/lib/rcm-evidence-repository";
import { requirePmsApiSession } from "@/lib/pms-api-auth";

export const dynamic = "force-dynamic";

type UploadBody = {
  sourceType?: string;
  sourceRecordId?: string;
  evidenceType?: string;
  title?: string;
  storageUrl?: string;
  checksum?: string;
  extractedFacts?: unknown;
  note?: string;
  patientId?: string;
  claimId?: string;
};

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => ({}))) as UploadBody;
  const sourceType = String(body.sourceType ?? "").trim() as RcmEvidenceSourceType;
  const sourceRecordId = String(body.sourceRecordId ?? "").trim();
  const evidenceType = String(body.evidenceType ?? "").trim();
  const title = String(body.title ?? "").trim();
  const storageUrl = typeof body.storageUrl === "string" ? body.storageUrl.trim() : undefined;
  const checksum = typeof body.checksum === "string" ? body.checksum.trim() : undefined;

  if (!sourceType || !["prior_auth", "denial_case", "era_posting", "eligibility"].includes(sourceType)) {
    return NextResponse.json(
      { ok: false, error: "sourceType must be one of: prior_auth, denial_case, era_posting, eligibility." },
      { status: 400 },
    );
  }
  if (!sourceRecordId) return NextResponse.json({ ok: false, error: "sourceRecordId is required." }, { status: 400 });
  if (!evidenceType) return NextResponse.json({ ok: false, error: "evidenceType is required." }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "title is required." }, { status: 400 });

  try {
    const row = await createRcmEvidence({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      sourceType,
      sourceRecordId,
      evidenceType,
      title,
      storageUrl: storageUrl || null,
      checksum: checksum || null,
      extractedFacts: body.extractedFacts,
      note: body.note?.trim() || null,
      patientId: body.patientId?.trim() || null,
      claimId: body.claimId?.trim() || null,
    });

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to upload evidence." }, { status });
  }
}
