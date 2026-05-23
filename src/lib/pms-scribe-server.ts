import "server-only";

import { currentSession } from "@/lib/auth";
import { getOpenAiWebchatConfig } from "@/lib/connector-control-repository";
import { newId, query, withTransaction } from "@/lib/db";
import { hasScope, type PermissionScope, type RoleKey } from "@/lib/foundation-data";
import { listProcedureCodes } from "@/lib/pms-repository";
import { generateScribeDraft, normalizeGeneratedDraft, type ScribeDraft, type ScribeSuggestion, type ScribeTaskDraft } from "@/lib/pms-scribe";

const clinicalRoles = new Set(["owner_dentist", "owner_doctor", "associate_provider", "rdh", "dental_assistant", "clinical_assistant", "super_admin", "dso_admin"]);
const scopedClinicalRoles = new Set(["owner_dentist", "associate_provider", "rdh", "dental_assistant", "compliance_admin"]);
const scribeModel = process.env.OPENAI_SCRIBE_MODEL || process.env.OPENAI_WEBCHAT_MODEL || "gpt-4o-mini";

type Session = NonNullable<Awaited<ReturnType<typeof currentSession>>>;
export type ScribeConsent = { patientAcknowledged: boolean; signedByName: string; recordingMode: string; providerAttestation: boolean };

export async function requireScribeSession() {
  const session = await currentSession();
  if (!session) throw Object.assign(new Error("Authentication required."), { status: 401 });
  const hasClinicalScope = scopedClinicalRoles.has(session.roleKey) && hasScope(session.roleKey as RoleKey, "clinical" as PermissionScope);
  if (!clinicalRoles.has(session.roleKey) && !hasClinicalScope) {
    await auditScribe({
      tenantId: session.tenantId,
      actorRole: session.roleKey,
      eventType: "SCRIBE_ACCESS_BLOCKED",
      targetType: "PmsClinicalNote",
      targetId: null,
      outcome: "BLOCKED",
      metadata: { reason: "role_without_clinical_scope", roleKey: session.roleKey },
    });
    throw Object.assign(new Error("Clinical scribe access requires a clinical role."), { status: 403 });
  }
  return session;
}

export function assertScribeConsent(consent: ScribeConsent) {
  if (!consent.patientAcknowledged || !consent.providerAttestation || !consent.signedByName.trim()) {
    throw Object.assign(new Error("Patient AI scribe acknowledgement, signer name, and provider attestation are required."), { status: 400 });
  }
}

export async function generateProductionScribeDraft(input: {
  session: Session;
  transcript: string;
  templateKey?: string;
  patientName?: string;
  useAi: boolean;
  consent: ScribeConsent;
}): Promise<ScribeDraft> {
  assertScribeConsent(input.consent);
  const procedureCodes = await listProcedureCodes(input.session.tenantId);
  const fallback = generateScribeDraft({
    transcript: input.transcript,
    templateKey: input.templateKey,
    procedureCodes,
    patientName: input.patientName,
  });

  if (!input.useAi) {
    await auditScribe({
      tenantId: input.session.tenantId,
      actorRole: input.session.roleKey,
      eventType: "SCRIBE_DRAFT_GENERATED",
      targetType: "PmsClinicalNote",
      targetId: null,
      outcome: "ALLOWED",
      metadata: {
        source: fallback.generation.source,
        model: fallback.generation.model,
        patientNameProvided: Boolean(input.patientName),
        transcriptLength: input.transcript.length,
        consent: { recordingMode: input.consent.recordingMode, patientAcknowledged: true, providerAttestation: true },
      },
    });
    return fallback;
  }

  const openAi = await getOpenAiWebchatConfig(input.session.tenantId);
  if (!openAi.apiKey) {
    const blocked = {
      ...fallback,
      generation: {
        source: "rules_fallback" as const,
        model: fallback.generation.model,
        blockedReason: openAi.blockedReason ?? "OpenAI connector is not ready.",
      },
    };
    await auditScribe({
      tenantId: input.session.tenantId,
      actorRole: input.session.roleKey,
      eventType: "SCRIBE_AI_BLOCKED_FALLBACK_USED",
      targetType: "PmsClinicalNote",
      targetId: null,
      outcome: "BLOCKED",
      metadata: { blockedReason: blocked.generation.blockedReason, fallbackModel: blocked.generation.model },
    });
    return blocked;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAi.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: scribeModel,
        instructions: [
          "You are a dental clinical documentation assistant inside a PMS.",
          "Return only structured JSON matching the schema.",
          "Draft provider-review clinical notes from the transcript. Do not finalize, sign, diagnose beyond captured facts, or invent findings.",
          "Use only procedure codes included in the allowed CDT code list. Suggested CDT rows are proposed and must be editable by the practice.",
          "If a section is unsupported, write 'Provider review needed.'",
        ].join("\n"),
        input: [
          `Template: ${fallback.templateKey}`,
          `Allowed CDT codes: ${procedureCodes.map((code) => `${code.code}: ${code.description}`).join("; ")}`,
          `Rule-based fallback draft:\n${JSON.stringify(fallback)}`,
          `Transcript:\n${input.transcript}`,
        ].join("\n\n"),
        text: {
          format: {
            type: "json_schema",
            name: "dental_scribe_draft",
            strict: true,
            schema: scribeDraftSchema,
          },
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data?.error?.message === "string" ? data.error.message : `OpenAI responded ${response.status}`);
    const output = typeof data.output_text === "string"
      ? data.output_text
      : data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).map((item: { text?: string }) => item.text).filter(Boolean).join("\n");
    const parsed = output ? JSON.parse(output) : null;
    const draft = normalizeGeneratedDraft({ parsed, fallback, procedureCodes, model: scribeModel });
    await auditScribe({
      tenantId: input.session.tenantId,
      actorRole: input.session.roleKey,
      eventType: "SCRIBE_AI_DRAFT_GENERATED",
      targetType: "PmsClinicalNote",
      targetId: null,
      outcome: "ALLOWED",
      metadata: { source: draft.generation.source, model: draft.generation.model, cdtCodes: draft.analytics.suggestedCdtCodes, transcriptLength: input.transcript.length },
    });
    return draft;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "OpenAI scribe generation failed.";
    await auditScribe({
      tenantId: input.session.tenantId,
      actorRole: input.session.roleKey,
      eventType: "SCRIBE_AI_ERROR_FALLBACK_USED",
      targetType: "PmsClinicalNote",
      targetId: null,
      outcome: "BLOCKED",
      metadata: { reason, fallbackModel: fallback.generation.model },
    });
    return {
      ...fallback,
      generation: {
        source: "rules_fallback",
        model: fallback.generation.model,
        blockedReason: reason,
      },
    };
  }
}

export async function saveApprovedScribePackage(input: {
  session: Session;
  patientId: string;
  noteType: string;
  noteBody: string;
  treatmentPlanName?: string;
  treatmentPlanNote?: string;
  treatmentSuggestions: ScribeSuggestion[];
  taskDrafts: ScribeTaskDraft[];
  consent: { patientAcknowledged: boolean; signedByName: string; recordingMode: string; providerAttestation: boolean };
  generation?: ScribeDraft["generation"];
}) {
  assertScribeConsent(input.consent);

  return withTransaction(async (client) => {
    const patient = (await client.query<{ id: string; tenantId: string }>(
      `select "id", "tenantId" from "PmsPatient" where "id" = $1 and "tenantId" = $2 limit 1`,
      [input.patientId, input.session.tenantId],
    )).rows[0];
    if (!patient) throw Object.assign(new Error("Patient not found for this tenant."), { status: 404 });

    const consentId = newId("consent");
    await client.query(
      `insert into "PmsPatientConsent"
         ("id", "patientId", "consentType", "status", "signedByName", "signedAt", "updatedAt")
       values ($1, $2, 'AI_SCRIBE_RECORDING', 'SIGNED', $3, current_timestamp, current_timestamp)`,
      [consentId, input.patientId, input.consent.signedByName.trim()],
    );

    const noteId = newId("note");
    await client.query(
      `insert into "PmsClinicalNote" ("id", "patientId", "providerId", "noteType", "body", "status", "updatedAt")
       values ($1, $2, $3, $4, $5, 'DRAFT', current_timestamp)`,
      [noteId, input.patientId, input.session.userId, input.noteType.trim() || "PROGRESS", input.noteBody.trim()],
    );

    const procedureCodes = (await client.query<{ id: string; code: string; defaultFeeCents: number }>(
      `select "id", "code", "defaultFeeCents" from "PmsProcedureCode" where "tenantId" = $1`,
      [input.session.tenantId],
    )).rows;
    const procedureByCode = new Map(procedureCodes.map((code) => [code.code, code]));

    let treatmentPlanId: string | null = null;
    const savedItemIds: string[] = [];
    const validSuggestions = input.treatmentSuggestions.filter((item) => procedureByCode.has(item.code));
    if (validSuggestions.length) {
      treatmentPlanId = newId("txp");
      await client.query(
        `insert into "PmsTreatmentPlan"
          ("id", "tenantId", "patientId", "name", "presentationNote", "status", "updatedAt")
         values ($1, $2, $3, $4, $5, 'DRAFT', current_timestamp)`,
        [
          treatmentPlanId,
          input.session.tenantId,
          input.patientId,
          input.treatmentPlanName?.trim() || "AI scribe treatment plan",
          input.treatmentPlanNote?.trim() || "Generated from approved scribe note. CDT rows require practice review before presentation.",
        ],
      );

      for (const [index, suggestion] of validSuggestions.entries()) {
        const code = procedureByCode.get(suggestion.code)!;
        const feeCents = Number(code.defaultFeeCents ?? 0);
        const insuranceEstimateCents = Math.round(feeCents * 0.5);
        const patientEstimateCents = feeCents - insuranceEstimateCents;
        const itemId = newId("txi");
        await client.query(
          `insert into "PmsTreatmentPlanItem"
             ("id", "treatmentPlanId", "procedureCodeId", "phase", "sequence", "tooth", "surface", "feeCents", "insuranceEstimateCents", "patientEstimateCents", "status", "updatedAt")
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PROPOSED', current_timestamp)`,
          [
            itemId,
            treatmentPlanId,
            code.id,
            Number(suggestion.phase || 1),
            index + 1,
            suggestion.tooth?.trim() || null,
            suggestion.surface?.trim() || null,
            feeCents,
            insuranceEstimateCents,
            patientEstimateCents,
          ],
        );
        savedItemIds.push(itemId);
      }

      await client.query(
        `update "PmsTreatmentPlan" tp
         set "totalFeeCents" = coalesce(items.total_fee, 0),
             "insuranceEstimateCents" = coalesce(items.insurance_estimate, 0),
             "patientEstimateCents" = coalesce(items.patient_estimate, 0),
             "updatedAt" = current_timestamp
         from (
           select "treatmentPlanId", sum("feeCents") as total_fee, sum("insuranceEstimateCents") as insurance_estimate, sum("patientEstimateCents") as patient_estimate
           from "PmsTreatmentPlanItem"
           where "treatmentPlanId" = $1
           group by "treatmentPlanId"
         ) items
         where tp."id" = items."treatmentPlanId"`,
        [treatmentPlanId],
      );
    }

    const savedTaskIds: string[] = [];
    for (const task of input.taskDrafts) {
      const taskId = newId("task");
      await client.query(
        `insert into "PmsTask" ("id", "tenantId", "patientId", "ownerRoleKey", "title", "taskType", "priority", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7, current_timestamp)`,
        [
          taskId,
          input.session.tenantId,
          input.patientId,
          task.ownerRoleKey,
          task.title.trim(),
          task.taskType,
          task.priority || "NORMAL",
        ],
      );
      savedTaskIds.push(taskId);
    }

    const auditMeta = {
      patientId: input.patientId,
      noteId,
      consentId,
      treatmentPlanId,
      treatmentItemIds: savedItemIds,
      taskIds: savedTaskIds,
      generation: input.generation,
      consent: { recordingMode: input.consent.recordingMode, patientAcknowledged: true, providerAttestation: true },
    };
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'SCRIBE_PACKAGE_APPROVED_AND_SAVED', 'PmsClinicalNote', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), input.session.tenantId, input.session.roleKey, noteId, JSON.stringify(auditMeta)],
    );

    return { noteId, consentId, treatmentPlanId, treatmentItemIds: savedItemIds, taskIds: savedTaskIds };
  });
}

export async function auditScribe(input: { tenantId: string; actorRole: string; eventType: string; targetType: string; targetId: string | null; outcome: "ALLOWED" | "BLOCKED" | "READ_ONLY"; metadata?: unknown }) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), input.tenantId, input.actorRole, input.eventType, input.targetType, input.targetId, input.outcome, input.metadata ? JSON.stringify(input.metadata) : null],
  );
}

const scribeDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["noteBody", "sections", "treatmentPlanName", "treatmentPlanNote", "treatmentSuggestions", "taskDrafts"],
  properties: {
    noteBody: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    treatmentPlanName: { type: "string" },
    treatmentPlanNote: { type: "string" },
    treatmentSuggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "tooth", "surface", "phase", "priority", "ownerRoleKey", "reason"],
        properties: {
          code: { type: "string" },
          tooth: { type: "string" },
          surface: { type: "string" },
          phase: { type: "number" },
          priority: { type: "string", enum: ["HIGH", "NORMAL"] },
          ownerRoleKey: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    taskDrafts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ownerRoleKey", "title", "taskType", "priority"],
        properties: {
          ownerRoleKey: { type: "string" },
          title: { type: "string" },
          taskType: { type: "string" },
          priority: { type: "string", enum: ["HIGH", "NORMAL"] },
        },
      },
    },
  },
};
