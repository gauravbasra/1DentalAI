import "server-only";

import { newId, query } from "@/lib/db";
import { defaultPmsConnectorInstanceId } from "@/lib/pms-connectors/capability-map";
import { createPmsWritebackJob } from "@/lib/pms-connectors/writeback-jobs";
import { buildTreatmentPlanCdtValidation, normalizeTreatmentPlanItems } from "@/lib/clinical-treatment-plan-normalizer";

type Session = { tenantId: string; roleKey: string };

export type ScribeWritebackPackage = {
  patientId: string;
  clinicalNoteId?: string;
  treatmentPlanId?: string;
  providerApprovalId: string;
  providerApprovalRole: string;
  providerApprovalNote?: string;
  connectorInstanceId?: string;
};

type WritebackResult = {
  status: "created" | "blocked";
  localType: string;
  localId: string;
  jobId: string;
  blockedReason?: string;
};

const providerRoles = new Set(["owner_dentist", "associate_provider", "owner_doctor", "rdh", "clinical_assistant", "super_admin", "dso_admin"]);

type EvidenceItem = {
  type: string;
  id: string | null;
  evidenceType: string;
  [key: string]: unknown;
};

export async function createScribeWritebackJobs(input: ScribeWritebackPackage & { session: Session }) {
  if (!providerRoles.has(input.session.roleKey)) {
    throw Object.assign(new Error("Only provider or approved clinical roles can trigger scribe writeback."), { status: 403 });
  }

  if (!input.providerApprovalId.trim()) {
    throw Object.assign(new Error("Provider approval id is required before external writeback."), { status: 400 });
  }
  if (!input.patientId.trim()) {
    throw Object.assign(new Error("Patient id is required."), { status: 400 });
  }

  const tenantId = input.session.tenantId;
  const connectorInstanceId = input.connectorInstanceId?.trim() || defaultPmsConnectorInstanceId;
  const approvedByRole = input.providerApprovalRole.trim() || input.session.roleKey;

  const patientLink = (await query<{ externalId: string }>(
    `select "externalId"
       from "PmsExternalRecordLink"
      where "tenantId" = $1 and "localType" = 'PmsPatient' and "localId" = $2 and "connectorInstanceId" = $3
      limit 1`,
    [tenantId, input.patientId, connectorInstanceId],
  )).rows[0];
  if (!patientLink) {
    throw Object.assign(new Error("Patient has no PMS external mapping. Map the patient before writeback."), { status: 409 });
  }

  const baseEvidence: EvidenceItem[] = [
    {
      type: "providerApprovalId",
      id: input.providerApprovalId,
      evidenceType: "provider_approval",
      approvedByRole,
      note: input.providerApprovalNote ?? `Provider approval recorded by ${approvedByRole}.`,
    },
  ];

  const jobs: WritebackResult[] = [];
  const idempotencySource = `${newId("scribewb")}`;

  if (input.clinicalNoteId?.trim()) {
    const note = (await query<{
      id: string;
      patientId: string;
      noteType: string;
      status: string;
      sourceRecordId: string | null;
    }>(
      `select "id", "patientId", "noteType", "status", "sourceRecordId"
         from "PmsClinicalNote"
        where "tenantId" = $1 and "id" = $2
        limit 1`,
      [tenantId, input.clinicalNoteId],
    )).rows[0];

    if (!note) throw Object.assign(new Error("Clinical note not found for this tenant."), { status: 404 });
    if (note.patientId !== input.patientId) {
      throw Object.assign(new Error("Clinical note patient does not match the selected patient."), { status: 409 });
    }

    const job = await createPmsWritebackJob({
      tenantId,
      connectorInstanceId,
      capabilityKey: "clinical_notes.write",
      localType: "PmsClinicalNote",
      localId: note.id,
      externalType: "clinical_note",
      requestedByRole: input.session.roleKey,
      idempotencyKey: `${idempotencySource}:note:${note.id}`,
      evidence: [
        ...baseEvidence,
        { type: "sourceRecordId", id: note.id, evidenceType: "clinical_note_reference", key: "sourceRecordId" },
      ],
      payload: {
        tenantId,
        externalPatientId: patientLink.externalId,
        source: "clinical_scribe",
        note: { id: note.id, noteType: note.noteType, status: note.status, sourceRecordId: note.sourceRecordId },
      },
    });
    jobs.push({ status: job.status === "BLOCKED" ? "blocked" : "created", localType: "PmsClinicalNote", localId: note.id, jobId: job.id, blockedReason: job.blockedReason ?? undefined });
  }

  if (!input.treatmentPlanId?.trim()) {
    return summarizeResults(patientLink.externalId, jobs);
  }

  const treatmentRows = (await query<{
    id: string;
    patientId: string;
    providerId: string | null;
    name: string;
    presentationNote: string | null;
    status: string;
    totalFeeCents: number;
    item_sequence: number | null;
    item_phase: number | null;
    procedure_code: string | null;
    procedure_fee_cents: number | null;
    item_tooth: string | null;
    item_surface: string | null;
    item_status: string | null;
  }>(
    `select tp."id", tp."patientId", tp."providerId", tp."name", tp."presentationNote", tp."status", tp."totalFeeCents",
            tpi."sequence" as "item_sequence", tpi."phase" as "item_phase", pc."code" as "procedure_code", tpi."feeCents" as "procedure_fee_cents",
            tpi."tooth" as "item_tooth", tpi."surface" as "item_surface", tpi."status" as "item_status"
       from "PmsTreatmentPlan" tp
       left join "PmsTreatmentPlanItem" tpi on tpi."treatmentPlanId" = tp."id"
       left join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
      where tp."tenantId" = $1 and tp."id" = $2 and tp."patientId" = $3
      order by tpi."sequence" asc nulls last`,
    [tenantId, input.treatmentPlanId, input.patientId],
  )).rows;
  if (!treatmentRows.length) {
    throw Object.assign(new Error("Treatment plan not found for this patient."), { status: 404 });
  }

  const firstPlan = treatmentRows[0];
  const itemRows = treatmentRows
    .filter((row) => row.item_sequence !== null)
    .map((row) => ({
      sequence: Number(row.item_sequence),
      phase: Number(row.item_phase ?? 1),
      code: row.procedure_code,
      tooth: row.item_tooth,
      surface: row.item_surface,
      feeCents: row.procedure_fee_cents,
      status: row.item_status,
    }));
  const treatmentItems = normalizeTreatmentPlanItems(itemRows);
  const cdtValidation = buildTreatmentPlanCdtValidation(treatmentItems);

  if (!treatmentItems.length) {
    throw Object.assign(new Error("Treatment plan has no procedure items for writeback."), { status: 400 });
  }

  const treatmentJob = await createPmsWritebackJob({
    tenantId,
    connectorInstanceId,
    capabilityKey: "treatment_plans.write",
    localType: "PmsTreatmentPlan",
    localId: firstPlan.id,
    externalType: "treatment_plan",
    requestedByRole: input.session.roleKey,
    idempotencyKey: `${idempotencySource}:plan:${firstPlan.id}`,
    evidence: [
      ...baseEvidence,
      { type: "cdtValidation", id: "cdt-validation", evidenceType: "cdt_validation", cdtValidation },
      { type: "providerApprovalId", id: input.providerApprovalId, evidenceType: "provider_approval", approvedByRole: approvedByRole },
    ],
    payload: {
      tenantId,
      externalPatientId: patientLink.externalId,
      source: "clinical_scribe",
      treatmentPlan: {
        treatmentPlanId: firstPlan.id,
        patientId: firstPlan.patientId,
        providerId: firstPlan.providerId,
        name: firstPlan.name,
        presentationNote: firstPlan.presentationNote,
        status: firstPlan.status,
        items: treatmentItems,
      },
      cdtValidation,
    },
  });
  jobs.push({ status: treatmentJob.status === "BLOCKED" ? "blocked" : "created", localType: "PmsTreatmentPlan", localId: firstPlan.id, jobId: treatmentJob.id, blockedReason: treatmentJob.blockedReason ?? undefined });

  return summarizeResults(patientLink.externalId, jobs);
}

export async function createTreatmentPlanWriteback(input: {
  session: Session;
  patientId: string;
  treatmentPlanId: string;
  providerApprovalId: string;
  providerApprovalRole: string;
  providerApprovalNote?: string;
  connectorInstanceId?: string;
}) {
  return createScribeWritebackJobs({
    session: input.session,
    patientId: input.patientId,
    treatmentPlanId: input.treatmentPlanId,
    providerApprovalId: input.providerApprovalId,
    providerApprovalRole: input.providerApprovalRole,
    providerApprovalNote: input.providerApprovalNote,
    connectorInstanceId: input.connectorInstanceId,
  });
}

function summarizeResults(externalPatientId: string, jobs: WritebackResult[]) {
  return {
    externalPatientId,
    jobs,
    createdCount: jobs.filter((item) => item.status === "created").length,
    blockedCount: jobs.filter((item) => item.status === "blocked").length,
  };
}
