import { getRcmEvidenceForSource, type RcmEvidenceSourceType } from "@/lib/rcm-evidence-repository";
import { query } from "@/lib/db";

export type RcmPacketType = "ELIGIBILITY" | "PRIOR_AUTH" | "DENIAL_APPEAL" | "ERA_POSTING";

type SourceRecord = {
  id: string;
  tenantId: string;
  patientId: string;
  payerName?: string | null;
  status?: string | null;
  requestedCents?: number | null;
  denialReason?: string | null;
  allowedCents?: number | null;
  paidCents?: number | null;
  patientDueCents?: number | null;
  adjustmentCents?: number | null;
  connectorStatus?: string | null;
  blockedReason?: string | null;
  requiredEvidence?: unknown;
  claimId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  appealDeadline?: string | null;
  frequencies?: unknown;
  limitations?: unknown;
  annualMaxCents?: number | null;
  annualUsedCents?: number | null;
  deductibleCents?: number | null;
  eligibilityStatus?: string | null;
  benefitYear?: number | null;
  [key: string]: unknown;
};

export type RcmPacketResult = {
  packetId: string;
  packetType: RcmPacketType;
  sourceType: RcmEvidenceSourceType;
  sourceRecordId: string;
  status: "DRAFT" | "READY_FOR_REVIEW" | "BLOCKED";
  blockedReason?: string;
  summary: string;
  checklist: Array<{ label: string; status: string; source: string }>;
  requiredEvidence: string[];
  attachedEvidenceCount: number;
  evidenceIds: string[];
  source: SourceRecord;
};

export async function buildRcmPacket(input: {
  tenantId: string;
  actorRole: string;
  packetType: RcmPacketType;
  sourceRecordId: string;
}) {
  if (!input.sourceRecordId.trim()) {
    throw Object.assign(new Error("sourceRecordId is required."), { status: 400 });
  }

  const [sourceType, sourceData] = await loadSourceRecord(input);
  const evidence = await getRcmEvidenceForSource({
    tenantId: input.tenantId,
    sourceType,
    sourceRecordId: input.sourceRecordId,
  });

  const requiredEvidence = normalizeRequiredEvidence(input.packetType, sourceData.requiredEvidence);
  const evidenceIds = evidence.map((item) => item.id);
  const attachedEvidenceTypes = new Set(
    evidence
      .map((item) => extractEvidenceType(item.parsedProof))
      .filter((value): value is string => Boolean(value)),
  );
  const missingEvidence = requiredEvidence.filter((item) => !attachedEvidenceTypes.has(item));

  const sourceBlocked = (String(sourceData.connectorStatus ?? "").toUpperCase() === "BLOCKED") || Boolean(sourceData.blockedReason);
  const statusFromPacket =
    missingEvidence.length > 0
      ? "BLOCKED"
      : sourceBlocked
        ? "BLOCKED"
        : requiredEvidence.length > 0
          ? "READY_FOR_REVIEW"
          : "DRAFT";

  const checklist = [
    ...requiredEvidence.map((item) => ({
      label: `Evidence: ${item}`,
      status: attachedEvidenceTypes.has(item) ? "READY" : "MISSING",
      source: attachedEvidenceTypes.has(item) ? "source" : "required",
    })),
    ...evidence.slice(0, 2).map((item) => ({
      label: `Attached: ${String(item.workType)}`,
      status: "ATTACHED",
      source: "found",
    })),
  ];

  const summary = `${input.packetType} packet for source ${input.sourceRecordId} is ${statusFromPacket.toLowerCase()} with ${evidence.length} evidence item(s).`;

  const blockedReason =
    missingEvidence.length > 0
      ? `Missing required evidence: ${missingEvidence.join(", ")}.`
      : sourceData.blockedReason?.trim() ||
        (sourceData.connectorStatus === "BLOCKED" && "Connector policy blocked source record.")
      || undefined;

  return {
    packetId: `${input.packetType.toLowerCase()}:${input.sourceRecordId}:${sourceType}`,
    packetType: input.packetType,
    sourceType,
    sourceRecordId: input.sourceRecordId,
    status: statusFromPacket,
    blockedReason,
    summary,
    checklist,
    requiredEvidence,
    attachedEvidenceCount: evidence.length,
    evidenceIds,
    source: sourceData,
  } as RcmPacketResult;
}

async function loadSourceRecord(input: { tenantId: string; packetType: RcmPacketType; sourceRecordId: string }): Promise<[RcmEvidenceSourceType, SourceRecord]> {
  switch (input.packetType) {
    case "PRIOR_AUTH":
      return ["prior_auth", await loadPriorAuthRecord(input.tenantId, input.sourceRecordId)];
    case "DENIAL_APPEAL":
      return ["denial_case", await loadDenialRecord(input.tenantId, input.sourceRecordId)];
    case "ERA_POSTING":
      return ["era_posting", await loadEraRecord(input.tenantId, input.sourceRecordId)];
    case "ELIGIBILITY":
    default:
      return ["eligibility", await loadEligibilityRecord(input.tenantId, input.sourceRecordId)];
  }
}

async function loadPriorAuthRecord(tenantId: string, sourceRecordId: string): Promise<SourceRecord> {
  const row = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    payerName: string;
    status: string;
    requestedCents: number;
    requiredEvidence: unknown;
    connectorStatus: string;
    blockedReason: string | null;
    createdAt: string;
    updatedAt: string;
    treatmentPlanId: string | null;
  }>(
    `select "id", "tenantId", "patientId", "payerName", "status", "requestedCents", "requiredEvidence", "connectorStatus", "blockedReason", "createdAt", "updatedAt", "treatmentPlanId", "patientInsuranceId"
       from "RcmPriorAuthorization"
      where pe."tenantId" = $1 and pe."id" = $2
      limit 1`,
    [tenantId, sourceRecordId],
  )).rows[0];

  if (!row) {
    throw Object.assign(new Error("Source record not found in RcmPriorAuthorization."), { status: 404 });
  }

  return {
    ...row,
    patientId: row.patientId,
    requiredEvidence: Array.isArray(row.requiredEvidence) ? row.requiredEvidence : extractJson(row.requiredEvidence),
    treatmentPlanId: row.treatmentPlanId ?? null,
    claimId: null,
    blockedReason: row.blockedReason ?? null,
    connectorStatus: row.connectorStatus,
    status: row.status,
  };
}

async function loadDenialRecord(tenantId: string, sourceRecordId: string): Promise<SourceRecord> {
  const row = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    payerName: string;
    claimId: string;
    status: string;
    denialReason: string | null;
    requiredEvidence: unknown;
    appealDeadline: string | null;
    connectorStatus: string;
    blockedReason: string | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `select "id", "tenantId", "patientId", "payerName", "claimId", "status", "denialReason", "requiredEvidence", "appealDeadline", "connectorStatus", "blockedReason", "createdAt", "updatedAt"
       from "RcmDenialCase"
      where "tenantId" = $1 and "id" = $2
      limit 1`,
    [tenantId, sourceRecordId],
  )).rows[0];

  if (!row) {
    throw Object.assign(new Error("Source record not found in RcmDenialCase."), { status: 404 });
  }

  return {
    ...row,
    requiredEvidence: Array.isArray(row.requiredEvidence) ? row.requiredEvidence : extractJson(row.requiredEvidence),
    claimId: row.claimId,
    blockedReason: row.blockedReason ?? null,
    connectorStatus: row.connectorStatus,
    status: row.status,
    denialReason: row.denialReason ?? null,
    appealDeadline: row.appealDeadline,
  };
}

async function loadEraRecord(tenantId: string, sourceRecordId: string): Promise<SourceRecord> {
  const row = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    payerName: string;
    claimId: string;
    status: string;
    allowedCents: number;
    paidCents: number;
    patientDueCents: number;
    adjustmentCents: number;
    connectorStatus: string;
    blockedReason: string | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `select "id", "tenantId", "patientId", "payerName", "claimId", "status", "allowedCents", "paidCents", "patientDueCents", "adjustmentCents", "connectorStatus", "blockedReason", "createdAt", "updatedAt"
       from "RcmEraPosting"
      where "tenantId" = $1 and "id" = $2
      limit 1`,
    [tenantId, sourceRecordId],
  )).rows[0];

  if (!row) {
    throw Object.assign(new Error("Source record not found in RcmEraPosting."), { status: 404 });
  }

  return {
    ...row,
    claimId: row.claimId,
    blockedReason: row.blockedReason ?? null,
    connectorStatus: row.connectorStatus,
    status: row.status,
    requiredEvidence: [],
  };
}

async function loadEligibilityRecord(tenantId: string, sourceRecordId: string): Promise<SourceRecord> {
  const row = (await query<{
    id: string;
    tenantId: string;
    patientInsuranceId: string;
    patientId: string | null;
    eligibilityStatus: string;
    benefitYear: number;
    deductibleCents: number;
    annualMaxCents: number;
    annualUsedCents: number;
    frequencies: unknown;
    limitations: unknown;
    writebackStatus: string;
    normalizedFields: unknown;
    createdAt: string;
    updatedAt: string;
  }>(
    `select pe."id", pe."tenantId", pe."patientInsuranceId", pe."eligibilityStatus", pe."benefitYear", pe."deductibleCents", pe."annualMaxCents", pe."annualUsedCents", pe."frequencies", pe."limitations", pe."writebackStatus", pe."normalizedFields", pe."createdAt", pe."updatedAt", pi."patientId"
      from "PmsEligibilityEvidence" pe
      left join "PmsPatientInsurance" pi on pi."id" = pe."patientInsuranceId"
      where pe."tenantId" = $1 and pe."id" = $2
      limit 1`,
    [tenantId, sourceRecordId],
  )).rows[0];

  if (!row) {
    throw Object.assign(new Error("Source record not found in PmsEligibilityEvidence."), { status: 404 });
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId || String(row.patientInsuranceId),
    eligibilityStatus: row.eligibilityStatus,
    benefitYear: row.benefitYear,
    deductibleCents: row.deductibleCents,
    annualMaxCents: row.annualMaxCents,
    annualUsedCents: row.annualUsedCents,
    frequencies: row.frequencies,
    limitations: row.limitations,
    status: row.writebackStatus,
    requiredEvidence: buildEligibilityEvidenceRequirements(row.frequencies, row.limitations),
    connectorStatus: "NOT_BLOCKED",
    blockedReason: "",
    normalizedFields: row.normalizedFields,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeRequiredEvidence(packetType: RcmPacketType, rawEvidence?: unknown) {
  if (Array.isArray(rawEvidence)) {
    return rawEvidence.map((value) => String(value).trim()).filter(Boolean);
  }

  if (packetType === "PRIOR_AUTH") return ["providerApprovalId", "clinicalNarrative", "periodontalHistory"];
  if (packetType === "DENIAL_APPEAL") return ["appealReason", "clinicalStatement", "supportingAttachment"];
  if (packetType === "ERA_POSTING") return ["eraTrace", "eobPdf", "postingApproval"];
  return ["evidenceSnapshot", "eligibilityResult", "limitBalances"];
}

function buildEligibilityEvidenceRequirements(frequencies: unknown, limitations: unknown) {
  const normalizedFrequencies = extractEvidenceTokens(frequencies);
  const normalizedLimitations = extractEvidenceTokens(limitations);
  return Array.from(
    new Set(["eligibilityResult", "benefitSnapshot", "coverageLimits", ...normalizedFrequencies, ...normalizedLimitations].map((item) => String(item).trim()).filter(Boolean)),
  );
}

function extractEvidenceTokens(raw: unknown) {
  const parsed = extractJsonValue(raw);
  if (typeof parsed === "string") return [parsed];
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") return JSON.stringify(item);
        return "";
      })
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([key, value]) => {
        if (value == null) return "";
        if (typeof value === "string") return `${key}: ${value}`;
        if (Array.isArray(value) || typeof value === "object") return `${key}: ${JSON.stringify(value)}`;
        return `${key}: ${String(value)}`;
      })
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function extractEvidenceType(proof: Record<string, unknown>) {
  const evidenceType = proof?.evidenceType;
  if (typeof evidenceType === "string" && evidenceType.trim()) return evidenceType.trim();
  return null;
}

function extractJson(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  try {
    if (typeof input === "string") {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    return [];
  }
  return [];
}

function extractJsonValue(input: unknown): unknown {
  if (input == null || typeof input === "object" || typeof input === "number" || typeof input === "boolean") {
    return input;
  }
  if (Array.isArray(input)) return input;
  try {
    if (typeof input === "string") {
      return JSON.parse(input);
    }
  } catch {
    return input;
  }
  return null;
}
