import { addAudit, addPerioMeasure, getPerio, undoLastPerioMeasure } from "@/lib/pms-repository";
import { query } from "@/lib/db";
import { defaultPmsConnectorInstanceId } from "@/lib/pms-connectors/capability-map";
import { createPmsWritebackJob } from "@/lib/pms-connectors/writeback-jobs";
import { parsePerioCommand } from "@/lib/perio-command-parser";
import type { ParsedPerioCommand } from "@/lib/perio-command-parser";

type ProviderRole =
  | "owner_dentist"
  | "associate_provider"
  | "owner_doctor"
  | "rdh"
  | "clinical_assistant"
  | "super_admin"
  | "dso_admin";

const clinicalRoles = new Set<ProviderRole>([
  "owner_dentist",
  "associate_provider",
  "owner_doctor",
  "rdh",
  "clinical_assistant",
  "super_admin",
  "dso_admin",
]);

type VoiceInput = {
  tenantId: string;
  actorRole: string;
  actorUserId?: string | null;
  patientId: string;
  rawText: string;
};

type VoiceResult = {
  ok: true;
  command: ParsedPerioCommand;
  examId: string;
  actionSummary: string;
  measureId?: string | null;
};

export async function applyPerioVoiceCommand(input: VoiceInput): Promise<VoiceResult> {
  const parsed = parsePerioCommand(input.rawText);

  const examResult = await getPerio(input.patientId, input.tenantId);
  const exam = examResult.exam;
  if (!exam) {
    throw Object.assign(new Error("No active perio exam available for this patient."), { status: 404 });
  }

  if (parsed.type === "MEASUREMENT") {
    const measure = await addPerioMeasure(input.patientId, {
      tooth: parsed.tooth,
      site: parsed.site,
      probingDepth: parsed.probingDepth,
      bleeding: parsed.bleeding,
      recession: parsed.recession,
      mobility: parsed.mobility,
      furcation: parsed.furcation,
      actorRole: input.actorRole,
    }, input.tenantId);

    await addAudit(
      input.tenantId,
      input.actorRole,
      "PERIO_VOICE_COMMAND_APPLIED",
      "PmsPerioMeasure",
      measure.id,
      "ALLOWED",
      {
        source: "voice",
        patientId: input.patientId,
        command: parsed,
        actorUserId: input.actorUserId,
      },
    );

    return {
      ok: true,
      examId: exam.id,
      measureId: measure.id,
      command: parsed,
      actionSummary: `Recorded tooth ${parsed.tooth} ${parsed.site} depth ${parsed.probingDepth} mm`,
    };
  }

  if (parsed.type === "CORRECTION") {
    const measure = await addPerioMeasure(input.patientId, {
      tooth: parsed.tooth,
      site: parsed.site,
      probingDepth: parsed.probingDepth ?? 0,
      bleeding: parsed.bleeding ?? false,
      recession: parsed.recession,
      mobility: parsed.mobility,
      furcation: parsed.furcation,
      actorRole: input.actorRole,
    }, input.tenantId);

    await addAudit(
      input.tenantId,
      input.actorRole,
      "PERIO_VOICE_COMMAND_CORRECTED",
      "PmsPerioMeasure",
      measure.id,
      "ALLOWED",
      {
        source: "voice",
        patientId: input.patientId,
        command: parsed,
        actorUserId: input.actorUserId,
      },
    );

    return {
      ok: true,
      examId: exam.id,
      measureId: measure.id,
      command: parsed,
      actionSummary: `Corrected tooth ${parsed.tooth} ${parsed.site}`,
    };
  }

  if (parsed.type === "CONTROL") {
    if (parsed.action === "UNDO") {
      const reverted = await undoLastPerioMeasure(input.patientId, { actorRole: input.actorRole }, input.tenantId);
      if (!reverted) {
        throw Object.assign(new Error("No in-progress perio measure available to undo."), { status: 409 });
      }
      return {
        ok: true,
        examId: exam.id,
        command: parsed,
        actionSummary: `Undid latest entry for tooth ${reverted.tooth} ${reverted.site}`,
      };
    }

    return {
      ok: true,
      examId: exam.id,
      command: parsed,
      actionSummary:
        parsed.action === "COMPLETE_EXAM"
          ? "Voice asked for exam completion. Submit provider diagnosis from the chart card to complete and writeback."
          : parsed.action === "NEXT_SITE"
            ? "Cursor move requested to next site."
            : "Cursor requested to skip current tooth.",
    };
  }

  throw Object.assign(new Error("Unknown perio command type."), { status: 400 });
}

type PerioWritebackInput = {
  tenantId: string;
  actorRole: string;
  actorUserId?: string | null;
  patientId: string;
  providerApprovalId: string;
  providerApprovalRole: string;
  providerApprovalNote?: string;
  perioSignoffId: string;
  connectorInstanceId?: string;
  preferredAction?: "draft" | "request";
};

export async function requestPerioWriteback(input: PerioWritebackInput) {
  if (!clinicalRoles.has(input.actorRole as ProviderRole)) {
    throw Object.assign(new Error("Only provider or approved clinical roles can request perio writeback."), { status: 403 });
  }

  const approvalId = input.providerApprovalId.trim();
  if (!approvalId) {
    throw Object.assign(new Error("providerApprovalId is required for perio writeback."), { status: 400 });
  }

  const signoffId = input.perioSignoffId.trim();
  if (!signoffId) {
    throw Object.assign(new Error("perioSignoffId is required for perio writeback."), { status: 400 });
  }

  const perio = await getPerio(input.patientId, input.tenantId);
  if (!perio.patient || !perio.exam) {
    throw Object.assign(new Error("No open perio exam for this patient."), { status: 404 });
  }
  if (String(perio.exam.status).toUpperCase() !== "COMPLETED") {
    throw Object.assign(new Error("Complete the perio exam before requesting writeback."), { status: 409 });
  }

  if ((perio.measures.length || 0) < 6) {
    throw Object.assign(new Error("At least six perio sites are required before writeback."), { status: 409 });
  }

  const patientLink = (await query<{ externalId: string }>(
    `select "externalId" from "PmsExternalRecordLink"
       where "tenantId" = $1 and "localType" = 'PmsPatient' and "localId" = $2 and "connectorInstanceId" = $3
       limit 1`,
    [input.tenantId, input.patientId, input.connectorInstanceId ?? defaultPmsConnectorInstanceId],
  )).rows[0];

  if (!patientLink) {
    throw Object.assign(new Error("Patient has no PMS external mapping. Map patient before writeback."), { status: 409 });
  }

  const payload = {
    tenantId: input.tenantId,
    patientId: input.patientId,
    examId: perio.exam.id,
    diagnosis: perio.exam.diagnosis ?? null,
    measures: perio.measures,
    status: perio.exam.status,
    writebackRequestedBy: {
      role: input.actorRole,
      userId: input.actorUserId ?? null,
      approvalRole: input.providerApprovalRole,
    },
    evidence: {
      providerApprovalNote: input.providerApprovalNote ?? null,
      providerApprovalId: approvalId,
      perioSignoffId: signoffId,
    },
    preferences: {
      preferredAction: input.preferredAction ?? "request",
    },
  };

  const job = await createPmsWritebackJob({
    tenantId: input.tenantId,
    connectorInstanceId: input.connectorInstanceId ?? defaultPmsConnectorInstanceId,
    capabilityKey: "perio.write",
    localType: "PmsPerioExam",
    localId: String(perio.exam.id),
    externalType: "perio_exam",
    requestedByRole: input.actorRole,
    evidence: [
      { type: "providerApprovalId", id: approvalId, evidenceType: "provider_approval", key: approvalId },
      { type: "perioSignoffId", id: signoffId, evidenceType: "perio_signoff", key: signoffId },
    ],
    idempotencyKey: `perio-writeback:${input.patientId}:${perio.exam.id}`,
    payload: {
      ...payload,
      externalPatientId: patientLink.externalId,
    },
  });

  await addAudit(
    input.tenantId,
    input.actorRole,
    "PERIO_WRITEBACK_REQUESTED",
    "PmsWritebackJob",
    job.id,
    job.status === "BLOCKED" ? "BLOCKED" : "ALLOWED",
    {
      patientId: input.patientId,
      examId: perio.exam.id,
      blockedReason: job.blockedReason,
      evidenceCount: 2,
      externalPatientId: patientLink.externalId,
    },
  );

  return {
    externalPatientId: patientLink.externalId,
    jobId: job.id,
    jobStatus: job.status,
    blockedReason: job.blockedReason,
  };
}
