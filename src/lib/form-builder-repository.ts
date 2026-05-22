import { newId, query, withTransaction } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

export type CustomFormDefinitionRow = {
  id: string;
  tenantId: string;
  formKey: string;
  name: string;
  formType: string;
  status: string;
  version: number;
  description: string | null;
  storageTableName: string;
  workflowUse: string;
  visibility: string;
  requiresSignature: boolean;
  allowAnonymous: boolean;
  successMessage: string | null;
  createdByRole: string;
  fieldCount?: number;
  submissionCount?: number;
};

export type CustomFormFieldRow = {
  id: string;
  tenantId: string;
  formDefinitionId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  options: unknown;
  validation: unknown;
  displayOrder: number;
  pmsTargetModel: string | null;
  pmsTargetField: string | null;
  phiCategory: string;
};

export type CustomFormSubmissionRow = {
  id: string;
  formDefinitionId: string;
  formName: string;
  status: string;
  sourceChannel: string;
  submittedByName: string | null;
  submittedByEmail: string | null;
  submittedByPhone: string | null;
  patientId: string | null;
  appointmentId: string | null;
  answerSummary: unknown;
  createdAt: string;
};

export type BookingWorkflowTemplate = {
  key: string;
  name: string;
  screens: Array<{ key: string; title: string; description: string; enabled: boolean; required: boolean }>;
  defaultBookingMode: string;
  description: string;
};

const workflowTemplates: BookingWorkflowTemplate[] = [
  {
    key: "new_patient_offer",
    name: "New patient offer",
    description: "PA Dental Arts-style service offer flow: patient type, service, calendar, contact, insurance, review.",
    defaultBookingMode: "DIRECT_BOOKING",
    screens: [
      { key: "patient_type", title: "Patient type", description: "New or returning patient.", enabled: true, required: true },
      { key: "service_line", title: "Service choice", description: "Cleaning, emergency, implants, whitening, or custom service.", enabled: true, required: true },
      { key: "calendar", title: "Calendar slots", description: "Real provider and chair availability.", enabled: true, required: true },
      { key: "contact", title: "Contact details", description: "Name, phone, email, DOB policy.", enabled: true, required: true },
      { key: "insurance", title: "Insurance capture", description: "Payer and subscriber details when required.", enabled: true, required: false },
      { key: "custom_forms", title: "Custom forms", description: "Attach intake, insurance, consent, or Typeform-style forms.", enabled: true, required: false },
      { key: "review", title: "Review and confirm", description: "Policy summary and final booking writeback.", enabled: true, required: true },
    ],
  },
  {
    key: "emergency_triage",
    name: "Emergency triage",
    description: "Urgent request flow with pain/swelling screening before same-day handoff or booking.",
    defaultBookingMode: "STAFF_APPROVAL",
    screens: [
      { key: "emergency_questions", title: "Emergency questions", description: "Pain, swelling, trauma, fever, bleeding.", enabled: true, required: true },
      { key: "calendar", title: "Emergency slots", description: "Same-day availability if rules allow.", enabled: true, required: true },
      { key: "contact", title: "Contact details", description: "Fast callback details.", enabled: true, required: true },
      { key: "review", title: "Staff review", description: "Confirm triage and staff approval requirement.", enabled: true, required: true },
    ],
  },
  {
    key: "existing_patient_recare",
    name: "Existing patient recare",
    description: "Recall or hygiene reappointment flow for known patients.",
    defaultBookingMode: "DIRECT_BOOKING",
    screens: [
      { key: "identity", title: "Patient lookup", description: "Phone/email/DOB identity match.", enabled: true, required: true },
      { key: "service_line", title: "Recall type", description: "Hygiene, perio maintenance, follow-up.", enabled: true, required: true },
      { key: "calendar", title: "Calendar slots", description: "Hygiene/provider availability.", enabled: true, required: true },
      { key: "review", title: "Confirm", description: "Book or request staff review.", enabled: true, required: true },
    ],
  },
];

function safeKey(value: string, fallback = "custom-form") {
  return (value || fallback).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}

function storageTableName(tenantId: string, formKey: string, version: number) {
  const tenant = tenantId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const key = formKey.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `form_${tenant}_${key}_v${version}`.slice(0, 60);
}

function assertSafeIdentifier(value: string) {
  if (!/^[a-z][a-z0-9_]{2,62}$/.test(value)) throw new Error("Unsafe form storage table name.");
  return value;
}

function parseOptions(value: string) {
  const options = value.split("\n").flatMap((line) => line.split(",")).map((item) => item.trim()).filter(Boolean);
  return options.length ? options : null;
}

function parseFieldLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [rawKey, rawLabel, rawType, rawRequired, rawOptions] = line.split("|").map((part) => part?.trim() ?? "");
    const label = rawLabel || rawKey || `Question ${index + 1}`;
    return {
      fieldKey: safeKey(rawKey || label, `field-${index + 1}`).replaceAll("-", "_"),
      label,
      fieldType: rawType || "short_text",
      required: ["true", "yes", "required", "1"].includes(rawRequired.toLowerCase()),
      options: rawOptions ? parseOptions(rawOptions) : null,
      displayOrder: (index + 1) * 10,
    };
  });
}

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}

export function getBookingWorkflowTemplates() {
  return workflowTemplates;
}

export async function getFormBuilderWorkbench(tenantId = defaultTenantId) {
  const [forms, fields, submissions, links] = await Promise.all([
    query<CustomFormDefinitionRow & { fieldCount: string; submissionCount: string }>(
      `select f.*,
        coalesce(count(distinct ff."id"), 0)::text as "fieldCount",
        coalesce(count(distinct s."id"), 0)::text as "submissionCount"
       from "CustomFormDefinition" f
       left join "CustomFormField" ff on ff."formDefinitionId" = f."id"
       left join "CustomFormSubmission" s on s."formDefinitionId" = f."id"
       where f."tenantId" = $1
       group by f."id"
       order by case f."status" when 'ACTIVE' then 0 when 'DRAFT' then 1 else 2 end, f."workflowUse", f."name"`,
      [tenantId],
    ),
    query<CustomFormFieldRow>(
      `select * from "CustomFormField" where "tenantId" = $1 order by "formDefinitionId", "displayOrder"`,
      [tenantId],
    ),
    query<CustomFormSubmissionRow>(
      `select s."id", s."formDefinitionId", f."name" as "formName", s."status", s."sourceChannel", s."submittedByName", s."submittedByEmail", s."submittedByPhone", s."patientId", s."appointmentId", s."createdAt"::text as "createdAt",
        coalesce(jsonb_object_agg(v."fieldKey", v."answerText") filter (where v."fieldKey" is not null), '{}'::jsonb) as "answerSummary"
       from "CustomFormSubmission" s
       join "CustomFormDefinition" f on f."id" = s."formDefinitionId"
       left join "CustomFormSubmissionValue" v on v."submissionId" = s."id"
       where s."tenantId" = $1
       group by s."id", f."name"
       order by s."createdAt" desc
       limit 50`,
      [tenantId],
    ),
    query(
      `select "id", "slug", "title", "workflowKey", "workflowName", "workflowScreenSchema", "customFormDefinitionIds", "bookingMode", "patientIdentityPolicy", "status"
       from "PmsOnlineSchedulingLink"
       where "tenantId" = $1
       order by "title"`,
      [tenantId],
    ),
  ]);

  return {
    forms: forms.rows.map((form) => ({ ...form, fieldCount: Number(form.fieldCount ?? 0), submissionCount: Number(form.submissionCount ?? 0) })),
    fields: fields.rows,
    submissions: submissions.rows,
    bookingLinks: links.rows,
    workflowTemplates,
  };
}

export async function upsertCustomFormDefinition(input: {
  tenantId?: string;
  id?: string;
  name: string;
  formKey?: string;
  formType: string;
  status: string;
  version?: number;
  description?: string;
  workflowUse?: string;
  visibility?: string;
  requiresSignature?: boolean;
  allowAnonymous?: boolean;
  successMessage?: string;
  fieldLines: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const formKey = safeKey(input.formKey || input.name);
  const version = input.version || 1;
  const tableName = assertSafeIdentifier(storageTableName(tenantId, formKey, version));
  const id = input.id || newId("cform");
  const fields = parseFieldLines(input.fieldLines);
  if (!input.name.trim()) throw new Error("Form name is required.");
  if (!fields.length) throw new Error("At least one form field is required.");

  await withTransaction(async (client) => {
    await client.query(
      `insert into "CustomFormDefinition"
        ("id", "tenantId", "formKey", "name", "formType", "status", "version", "description", "storageTableName", "workflowUse", "visibility", "requiresSignature", "allowAnonymous", "successMessage", "createdByRole", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, current_timestamp)
       on conflict ("tenantId", "formKey", "version") do update set
         "name" = excluded."name",
         "formType" = excluded."formType",
         "status" = excluded."status",
         "description" = excluded."description",
         "workflowUse" = excluded."workflowUse",
         "visibility" = excluded."visibility",
         "requiresSignature" = excluded."requiresSignature",
         "allowAnonymous" = excluded."allowAnonymous",
         "successMessage" = excluded."successMessage",
         "updatedAt" = current_timestamp
       returning "id"`,
      [id, tenantId, formKey, input.name.trim(), input.formType || "CUSTOM", input.status || "DRAFT", version, input.description?.trim() || null, tableName, input.workflowUse || "GENERAL", input.visibility || "STAFF_AND_PUBLIC_LINK", Boolean(input.requiresSignature), input.allowAnonymous ?? true, input.successMessage?.trim() || null, input.actorRole || "practice_manager"],
    );
    await client.query(`delete from "CustomFormField" where "formDefinitionId" = $1`, [id]);
    for (const field of fields) {
      await client.query(
        `insert into "CustomFormField"
          ("id", "tenantId", "formDefinitionId", "fieldKey", "label", "fieldType", "required", "options", "displayOrder", "phiCategory")
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
        [newId("cff"), tenantId, id, field.fieldKey, field.label, field.fieldType, field.required, field.options ? JSON.stringify(field.options) : null, field.displayOrder, field.fieldType.includes("insurance") ? "INSURANCE" : "ADMINISTRATIVE"],
      );
    }
    await client.query(
      `create table if not exists "${tableName}" (
        "submissionId" text primary key,
        "tenantId" text not null,
        "patientId" text,
        "appointmentId" text,
        "sourceChannel" text,
        "submittedAt" timestamp not null default current_timestamp,
        "payload" jsonb not null
      )`,
    );
  });

  await addAudit(tenantId, input.actorRole ?? "practice_manager", "CUSTOM_FORM_DEFINITION_UPSERTED", "CustomFormDefinition", id, "ALLOWED", {
    formKey,
    tableName,
    fieldCount: fields.length,
    physicalFormTableCreated: true,
  });
  return { id, storageTableName: tableName };
}

export async function submitCustomForm(input: {
  tenantId?: string;
  formDefinitionId: string;
  patientId?: string;
  appointmentId?: string;
  conversationId?: string;
  sourceChannel?: string;
  submittedByName?: string;
  submittedByEmail?: string;
  submittedByPhone?: string;
  signatureName?: string;
  answers: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const form = await query<CustomFormDefinitionRow>(
    `select * from "CustomFormDefinition" where "tenantId" = $1 and "id" = $2 and "status" in ('ACTIVE','DRAFT') limit 1`,
    [tenantId, input.formDefinitionId],
  );
  const definition = form.rows[0];
  if (!definition) throw new Error("Form definition not found.");
  const tableName = assertSafeIdentifier(definition.storageTableName);
  const fields = await query<CustomFormFieldRow>(
    `select * from "CustomFormField" where "tenantId" = $1 and "formDefinitionId" = $2 order by "displayOrder"`,
    [tenantId, definition.id],
  );
  const missing = fields.rows.filter((field) => field.required && !String(input.answers[field.fieldKey] ?? "").trim());
  if (missing.length) throw new Error(`Missing required fields: ${missing.map((field) => field.label).join(", ")}.`);
  const submissionId = newId("cfsub");
  const payload = Object.fromEntries(fields.rows.map((field) => [field.fieldKey, input.answers[field.fieldKey] ?? ""]));

  await withTransaction(async (client) => {
    await client.query(
      `insert into "CustomFormSubmission"
        ("id", "tenantId", "formDefinitionId", "storageTableName", "patientId", "appointmentId", "conversationId", "sourceChannel", "submittedByName", "submittedByEmail", "submittedByPhone", "signatureName", "signatureAt", "ipAddress", "userAgent", "rawPayload")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, case when $12::text is null then null else current_timestamp end, $13, $14, $15::jsonb)`,
      [submissionId, tenantId, definition.id, tableName, input.patientId || null, input.appointmentId || null, input.conversationId || null, input.sourceChannel || "PUBLIC_FORM", input.submittedByName || null, input.submittedByEmail || null, input.submittedByPhone || null, input.signatureName || null, input.ipAddress || null, input.userAgent || null, JSON.stringify(payload)],
    );
    for (const field of fields.rows) {
      const answer = String(input.answers[field.fieldKey] ?? "");
      await client.query(
        `insert into "CustomFormSubmissionValue"
          ("id", "tenantId", "submissionId", "formDefinitionId", "fieldId", "fieldKey", "fieldType", "answerText", "answerJson")
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [newId("cfval"), tenantId, submissionId, definition.id, field.id, field.fieldKey, field.fieldType, answer, JSON.stringify({ value: answer })],
      );
    }
    await client.query(
      `insert into "${tableName}" ("submissionId", "tenantId", "patientId", "appointmentId", "sourceChannel", "payload")
       values ($1, $2, $3, $4, $5, $6::jsonb)
       on conflict ("submissionId") do update set "payload" = excluded."payload"`,
      [submissionId, tenantId, input.patientId || null, input.appointmentId || null, input.sourceChannel || "PUBLIC_FORM", JSON.stringify(payload)],
    );
  });
  await addAudit(tenantId, "public_form", "CUSTOM_FORM_SUBMITTED", "CustomFormSubmission", submissionId, "ALLOWED", {
    formDefinitionId: definition.id,
    storageTableName: tableName,
    fieldCount: fields.rows.length,
  });
  return { submissionId, successMessage: definition.successMessage };
}

export async function updateBookingWorkflow(input: {
  tenantId?: string;
  linkId: string;
  workflowKey: string;
  workflowName: string;
  bookingMode: string;
  patientIdentityPolicy: string;
  customFormDefinitionIds: string[];
  screenKeys: string[];
  screenTheme?: Record<string, unknown>;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const template = workflowTemplates.find((item) => item.key === input.workflowKey) ?? workflowTemplates[0];
  const selectedScreens = template.screens.map((screen) => ({
    ...screen,
    enabled: input.screenKeys.includes(screen.key) || screen.required,
  }));
  const result = await query<{ id: string }>(
    `update "PmsOnlineSchedulingLink"
     set "workflowKey" = $3,
       "workflowName" = $4,
       "workflowScreenSchema" = $5::jsonb,
       "customFormDefinitionIds" = $6,
       "bookingMode" = $7,
       "patientIdentityPolicy" = $8,
       "screenTheme" = $9::jsonb,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2
     returning "id"`,
    [tenantId, input.linkId, input.workflowKey, input.workflowName.trim() || template.name, JSON.stringify({ screens: selectedScreens }), input.customFormDefinitionIds, input.bookingMode, input.patientIdentityPolicy, JSON.stringify(input.screenTheme ?? {})],
  );
  if (!result.rows[0]) throw new Error("Booking link not found.");
  await addAudit(tenantId, input.actorRole ?? "practice_manager", "BOOKING_WORKFLOW_UPDATED", "PmsOnlineSchedulingLink", input.linkId, "ALLOWED", {
    workflowKey: input.workflowKey,
    bookingMode: input.bookingMode,
    screenCount: selectedScreens.filter((screen) => screen.enabled).length,
    customFormDefinitionIds: input.customFormDefinitionIds,
  });
}
