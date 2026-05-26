import { newId, query } from "@/lib/db";
import { addAudit } from "@/lib/pms-repository";

export type RcmEvidenceSourceType = "prior_auth" | "denial_case" | "era_posting" | "eligibility";

export type RcmEvidenceInput = {
  tenantId: string;
  actorRole?: string;
  sourceType: RcmEvidenceSourceType;
  sourceRecordId: string;
  evidenceType: string;
  title: string;
  storageUrl?: string | null;
  checksum?: string | null;
  extractedFacts?: unknown;
  note?: string | null;
  patientId?: string | null;
  claimId?: string | null;
};

export type RcmEvidenceRow = {
  id: string;
  tenantId: string;
  patientId: string | null;
  claimId: string | null;
  workType: string;
  stage: string;
  status: string;
  sourceRecord: string;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
  proofRequired: string;
  notes: string | null;
};

export type RcmEvidenceLoaded = RcmEvidenceRow & {
  parsedProof: Record<string, unknown>;
  parsedApprovalPolicy: Record<string, unknown>;
};

const EVIDENCE_WORK_TYPE = "RCM_EVIDENCE";

export async function createRcmEvidence(input: RcmEvidenceInput) {
  const sourceRecord = `${input.sourceType}:${input.sourceRecordId}`;
  const tenantId = input.tenantId;
  const workType = `${EVIDENCE_WORK_TYPE}_${String(input.evidenceType || "generic").replace(/[^a-z0-9_]/gi, "_").toUpperCase()}`;
  const id = newId("rcm_evd");

  const result = await query<RcmEvidenceRow>(
    `insert into "RcmWorkItem" (
       "id", "tenantId", "patientId", "claimId", "workType", "stage", "priority", "status", "sourceRecord", "nextAction", "proofRequired", "approvalPolicy", "notes", "ownerRoleKey"
     ) values (
       $1, $2, $3, $4, $5, 'EVIDENCE', 'NORMAL', 'OPEN', $6, $7, $8, $9, $10, 'billing_rcm'
     ) returning *`,
    [
      id,
      tenantId,
      input.patientId || null,
      input.claimId || null,
      workType,
      sourceRecord,
      `Attach and review ${input.evidenceType} for ${input.sourceType} source.`,
      JSON.stringify({
        sourceType: input.sourceType,
        sourceRecordId: input.sourceRecordId,
        evidenceType: input.evidenceType,
        title: input.title,
        storageUrl: input.storageUrl || null,
        checksum: input.checksum || null,
        extractedFacts: input.extractedFacts || null,
      }),
      JSON.stringify({
        title: input.title,
        storageUrl: input.storageUrl || null,
        checksum: input.checksum || null,
        note: input.note || null,
        createdBy: input.actorRole || "billing_rcm",
      }),
      input.note || null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Unable to persist RCM evidence record.");
  }

  await addAudit(tenantId, input.actorRole || "billing_rcm", "RCM_EVIDENCE_UPLOADED", "RcmWorkItem", row.id, "ALLOWED", {
    sourceType: input.sourceType,
    sourceRecordId: input.sourceRecordId,
    evidenceType: input.evidenceType,
    title: input.title,
  });

  return row;
}

export async function getRcmEvidenceForSource(input: { tenantId: string; sourceType: RcmEvidenceSourceType; sourceRecordId: string }) {
  const sourceRecord = `${input.sourceType}:${input.sourceRecordId}`;
  const rows = (await query<RcmEvidenceRow>(
    `select "id", "tenantId", "patientId", "claimId", "workType", "stage", "status", "sourceRecord", "nextAction", "proofRequired", "approvalPolicy", "createdAt", "updatedAt", coalesce("notes", '') as "notes"
       from "RcmWorkItem"
      where "tenantId" = $1 and "stage" = 'EVIDENCE' and "sourceRecord" = $2 and "workType" like 'RCM_EVIDENCE_%'
      order by "createdAt" desc`,
    [input.tenantId, sourceRecord],
  )).rows;

  return rows.map((row) => ({
    ...row,
    parsedProof: safeJson(row.proofRequired),
    parsedApprovalPolicy: safeJson((row as unknown as { approvalPolicy: string }).approvalPolicy),
  }));
}

function safeJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}
