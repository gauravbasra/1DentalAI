# Phased Product Improvement Code Plan

Status: implementation blueprint  
Date: 2026-05-24  
Repo: `/Users/gauravbasra/Developer/1DentalAI`

## Why This Exists

The prior product plan described what to build, but it did not include the code package. This document is the code-level plan for turning the Drive reference workflow into 1DentalAI product work.

The product target is:

```txt
OpenDental or PMS source data
  -> 1DentalAI workflow UI
  -> AI or staff processing
  -> human approval gate
  -> PMS writeback job
  -> external response evidence
  -> audit trail
```

Every live workflow must show one of these states:

```ts
export type ExecutionState = "LIVE" | "STAGED" | "NEEDS_APPROVAL" | "BLOCKED" | "FAILED";
```

## Phase 1: PMS Connector Foundation

### Business Goal

Make OpenDental or another approved PMS the source of truth. Internal PMS tables remain the normalized cache and workflow workspace, but the product must distinguish internal save from external PMS writeback.

### UI To Build

Route:

```txt
/app/connectors/pms
```

UI components:

```txt
src/components/connectors/pms-connector-readiness.tsx
src/components/connectors/pms-capability-map.tsx
src/components/connectors/pms-smoke-test-panel.tsx
src/components/connectors/pms-writeback-test-panel.tsx
```

Page:

```txt
src/app/app/connectors/pms/page.tsx
```

Page responsibilities:

- Show OpenDental connector status.
- Show credential vault status without exposing secrets.
- Show capability map: patients, appointments, chart notes, perio, treatment plans, ledger, claims, documents.
- Run read smoke tests.
- Run writeback smoke tests.
- Show last external response and blocker reason.

### Database Models

Add a migration:

```txt
prisma/migrations/YYYYMMDDHHMM_pms_connector_writeback_foundation/migration.sql
```

SQL:

```sql
create table if not exists "PmsConnectorCapability" (
  "id" text primary key,
  "tenantId" text not null,
  "connectorInstanceId" text not null,
  "capabilityKey" text not null,
  "resourceType" text not null,
  "operation" text not null,
  "status" text not null default 'UNKNOWN',
  "requiresApproval" boolean not null default true,
  "requiredEvidence" jsonb not null default '[]'::jsonb,
  "lastSmokeTestAt" timestamp,
  "lastSmokeTestStatus" text,
  "lastSmokeTestSummary" text,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create unique index if not exists "PmsConnectorCapability_unique"
  on "PmsConnectorCapability"("tenantId", "connectorInstanceId", "capabilityKey");

create table if not exists "PmsExternalRecordLink" (
  "id" text primary key,
  "tenantId" text not null,
  "localType" text not null,
  "localId" text not null,
  "connectorInstanceId" text not null,
  "externalType" text not null,
  "externalId" text not null,
  "externalUrl" text,
  "lastSyncedAt" timestamp,
  "metadata" jsonb not null default '{}'::jsonb,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create unique index if not exists "PmsExternalRecordLink_unique"
  on "PmsExternalRecordLink"("tenantId", "localType", "localId", "connectorInstanceId", "externalType");

create table if not exists "PmsWritebackJob" (
  "id" text primary key,
  "tenantId" text not null,
  "connectorInstanceId" text not null,
  "capabilityKey" text not null,
  "localType" text not null,
  "localId" text not null,
  "externalType" text not null,
  "status" text not null default 'PENDING_APPROVAL',
  "idempotencyKey" text not null,
  "requestedByRole" text not null,
  "approvedByRole" text,
  "approvedAt" timestamp,
  "payload" jsonb not null,
  "evidence" jsonb not null default '[]'::jsonb,
  "blockedReason" text,
  "externalResponse" jsonb,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create unique index if not exists "PmsWritebackJob_idempotency_unique"
  on "PmsWritebackJob"("tenantId", "idempotencyKey");

create table if not exists "PmsWritebackAttempt" (
  "id" text primary key,
  "tenantId" text not null,
  "writebackJobId" text not null references "PmsWritebackJob"("id") on delete cascade,
  "status" text not null,
  "requestPayload" jsonb not null,
  "responsePayload" jsonb,
  "statusCode" integer,
  "errorMessage" text,
  "startedAt" timestamp not null default current_timestamp,
  "finishedAt" timestamp
);
```

### Code To Write

```txt
src/lib/pms-connectors/types.ts
src/lib/pms-connectors/open-dental-client.ts
src/lib/pms-connectors/capability-map.ts
src/lib/pms-connectors/writeback-policy.ts
src/lib/pms-connectors/writeback-jobs.ts
src/lib/pms-connectors/smoke-tests.ts
src/app/api/connectors/pms/open-dental/smoke-test/route.ts
src/app/api/connectors/pms/writeback-jobs/route.ts
src/app/api/connectors/pms/writeback-jobs/[jobId]/approve/route.ts
src/app/api/connectors/pms/writeback-jobs/[jobId]/execute/route.ts
```

#### `src/lib/pms-connectors/types.ts`

```ts
export type PmsConnectorKind = "OPEN_DENTAL_DIRECT" | "NEXHEALTH" | "MANUAL_IMPORT";

export type PmsCapabilityKey =
  | "patients.read"
  | "appointments.read"
  | "appointments.write"
  | "clinical_notes.write"
  | "treatment_plans.write"
  | "perio.write"
  | "ledger.write"
  | "claims.read"
  | "claims.write"
  | "documents.write";

export type PmsWritebackStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "RUNNING"
  | "APPLIED"
  | "BLOCKED"
  | "FAILED";

export type PmsConnectorCredentials = {
  baseUrl: string;
  apiKey: string;
  developerKey?: string;
};

export type PmsCapability = {
  key: PmsCapabilityKey;
  resourceType: string;
  operation: "READ" | "WRITE";
  requiresApproval: boolean;
  requiredEvidence: string[];
};

export type PmsWritebackRequest = {
  tenantId: string;
  connectorInstanceId: string;
  capabilityKey: PmsCapabilityKey;
  localType: string;
  localId: string;
  externalType: string;
  requestedByRole: string;
  payload: Record<string, unknown>;
  evidence?: Array<Record<string, unknown>>;
  idempotencyKey: string;
};

export type PmsWritebackExecutionResult = {
  ok: boolean;
  externalId?: string;
  externalUrl?: string;
  statusCode?: number;
  response: Record<string, unknown>;
  blockedReason?: string;
};
```

#### `src/lib/pms-connectors/open-dental-client.ts`

```ts
import "server-only";
import type { PmsConnectorCredentials } from "@/lib/pms-connectors/types";

export class OpenDentalClient {
  constructor(private readonly credentials: PmsConnectorCredentials) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path, this.credentials.baseUrl);
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.credentials.apiKey,
        ...(this.credentials.developerKey ? { "Developer-Key": this.credentials.developerKey } : {}),
        ...(init.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(`OpenDental ${response.status}: ${payload?.error ?? response.statusText}`), {
        statusCode: response.status,
        payload,
      });
    }
    return payload as T;
  }

  async smokeTest() {
    const patients = await this.request<unknown[]>("/patients?limit=1");
    const appointments = await this.request<unknown[]>("/appointments?limit=1");
    return {
      ok: true,
      checks: [
        { label: "patients.read", status: Array.isArray(patients) ? "PASS" : "WARN" },
        { label: "appointments.read", status: Array.isArray(appointments) ? "PASS" : "WARN" },
      ],
    };
  }

  async createClinicalNote(input: { patientExternalId: string; note: string; providerExternalId?: string }) {
    return this.request<{ id?: string; PatNum?: string }>("/clinicalnotes", {
      method: "POST",
      body: JSON.stringify({
        PatNum: input.patientExternalId,
        Note: input.note,
        ProvNum: input.providerExternalId,
      }),
    });
  }

  async createTreatmentPlan(input: {
    patientExternalId: string;
    name: string;
    note?: string;
    items: Array<{ code: string; tooth?: string; surface?: string; feeCents?: number }>;
  }) {
    return this.request<{ id?: string; TreatPlanNum?: string }>("/treatmentplans", {
      method: "POST",
      body: JSON.stringify({
        PatNum: input.patientExternalId,
        Heading: input.name,
        Note: input.note,
        Items: input.items.map((item) => ({
          ProcCode: item.code,
          ToothNum: item.tooth,
          Surf: item.surface,
          FeeAmt: typeof item.feeCents === "number" ? item.feeCents / 100 : undefined,
        })),
      }),
    });
  }

  async createPerioMeasurement(input: {
    patientExternalId: string;
    examExternalId?: string;
    tooth: string;
    site: string;
    probingDepth: number;
    bleeding: boolean;
    recession?: number;
  }) {
    return this.request<{ id?: string; PerioMeasureNum?: string }>("/perio/measurements", {
      method: "POST",
      body: JSON.stringify({
        PatNum: input.patientExternalId,
        PerioExamNum: input.examExternalId,
        ToothNum: input.tooth,
        Site: input.site,
        Depth: input.probingDepth,
        Bleeding: input.bleeding,
        Recession: input.recession,
      }),
    });
  }
}
```

#### `src/lib/pms-connectors/writeback-policy.ts`

```ts
import "server-only";
import { query } from "@/lib/db";
import type { PmsCapabilityKey } from "@/lib/pms-connectors/types";

export async function assertPmsWritebackAllowed(input: {
  tenantId: string;
  connectorInstanceId: string;
  capabilityKey: PmsCapabilityKey;
  roleKey: string;
  evidenceCount: number;
}) {
  const capability = (await query<{
    status: string;
    requiresApproval: boolean;
    requiredEvidence: unknown;
  }>(
    `select "status", "requiresApproval", "requiredEvidence"
       from "PmsConnectorCapability"
      where "tenantId" = $1 and "connectorInstanceId" = $2 and "capabilityKey" = $3
      limit 1`,
    [input.tenantId, input.connectorInstanceId, input.capabilityKey],
  )).rows[0];

  if (!capability || capability.status !== "ACTIVE") {
    return { allowed: false, requiresApproval: true, blockedReason: "PMS capability is not active." };
  }

  const requiredEvidence = Array.isArray(capability.requiredEvidence) ? capability.requiredEvidence : [];
  if (requiredEvidence.length > 0 && input.evidenceCount === 0) {
    return { allowed: false, requiresApproval: capability.requiresApproval, blockedReason: "Required writeback evidence is missing." };
  }

  return { allowed: true, requiresApproval: capability.requiresApproval, blockedReason: null };
}
```

#### `src/lib/pms-connectors/writeback-jobs.ts`

```ts
import "server-only";
import { newId, query, withTransaction } from "@/lib/db";
import { assertPmsWritebackAllowed } from "@/lib/pms-connectors/writeback-policy";
import type { PmsWritebackRequest } from "@/lib/pms-connectors/types";

export async function createPmsWritebackJob(input: PmsWritebackRequest) {
  const policy = await assertPmsWritebackAllowed({
    tenantId: input.tenantId,
    connectorInstanceId: input.connectorInstanceId,
    capabilityKey: input.capabilityKey,
    roleKey: input.requestedByRole,
    evidenceCount: input.evidence?.length ?? 0,
  });
  const status = policy.allowed ? (policy.requiresApproval ? "PENDING_APPROVAL" : "APPROVED") : "BLOCKED";
  const id = newId("pms_wb");

  await query(
    `insert into "PmsWritebackJob"
      ("id", "tenantId", "connectorInstanceId", "capabilityKey", "localType", "localId", "externalType",
       "status", "idempotencyKey", "requestedByRole", "payload", "evidence", "blockedReason")
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     on conflict ("tenantId", "idempotencyKey") do update
       set "updatedAt" = current_timestamp
     returning "id"`,
    [
      id,
      input.tenantId,
      input.connectorInstanceId,
      input.capabilityKey,
      input.localType,
      input.localId,
      input.externalType,
      status,
      input.idempotencyKey,
      input.requestedByRole,
      JSON.stringify(input.payload),
      JSON.stringify(input.evidence ?? []),
      policy.blockedReason,
    ],
  );

  await query(
    `insert into "AuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1,$2,$3,'PMS_WRITEBACK_JOB_CREATED','PmsWritebackJob',$4,$5,$6)`,
    [newId("audit"), input.tenantId, input.requestedByRole, id, status === "BLOCKED" ? "BLOCKED" : "ALLOWED", JSON.stringify({ capabilityKey: input.capabilityKey, status })],
  );

  return { id, status, blockedReason: policy.blockedReason };
}

export async function approvePmsWritebackJob(input: { tenantId: string; jobId: string; approvedByRole: string }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `update "PmsWritebackJob"
          set "status" = 'APPROVED', "approvedByRole" = $3, "approvedAt" = current_timestamp, "updatedAt" = current_timestamp
        where "tenantId" = $1 and "id" = $2 and "status" in ('PENDING_APPROVAL','FAILED')
        returning "id"`,
      [input.tenantId, input.jobId, input.approvedByRole],
    );
    if (result.rowCount !== 1) throw new Error("Writeback job cannot be approved in its current state.");
    await client.query(
      `insert into "AuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1,$2,$3,'PMS_WRITEBACK_JOB_APPROVED','PmsWritebackJob',$4,'ALLOWED','{}'::jsonb)`,
      [newId("audit"), input.tenantId, input.approvedByRole, input.jobId],
    );
    return { id: input.jobId, status: "APPROVED" };
  });
}
```

### Data Flow

```txt
Vault credentials
  -> OpenDental client
  -> read smoke test
  -> capability table
  -> UI readiness card

Workflow action
  -> create writeback job
  -> policy check
  -> approval if needed
  -> execute writeback
  -> external response stored
  -> external record link stored
  -> audit event
```

## Phase 2: Patient Timeline

### Business Goal

Make the patient the center of the product. Phone, clinical AI, perio, RCM, documents, ledger, claims, treatment, and tasks must be visible in one timeline.

### UI To Build

```txt
src/app/app/pms/patients/[patientId]/timeline/page.tsx
src/components/patients/patient-timeline.tsx
src/components/patients/patient-timeline-filter.tsx
src/components/patients/patient-timeline-event-card.tsx
```

### Code To Write

```txt
src/lib/patient-timeline-repository.ts
src/app/api/pms/patients/[patientId]/timeline/route.ts
```

Repository contract:

```ts
export type PatientTimelineEvent = {
  id: string;
  tenantId: string;
  patientId: string;
  occurredAt: string;
  sourceModule: "PMS" | "PHONE" | "SCRIBE" | "PERIO" | "RCM" | "DOCUMENTS" | "LEDGER" | "TASKS";
  eventType: string;
  title: string;
  body: string;
  status: string;
  localType: string;
  localId: string;
  externalType?: string;
  externalId?: string;
  writebackStatus?: string;
  evidenceCount: number;
  routeHref: string;
};

export async function getPatientTimeline(input: {
  tenantId: string;
  patientId: string;
  filters?: string[];
}): Promise<PatientTimelineEvent[]> {
  // Implementation merges PmsAppointment, PhoneConversation, PmsClinicalNote,
  // PmsPerioExam, PmsTreatmentPlan, PmsClaim, PmsLedgerEntry, PmsDocument, and PmsTask.
  // Each SELECT must project into the same event shape and preserve source attribution.
  return [];
}
```

### Data Flow

```txt
Internal PMS records + external record links + phone + RCM + scribe + perio
  -> normalized timeline event list
  -> patient timeline UI
```

### Writeback

Timeline does not write directly. It links to action pages and displays writeback state from `PmsWritebackJob`.

## Phase 3: AI Scribe To Treatment Plan Writeback

### Business Goal

Match the Drive reference workflow: patient context, AI note, CDT treatment plan, provider approval, OpenDental writeback.

### UI To Build

```txt
src/app/app/pms/patients/[patientId]/scribe/page.tsx
src/components/clinical/scribe-patient-context.tsx
src/components/clinical/scribe-transcript-capture.tsx
src/components/clinical/scribe-note-editor.tsx
src/components/clinical/scribe-treatment-plan-editor.tsx
src/components/clinical/scribe-writeback-panel.tsx
```

### Code To Write

```txt
src/lib/clinical-scribe-workflow.ts
src/lib/clinical-treatment-plan-normalizer.ts
src/app/api/pms/scribe/writeback/route.ts
src/app/api/pms/treatment-plans/[id]/writeback/route.ts
```

Core workflow contract:

```ts
export type ScribeWritebackPackage = {
  patientId: string;
  appointmentId?: string;
  clinicalNoteId: string;
  treatmentPlanId?: string;
  providerApprovalId: string;
  note: {
    noteType: string;
    body: string;
    sourceTranscriptId?: string;
  };
  treatmentPlan?: {
    name: string;
    note?: string;
    items: Array<{
      code: string;
      tooth?: string;
      surface?: string;
      phase: number;
      priority?: string;
      feeCents?: number;
      rationale?: string;
    }>;
  };
};

export async function createScribeWritebackJobs(input: {
  tenantId: string;
  actorRole: string;
  connectorInstanceId: string;
  package: ScribeWritebackPackage;
}) {
  // 1. Verify provider approval exists and is valid.
  // 2. Resolve patient external PMS id from PmsExternalRecordLink.
  // 3. Create clinical note writeback job.
  // 4. If treatment plan exists, create treatment plan writeback job.
  // 5. Return job ids and blocked reasons.
}
```

### Business Logic

- AI draft is never final.
- Provider approval is mandatory for clinical note writeback.
- CDT rows must come from tenant procedure-code catalog.
- Writeback is blocked if the patient has no PMS external link.
- If OpenDental writeback fails, the internal note and treatment plan remain available as staged drafts.

### Data Source

```txt
PmsPatient
PmsAppointment
PmsProcedureCode
PmsClinicalNote
PmsTreatmentPlan
PmsTreatmentPlanItem
PmsExternalRecordLink
OpenAI transcript/draft output
```

### Processing

```txt
audio/manual transcript
  -> transcription if audio
  -> structured scribe generation
  -> CDT validation
  -> provider edits
  -> provider approval
  -> writeback jobs
  -> OpenDental clinical note and treatment plan
```

## Phase 4: Voice Perio

### Business Goal

Hands-free perio charting with validation, correction, signoff, and PMS writeback.

### UI To Build

```txt
src/components/perio/perio-chart-grid.tsx
src/components/perio/perio-site-cursor.tsx
src/components/perio/perio-voice-capture.tsx
src/components/perio/perio-command-preview.tsx
src/components/perio/perio-signoff-panel.tsx
```

### Code To Write

```txt
src/lib/perio-command-parser.ts
src/lib/perio-workflow.ts
src/app/api/pms/perio/[patientId]/voice-command/route.ts
src/app/api/pms/perio/[patientId]/writeback/route.ts
```

Parser contract:

```ts
export type PerioSite = "MB" | "B" | "DB" | "ML" | "L" | "DL";

export type ParsedPerioCommand =
  | {
      type: "MEASUREMENT";
      tooth: string;
      site: PerioSite;
      probingDepth: number;
      bleeding: boolean;
      recession?: number;
      confidence: number;
      rawText: string;
    }
  | {
      type: "CORRECTION";
      tooth: string;
      site: PerioSite;
      probingDepth?: number;
      bleeding?: boolean;
      rawText: string;
    }
  | {
      type: "CONTROL";
      action: "NEXT_SITE" | "SKIP_TOOTH" | "UNDO" | "COMPLETE_EXAM";
      rawText: string;
    };

export function parsePerioCommand(rawText: string): ParsedPerioCommand {
  const text = rawText.toLowerCase().trim();
  const tooth = text.match(/\b(?:tooth\s*)?(\d{1,2})\b/)?.[1];
  const depth = text.match(/\b([1-9]|1[0-2])\s*(?:mm)?\b/)?.[1];
  const site = normalizeSite(text);
  if (text.includes("undo")) return { type: "CONTROL", action: "UNDO", rawText };
  if (text.includes("complete exam")) return { type: "CONTROL", action: "COMPLETE_EXAM", rawText };
  if (text.includes("correction") && tooth && site) {
    return { type: "CORRECTION", tooth, site, probingDepth: depth ? Number(depth) : undefined, rawText };
  }
  if (!tooth || !site || !depth) throw new Error("Could not parse perio tooth, site, and depth.");
  return {
    type: "MEASUREMENT",
    tooth,
    site,
    probingDepth: Number(depth),
    bleeding: /\bbleed|bleeding|bop\b/.test(text),
    rawText,
    confidence: 0.85,
  };
}

function normalizeSite(text: string): PerioSite | null {
  if (/\bmb|mesial buccal\b/.test(text)) return "MB";
  if (/\bdb|distal buccal\b/.test(text)) return "DB";
  if (/\bml|mesial lingual\b/.test(text)) return "ML";
  if (/\bdl|distal lingual\b/.test(text)) return "DL";
  if (/\bb|buccal|facial\b/.test(text)) return "B";
  if (/\bl|lingual\b/.test(text)) return "L";
  return null;
}
```

### Data Flow

```txt
browser mic
  -> /api/pms/scribe/transcribe or perio-specific transcription
  -> parsePerioCommand
  -> provisional command preview
  -> save measurement
  -> audit
  -> writeback job if signoff complete
```

### Writeback

Internal:

```txt
PmsPerioExam
PmsPerioMeasure
PmsAuditEvent
```

External:

```txt
OpenDental perio measurement endpoint through PmsWritebackJob
```

## Phase 5: RCM Evidence Engine

### Business Goal

RCM actions must be evidence-backed. Do not mark claim, payer, denial, prior-auth, or ERA work externally complete without proof.

### UI To Build

```txt
src/components/rcm/evidence-drawer.tsx
src/components/rcm/packet-preview.tsx
src/components/rcm/writeback-status.tsx
src/components/rcm/rcm-action-checklist.tsx
```

### Database Models

```sql
create table if not exists "RcmEvidence" (
  "id" text primary key,
  "tenantId" text not null,
  "sourceType" text not null,
  "sourceRecordId" text not null,
  "evidenceType" text not null,
  "title" text not null,
  "storageUrl" text,
  "checksum" text,
  "extractedFacts" jsonb not null default '{}'::jsonb,
  "reviewStatus" text not null default 'NEEDS_REVIEW',
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create table if not exists "RcmPacket" (
  "id" text primary key,
  "tenantId" text not null,
  "packetType" text not null,
  "sourceType" text not null,
  "sourceRecordId" text not null,
  "status" text not null default 'DRAFT',
  "summary" text not null,
  "requiredEvidence" jsonb not null default '[]'::jsonb,
  "evidenceIds" jsonb not null default '[]'::jsonb,
  "payload" jsonb not null default '{}'::jsonb,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);
```

### Code To Write

```txt
src/lib/rcm-evidence-repository.ts
src/lib/rcm-packet-builder.ts
src/lib/rcm-writeback-workflow.ts
src/app/api/rcm/evidence/upload/route.ts
src/app/api/rcm/prior-auth/[id]/packet/route.ts
src/app/api/rcm/denials/[id]/appeal-packet/route.ts
src/app/api/rcm/era/[id]/post-to-pms/route.ts
```

Packet builder contract:

```ts
export type RcmPacketType = "ELIGIBILITY" | "PRIOR_AUTH" | "DENIAL_APPEAL" | "ERA_POSTING";

export async function buildRcmPacket(input: {
  tenantId: string;
  actorRole: string;
  packetType: RcmPacketType;
  sourceRecordId: string;
}) {
  // 1. Load source record.
  // 2. Load required evidence rules.
  // 3. Attach available evidence.
  // 4. Produce checklist and summary.
  // 5. Return DRAFT, READY_FOR_REVIEW, or BLOCKED.
}
```

### Data Flow

```txt
payer screenshot/pdf/eob/era/claim trace
  -> RcmEvidence
  -> extracted facts
  -> packet builder
  -> staff review
  -> writeback job
  -> PMS claim/ledger/insurance note
```

## Phase 6: Phone And AI Voice Live Readiness

### Business Goal

Move from staged phone work items to real call handling where provider readiness is explicit.

### UI To Build

```txt
src/components/phone/softphone-panel.tsx
src/components/phone/screen-pop-panel.tsx
src/components/phone/live-transcript-panel.tsx
src/components/phone/call-disposition-panel.tsx
src/components/phone/phone-setup-wizard.tsx
```

### Code To Write

```txt
src/lib/phone/twilio-client.ts
src/lib/phone/live-call-service.ts
src/lib/phone/screen-pop-service.ts
src/lib/phone/call-summary-service.ts
src/app/api/phone/live/dial/route.ts
src/app/api/phone/live/control/route.ts
src/app/api/phone/live/summary/route.ts
```

Live call contract:

```ts
export type LiveCallAction =
  | "OUTBOUND_DIAL"
  | "ANSWER"
  | "HOLD"
  | "RESUME"
  | "WARM_TRANSFER"
  | "BLIND_TRANSFER"
  | "CALL_PARK"
  | "PICKUP_PARK"
  | "SEND_TO_VOICEMAIL"
  | "END_CALL";

export async function executeLiveCallAction(input: {
  tenantId: string;
  actorRole: string;
  activeCallId?: string;
  conversationId?: string;
  actionType: LiveCallAction;
  targetNumber?: string;
  targetExtensionId?: string;
  targetParkSlot?: string;
}) {
  // 1. Load active provider readiness.
  // 2. Block if credentials, webhook, number, or E911 requirements are missing.
  // 3. Execute provider action only when ready.
  // 4. Store provider response.
  // 5. Audit success or blocker.
}
```

### Data Flow

```txt
Twilio webhook
  -> normalize caller
  -> patient match
  -> screen pop snapshot
  -> active call
  -> transcript events
  -> AI/staff summary
  -> disposition task
  -> PMS communication note writeback job
```

## Phase 7: Readiness Dashboard

### Business Goal

The product should never claim a module is live unless its feature-specific smoke test passed.

### UI To Build

```txt
src/app/app/admin/readiness/page.tsx
src/components/readiness/readiness-card.tsx
src/components/readiness/smoke-test-runner.tsx
```

### Code To Write

```txt
src/lib/readiness/smoke-test-registry.ts
src/lib/readiness/run-smoke-test.ts
src/app/api/readiness/run/route.ts
src/app/api/readiness/status/route.ts
```

Smoke test registry:

```ts
export type SmokeTestKey =
  | "app.health"
  | "openai.transcription"
  | "openai.scribe"
  | "pms.open_dental.read"
  | "pms.open_dental.writeback"
  | "phone.twilio.webhook"
  | "phone.twilio.call_control"
  | "rcm.era_posting"
  | "rcm.prior_auth_packet";

export type SmokeTestResult = {
  key: SmokeTestKey;
  status: "PASS" | "WARN" | "FAIL" | "BLOCKED";
  summary: string;
  blocker?: string;
  checkedAt: string;
};
```

## Phase 8: Role-Based Daily Workflows

### Business Goal

Make the app usable for daily dental work. Users should not have to inspect every module manually.

### UI To Build

```txt
src/app/app/today/page.tsx
src/components/today/role-dashboard.tsx
src/components/today/work-queue-card.tsx
src/components/today/module-blocker-card.tsx
```

### Code To Write

```txt
src/lib/daily-workflows-repository.ts
src/app/api/today/route.ts
```

Repository contract:

```ts
export type DailyWorkItem = {
  id: string;
  roleKey: string;
  module: "PHONE" | "PMS" | "SCRIBE" | "PERIO" | "RCM" | "FORMS" | "CONNECTORS";
  priority: "HIGH" | "NORMAL" | "LOW";
  title: string;
  patientLabel?: string;
  dueAt?: string;
  status: string;
  blocker?: string;
  href: string;
};

export async function getDailyWorkflow(input: { tenantId: string; roleKey: string }) {
  // Merge phone callbacks, unsigned notes, perio exams, RCM blockers,
  // treatment plans, open claims, forms, and connector readiness gaps.
}
```

## Phase 9: Demo And Go-Live Pack

### Business Goal

Create a full end-to-end demo scenario that mirrors the Drive reference:

```txt
appointment -> AI scribe -> treatment plan -> perio -> benefits -> prior auth -> claim -> ERA -> ledger -> phone follow-up
```

### Code To Write

```txt
prisma/fixtures/demo-open-dental-workflow.json
scripts/seed-demo-open-dental-workflow.mjs
scripts/run-product-smoke-tests.mjs
tests/e2e/open-dental-scribe-writeback.spec.ts
tests/e2e/voice-perio.spec.ts
tests/e2e/rcm-packet.spec.ts
tests/e2e/phone-screen-pop.spec.ts
```

### Go-Live Test Matrix

```txt
npm run lint
npm run build
node scripts/run-product-smoke-tests.mjs
GET /api/health
GET /api/clinical-ai/transcribe
POST /api/connectors/pms/open-dental/smoke-test
POST /api/pms/scribe/generate
POST /api/pms/scribe/save
POST /api/pms/scribe/writeback
POST /api/pms/perio/:patientId/voice-command
POST /api/rcm/era/:id/post-to-pms
POST /api/phone/live/control
```

## Drive Reference Delta

The Drive folder `Snapshot of RCM` is implementation evidence, not inspiration. The folder contains 48 JPG workflow screenshots and 2 MP4 recordings:

```txt
20260522_103043.mp4 - phone AI, call handling, emergency booking, transcript, summary
20260522_104001.mp4 - voice perio, configurable commands, office-specific perio rules
```

The product must be built against these observed workflows:

- OpenDental-style schedule grid with patient screen-pop.
- Patient detail card with appointment, account, family, referrals, treatment plans, documents, alerts, and communication actions.
- AI clinical transcribe launched from patient or appointment context, not as a standalone utility.
- AI-generated clinical note and treatment plan with CDT code search, tooth, surface, phase, priority, fee, and rationale.
- Treatment plan writeback that matches OpenDental treatment-plan behavior and preserves failed writes as staged drafts.
- OpenDental chart, progress notes, documents, imaging, family, ledger, and treatment-plan parity.
- Phone AI that answers calls through the office number, books emergency appointments, handles insurance/cash questions, writes booking attribution, and stores call transcript plus summary.
- Voice perio that captures probing, gingival margin, MGJ, bleeding, mobility, tooth/site navigation, corrections, and signoff.
- Office-specific perio rule profiles, for example `bleeding on probing depths >= 4`, without hard-coding one clinic workflow.
- RCM evidence packets that keep payer screenshot/PDF/EOB/ERA/claim traces with extracted facts, checksum, reviewer status, and PMS writeback linkage.

## Drive-Derived Build Gates

No phase can be marked `LIVE` unless these gates pass in QA:

- A user can start from the schedule, open a patient screen-pop, and launch the relevant workflow without reselecting patient context.
- Every generated note, treatment plan, perio exam, phone summary, claim action, and RCM packet has a durable database record.
- Every external PMS mutation goes through `PmsWritebackJob`, stores idempotency, external response, audit event, and external record link.
- Clinical writes require provider approval before execution.
- RCM writes require evidence before execution.
- Phone workflows show provider readiness, webhook readiness, caller/patient matching, transcript, summary, appointment booking, and PMS communication-note writeback status.
- Perio workflows support voice commands, correction commands, office rule profiles, manual override, signoff, and PMS writeback status.
- QA can reproduce the Drive reference scenario end to end:

```txt
phone call
  -> patient match or new patient intake
  -> emergency appointment booking
  -> transcript and summary
  -> schedule screen-pop
  -> clinical scribe
  -> CDT treatment plan
  -> provider approval
  -> PMS writeback
  -> perio charting
  -> perio signoff
  -> RCM evidence packet
  -> claim or prior-auth packet
  -> ledger/claim writeback
  -> audit trail
```

## Implementation Order

1. Add Phase 1 database migration and connector service files.
2. Add PMS connector page and smoke-test endpoints.
3. Add patient timeline repository and UI.
4. Implement Drive-derived schedule screen-pop and patient context launch points.
5. Move scribe into patient context and add clinical note plus treatment-plan writeback jobs.
6. Rebuild perio into grid, voice parser, office rule profiles, correction flow, signoff, and writeback.
7. Add phone live provider execution gates, screen-pop, AI booking attribution, transcript, summary, and PMS communication-note writeback.
8. Add RCM evidence and packet builder.
9. Add readiness dashboard.
10. Add role-based daily dashboard.
11. Add demo seed and e2e smoke tests.

## Definition Of Done

A workflow is done only when all of these are true:

- It has a real UI.
- It has durable database records.
- It has role and tenant checks.
- It has audit events.
- It has explicit live/staged/blocked status.
- It has connector readiness checks.
- It has idempotent writeback jobs for external writes.
- It has evidence stored for RCM and clinical writeback.
- It has a smoke test.
- It has a Playwright or QA-agent path that clicks the live UI, not only direct API tests.
- It passes the Drive reference build gates above.
- The app passes lint and build.
