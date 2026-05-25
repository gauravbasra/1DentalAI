import "server-only";

import { query } from "@/lib/db";

export type PatientTimelineSource =
  | "APPOINTMENT"
  | "PHONE"
  | "CLINICAL_NOTE"
  | "PERIO"
  | "TREATMENT_PLAN"
  | "CLAIM"
  | "LEDGER"
  | "DOCUMENT"
  | "TASK";

export type PatientTimelineEvent = {
  id: string;
  source: PatientTimelineSource;
  localType: string;
  localId: string;
  occurredAt: string;
  title: string;
  summary: string;
  status: string;
  actor: string | null;
  amountCents: number | null;
  routeHref: string | null;
  evidenceCount: number;
  writebackStatus: string | null;
  writebackBlockedReason: string | null;
};

export type PatientTimelineFilters = {
  source?: PatientTimelineSource | "ALL" | string;
  status?: string;
  from?: string;
  to?: string;
};

type RawTimelineEvent = Omit<PatientTimelineEvent, "evidenceCount" | "writebackStatus" | "writebackBlockedReason">;

const sources = new Set<PatientTimelineSource>([
  "APPOINTMENT",
  "PHONE",
  "CLINICAL_NOTE",
  "PERIO",
  "TREATMENT_PLAN",
  "CLAIM",
  "LEDGER",
  "DOCUMENT",
  "TASK",
]);

function parseSource(value?: string | null): PatientTimelineSource | "ALL" {
  if (!value || value === "ALL") return "ALL";
  return sources.has(value as PatientTimelineSource) ? (value as PatientTimelineSource) : "ALL";
}

function nullableDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function routeFor(localType: string, localId: string, patientId: string) {
  switch (localType) {
    case "PmsAppointment":
      return `/app/pms/appointments/${localId}`;
    case "PmsClinicalNote":
      return `/app/pms/chart/${patientId}`;
    case "PmsPerioExam":
      return `/app/pms/perio/${patientId}`;
    case "PmsTreatmentPlan":
      return `/app/pms/treatment-plans`;
    case "PmsClaim":
    case "PmsLedgerEntry":
      return `/app/pms/ledger`;
    case "PmsDocument":
      return `/app/pms/documents`;
    case "PmsTask":
      return `/app/pms/tasks`;
    case "PhoneConversation":
      return `/app/patient-engagement`;
    default:
      return null;
  }
}

export function normalizeTimelineFilters(input: PatientTimelineFilters = {}) {
  return {
    source: parseSource(input.source),
    status: input.status?.trim() || "ALL",
    from: nullableDate(input.from),
    to: nullableDate(input.to),
  };
}

export async function getPatientTimeline(input: {
  tenantId: string;
  patientId: string;
  filters?: PatientTimelineFilters;
  limit?: number;
}): Promise<PatientTimelineEvent[]> {
  const filters = normalizeTimelineFilters(input.filters);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 250);
  const params: unknown[] = [input.tenantId, input.patientId, filters.source, filters.status, filters.from, filters.to, limit];

  const result = await query<RawTimelineEvent & { evidenceCount: string; writebackStatus: string | null; writebackBlockedReason: string | null }>(
    `with events as (
      select
        a."id" || ':appointment' as "id",
        'APPOINTMENT'::text as "source",
        'PmsAppointment'::text as "localType",
        a."id" as "localId",
        a."startsAt" as "occurredAt",
        a."appointmentType" || ' appointment' as "title",
        concat_ws(' · ', a."status", a."readinessStatus", nullif(a."notes", '')) as "summary",
        a."status",
        coalesce(pr."displayName", op."name") as "actor",
        a."productionCents"::int as "amountCents"
      from "PmsAppointment" a
      left join "PmsProvider" pr on pr."id" = a."providerId" and pr."tenantId" = a."tenantId"
      left join "PmsOperatory" op on op."id" = a."operatoryId" and op."tenantId" = a."tenantId"
      where a."tenantId" = $1 and a."patientId" = $2

      union all

      select
        pc."id" || ':phone',
        'PHONE',
        'PhoneConversation',
        pc."id",
        pc."startedAt",
        concat_ws(' ', initcap(lower(pc."direction")), 'phone conversation'),
        concat_ws(' · ', pc."aiIntent", pc."outcome", pc."transcriptSummary", pc."followUpStatus"),
        pc."status",
        pc."callerName",
        null::int
      from "PhoneConversation" pc
      where pc."tenantId" = $1 and pc."patientId" = $2

      union all

      select
        n."id" || ':note',
        'CLINICAL_NOTE',
        'PmsClinicalNote',
        n."id",
        coalesce(n."signedAt", n."createdAt"),
        n."noteType" || ' note',
        left(n."body", 260),
        n."status",
        coalesce(pr."displayName", n."signedByRole"),
        null::int
      from "PmsClinicalNote" n
      left join "PmsProvider" pr on pr."id" = n."providerId" and pr."tenantId" = n."tenantId"
      where n."tenantId" = $1 and n."patientId" = $2

      union all

      select
        pe."id" || ':perio',
        'PERIO',
        'PmsPerioExam',
        pe."id",
        pe."examDate",
        'Perio exam',
        concat_ws(' · ', pe."diagnosis", case when pe."bleedingScore" is not null then 'Bleeding score ' || pe."bleedingScore"::text end),
        pe."status",
        pr."displayName",
        null::int
      from "PmsPerioExam" pe
      left join "PmsProvider" pr on pr."id" = pe."providerId"
      where pe."patientId" = $2

      union all

      select
        tp."id" || ':treatment',
        'TREATMENT_PLAN',
        'PmsTreatmentPlan',
        tp."id",
        coalesce(tp."acceptedAt", tp."createdAt"),
        tp."name",
        concat_ws(' · ', tp."status", nullif(tp."presentationNote", ''), 'Patient estimate ' || (tp."patientEstimateCents" / 100)::text),
        tp."status",
        pr."displayName",
        tp."totalFeeCents"::int
      from "PmsTreatmentPlan" tp
      left join "PmsProvider" pr on pr."id" = tp."providerId" and pr."tenantId" = tp."tenantId"
      where tp."tenantId" = $1 and tp."patientId" = $2

      union all

      select
        c."id" || ':claim',
        'CLAIM',
        'PmsClaim',
        c."id",
        coalesce(c."lastStatusAt", c."submittedAt", c."createdAt"),
        concat_ws(' ', c."payerName", coalesce(c."claimNumber", 'claim')),
        concat_ws(' · ', c."status", 'attachments ' || c."attachmentStatus", 'paid ' || (c."paidCents" / 100)::text, 'patient due ' || (c."patientDueCents" / 100)::text),
        c."status",
        c."payerName",
        c."billedCents"::int
      from "PmsClaim" c
      where c."tenantId" = $1 and c."patientId" = $2

      union all

      select
        le."id" || ':ledger',
        'LEDGER',
        'PmsLedgerEntry',
        le."id",
        coalesce(le."serviceDate", le."postedAt"),
        le."entryType",
        le."description",
        le."status",
        null::text,
        le."amountCents"::int
      from "PmsLedgerEntry" le
      where le."tenantId" = $1 and le."patientId" = $2

      union all

      select
        d."id" || ':document',
        'DOCUMENT',
        'PmsDocument',
        d."id",
        d."createdAt",
        d."title",
        concat_ws(' · ', d."documentType", d."status", d."signatureStatus", d."sourceModule"),
        d."status",
        d."reviewedByRole",
        null::int
      from "PmsDocument" d
      where d."tenantId" = $1 and d."patientId" = $2

      union all

      select
        t."id" || ':task',
        'TASK',
        'PmsTask',
        t."id",
        coalesce(t."dueAt", t."createdAt"),
        t."title",
        concat_ws(' · ', t."taskType", t."priority", t."ownerRoleKey"),
        t."status",
        t."ownerRoleKey",
        null::int
      from "PmsTask" t
      where t."tenantId" = $1 and t."patientId" = $2
    )
    select
      e.*,
      coalesce(jsonb_array_length(w."evidence"::jsonb), 0)::text as "evidenceCount",
      w."status" as "writebackStatus",
      w."blockedReason" as "writebackBlockedReason"
    from events e
    left join lateral (
      select "status", "blockedReason", "evidence"
      from "PmsWritebackJob" wj
      where wj."tenantId" = $1 and wj."localType" = e."localType" and wj."localId" = e."localId"
      order by wj."createdAt" desc
      limit 1
    ) w on true
    where ($3::text = 'ALL' or e."source" = $3::text)
      and ($4::text = 'ALL' or e."status" = $4::text)
      and ($5::timestamptz is null or e."occurredAt" >= $5::timestamptz)
      and ($6::timestamptz is null or e."occurredAt" <= $6::timestamptz)
    order by e."occurredAt" desc
    limit $7::int`,
    params,
  );

  return result.rows.map((row) => ({
    ...row,
    routeHref: routeFor(row.localType, row.localId, input.patientId),
    amountCents: row.amountCents === null ? null : Number(row.amountCents),
    evidenceCount: Number(row.evidenceCount ?? 0),
  }));
}

export const patientTimelineSources: Array<{ value: PatientTimelineSource | "ALL"; label: string }> = [
  { value: "ALL", label: "All activity" },
  { value: "APPOINTMENT", label: "Appointments" },
  { value: "PHONE", label: "Phone" },
  { value: "CLINICAL_NOTE", label: "Clinical notes" },
  { value: "PERIO", label: "Perio" },
  { value: "TREATMENT_PLAN", label: "Treatment" },
  { value: "CLAIM", label: "Claims" },
  { value: "LEDGER", label: "Ledger" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "TASK", label: "Tasks" },
];
