import { newId, query, withTransaction } from "@/lib/db";

export const defaultTenantId = "tenant_1dentalai_production";

export type PmsPatientSummary = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  privacyLevel: string;
  familyAccountId: string | null;
  responsibleParty: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  referralSource?: string | null;
  patientNote: string | null;
  openTasks: number;
  balanceCents: number;
};

export type PmsFamilyAccountRow = {
  id: string;
  accountNumber: string;
  displayName: string;
  guarantorPatientId: string | null;
  billingType: string;
  billingStatus: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  financialNote: string | null;
};

export type PmsAppointmentRow = {
  id: string;
  patientId: string | null;
  patientName: string | null;
  providerName: string | null;
  operatoryName: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  appointmentType: string;
  productionCents: number;
  readinessStatus: string;
  notes: string | null;
};

export type PmsAppointmentProcedureRow = {
  id: string;
  procedureCodeId: string;
  code: string;
  description: string;
  category: string;
  tooth: string | null;
  surface: string | null;
  feeCents: number;
  status: string;
};

export type PmsAppointmentReadinessBlocker = {
  area: string;
  severity: "HARD" | "SOFT";
  message: string;
  action: string;
};

export type PmsAppointmentControl = {
  appointment: PmsAppointmentRow & {
    tenantId: string;
    providerId: string | null;
    operatoryId: string | null;
    chartNumber: string | null;
    patientFirstName: string | null;
    patientLastName: string | null;
    phone: string | null;
    email: string | null;
    primaryInsuranceId: string | null;
    eligibilityStatus: string | null;
    payerName: string | null;
    planName: string | null;
  };
  procedures: PmsAppointmentProcedureRow[];
  forms: Array<{ id: string; templateName: string; status: string; dueAt: string | null }>;
  labCases: Array<{ id: string; labName: string; caseType: string; status: string; dueDate: string | null }>;
  imaging: Array<{ id: string; studyType: string; acquisitionStatus: string; tooth: string | null; region: string | null; takenAt: string | null }>;
  claims: Array<{ id: string; claimNumber: string | null; status: string; billedCents: number; patientDueCents: number; attachmentStatus: string }>;
  checkoutSessions: Array<{ id: string; status: string; chargeCents: number; patientPaymentCents: number; claimId: string | null; createdAt: string; checkoutNote: string | null }>;
  readinessBlockers: PmsAppointmentReadinessBlocker[];
  totals: { procedureFeeCents: number; estimatedPatientDueCents: number; openBalanceCents: number };
};

export type PmsAppointmentCategoryRow = {
  id: string;
  name: string;
  color: string;
  defaultMinutes: number;
  productionType: string;
  defaultProcedureCodes: string[];
  providerType: string | null;
};

export type PmsScheduleBoard = {
  date: string;
  operatories: Array<{ id: string; code: string; name: string; status: string }>;
  providers: Array<{ id: string; displayName: string; providerType: string }>;
  categories: PmsAppointmentCategoryRow[];
  appointments: PmsAppointmentRow[];
  blockouts: Array<{ id: string; operatoryId: string | null; providerId: string | null; startsAt: string; endsAt: string; reason: string; blockType: string }>;
  requests: Array<{ id: string; requestType: string; source: string; urgency: string; preferredWindow: string | null; status: string; note: string | null; patientName: string | null }>;
  recalls: Array<{ id: string; recallType: string; dueDate: string; status: string; procedureCodes: string[]; patientName: string }>;
  labCases: Array<{ id: string; labName: string; caseType: string; status: string; dueDate: string | null; patientName: string | null }>;
  production: { scheduledCents: number; completedCents: number; unscheduledRequests: number; dueRecalls: number; labCaseRisks: number };
};

export type PmsPracticeIntelligence = {
  productionTrend: Array<{ day: string; scheduledCents: number; completedCents: number; appointmentCount: number }>;
  providerProduction: Array<{ providerId: string | null; providerName: string; providerType: string | null; scheduledCents: number; completedCents: number; last30RevenueCents: number; appointmentCount: number; completedProcedureCount: number; bookedMinutes: number; bookedUntil: string | null }>;
  roomUtilization: Array<{ operatoryId: string | null; roomName: string; roomCode: string | null; scheduledCents: number; completedCents: number; bookedMinutes: number; utilizationPercent: number; appointmentCount: number; bookedUntil: string | null }>;
  serviceMix: Array<{ serviceLine: string; scheduledCents: number; completedCents: number; last90RevenueCents: number; bookedMinutes: number; appointmentCount: number; bookedUntil: string | null }>;
  payerMix: Array<{ payerName: string; billedCents: number; paidCents: number; patientDueCents: number; openCents: number; claimCount: number; denialCount: number; collectionRate: number }>;
  calendarForecast: Array<{ weekStart: string; scheduledCents: number; bookedMinutes: number; appointmentCount: number }>;
  bookedProductionHorizon: Array<{ horizon: string; scheduledCents: number; bookedMinutes: number; appointmentCount: number; providerCount: number; roomCount: number }>;
  hygieneRecall: { dueCount: number; overdueCount: number; unscheduledDueCount: number; futureRecallBookedCount: number; recallOpportunityCents: number; hygieneVisits30: number; hygieneReappointed30: number; reappointmentRate: number };
  noShowCancelImpact: { brokenCount: number; noShowCount: number; cancelCount: number; lostProductionCents: number; unscheduledPatientCount: number; recoveredCount: number; recoveredProductionCents: number };
  roomProviderProduction: Array<{ operatoryId: string | null; roomName: string; providerId: string | null; providerName: string; scheduledCents: number; completedCents: number; bookedMinutes: number; appointmentCount: number }>;
  insights: Array<{ label: string; value: string; detail: string; tone: "green" | "amber" | "red" | "neutral" }>;
};

export type PmsOnlineSchedulingLinkRow = {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  audience: string;
  sourceChannel: string;
  status: string;
  appointmentCategoryId: string | null;
  providerId: string | null;
  locationId: string | null;
  earliestBookingDays: number;
  maxBookingDays: number;
  slotIntervalMinutes: number;
  reservationFeeCents: number;
  requiresInsurance: boolean;
  acceptedPayerNames: string[] | null;
  patientTypePolicy: string;
  requireSmsVerification: boolean;
  publicFlowConfig: Record<string, unknown> | null;
  intakeQuestionSchema: Record<string, unknown> | null;
  confirmationPolicy: Record<string, unknown> | null;
  brandingJson: Record<string, unknown> | null;
  notes: string | null;
  categoryName: string | null;
  defaultMinutes: number | null;
  providerName: string | null;
  bookingCount: number;
  clickCount: number;
};

export type PmsOnlineSlot = {
  startsAt: string;
  endsAt: string;
  providerId: string;
  providerName: string;
  operatoryId: string;
  operatoryName: string;
};

export type PmsPublicSchedulingExperience = {
  link: PmsOnlineSchedulingLinkRow | null;
  appointmentTypes: PmsOnlineSchedulingLinkRow[];
  slotsBySlug: Record<string, PmsOnlineSlot[]>;
};

export function cents(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export async function getPmsDashboard(tenantId = defaultTenantId) {
  const [patients, schedule, tasks, claims, ledgers, procedures] = await Promise.all([
    query<{ count: string }>(`select count(*)::text as count from "PmsPatient" where "tenantId" = $1 and "status" = 'ACTIVE'`, [tenantId]),
    query<{ count: string; production: string }>(
      `select count(*)::text as count, coalesce(sum("productionCents"), 0)::text as production
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt"::date = current_date`,
      [tenantId],
    ),
    query<{ count: string }>(`select count(*)::text as count from "PmsTask" where "tenantId" = $1 and "status" = 'OPEN'`, [tenantId]),
    query<{ count: string; billed: string }>(
      `select count(*)::text as count, coalesce(sum("billedCents" - "paidCents"), 0)::text as billed
       from "PmsClaim"
       where "tenantId" = $1 and "status" in ('READY', 'SUBMITTED', 'REJECTED', 'DENIED')`,
      [tenantId],
    ),
    query<{ balance: string }>(
      `select coalesce(sum("balanceCents"), 0)::text as balance from "PmsLedgerEntry" where "tenantId" = $1`,
      [tenantId],
    ),
    query<{ count: string }>(`select count(*)::text as count from "PmsProcedureCode" where "tenantId" = $1`, [tenantId]),
  ]);

  return {
    activePatients: Number(patients.rows[0]?.count ?? 0),
    todayAppointments: Number(schedule.rows[0]?.count ?? 0),
    todayProductionCents: Number(schedule.rows[0]?.production ?? 0),
    openTasks: Number(tasks.rows[0]?.count ?? 0),
    claimExposureCents: Number(claims.rows[0]?.billed ?? 0),
    openClaimCount: Number(claims.rows[0]?.count ?? 0),
    patientBalanceCents: Number(ledgers.rows[0]?.balance ?? 0),
    procedureCodeCount: Number(procedures.rows[0]?.count ?? 0),
  };
}

export async function getPracticeIntelligence(tenantId = defaultTenantId): Promise<PmsPracticeIntelligence> {
  const [
    productionTrend,
    providerProduction,
    roomUtilization,
    serviceMix,
    payerMix,
    calendarForecast,
    bookedProductionHorizon,
    hygieneRecall,
    noShowCancelImpact,
    roomProviderProduction,
  ] = await Promise.all([
    query<{ day: string; scheduledCents: string; completedCents: string; appointmentCount: string }>(
      `select to_char(days.day, 'Mon DD') as day,
        coalesce(sum(a."productionCents") filter (where a."status" not in ('CANCELED','BROKEN','NO_SHOW')), 0)::text as "scheduledCents",
        coalesce(sum(a."productionCents") filter (where a."status" in ('COMPLETED','CHECKED_OUT')), 0)::text as "completedCents",
        count(a."id") filter (where a."status" not in ('CANCELED','BROKEN','NO_SHOW'))::text as "appointmentCount"
       from generate_series(current_date - interval '13 days', current_date, interval '1 day') days(day)
       left join "PmsAppointment" a on a."tenantId" = $1 and a."startsAt"::date = days.day::date
       group by days.day
       order by days.day`,
      [tenantId],
    ),
    query<{ providerId: string | null; providerName: string | null; providerType: string | null; scheduledCents: string; completedCents: string; last30RevenueCents: string; appointmentCount: string; completedProcedureCount: string; bookedMinutes: string; bookedUntil: string | null }>(
      `with scheduled as (
        select a."providerId",
          coalesce(sum(a."productionCents"), 0) as scheduled_cents,
          count(a."id") as appointment_count,
          coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0)::int as booked_minutes,
          max(a."endsAt") as booked_until
        from "PmsAppointment" a
        where a."tenantId" = $1
          and a."startsAt" >= current_date
          and a."startsAt" < current_date + interval '30 days'
          and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
        group by a."providerId"
       ),
       revenue as (
        select pl."providerId",
          coalesce(sum(le."amountCents"), 0) as revenue_cents,
          count(distinct pl."id") as completed_procedures
        from "PmsLedgerEntry" le
        join "PmsProcedureLog" pl on pl."id" = le."procedureLogId"
        where le."tenantId" = $1
          and le."amountCents" > 0
          and coalesce(le."serviceDate", le."postedAt")::date >= current_date - interval '30 days'
        group by pl."providerId"
       ),
       provider_rows as (
        select pr."id" as "providerId", pr."displayName" as "providerName", pr."providerType",
          coalesce(s.scheduled_cents, 0) as scheduled_cents,
          coalesce(r.revenue_cents, 0) as completed_cents,
          coalesce(r.completed_procedures, 0) as completed_procedures,
          coalesce(s.appointment_count, 0) as appointment_count,
          coalesce(s.booked_minutes, 0) as booked_minutes,
          s.booked_until
        from "PmsProvider" pr
        left join scheduled s on s."providerId" = pr."id"
        left join revenue r on r."providerId" = pr."id"
        where pr."tenantId" = $1 and pr."status" = 'ACTIVE'
        union all
        select null, 'Unassigned provider', null,
          coalesce(s.scheduled_cents, 0),
          coalesce(r.revenue_cents, 0),
          coalesce(r.completed_procedures, 0),
          coalesce(s.appointment_count, 0),
          coalesce(s.booked_minutes, 0),
          s.booked_until
        from scheduled s
        left join revenue r on r."providerId" is null
        where s."providerId" is null
       )
       select "providerId", "providerName", "providerType",
        scheduled_cents::text as "scheduledCents",
        completed_cents::text as "completedCents",
        completed_cents::text as "last30RevenueCents",
        appointment_count::text as "appointmentCount",
        completed_procedures::text as "completedProcedureCount",
        booked_minutes::text as "bookedMinutes",
        booked_until::text as "bookedUntil"
       from provider_rows
       where scheduled_cents > 0 or completed_cents > 0 or appointment_count > 0
       order by scheduled_cents desc, completed_cents desc, "providerName"
       limit 10`,
      [tenantId],
    ),
    query<{ operatoryId: string | null; roomName: string | null; roomCode: string | null; scheduledCents: string; completedCents: string; bookedMinutes: string; appointmentCount: string; bookedUntil: string | null }>(
      `with scheduled as (
        select a."operatoryId",
          coalesce(sum(a."productionCents"), 0) as scheduled_cents,
          coalesce(sum(a."productionCents") filter (where a."status" in ('COMPLETED','CHECKED_OUT')), 0) as completed_cents,
          coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0)::int as booked_minutes,
          count(a."id") as appointment_count,
          max(a."endsAt") as booked_until
        from "PmsAppointment" a
        where a."tenantId" = $1
          and a."startsAt" >= current_date
          and a."startsAt" < current_date + interval '14 days'
          and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
        group by a."operatoryId"
       )
       select op."id" as "operatoryId",
        coalesce(op."name", 'Unassigned room') as "roomName",
        op."code" as "roomCode",
        coalesce(s.scheduled_cents, 0)::text as "scheduledCents",
        coalesce(s.completed_cents, 0)::text as "completedCents",
        coalesce(s.booked_minutes, 0)::text as "bookedMinutes",
        coalesce(s.appointment_count, 0)::text as "appointmentCount",
        s.booked_until::text as "bookedUntil"
       from "PmsOperatory" op
       left join scheduled s on s."operatoryId" = op."id"
       where op."tenantId" = $1 and op."status" = 'READY'
       union all
       select null, 'Unassigned room', null,
        coalesce(s.scheduled_cents, 0)::text,
        coalesce(s.completed_cents, 0)::text,
        coalesce(s.booked_minutes, 0)::text,
        coalesce(s.appointment_count, 0)::text,
        s.booked_until::text
       from scheduled s
       where s."operatoryId" is null
       order by "bookedMinutes" desc, "roomName"
       limit 12`,
      [tenantId],
    ),
    query<{ serviceLine: string; scheduledCents: string; completedCents: string; last90RevenueCents: string; bookedMinutes: string; appointmentCount: string; bookedUntil: string | null }>(
      `with appointment_services as (
        select a."id", a."startsAt", a."endsAt", a."status", a."productionCents",
          case
            when pc."category" in ('RESTORATIVE','IMPLANT','ORAL_SURGERY','ENDODONTIC','PROSTHODONTIC') then 'Restorative/elective'
            when pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE') or a."appointmentType" ilike '%hygiene%' then 'Hygiene/perio'
            when pc."category" = 'DIAGNOSTIC' or a."appointmentType" ilike '%new%' then 'Diagnostic/new patient'
            when pc."category" is not null then initcap(replace(lower(pc."category"), '_', ' '))
            else 'Other'
          end as service_line,
          row_number() over (partition by a."id" order by ap."feeCents" desc nulls last) as rn
        from "PmsAppointment" a
        left join "PmsAppointmentProcedure" ap on ap."appointmentId" = a."id"
        left join "PmsProcedureCode" pc on pc."id" = ap."procedureCodeId"
        where a."tenantId" = $1
          and a."startsAt" >= current_date - interval '30 days'
          and a."startsAt" < current_date + interval '30 days'
          and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
       ),
       scheduled as (
        select service_line,
          coalesce(sum("productionCents") filter (where "startsAt" >= current_date), 0) as scheduled_cents,
          coalesce(sum("productionCents") filter (where "status" in ('COMPLETED','CHECKED_OUT')), 0) as completed_cents,
          coalesce(sum(extract(epoch from ("endsAt" - "startsAt")) / 60) filter (where "startsAt" >= current_date), 0)::int as booked_minutes,
          count("id") filter (where "startsAt" >= current_date) as appointment_count,
          max("endsAt") filter (where "startsAt" >= current_date) as booked_until
        from appointment_services
        where rn = 1
        group by service_line
       ),
       revenue as (
        select
          case
            when pc."category" in ('RESTORATIVE','IMPLANT','ORAL_SURGERY','ENDODONTIC','PROSTHODONTIC') then 'Restorative/elective'
            when pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE') then 'Hygiene/perio'
            when pc."category" = 'DIAGNOSTIC' then 'Diagnostic/new patient'
            when pc."category" is not null then initcap(replace(lower(pc."category"), '_', ' '))
            else 'Other'
          end as service_line,
          coalesce(sum(le."amountCents"), 0) as revenue_cents
        from "PmsLedgerEntry" le
        left join "PmsProcedureLog" pl on pl."id" = le."procedureLogId"
        left join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        where le."tenantId" = $1
          and le."amountCents" > 0
          and coalesce(le."serviceDate", le."postedAt")::date >= current_date - interval '90 days'
        group by 1
       )
       select coalesce(s.service_line, r.service_line) as "serviceLine",
        coalesce(s.scheduled_cents, 0)::text as "scheduledCents",
        coalesce(s.completed_cents, 0)::text as "completedCents",
        coalesce(r.revenue_cents, 0)::text as "last90RevenueCents",
        coalesce(s.booked_minutes, 0)::text as "bookedMinutes",
        coalesce(s.appointment_count, 0)::text as "appointmentCount",
        s.booked_until::text as "bookedUntil"
       from scheduled s
       full join revenue r on r.service_line = s.service_line
       order by coalesce(r.revenue_cents, 0) desc, coalesce(s.scheduled_cents, 0) desc
       limit 10`,
      [tenantId],
    ),
    query<{ payerName: string; billedCents: string; paidCents: string; patientDueCents: string; openCents: string; claimCount: string; denialCount: string; collectionRate: string }>(
      `select coalesce("payerName", 'Patient / no payer') as "payerName",
        coalesce(sum("billedCents"), 0)::text as "billedCents",
        coalesce(sum("paidCents"), 0)::text as "paidCents",
        coalesce(sum("patientDueCents"), 0)::text as "patientDueCents",
        coalesce(sum(greatest("billedCents" - "paidCents", 0)), 0)::text as "openCents",
        count(*)::text as "claimCount",
        count(*) filter (where "status" in ('DENIED','REJECTED'))::text as "denialCount",
        case when coalesce(sum("billedCents"), 0) = 0 then '0'
          else round((coalesce(sum("paidCents"), 0)::numeric / nullif(sum("billedCents"), 0)) * 100)::text
        end as "collectionRate"
       from "PmsClaim"
       where "tenantId" = $1
         and "createdAt" >= current_date - interval '90 days'
       group by coalesce("payerName", 'Patient / no payer')
       order by coalesce(sum("billedCents"), 0) desc
       limit 8`,
      [tenantId],
    ),
    query<{ weekStart: string; scheduledCents: string; bookedMinutes: string; appointmentCount: string }>(
      `select to_char(date_trunc('week', weeks.week_start), 'Mon DD') as "weekStart",
        coalesce(sum(a."productionCents"), 0)::text as "scheduledCents",
        coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0)::int::text as "bookedMinutes",
        count(a."id")::text as "appointmentCount"
       from generate_series(date_trunc('week', current_date), date_trunc('week', current_date) + interval '7 weeks', interval '1 week') weeks(week_start)
       left join "PmsAppointment" a on a."tenantId" = $1
        and a."startsAt" >= weeks.week_start
        and a."startsAt" < weeks.week_start + interval '1 week'
        and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
       group by weeks.week_start
       order by weeks.week_start`,
      [tenantId],
    ),
    query<{ horizon: string; scheduledCents: string; bookedMinutes: string; appointmentCount: string; providerCount: string; roomCount: string }>(
      `with horizons as (
        select * from (values ('7 days', 7), ('30 days', 30), ('60 days', 60), ('90 days', 90)) as h(horizon, days)
       )
       select h.horizon,
        coalesce(sum(a."productionCents"), 0)::text as "scheduledCents",
        coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0)::int::text as "bookedMinutes",
        count(a."id")::text as "appointmentCount",
        count(distinct a."providerId") filter (where a."providerId" is not null)::text as "providerCount",
        count(distinct a."operatoryId") filter (where a."operatoryId" is not null)::text as "roomCount"
       from horizons h
       left join "PmsAppointment" a on a."tenantId" = $1
        and a."startsAt" >= current_date
        and a."startsAt" < current_date + (h.days::text || ' days')::interval
        and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
       group by h.horizon, h.days
       order by h.days`,
      [tenantId],
    ),
    query<{ dueCount: string; overdueCount: string; unscheduledDueCount: string; futureRecallBookedCount: string; recallOpportunityCents: string; hygieneVisits30: string; hygieneReappointed30: string; reappointmentRate: string }>(
      `with hygiene_fee as (
        select greatest(coalesce(avg(pl."feeCents"), 0)::int, 15500) as cents
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" p on p."id" = pl."patientId"
        where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')
       ),
       recall_base as (
        select r."id", r."patientId", r."status",
          exists (
            select 1 from "PmsAppointment" a
            where a."patientId" = r."patientId"
              and a."startsAt" >= current_date
              and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
          ) as has_future
        from "PmsRecall" r
        join "PmsPatient" p on p."id" = r."patientId"
        where r."tenantId" = $1 and p."status" = 'ACTIVE' and r."status" in ('DUE','OVERDUE')
       ),
       hygiene_visits as (
        select distinct pl."patientId", pl."serviceDate"::date as service_date
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" p on p."id" = pl."patientId"
        where p."tenantId" = $1
          and pl."status" = 'COMPLETED'
          and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')
          and pl."serviceDate" >= current_date - interval '30 days'
       ),
       reappointed as (
        select hv."patientId"
        from hygiene_visits hv
        where exists (
          select 1 from "PmsAppointment" a
          where a."patientId" = hv."patientId"
            and a."startsAt"::date > hv.service_date
            and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
        )
       )
       select
        count(*) filter (where rb."status" = 'DUE')::text as "dueCount",
        count(*) filter (where rb."status" = 'OVERDUE')::text as "overdueCount",
        count(*) filter (where not rb.has_future)::text as "unscheduledDueCount",
        count(*) filter (where rb.has_future)::text as "futureRecallBookedCount",
        (count(*) filter (where not rb.has_future) * (select cents from hygiene_fee))::text as "recallOpportunityCents",
        (select count(*) from hygiene_visits)::text as "hygieneVisits30",
        (select count(*) from reappointed)::text as "hygieneReappointed30",
        case when (select count(*) from hygiene_visits) = 0 then '0'
          else round(((select count(*) from reappointed)::numeric / nullif((select count(*) from hygiene_visits), 0)) * 100)::text
        end as "reappointmentRate"
       from recall_base rb`,
      [tenantId],
    ),
    query<{ brokenCount: string; noShowCount: string; cancelCount: string; lostProductionCents: string; unscheduledPatientCount: string; recoveredCount: string; recoveredProductionCents: string }>(
      `with broken as (
        select a."id", a."patientId", a."startsAt", a."status", a."productionCents",
          exists (
            select 1 from "PmsAppointment" future
            where future."patientId" = a."patientId"
              and future."startsAt" > a."startsAt"
              and future."status" not in ('CANCELED','BROKEN','NO_SHOW')
          ) as recovered
        from "PmsAppointment" a
        where a."tenantId" = $1
          and a."startsAt" >= current_date - interval '30 days'
          and a."status" in ('CANCELED','BROKEN','NO_SHOW')
       )
       select
        count(*)::text as "brokenCount",
        count(*) filter (where "status" = 'NO_SHOW')::text as "noShowCount",
        count(*) filter (where "status" in ('CANCELED','BROKEN'))::text as "cancelCount",
        coalesce(sum("productionCents"), 0)::text as "lostProductionCents",
        count(distinct "patientId") filter (where not recovered)::text as "unscheduledPatientCount",
        count(*) filter (where recovered)::text as "recoveredCount",
        coalesce(sum("productionCents") filter (where recovered), 0)::text as "recoveredProductionCents"
       from broken`,
      [tenantId],
    ),
    query<{ operatoryId: string | null; roomName: string; providerId: string | null; providerName: string; scheduledCents: string; completedCents: string; bookedMinutes: string; appointmentCount: string }>(
      `select a."operatoryId",
        coalesce(op."name", 'Unassigned room') as "roomName",
        a."providerId",
        coalesce(pr."displayName", 'Unassigned provider') as "providerName",
        coalesce(sum(a."productionCents"), 0)::text as "scheduledCents",
        coalesce(sum(a."productionCents") filter (where a."status" in ('COMPLETED','CHECKED_OUT')), 0)::text as "completedCents",
        coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0)::int::text as "bookedMinutes",
        count(a."id")::text as "appointmentCount"
       from "PmsAppointment" a
       left join "PmsOperatory" op on op."id" = a."operatoryId"
       left join "PmsProvider" pr on pr."id" = a."providerId"
       where a."tenantId" = $1
        and a."startsAt" >= current_date
        and a."startsAt" < current_date + interval '30 days'
        and a."status" not in ('CANCELED','BROKEN','NO_SHOW')
       group by a."operatoryId", op."name", a."providerId", pr."displayName"
       order by coalesce(sum(a."productionCents"), 0) desc, coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0) desc
       limit 12`,
      [tenantId],
    ),
  ]);

  const rooms = roomUtilization.rows.map((room) => {
    const bookedMinutes = Number(room.bookedMinutes ?? 0);
    return {
      operatoryId: room.operatoryId,
      roomName: room.roomName ?? "Unassigned room",
      roomCode: room.roomCode,
      scheduledCents: Number(room.scheduledCents ?? 0),
      completedCents: Number(room.completedCents ?? 0),
      bookedMinutes,
      utilizationPercent: Math.min(100, Math.round((bookedMinutes / (14 * 8 * 60)) * 100)),
      appointmentCount: Number(room.appointmentCount ?? 0),
      bookedUntil: room.bookedUntil,
    };
  });
  const services = serviceMix.rows.map((service) => ({
    serviceLine: service.serviceLine,
    scheduledCents: Number(service.scheduledCents ?? 0),
    completedCents: Number(service.completedCents ?? 0),
    last90RevenueCents: Number(service.last90RevenueCents ?? 0),
    bookedMinutes: Number(service.bookedMinutes ?? 0),
    appointmentCount: Number(service.appointmentCount ?? 0),
    bookedUntil: service.bookedUntil,
  }));
  const topService = services[0];
  const topRoom = rooms[0];
  const brokenImpact = noShowCancelImpact.rows[0];
  const recall = hygieneRecall.rows[0];
  const payerRows = payerMix.rows.map((payer) => ({
    payerName: payer.payerName,
    billedCents: Number(payer.billedCents ?? 0),
    paidCents: Number(payer.paidCents ?? 0),
    patientDueCents: Number(payer.patientDueCents ?? 0),
    openCents: Number(payer.openCents ?? 0),
    claimCount: Number(payer.claimCount ?? 0),
    denialCount: Number(payer.denialCount ?? 0),
    collectionRate: Number(payer.collectionRate ?? 0),
  }));
  const topPayerRisk = payerRows.slice().sort((a, b) => b.denialCount - a.denialCount)[0];

  return {
    productionTrend: productionTrend.rows.map((row) => ({
      day: row.day,
      scheduledCents: Number(row.scheduledCents ?? 0),
      completedCents: Number(row.completedCents ?? 0),
      appointmentCount: Number(row.appointmentCount ?? 0),
    })),
    providerProduction: providerProduction.rows.map((provider) => ({
      providerId: provider.providerId,
      providerName: provider.providerName ?? "Unassigned provider",
      providerType: provider.providerType,
      scheduledCents: Number(provider.scheduledCents ?? 0),
      completedCents: Number(provider.completedCents ?? 0),
      last30RevenueCents: Number(provider.last30RevenueCents ?? 0),
      appointmentCount: Number(provider.appointmentCount ?? 0),
      completedProcedureCount: Number(provider.completedProcedureCount ?? 0),
      bookedMinutes: Number(provider.bookedMinutes ?? 0),
      bookedUntil: provider.bookedUntil,
    })),
    roomUtilization: rooms,
    serviceMix: services,
    payerMix: payerRows,
    calendarForecast: calendarForecast.rows.map((week) => ({
      weekStart: week.weekStart,
      scheduledCents: Number(week.scheduledCents ?? 0),
      bookedMinutes: Number(week.bookedMinutes ?? 0),
      appointmentCount: Number(week.appointmentCount ?? 0),
    })),
    bookedProductionHorizon: bookedProductionHorizon.rows.map((horizon) => ({
      horizon: horizon.horizon,
      scheduledCents: Number(horizon.scheduledCents ?? 0),
      bookedMinutes: Number(horizon.bookedMinutes ?? 0),
      appointmentCount: Number(horizon.appointmentCount ?? 0),
      providerCount: Number(horizon.providerCount ?? 0),
      roomCount: Number(horizon.roomCount ?? 0),
    })),
    hygieneRecall: {
      dueCount: Number(recall?.dueCount ?? 0),
      overdueCount: Number(recall?.overdueCount ?? 0),
      unscheduledDueCount: Number(recall?.unscheduledDueCount ?? 0),
      futureRecallBookedCount: Number(recall?.futureRecallBookedCount ?? 0),
      recallOpportunityCents: Number(recall?.recallOpportunityCents ?? 0),
      hygieneVisits30: Number(recall?.hygieneVisits30 ?? 0),
      hygieneReappointed30: Number(recall?.hygieneReappointed30 ?? 0),
      reappointmentRate: Number(recall?.reappointmentRate ?? 0),
    },
    noShowCancelImpact: {
      brokenCount: Number(brokenImpact?.brokenCount ?? 0),
      noShowCount: Number(brokenImpact?.noShowCount ?? 0),
      cancelCount: Number(brokenImpact?.cancelCount ?? 0),
      lostProductionCents: Number(brokenImpact?.lostProductionCents ?? 0),
      unscheduledPatientCount: Number(brokenImpact?.unscheduledPatientCount ?? 0),
      recoveredCount: Number(brokenImpact?.recoveredCount ?? 0),
      recoveredProductionCents: Number(brokenImpact?.recoveredProductionCents ?? 0),
    },
    roomProviderProduction: roomProviderProduction.rows.map((row) => ({
      operatoryId: row.operatoryId,
      roomName: row.roomName,
      providerId: row.providerId,
      providerName: row.providerName,
      scheduledCents: Number(row.scheduledCents ?? 0),
      completedCents: Number(row.completedCents ?? 0),
      bookedMinutes: Number(row.bookedMinutes ?? 0),
      appointmentCount: Number(row.appointmentCount ?? 0),
    })),
    insights: [
      {
        label: "Top service-line revenue",
        value: topService?.serviceLine ?? "No scheduled service",
        detail: topService ? `${cents(topService.last90RevenueCents)} actual in 90 days; ${cents(topService.scheduledCents)} booked ahead` : "No production data available.",
        tone: "green",
      },
      {
        label: "Recall opportunity",
        value: cents(Number(recall?.recallOpportunityCents ?? 0)),
        detail: `${Number(recall?.unscheduledDueCount ?? 0)} due/overdue hygiene patients without a future visit`,
        tone: Number(recall?.unscheduledDueCount ?? 0) > 0 ? "amber" : "green",
      },
      {
        label: "Busiest room",
        value: topRoom?.roomName ?? "No room schedule",
        detail: topRoom ? `${topRoom.utilizationPercent}% of two-week chair capacity, booked until ${formatShortDate(topRoom.bookedUntil)}` : "No room utilization yet.",
        tone: topRoom && topRoom.utilizationPercent > 85 ? "amber" : "neutral",
      },
      {
        label: "No-show/cancel drag",
        value: cents(Number(brokenImpact?.lostProductionCents ?? 0)),
        detail: `${Number(brokenImpact?.brokenCount ?? 0)} broken visits; ${Number(brokenImpact?.unscheduledPatientCount ?? 0)} patients still unscheduled`,
        tone: Number(brokenImpact?.unscheduledPatientCount ?? 0) > 0 ? "red" : "green",
      },
      {
        label: "Payer risk",
        value: topPayerRisk?.payerName ?? "No payer claims",
        detail: topPayerRisk ? `${topPayerRisk.denialCount} denied/rejected claims, ${topPayerRisk.collectionRate}% collected` : "No payer risk found.",
        tone: topPayerRisk && topPayerRisk.denialCount > 0 ? "red" : "green",
      },
    ],
  };
}

function formatShortDate(value: string | null) {
  if (!value) return "not booked";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function listPatients(tenantId = defaultTenantId, search = "") {
  const like = `%${search.trim()}%`;
  const result = await query<PmsPatientSummary>(
    `select
      p."id",
      p."chartNumber",
      p."firstName",
      p."lastName",
      p."preferredName",
      p."dateOfBirth"::text as "dateOfBirth",
      p."phone",
      p."email",
      p."status",
      p."privacyLevel",
      p."familyAccountId",
      p."responsibleParty",
      p."patientNote",
      coalesce(t.open_tasks, 0)::int as "openTasks",
      coalesce(l.balance_cents, 0)::int as "balanceCents"
     from "PmsPatient" p
     left join (
       select "patientId", count(*) as open_tasks
       from "PmsTask"
       where "tenantId" = $1 and "status" = 'OPEN'
       group by "patientId"
     ) t on t."patientId" = p."id"
     left join (
       select "patientId", sum("balanceCents") as balance_cents
       from "PmsLedgerEntry"
       where "tenantId" = $1
       group by "patientId"
     ) l on l."patientId" = p."id"
     where p."tenantId" = $1
       and ($2 = '%%' or p."firstName" ilike $2 or p."lastName" ilike $2 or p."chartNumber" ilike $2 or p."phone" ilike $2)
     order by p."lastName", p."firstName"
     limit 100`,
    [tenantId, like],
  );
  return result.rows;
}

export async function createPatient(input: {
  tenantId?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  sex?: string;
  responsibleParty?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  referralSource?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const chart = await query<{ next: string }>(
    `select ('P' || lpad((coalesce(max(substring("chartNumber" from 2)::int), 0) + 1)::text, 6, '0')) as next
     from "PmsPatient"
     where "tenantId" = $1 and "chartNumber" ~ '^P[0-9]+$'`,
    [tenantId],
  );
  const id = newId("pat");
  const familyId = newId("fam");
  const chartNumber = chart.rows[0]?.next ?? "P000001";
  const accountNumber = `F${chartNumber.slice(1)}`;

  await query(
    `insert into "PmsFamilyAccount"
       ("id", "tenantId", "accountNumber", "displayName", "guarantorPatientId", "billingType", "billingStatus",
        "addressLine1", "addressLine2", "city", "state", "postalCode", "phone", "email", "updatedAt")
     values ($1, $2, $3, $4, $5, 'STANDARD', 'CURRENT', $6, $7, $8, $9, $10, $11, $12, current_timestamp)`,
    [
      familyId,
      tenantId,
      accountNumber,
      `${input.lastName.trim()} family`,
      id,
      input.addressLine1?.trim() || null,
      input.addressLine2?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.postalCode?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
    ],
  );

  const result = await query<PmsPatientSummary>(
    `insert into "PmsPatient"
       ("id", "tenantId", "familyAccountId", "chartNumber", "firstName", "lastName", "preferredName", "dateOfBirth", "phone", "email",
        "sex", "responsibleParty", "referralSource", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, $12, $13, current_timestamp)
     returning "id", "chartNumber", "firstName", "lastName", "preferredName", "dateOfBirth"::text as "dateOfBirth",
       "phone", "email", "status", "privacyLevel", "familyAccountId", "responsibleParty", "patientNote", 0::int as "openTasks", 0::int as "balanceCents"`,
    [
      id,
      tenantId,
      familyId,
      chartNumber,
      input.firstName.trim(),
      input.lastName.trim(),
      input.preferredName?.trim() || null,
      input.dateOfBirth || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.sex?.trim() || null,
      input.responsibleParty?.trim() || "SELF",
      input.referralSource?.trim() || null,
    ],
  );

  await addAudit(tenantId, "front_desk", "PATIENT_CREATED", "PmsPatient", id, "ALLOWED");
  return result.rows[0];
}

export async function getPatient(patientId: string) {
  const result = await query<PmsPatientSummary>(
    `select
      p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."dateOfBirth"::text as "dateOfBirth",
      p."phone", p."email", p."status", p."privacyLevel", p."familyAccountId", p."responsibleParty",
      p."emergencyContactName", p."emergencyContactPhone", p."referralSource", p."patientNote",
      coalesce(t.open_tasks, 0)::int as "openTasks",
      coalesce(l.balance_cents, 0)::int as "balanceCents"
     from "PmsPatient" p
     left join (
       select "patientId", count(*) as open_tasks from "PmsTask" where "status" = 'OPEN' group by "patientId"
     ) t on t."patientId" = p."id"
     left join (
       select "patientId", sum("balanceCents") as balance_cents from "PmsLedgerEntry" group by "patientId"
     ) l on l."patientId" = p."id"
     where p."id" = $1`,
    [patientId],
  );
  return result.rows[0] ?? null;
}

export async function updatePatientAdministrativeProfile(input: {
  patientId: string;
  preferredName?: string;
  phone?: string;
  email?: string;
  genderIdentity?: string;
  responsibleParty?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  referralSource?: string;
  privacyLevel?: string;
  patientNote?: string;
  actorRole?: string;
}) {
  const result = await query(
    `update "PmsPatient"
     set "preferredName" = $2,
       "phone" = $3,
       "email" = $4,
       "genderIdentity" = $5,
       "responsibleParty" = $6,
       "emergencyContactName" = $7,
       "emergencyContactPhone" = $8,
       "referralSource" = $9,
       "privacyLevel" = $10,
       "patientNote" = $11,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning *`,
    [
      input.patientId,
      input.preferredName?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.genderIdentity?.trim() || null,
      input.responsibleParty?.trim() || null,
      input.emergencyContactName?.trim() || null,
      input.emergencyContactPhone?.trim() || null,
      input.referralSource?.trim() || null,
      input.privacyLevel?.trim() || "STANDARD",
      input.patientNote?.trim() || null,
    ],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "front_desk", "PATIENT_PROFILE_UPDATED", "PmsPatient", input.patientId, result.rowCount ? "ALLOWED" : "BLOCKED");
  return result.rows[0] ?? null;
}

export async function getFamilyAccount(patientId: string) {
  const result = await query<PmsFamilyAccountRow>(
    `select fa.*
     from "PmsPatient" p
     join "PmsFamilyAccount" fa on fa."id" = p."familyAccountId"
     where p."id" = $1`,
    [patientId],
  );
  return result.rows[0] ?? null;
}

export async function getFamilyMembers(patientId: string) {
  return (await query<PmsPatientSummary>(
    `select
      p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."dateOfBirth"::text as "dateOfBirth",
      p."phone", p."email", p."status", p."privacyLevel", p."familyAccountId", p."responsibleParty", p."patientNote",
      coalesce(t.open_tasks, 0)::int as "openTasks",
      coalesce(l.balance_cents, 0)::int as "balanceCents"
     from "PmsPatient" selected
     join "PmsPatient" p on p."familyAccountId" = selected."familyAccountId"
     left join (
       select "patientId", count(*) as open_tasks from "PmsTask" where "status" = 'OPEN' group by "patientId"
     ) t on t."patientId" = p."id"
     left join (
       select "patientId", sum("balanceCents") as balance_cents from "PmsLedgerEntry" group by "patientId"
     ) l on l."patientId" = p."id"
     where selected."id" = $1
     order by p."lastName", p."firstName"`,
    [patientId],
  )).rows;
}

export async function getPatientAccount(patientId: string) {
  const [ledger, insurance, claims, treatmentPlans, recalls, documents, imaging, labCases, prescriptions, referrals] = await Promise.all([
    query(`select * from "PmsLedgerEntry" where "patientId" = $1 order by "postedAt" desc limit 50`, [patientId]),
    query(
      `select pi.*, ip."payerName", ip."planName", ip."groupNumber", bs."annualMaxCents", bs."annualUsedCents", bs."frequencies", bs."limitations"
       from "PmsPatientInsurance" pi
       join "PmsInsurancePlan" ip on ip."id" = pi."planId"
       left join "PmsBenefitSummary" bs on bs."patientInsuranceId" = pi."id"
       where pi."patientId" = $1
       order by pi."priority"`,
      [patientId],
    ),
    query(`select * from "PmsClaim" where "patientId" = $1 order by "createdAt" desc`, [patientId]),
    query(`select * from "PmsTreatmentPlan" where "patientId" = $1 order by "updatedAt" desc`, [patientId]),
    query(`select * from "PmsRecall" where "patientId" = $1 order by "dueDate" asc`, [patientId]),
    query(`select * from "PmsDocument" where "patientId" = $1 order by "updatedAt" desc`, [patientId]),
    query(`select * from "PmsImagingStudy" where "patientId" = $1 order by "takenAt" desc nulls first, "updatedAt" desc`, [patientId]),
    query(`select * from "PmsLabCase" where "patientId" = $1 order by "dueDate" asc nulls last`, [patientId]),
    query(`select * from "PmsPrescription" where "patientId" = $1 order by "writtenAt" desc`, [patientId]),
    query(`select * from "PmsReferral" where "patientId" = $1 order by "createdAt" desc`, [patientId]),
  ]);

  return {
    ledger: ledger.rows,
    insurance: insurance.rows,
    claims: claims.rows,
    treatmentPlans: treatmentPlans.rows,
    recalls: recalls.rows,
    documents: documents.rows,
    imaging: imaging.rows,
    labCases: labCases.rows,
    prescriptions: prescriptions.rows,
    referrals: referrals.rows,
  };
}

export async function getPatientProfile(patientId: string) {
  const [communicationPreferences, consents, medicalHistory, pharmacies, alerts, allergies, medications] = await Promise.all([
    query(`select * from "PmsPatientCommunicationPreference" where "patientId" = $1 order by "priority", "channel"`, [patientId]),
    query(`select * from "PmsPatientConsent" where "patientId" = $1 order by "updatedAt" desc`, [patientId]),
    query(`select * from "PmsMedicalHistoryEntry" where "patientId" = $1 order by "status", "category", "condition"`, [patientId]),
    query(`select * from "PmsPatientPharmacy" where "patientId" = $1 order by "isPreferred" desc, "pharmacyName"`, [patientId]),
    query(`select * from "PmsMedicalAlert" where "patientId" = $1 order by "active" desc, "severity" desc, "title"`, [patientId]),
    query(`select * from "PmsAllergy" where "patientId" = $1 order by "active" desc, "severity" desc, "allergen"`, [patientId]),
    query(`select * from "PmsMedication" where "patientId" = $1 order by "status", "name"`, [patientId]),
  ]);

  return {
    communicationPreferences: communicationPreferences.rows,
    consents: consents.rows,
    medicalHistory: medicalHistory.rows,
    pharmacies: pharmacies.rows,
    alerts: alerts.rows,
    allergies: allergies.rows,
    medications: medications.rows,
  };
}

export async function addCommunicationPreference(input: {
  patientId: string;
  channel: string;
  destination: string;
  consentStatus: string;
  priority?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  source?: string;
  actorRole?: string;
}) {
  const id = newId("comm");
  const result = await query(
    `insert into "PmsPatientCommunicationPreference"
       ("id", "patientId", "channel", "destination", "consentStatus", "priority", "quietHoursStart", "quietHoursEnd", "source", "lastConfirmedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, coalesce($6::int, 1), $7, $8, $9, current_timestamp, current_timestamp)
     on conflict ("patientId", "channel", "destination")
     do update set "consentStatus" = excluded."consentStatus", "priority" = excluded."priority", "quietHoursStart" = excluded."quietHoursStart",
       "quietHoursEnd" = excluded."quietHoursEnd", "source" = excluded."source", "lastConfirmedAt" = current_timestamp, "updatedAt" = current_timestamp
     returning *`,
    [
      id,
      input.patientId,
      input.channel.trim(),
      input.destination.trim(),
      input.consentStatus.trim(),
      input.priority ?? 1,
      input.quietHoursStart?.trim() || null,
      input.quietHoursEnd?.trim() || null,
      input.source?.trim() || null,
    ],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "front_desk", "COMMUNICATION_PREFERENCE_SAVED", "PmsPatientCommunicationPreference", result.rows[0]?.id ?? id, "ALLOWED");
  return result.rows[0];
}

export async function addPatientConsent(input: {
  patientId: string;
  consentType: string;
  status: string;
  signedByName?: string;
  signedAt?: string;
  expiresAt?: string;
  sourceDocumentId?: string;
  actorRole?: string;
}) {
  const id = newId("consent");
  const result = await query(
    `insert into "PmsPatientConsent"
       ("id", "patientId", "consentType", "status", "sourceDocumentId", "signedByName", "signedAt", "expiresAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp, current_timestamp)
     returning *`,
    [
      id,
      input.patientId,
      input.consentType.trim(),
      input.status.trim(),
      input.sourceDocumentId?.trim() || null,
      input.signedByName?.trim() || null,
      input.signedAt || null,
      input.expiresAt || null,
    ],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "front_desk", "PATIENT_CONSENT_RECORDED", "PmsPatientConsent", id, "ALLOWED");
  return result.rows[0];
}

export async function addMedicalHistoryEntry(input: {
  patientId: string;
  category: string;
  condition: string;
  status: string;
  severity?: string;
  onsetDate?: string;
  resolvedDate?: string;
  notes?: string;
  reviewedByRole?: string;
  actorRole?: string;
}) {
  const id = newId("mh");
  const result = await query(
    `insert into "PmsMedicalHistoryEntry"
       ("id", "patientId", "category", "condition", "status", "severity", "onsetDate", "resolvedDate", "notes", "source", "reviewedByRole", "reviewedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp, $9, 'STAFF_ENTERED', $10, current_timestamp, current_timestamp)
     returning *`,
    [
      id,
      input.patientId,
      input.category.trim(),
      input.condition.trim(),
      input.status.trim(),
      input.severity?.trim() || null,
      input.onsetDate || null,
      input.resolvedDate || null,
      input.notes?.trim() || null,
      input.reviewedByRole?.trim() || input.actorRole || null,
    ],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "associate_provider", "MEDICAL_HISTORY_RECORDED", "PmsMedicalHistoryEntry", id, "ALLOWED");
  return result.rows[0];
}

export async function addPatientPharmacy(input: {
  patientId: string;
  pharmacyName: string;
  phone?: string;
  fax?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isPreferred?: boolean;
  notes?: string;
  actorRole?: string;
}) {
  const id = newId("pharm");
  const preferred = input.isPreferred ?? true;
  if (preferred) {
    await query(`update "PmsPatientPharmacy" set "isPreferred" = false, "updatedAt" = current_timestamp where "patientId" = $1`, [input.patientId]);
  }
  const result = await query(
    `insert into "PmsPatientPharmacy"
       ("id", "patientId", "pharmacyName", "phone", "fax", "addressLine1", "city", "state", "postalCode", "isPreferred", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, current_timestamp)
     returning *`,
    [
      id,
      input.patientId,
      input.pharmacyName.trim(),
      input.phone?.trim() || null,
      input.fax?.trim() || null,
      input.addressLine1?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.postalCode?.trim() || null,
      preferred,
      input.notes?.trim() || null,
    ],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "front_desk", "PATIENT_PHARMACY_SAVED", "PmsPatientPharmacy", id, "ALLOWED");
  return result.rows[0];
}

export async function addMedicalAlert(input: { patientId: string; severity: string; title: string; details?: string; actorRole?: string }) {
  const id = newId("alert");
  const result = await query(
    `insert into "PmsMedicalAlert" ("id", "patientId", "severity", "title", "details", "updatedAt")
     values ($1, $2, $3, $4, $5, current_timestamp) returning *`,
    [id, input.patientId, input.severity.trim(), input.title.trim(), input.details?.trim() || null],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "associate_provider", "MEDICAL_ALERT_CREATED", "PmsMedicalAlert", id, "ALLOWED");
  return result.rows[0];
}

export async function addAllergy(input: { patientId: string; allergen: string; reaction?: string; severity: string; actorRole?: string }) {
  const id = newId("allergy");
  const result = await query(
    `insert into "PmsAllergy" ("id", "patientId", "allergen", "reaction", "severity", "updatedAt")
     values ($1, $2, $3, $4, $5, current_timestamp) returning *`,
    [id, input.patientId, input.allergen.trim(), input.reaction?.trim() || null, input.severity.trim()],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "associate_provider", "ALLERGY_CREATED", "PmsAllergy", id, "ALLOWED");
  return result.rows[0];
}

export async function addMedication(input: { patientId: string; name: string; dosage?: string; status?: string; actorRole?: string }) {
  const id = newId("med");
  const result = await query(
    `insert into "PmsMedication" ("id", "patientId", "name", "dosage", "status", "updatedAt")
     values ($1, $2, $3, $4, coalesce($5, 'ACTIVE'), current_timestamp) returning *`,
    [id, input.patientId, input.name.trim(), input.dosage?.trim() || null, input.status?.trim() || null],
  );
  await addAudit(defaultTenantId, input.actorRole ?? "associate_provider", "MEDICATION_CREATED", "PmsMedication", id, "ALLOWED");
  return result.rows[0];
}

export async function getFormsWorkbench(tenantId = defaultTenantId) {
  const [templates, fields, assignments, changes, patients] = await Promise.all([
    query(
      `select t.*, count(f."id")::int as "fieldCount"
       from "PmsFormTemplate" t
       left join "PmsFormField" f on f."templateId" = t."id"
       where t."tenantId" = $1
       group by t."id"
       order by t."formType", t."name"`,
      [tenantId],
    ),
    query(
      `select f.*, m."targetModel", m."targetField"
       from "PmsFormField" f
       left join "PmsFormFieldMapping" m on m."fieldId" = f."id"
       join "PmsFormTemplate" t on t."id" = f."templateId"
       where t."tenantId" = $1
       order by f."templateId", f."displayOrder"`,
      [tenantId],
    ),
    query(
      `select a.*, t."name" as "templateName", t."formType", p."firstName", p."lastName", p."chartNumber",
        coalesce(cr.pending_changes, 0)::int as "pendingChanges"
       from "PmsFormAssignment" a
       join "PmsFormTemplate" t on t."id" = a."templateId"
       join "PmsPatient" p on p."id" = a."patientId"
       left join (
         select "patientId", count(*) as pending_changes
         from "PmsProfileChangeRequest"
         where "tenantId" = $1 and "status" = 'PENDING'
         group by "patientId"
       ) cr on cr."patientId" = a."patientId"
       where a."tenantId" = $1
       order by
        case a."status" when 'SUBMITTED' then 1 when 'ASSIGNED' then 2 when 'REVIEWED' then 3 else 4 end,
        a."dueAt" asc nulls last, a."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsProfileChangeRequest" c
       join "PmsPatient" p on p."id" = c."patientId"
       where c."tenantId" = $1
       order by case c."status" when 'PENDING' then 1 else 2 end, c."createdAt" desc`,
      [tenantId],
    ),
    listPatients(tenantId),
  ]);

  return {
    templates: templates.rows,
    fields: fields.rows,
    assignments: assignments.rows,
    changes: changes.rows,
    patients,
  };
}

export async function assignFormToPatient(input: {
  tenantId?: string;
  patientId: string;
  templateId: string;
  appointmentId?: string;
  dueAt?: string;
  assignedByRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("formassign");
  const result = await query(
    `insert into "PmsFormAssignment"
       ("id", "tenantId", "patientId", "templateId", "appointmentId", "status", "assignedByRole", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'ASSIGNED', $6, $7::timestamp, current_timestamp)
     returning *`,
    [id, tenantId, input.patientId, input.templateId, input.appointmentId?.trim() || null, input.assignedByRole ?? "front_desk", input.dueAt || null],
  );
  await addAudit(tenantId, input.assignedByRole ?? "front_desk", "FORM_ASSIGNED", "PmsFormAssignment", id, "ALLOWED");
  return result.rows[0];
}

export async function getFormAssignmentDetail(assignmentId: string) {
  const assignment = await query(
    `select a.*, t."name" as "templateName", t."formType", p."firstName", p."lastName", p."chartNumber"
     from "PmsFormAssignment" a
     join "PmsFormTemplate" t on t."id" = a."templateId"
     join "PmsPatient" p on p."id" = a."patientId"
     where a."id" = $1`,
    [assignmentId],
  );
  const row = assignment.rows[0];
  if (!row) return null;
  const fields = await query(
    `select f.*, m."targetModel", m."targetField"
     from "PmsFormField" f
     left join "PmsFormFieldMapping" m on m."fieldId" = f."id"
     where f."templateId" = $1
     order by f."displayOrder"`,
    [row.templateId],
  );
  return { assignment: row, fields: fields.rows };
}

export async function recordFormResponse(input: {
  assignmentId: string;
  submittedByName?: string;
  submittedByType?: string;
  signatureName?: string;
  answers: Record<string, string>;
  actorRole?: string;
}) {
  const detail = await getFormAssignmentDetail(input.assignmentId);
  if (!detail) throw new Error("Form assignment not found");
  const assignment = detail.assignment as { tenantId: string; patientId: string; id: string };
  const responseId = newId("formresp");
  await query(
    `insert into "PmsFormResponse"
       ("id", "assignmentId", "patientId", "submittedByName", "submittedByType", "status", "signatureName", "signatureAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'SUBMITTED', $6, case when $6::text is null then null else current_timestamp end, current_timestamp)`,
    [
      responseId,
      input.assignmentId,
      assignment.patientId,
      input.submittedByName?.trim() || null,
      input.submittedByType ?? "STAFF_KIOSK",
      input.signatureName?.trim() || null,
    ],
  );

  for (const field of detail.fields as Array<{ id: string; fieldKey: string; targetModel?: string | null; targetField?: string | null }>) {
    const value = input.answers[field.fieldKey]?.trim();
    if (!value) continue;
    await query(
      `insert into "PmsFormResponseAnswer" ("id", "responseId", "fieldId", "fieldKey", "answerValue")
       values ($1, $2, $3, $4, $5)
       on conflict ("responseId", "fieldId") do update set "answerValue" = excluded."answerValue"`,
      [newId("answer"), responseId, field.id, field.fieldKey, value],
    );

    if (field.targetModel && field.targetField) {
      const currentValue = await getCurrentProfileValue(assignment.patientId, field.targetModel, field.targetField);
      await query(
        `insert into "PmsProfileChangeRequest"
           ("id", "tenantId", "patientId", "responseId", "fieldId", "targetModel", "targetField", "currentValue", "proposedValue", "status", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', current_timestamp)`,
        [newId("change"), assignment.tenantId, assignment.patientId, responseId, field.id, field.targetModel, field.targetField, currentValue, value],
      );
    }
  }

  await query(
    `update "PmsFormAssignment"
     set "status" = 'SUBMITTED', "completedAt" = current_timestamp, "updatedAt" = current_timestamp
     where "id" = $1`,
    [input.assignmentId],
  );
  await addAudit(assignment.tenantId, input.actorRole ?? "front_desk", "FORM_RESPONSE_RECORDED", "PmsFormResponse", responseId, "ALLOWED");
  return { responseId };
}

export async function reviewProfileChangeRequest(input: {
  changeId: string;
  decision: "ACCEPTED" | "REJECTED";
  reviewNote?: string;
  reviewedByRole?: string;
}) {
  const changeResult = await query<{
    id: string;
    tenantId: string;
    patientId: string;
    targetModel: string;
    targetField: string;
    proposedValue: string;
    status: string;
  }>(`select * from "PmsProfileChangeRequest" where "id" = $1`, [input.changeId]);
  const change = changeResult.rows[0];
  if (!change || change.status !== "PENDING") return null;

  if (input.decision === "ACCEPTED") {
    await applyProfileChange(change.patientId, change.targetModel, change.targetField, change.proposedValue);
  }

  const result = await query(
    `update "PmsProfileChangeRequest"
     set "status" = $2, "reviewNote" = $3, "reviewedByRole" = $4, "reviewedAt" = current_timestamp, "updatedAt" = current_timestamp
     where "id" = $1
     returning *`,
    [input.changeId, input.decision, input.reviewNote?.trim() || null, input.reviewedByRole ?? "front_desk"],
  );
  await addAudit(change.tenantId, input.reviewedByRole ?? "front_desk", `PROFILE_CHANGE_${input.decision}`, "PmsProfileChangeRequest", input.changeId, "ALLOWED");
  return result.rows[0];
}

async function getCurrentProfileValue(patientId: string, targetModel: string, targetField: string) {
  if (targetModel === "PmsPatient" && ["phone", "email", "emergencyContactName", "emergencyContactPhone", "patientNote"].includes(targetField)) {
    const result = await query(`select "${targetField}"::text as value from "PmsPatient" where "id" = $1`, [patientId]);
    return result.rows[0]?.value ?? null;
  }
  if (targetModel === "PmsPatientCommunicationPreference") {
    const result = await query(`select "consentStatus" as value from "PmsPatientCommunicationPreference" where "patientId" = $1 and "channel" = 'SMS' order by "priority" limit 1`, [patientId]);
    return result.rows[0]?.value ?? null;
  }
  return null;
}

async function applyProfileChange(patientId: string, targetModel: string, targetField: string, proposedValue: string) {
  if (targetModel === "PmsPatient" && ["phone", "email", "emergencyContactName", "emergencyContactPhone", "patientNote"].includes(targetField)) {
    await query(`update "PmsPatient" set "${targetField}" = $2, "updatedAt" = current_timestamp where "id" = $1`, [patientId, proposedValue]);
    return;
  }
  if (targetModel === "PmsPatientCommunicationPreference" && targetField === "SMS.consentStatus") {
    const patient = await query<{ phone: string | null }>(`select "phone" from "PmsPatient" where "id" = $1`, [patientId]);
    const destination = patient.rows[0]?.phone || "SMS destination pending";
    await addCommunicationPreference({ patientId, channel: "SMS", destination, consentStatus: proposedValue, source: "FORM_REVIEW" });
    return;
  }
  if (targetModel === "PmsMedicalHistoryEntry" && targetField === "condition") {
    await addMedicalHistoryEntry({ patientId, category: "FORM_REPORTED", condition: proposedValue, status: "ACTIVE", severity: "MODERATE", notes: "Accepted from patient form review." });
    return;
  }
  if (targetModel === "PmsAllergy" && targetField === "allergen") {
    await addAllergy({ patientId, allergen: proposedValue, severity: "MODERATE", reaction: "Accepted from patient form review." });
    return;
  }
  if (targetModel === "PmsPatientConsent" && targetField === "consentType") {
    await addPatientConsent({ patientId, consentType: proposedValue, status: "SIGNED", signedAt: new Date().toISOString(), signedByName: "Form signer" });
  }
}

export async function listSchedule(tenantId = defaultTenantId, date?: string) {
  const result = await query<PmsAppointmentRow>(
    `select
      a."id",
      a."patientId",
      case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName",
      pr."displayName" as "providerName",
      op."name" as "operatoryName",
      a."startsAt"::text as "startsAt",
      a."endsAt"::text as "endsAt",
      a."status",
      a."appointmentType",
      a."productionCents",
      a."readinessStatus",
      a."notes"
     from "PmsAppointment" a
     left join "PmsPatient" p on p."id" = a."patientId"
     left join "PmsProvider" pr on pr."id" = a."providerId"
     left join "PmsOperatory" op on op."id" = a."operatoryId"
     where a."tenantId" = $1 and a."startsAt"::date = coalesce($2::date, current_date)
     order by a."startsAt", op."code"`,
    [tenantId, date ?? null],
  );
  return result.rows;
}

export async function getScheduleBoard(tenantId = defaultTenantId, date?: string): Promise<PmsScheduleBoard> {
  const boardDate = date ?? new Date().toISOString().slice(0, 10);
  const [appointments, operatories, providers, categories, blockouts, requests, recalls, labCases, production] = await Promise.all([
    listSchedule(tenantId, boardDate),
    listOperatories(tenantId),
    listProviders(tenantId),
    listAppointmentCategories(tenantId),
    query<PmsScheduleBoard["blockouts"][number]>(
      `select "id", "operatoryId", "providerId", "startsAt"::text as "startsAt", "endsAt"::text as "endsAt", "reason", "blockType"
       from "PmsBlockout"
       where "tenantId" = $1 and "startsAt"::date = $2::date
       order by "startsAt"`,
      [tenantId, boardDate],
    ),
    query<PmsScheduleBoard["requests"][number]>(
      `select ar."id", ar."requestType", ar."source", ar."urgency", ar."preferredWindow", ar."status", ar."note",
        case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName"
       from "PmsAppointmentRequest" ar
       left join "PmsPatient" p on p."id" = ar."patientId"
       where ar."tenantId" = $1 and ar."status" = 'OPEN'
       order by ar."urgency" desc, ar."createdAt"`,
      [tenantId],
    ),
    query<PmsScheduleBoard["recalls"][number]>(
      `select r."id", r."recallType", r."dueDate"::text as "dueDate", r."status", r."procedureCodes",
        p."lastName" || ', ' || p."firstName" as "patientName"
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       where r."tenantId" = $1 and r."status" in ('DUE', 'OVERDUE')
       order by r."dueDate" asc limit 25`,
      [tenantId],
    ),
    query<PmsScheduleBoard["labCases"][number]>(
      `select lc."id", lc."labName", lc."caseType", lc."status", lc."dueDate"::text as "dueDate",
        case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName"
       from "PmsLabCase" lc
       left join "PmsPatient" p on p."id" = lc."patientId"
       where lc."tenantId" = $1 and lc."status" not in ('DELIVERED', 'CANCELED')
       order by lc."dueDate" asc nulls last limit 25`,
      [tenantId],
    ),
    query<{ scheduled: string; completed: string }>(
      `select
        coalesce(sum("productionCents"), 0)::text as scheduled,
        coalesce(sum(case when "status" = 'COMPLETED' then "productionCents" else 0 end), 0)::text as completed
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt"::date = $2::date`,
      [tenantId, boardDate],
    ),
  ]);

  return {
    date: boardDate,
    operatories,
    providers,
    categories,
    appointments,
    blockouts: blockouts.rows,
    requests: requests.rows,
    recalls: recalls.rows,
    labCases: labCases.rows,
    production: {
      scheduledCents: Number(production.rows[0]?.scheduled ?? 0),
      completedCents: Number(production.rows[0]?.completed ?? 0),
      unscheduledRequests: requests.rows.length,
      dueRecalls: recalls.rows.length,
      labCaseRisks: labCases.rows.filter((item) => item.status !== "DELIVERED").length,
    },
  };
}

export async function listAppointmentCategories(tenantId = defaultTenantId) {
  return (await query<PmsAppointmentCategoryRow>(
    `select "id", "name", "color", "defaultMinutes", "productionType", "defaultProcedureCodes", "providerType"
     from "PmsAppointmentCategory"
     where "tenantId" = $1 and "active" = true
     order by "productionType", "defaultMinutes", "name"`,
    [tenantId],
  )).rows;
}

export async function listProviders(tenantId = defaultTenantId) {
  return (await query<{ id: string; displayName: string; providerType: string }>(
    `select "id", "displayName", "providerType" from "PmsProvider" where "tenantId" = $1 and "status" = 'ACTIVE' order by "providerType", "displayName"`,
    [tenantId],
  )).rows;
}

export async function listOperatories(tenantId = defaultTenantId) {
  return (await query<{ id: string; code: string; name: string; status: string }>(
    `select "id", "code", "name", "status" from "PmsOperatory" where "tenantId" = $1 order by "code"`,
    [tenantId],
  )).rows;
}

export async function createAppointmentHold(input: {
  tenantId?: string;
  patientId?: string;
  providerId?: string;
  operatoryId?: string;
  startsAt: string;
  endsAt: string;
  appointmentType: string;
  categoryId?: string;
  notes?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("appt");
  const category = input.categoryId
    ? (await query<{ name: string; defaultProcedureCodes: string[]; defaultMinutes: number }>(
        `select "name", "defaultProcedureCodes", "defaultMinutes" from "PmsAppointmentCategory" where "id" = $1 and "tenantId" = $2`,
        [input.categoryId, tenantId],
      )).rows[0]
    : null;
  const appointmentType = category?.name ?? input.appointmentType;
  const result = await query<PmsAppointmentRow>(
    `insert into "PmsAppointment"
       ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, 'HELD', $8, $9, current_timestamp)
     returning "id", "patientId", null::text as "patientName", null::text as "providerName", null::text as "operatoryName",
       "startsAt"::text as "startsAt", "endsAt"::text as "endsAt", "status", "appointmentType", "productionCents", "readinessStatus", "notes"`,
    [id, tenantId, input.patientId ?? null, input.providerId ?? null, input.operatoryId ?? null, input.startsAt, input.endsAt, appointmentType, input.notes ?? null],
  );
  await query(
    `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
     values ($1, $2, 'HELD', 'front_desk', $3)`,
    [newId("apst"), id, category ? `Created from category ${category.name}` : null],
  );
  if (category?.defaultProcedureCodes.length) {
    await addAppointmentProceduresFromCodes(id, tenantId, category.defaultProcedureCodes);
  }
  await addAudit(tenantId, "front_desk", "APPOINTMENT_HELD", "PmsAppointment", id, "ALLOWED");
  return result.rows[0];
}

async function addAppointmentProceduresFromCodes(appointmentId: string, tenantId: string, codes: string[]) {
  const procedureCodes = (await query<{ id: string; defaultFeeCents: number }>(
    `select "id", "defaultFeeCents" from "PmsProcedureCode" where "tenantId" = $1 and "code" = any($2::text[])`,
    [tenantId, codes],
  )).rows;
  for (const procedureCode of procedureCodes) {
    await query(
      `insert into "PmsAppointmentProcedure"
         ("id", "appointmentId", "procedureCodeId", "feeCents", "status", "updatedAt")
       values ($1, $2, $3, $4, 'PLANNED', current_timestamp)`,
      [newId("aproc"), appointmentId, procedureCode.id, procedureCode.defaultFeeCents],
    );
  }
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const result = await query<{ id: string; tenantId: string; status: string }>(
    `update "PmsAppointment" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "id", "tenantId", "status"`,
    [appointmentId, status],
  );
  const row = result.rows[0] ?? null;
  if (row) {
    await query(
      `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole")
       values ($1, $2, $3, 'front_desk')`,
      [newId("apst"), appointmentId, status],
    );
    await addAudit(row.tenantId, "front_desk", "APPOINTMENT_STATUS_UPDATED", "PmsAppointment", appointmentId, "ALLOWED");
  }
  return row;
}

export async function addAppointmentProcedure(input: {
  appointmentId: string;
  procedureCodeId: string;
  tooth?: string;
  surface?: string;
  feeCents?: number;
  actorRole?: string;
}) {
  const appointment = (await query<{ tenantId: string }>(
    `select "tenantId" from "PmsAppointment" where "id" = $1`,
    [input.appointmentId],
  )).rows[0];
  if (!appointment) throw new Error("Appointment not found.");
  const code = (await query<{ defaultFeeCents: number }>(
    `select "defaultFeeCents" from "PmsProcedureCode" where "id" = $1 and "tenantId" = $2`,
    [input.procedureCodeId, appointment.tenantId],
  )).rows[0];
  if (!code) throw new Error("Procedure code not found for this tenant.");

  const id = newId("aproc");
  const result = await query(
    `insert into "PmsAppointmentProcedure"
       ("id", "appointmentId", "procedureCodeId", "tooth", "surface", "feeCents", "status", "updatedAt")
     values ($1, $2, $3, $4, $5, coalesce($6::int, $7::int), 'PLANNED', current_timestamp)
     returning *`,
    [
      id,
      input.appointmentId,
      input.procedureCodeId,
      input.tooth?.trim() || null,
      input.surface?.trim() || null,
      input.feeCents ?? null,
      code.defaultFeeCents,
    ],
  );
  await addAudit(appointment.tenantId, input.actorRole ?? "associate_provider", "APPOINTMENT_PROCEDURE_ADDED", "PmsAppointmentProcedure", id, "ALLOWED");
  return result.rows[0];
}

export async function getAppointmentControl(appointmentId: string): Promise<PmsAppointmentControl | null> {
  const appointment = (await query<PmsAppointmentControl["appointment"]>(
    `select
      a."id", a."tenantId", a."patientId",
      case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName",
      a."providerId", pr."displayName" as "providerName",
      a."operatoryId", op."name" as "operatoryName",
      a."startsAt"::text as "startsAt", a."endsAt"::text as "endsAt",
      a."status", a."appointmentType", a."productionCents", a."readinessStatus", a."notes",
      p."chartNumber", p."firstName" as "patientFirstName", p."lastName" as "patientLastName", p."phone", p."email",
      pi."id" as "primaryInsuranceId", pi."eligibilityStatus", ip."payerName", ip."planName"
     from "PmsAppointment" a
     left join "PmsPatient" p on p."id" = a."patientId"
     left join "PmsProvider" pr on pr."id" = a."providerId"
     left join "PmsOperatory" op on op."id" = a."operatoryId"
     left join "PmsPatientInsurance" pi on pi."patientId" = a."patientId" and pi."priority" = 1
     left join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     where a."id" = $1`,
    [appointmentId],
  )).rows[0];
  if (!appointment) return null;

  const [procedures, forms, labCases, imaging, claims, checkoutSessions, balance] = await Promise.all([
    query<PmsAppointmentProcedureRow>(
      `select ap."id", ap."procedureCodeId", pc."code", pc."description", pc."category",
        ap."tooth", ap."surface", ap."feeCents", ap."status"
       from "PmsAppointmentProcedure" ap
       join "PmsProcedureCode" pc on pc."id" = ap."procedureCodeId"
       where ap."appointmentId" = $1
       order by pc."code", ap."createdAt"`,
      [appointmentId],
    ),
    query<PmsAppointmentControl["forms"][number]>(
      `select fa."id", ft."name" as "templateName", fa."status", fa."dueAt"::text as "dueAt"
       from "PmsFormAssignment" fa
       join "PmsFormTemplate" ft on ft."id" = fa."templateId"
       where fa."appointmentId" = $1
       order by fa."dueAt" asc nulls last, ft."name"`,
      [appointmentId],
    ),
    query<PmsAppointmentControl["labCases"][number]>(
      `select "id", "labName", "caseType", "status", "dueDate"::text as "dueDate"
       from "PmsLabCase"
       where "appointmentId" = $1
       order by "dueDate" asc nulls last`,
      [appointmentId],
    ),
    query<PmsAppointmentControl["imaging"][number]>(
      `select "id", "studyType", "acquisitionStatus", "tooth", "region", "takenAt"::text as "takenAt"
       from "PmsImagingStudy"
       where "appointmentId" = $1
       order by "takenAt" desc nulls first, "updatedAt" desc`,
      [appointmentId],
    ),
    query<PmsAppointmentControl["claims"][number]>(
      `select "id", "claimNumber", "status", "billedCents", "patientDueCents", "attachmentStatus"
       from "PmsClaim"
       where "appointmentId" = $1
       order by "createdAt" desc`,
      [appointmentId],
    ),
    query<PmsAppointmentControl["checkoutSessions"][number]>(
      `select "id", "status", "chargeCents", "patientPaymentCents", "claimId", "createdAt"::text as "createdAt", "checkoutNote"
       from "PmsCheckoutSession"
       where "appointmentId" = $1
       order by "createdAt" desc`,
      [appointmentId],
    ),
    query<{ openBalanceCents: string }>(
      `select coalesce(sum("balanceCents"), 0)::text as "openBalanceCents"
       from "PmsLedgerEntry"
       where "patientId" = $1`,
      [appointment.patientId],
    ),
  ]);

  const readinessBlockers = buildAppointmentReadinessBlockers({
    appointment,
    procedures: procedures.rows,
    forms: forms.rows,
    labCases: labCases.rows,
    imaging: imaging.rows,
  });
  const procedureFeeCents = procedures.rows.reduce((sum, procedure) => sum + Number(procedure.feeCents ?? 0), 0);
  const estimatedPatientDueCents = appointment.primaryInsuranceId ? Math.round(procedureFeeCents * 0.2) : procedureFeeCents;

  return {
    appointment,
    procedures: procedures.rows,
    forms: forms.rows,
    labCases: labCases.rows,
    imaging: imaging.rows,
    claims: claims.rows,
    checkoutSessions: checkoutSessions.rows,
    readinessBlockers,
    totals: {
      procedureFeeCents,
      estimatedPatientDueCents,
      openBalanceCents: Number(balance.rows[0]?.openBalanceCents ?? 0),
    },
  };
}

function buildAppointmentReadinessBlockers(input: {
  appointment: PmsAppointmentControl["appointment"];
  procedures: PmsAppointmentProcedureRow[];
  forms: PmsAppointmentControl["forms"];
  labCases: PmsAppointmentControl["labCases"];
  imaging: PmsAppointmentControl["imaging"];
}): PmsAppointmentReadinessBlocker[] {
  const blockers: PmsAppointmentReadinessBlocker[] = [];
  if (!input.appointment.patientId) {
    blockers.push({ area: "Patient", severity: "HARD", message: "Appointment is not attached to a patient.", action: "Attach a patient before checkout." });
  }
  if (!input.procedures.length) {
    blockers.push({ area: "Procedures", severity: "HARD", message: "No billable or clinical procedures are staged for this visit.", action: "Add the completed procedures before checkout." });
  }
  const openForms = input.forms.filter((form) => !["REVIEWED", "COMPLETED"].includes(form.status));
  if (openForms.length) {
    blockers.push({ area: "Forms", severity: "SOFT", message: `${openForms.length} form packet${openForms.length === 1 ? "" : "s"} still need review.`, action: "Review intake changes or document the override." });
  }
  const openLabs = input.labCases.filter((lab) => !["RECEIVED", "DELIVERED", "CANCELED"].includes(lab.status));
  if (openLabs.length) {
    blockers.push({ area: "Labs", severity: "HARD", message: `${openLabs.length} linked lab case${openLabs.length === 1 ? "" : "s"} are not received.`, action: "Receive the lab case or override with a clinical note." });
  }
  const orderedImaging = input.imaging.filter((study) => ["ORDERED", "ACQUIRED"].includes(study.acquisitionStatus));
  if (orderedImaging.length) {
    blockers.push({ area: "Imaging", severity: "SOFT", message: `${orderedImaging.length} imaging stud${orderedImaging.length === 1 ? "y is" : "ies are"} not provider reviewed.`, action: "Review imaging before claim attachment or document why it is not required." });
  }
  if (input.appointment.primaryInsuranceId && input.appointment.eligibilityStatus !== "ACTIVE") {
    blockers.push({ area: "Insurance", severity: "SOFT", message: `Primary insurance is ${input.appointment.eligibilityStatus ?? "not checked"}.`, action: "Verify benefits before estimating patient due." });
  }
  return blockers;
}

export async function completeAppointmentCheckout(input: {
  appointmentId: string;
  procedureIds?: string[];
  paymentCents?: number;
  paymentType?: string;
  paymentReference?: string;
  createClaimDraft?: boolean;
  overrideBlockers?: boolean;
  checkoutNote?: string;
  actorRole?: string;
}) {
  const actorRole = input.actorRole ?? "front_desk";
  const control = await getAppointmentControl(input.appointmentId);
  if (!control) throw new Error("Appointment not found.");
  if (!control.appointment.patientId) throw new Error("A patient is required before checkout.");
  if (control.appointment.status === "COMPLETED") throw new Error("This appointment has already been completed.");

  const hardBlockers = control.readinessBlockers.filter((blocker) => blocker.severity === "HARD");
  if (hardBlockers.length && !input.overrideBlockers) {
    await addAudit(control.appointment.tenantId, actorRole, "APPOINTMENT_CHECKOUT_BLOCKED", "PmsAppointment", input.appointmentId, "BLOCKED");
    throw new Error(`Checkout blocked: ${hardBlockers.map((blocker) => blocker.message).join(" ")}`);
  }

  const selectedIds = input.procedureIds?.filter(Boolean) ?? control.procedures.map((procedure) => procedure.id);
  const selectedProcedures = control.procedures.filter((procedure) => selectedIds.includes(procedure.id));
  if (!selectedProcedures.length) throw new Error("Select at least one appointment procedure to complete.");

  const procedureLogIds: string[] = [];
  for (const procedure of selectedProcedures) {
    await query(`update "PmsAppointmentProcedure" set "status" = 'COMPLETED', "updatedAt" = current_timestamp where "id" = $1`, [procedure.id]);
    const logId = newId("plog");
    await query(
      `insert into "PmsProcedureLog"
         ("id", "patientId", "providerId", "procedureCodeId", "tooth", "surface", "status", "feeCents", "serviceDate", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8::timestamp, current_timestamp)`,
      [
        logId,
        control.appointment.patientId,
        control.appointment.providerId,
        procedure.procedureCodeId,
        procedure.tooth,
        procedure.surface,
        procedure.feeCents,
        control.appointment.startsAt,
      ],
    );
    procedureLogIds.push(logId);
  }

  const chargeCents = selectedProcedures.reduce((sum, procedure) => sum + Number(procedure.feeCents ?? 0), 0);
  let claimId: string | null = null;
  if (input.createClaimDraft && control.appointment.primaryInsuranceId) {
    const claim = await createClaimFromProcedures({
      tenantId: control.appointment.tenantId,
      patientId: control.appointment.patientId,
      patientInsuranceId: control.appointment.primaryInsuranceId,
      procedureLogIds,
    });
    claimId = claim.id;
    await query(`update "PmsClaim" set "appointmentId" = $2, "updatedAt" = current_timestamp where "id" = $1`, [claimId, input.appointmentId]);
  }

  for (const procedure of selectedProcedures) {
    await postLedgerCharge({
      tenantId: control.appointment.tenantId,
      patientId: control.appointment.patientId,
      claimId: claimId ?? undefined,
      procedureLogId: procedureLogIds[selectedProcedures.indexOf(procedure)],
      description: `${procedure.code} ${procedure.description}`,
      amountCents: procedure.feeCents,
      serviceDate: control.appointment.startsAt,
    });
  }

  let paymentId: string | null = null;
  const paymentCents = Math.max(0, input.paymentCents ?? 0);
  if (paymentCents > 0) {
    const payment = await postPatientPayment({
      tenantId: control.appointment.tenantId,
      patientId: control.appointment.patientId,
      amountCents: paymentCents,
      paymentType: input.paymentType?.trim() || "CARD",
      reference: input.paymentReference?.trim() || `Checkout ${input.appointmentId}`,
    });
    paymentId = String(payment.id);
  }

  await query(
    `update "PmsAppointment"
     set "status" = 'COMPLETED', "readinessStatus" = case when $2::boolean then 'OVERRIDDEN' else 'READY' end,
       "productionCents" = greatest("productionCents", $3), "updatedAt" = current_timestamp
     where "id" = $1`,
    [input.appointmentId, Boolean(input.overrideBlockers && control.readinessBlockers.length), chargeCents],
  );
  await query(
    `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
     values ($1, $2, 'COMPLETED', $3, $4)`,
    [newId("apst"), input.appointmentId, actorRole, input.checkoutNote?.trim() || null],
  );

  const checkoutId = newId("checkout");
  await query(
    `insert into "PmsCheckoutSession"
       ("id", "tenantId", "appointmentId", "patientId", "actorRole", "status", "completedProcedureIds", "readinessOverride",
        "blockerSummary", "chargeCents", "patientPaymentCents", "claimId", "paymentId", "checkoutNote")
     values ($1, $2, $3, $4, $5, 'COMPLETED', $6::text[], $7, $8::jsonb, $9, $10, $11, $12, $13)`,
    [
      checkoutId,
      control.appointment.tenantId,
      input.appointmentId,
      control.appointment.patientId,
      actorRole,
      selectedIds,
      Boolean(input.overrideBlockers && control.readinessBlockers.length),
      JSON.stringify(control.readinessBlockers),
      chargeCents,
      paymentCents,
      claimId,
      paymentId,
      input.checkoutNote?.trim() || null,
    ],
  );

  await createTask({
    tenantId: control.appointment.tenantId,
    patientId: control.appointment.patientId,
    appointmentId: input.appointmentId,
    ownerRoleKey: claimId ? "billing_rcm" : "front_desk",
    title: claimId ? "Review checkout claim draft before submission" : "Review completed cash-pay checkout",
    taskType: claimId ? "CLAIM_REVIEW" : "CHECKOUT_REVIEW",
    priority: control.readinessBlockers.length ? "HIGH" : "NORMAL",
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  await addAudit(control.appointment.tenantId, actorRole, "APPOINTMENT_CHECKOUT_COMPLETED", "PmsCheckoutSession", checkoutId, "ALLOWED");

  return { checkoutId, claimId, paymentId, chargeCents, patientPaymentCents: paymentCents };
}

export async function getOnlineSchedulingWorkbench(tenantId = defaultTenantId) {
  const [links, bookings, campaigns, categories, providers, operatories, patientFinder] = await Promise.all([
    query<PmsOnlineSchedulingLinkRow>(
      `select l.*,
        c."name" as "categoryName",
        c."defaultMinutes",
        pr."displayName" as "providerName",
        coalesce(b.booking_count, 0)::int as "bookingCount",
        coalesce(r.click_count, 0)::int as "clickCount"
       from "PmsOnlineSchedulingLink" l
       left join "PmsAppointmentCategory" c on c."id" = l."appointmentCategoryId"
       left join "PmsProvider" pr on pr."id" = l."providerId"
       left join (
        select "linkId", count(*) as booking_count
        from "PmsOnlineBooking"
        where "tenantId" = $1
        group by "linkId"
       ) b on b."linkId" = l."id"
       left join (
        select c."linkId", count(r."id") filter (where r."clickedAt" is not null) as click_count
        from "PmsSchedulingInviteCampaign" c
        left join "PmsSchedulingInviteRecipient" r on r."campaignId" = c."id"
        where c."tenantId" = $1
        group by c."linkId"
       ) r on r."linkId" = l."id"
       where l."tenantId" = $1
       order by l."status", l."sourceChannel", l."title"`,
      [tenantId],
    ),
    query(
      `select b.*, l."title" as "linkTitle", p."chartNumber"
       from "PmsOnlineBooking" b
       join "PmsOnlineSchedulingLink" l on l."id" = b."linkId"
       left join "PmsPatient" p on p."id" = b."patientId"
       where b."tenantId" = $1
       order by b."createdAt" desc
       limit 25`,
      [tenantId],
    ),
    query(
      `select c.*, l."title" as "linkTitle",
        coalesce(r.recipients, 0)::int as recipients,
        coalesce(r.clicked, 0)::int as clicked,
        coalesce(r.booked, 0)::int as booked
       from "PmsSchedulingInviteCampaign" c
       join "PmsOnlineSchedulingLink" l on l."id" = c."linkId"
       left join (
        select "campaignId", count(*) as recipients,
          count(*) filter (where "clickedAt" is not null) as clicked,
          count(*) filter (where "bookedAt" is not null) as booked
        from "PmsSchedulingInviteRecipient"
        group by "campaignId"
       ) r on r."campaignId" = c."id"
       where c."tenantId" = $1
       order by c."createdAt" desc`,
      [tenantId],
    ),
    listAppointmentCategories(tenantId),
    listProviders(tenantId),
    listOperatories(tenantId),
    getSchedulingPatientFinder(tenantId),
  ]);

  const slotsByLink = await Promise.all(links.rows.map(async (link) => [link.id, await getOnlineSchedulingAvailability(link.slug, tenantId)] as const));

  return {
    links: links.rows,
    bookings: bookings.rows,
    campaigns: campaigns.rows,
    categories,
    providers,
    operatories,
    patientFinder,
    slotsByLink: Object.fromEntries(slotsByLink),
  };
}

export async function getOnlineSchedulingLink(slug: string, tenantId = defaultTenantId) {
  const result = await query<PmsOnlineSchedulingLinkRow>(
    `select l.*,
      c."name" as "categoryName",
      c."defaultMinutes",
      pr."displayName" as "providerName",
      0::int as "bookingCount",
      0::int as "clickCount"
     from "PmsOnlineSchedulingLink" l
     left join "PmsAppointmentCategory" c on c."id" = l."appointmentCategoryId"
     left join "PmsProvider" pr on pr."id" = l."providerId"
     where l."tenantId" = $1 and l."slug" = $2 and l."status" = 'ACTIVE'`,
    [tenantId, slug],
  );
  return result.rows[0] ?? null;
}

export async function getPublicSchedulingExperience(slug: string, tenantId = defaultTenantId): Promise<PmsPublicSchedulingExperience> {
  const link = await getOnlineSchedulingLink(slug, tenantId);
  if (!link) return { link: null, appointmentTypes: [], slotsBySlug: {} };
  const appointmentTypes = await query<PmsOnlineSchedulingLinkRow>(
    `select l.*,
      c."name" as "categoryName",
      c."defaultMinutes",
      pr."displayName" as "providerName",
      coalesce(b.booking_count, 0)::int as "bookingCount",
      0::int as "clickCount"
     from "PmsOnlineSchedulingLink" l
     left join "PmsAppointmentCategory" c on c."id" = l."appointmentCategoryId"
     left join "PmsProvider" pr on pr."id" = l."providerId"
     left join (
      select "linkId", count(*) as booking_count
      from "PmsOnlineBooking"
      where "tenantId" = $1
      group by "linkId"
     ) b on b."linkId" = l."id"
     where l."tenantId" = $1
       and l."status" = 'ACTIVE'
       and l."sourceChannel" in ($2, 'WEBSITE', 'WEB_CHAT')
     order by
       case when l."slug" = $3 then 0 else 1 end,
       coalesce(c."defaultMinutes", 60),
       l."title"`,
    [tenantId, link.sourceChannel, slug],
  );
  const limitedTypes = appointmentTypes.rows.slice(0, 8);
  const slotsBySlug = Object.fromEntries(await Promise.all(limitedTypes.map(async (type) => [type.slug, (await getOnlineSchedulingAvailability(type.slug, tenantId)).slice(0, 48)] as const)));
  await addAudit(tenantId, "public_visitor", "ONLINE_SCHEDULING_EXPERIENCE_VIEWED", "PmsOnlineSchedulingLink", link.id, "ALLOWED").catch(() => null);
  return { link, appointmentTypes: limitedTypes, slotsBySlug };
}

export async function getOnlineSchedulingAvailability(slug: string, tenantId = defaultTenantId): Promise<PmsOnlineSlot[]> {
  const link = await getOnlineSchedulingLink(slug, tenantId);
  if (!link) return [];
  const durationMinutes = Number(link.defaultMinutes ?? 60);
  const interval = Math.max(15, Number(link.slotIntervalMinutes || 30));
  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() + Number(link.earliestBookingDays ?? 1));
  const endDay = new Date();
  endDay.setHours(23, 59, 59, 999);
  endDay.setDate(endDay.getDate() + Number(link.maxBookingDays ?? 21));

  const [providers, operatories, conflicts] = await Promise.all([
    query<{ id: string; displayName: string }>(
      `select "id", "displayName"
       from "PmsProvider"
       where "tenantId" = $1 and "status" = 'ACTIVE' and ($2::text is null or "id" = $2)
       order by "displayName"`,
      [tenantId, link.providerId],
    ),
    query<{ id: string; name: string }>(
      `select "id", "name"
       from "PmsOperatory"
       where "tenantId" = $1 and "status" = 'READY'
       order by "code"`,
      [tenantId],
    ),
    query<{ providerId: string | null; operatoryId: string | null; startsAt: string; endsAt: string }>(
      `select "providerId", "operatoryId", "startsAt"::text as "startsAt", "endsAt"::text as "endsAt"
       from "PmsAppointment"
       where "tenantId" = $1
         and "startsAt" < $3::timestamp
         and "endsAt" > $2::timestamp
         and "status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')`,
      [tenantId, startDay.toISOString(), endDay.toISOString()],
    ),
  ]);

  const slots: PmsOnlineSlot[] = [];
  for (const provider of providers.rows) {
    for (const operatory of operatories.rows) {
      for (let dayOffset = Number(link.earliestBookingDays ?? 1); dayOffset <= Number(link.maxBookingDays ?? 21); dayOffset++) {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() + dayOffset);
        if ([0, 6].includes(day.getDay())) continue;
        for (let minute = 8 * 60; minute <= 16 * 60; minute += interval) {
          const startsAt = new Date(day);
          startsAt.setMinutes(minute);
          const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
          const overlaps = conflicts.rows.some((item) => {
            if (item.providerId !== provider.id && item.operatoryId !== operatory.id) return false;
            return new Date(item.startsAt) < endsAt && new Date(item.endsAt) > startsAt;
          });
          if (!overlaps) {
            slots.push({
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              providerId: provider.id,
              providerName: provider.displayName,
              operatoryId: operatory.id,
              operatoryName: operatory.name,
            });
          }
          if (slots.length >= 60) return slots;
        }
      }
    }
  }
  return slots;
}

export async function createOnlineSchedulingLink(input: {
  tenantId?: string;
  title: string;
  slug: string;
  audience: string;
  sourceChannel: string;
  appointmentCategoryId?: string;
  providerId?: string;
  locationId?: string;
  earliestBookingDays?: number;
  maxBookingDays?: number;
  slotIntervalMinutes?: number;
  reservationFeeCents?: number;
  requiresInsurance?: boolean;
  acceptedPayerNames?: string;
  notes?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const slug = input.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const result = await query(
    `insert into "PmsOnlineSchedulingLink"
       ("id", "tenantId", "slug", "title", "audience", "sourceChannel", "status", "appointmentCategoryId", "providerId", "locationId", "earliestBookingDays", "maxBookingDays", "slotIntervalMinutes", "reservationFeeCents", "requiresInsurance", "acceptedPayerNames", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, current_timestamp)
     on conflict ("tenantId", "slug") do update set
       "title" = excluded."title",
       "audience" = excluded."audience",
       "sourceChannel" = excluded."sourceChannel",
       "appointmentCategoryId" = excluded."appointmentCategoryId",
       "providerId" = excluded."providerId",
       "locationId" = excluded."locationId",
       "earliestBookingDays" = excluded."earliestBookingDays",
       "maxBookingDays" = excluded."maxBookingDays",
       "slotIntervalMinutes" = excluded."slotIntervalMinutes",
       "reservationFeeCents" = excluded."reservationFeeCents",
       "requiresInsurance" = excluded."requiresInsurance",
       "acceptedPayerNames" = excluded."acceptedPayerNames",
       "notes" = excluded."notes",
       "updatedAt" = current_timestamp
     returning *`,
    [
      newId("oslink"),
      tenantId,
      slug,
      input.title.trim(),
      input.audience,
      input.sourceChannel,
      input.appointmentCategoryId || null,
      input.providerId || null,
      input.locationId || "loc_primary",
      input.earliestBookingDays ?? 1,
      input.maxBookingDays ?? 21,
      input.slotIntervalMinutes ?? 30,
      input.reservationFeeCents ?? 0,
      Boolean(input.requiresInsurance),
      payerNamesJson(input.acceptedPayerNames),
      input.notes?.trim() || null,
    ],
  );
  await addAudit(tenantId, "front_desk", "ONLINE_SCHEDULING_LINK_UPSERTED", "PmsOnlineSchedulingLink", result.rows[0].id, "ALLOWED");
  return result.rows[0];
}

export async function submitOnlineBooking(input: {
  tenantId?: string;
  slug: string;
  startsAt: string;
  providerId: string;
  operatoryId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  patientNote?: string;
  insurancePayerName?: string;
  subscriberId?: string;
  utmSource?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const link = await getOnlineSchedulingLink(input.slug, tenantId);
  if (!link) throw new Error("Scheduling link is not active");
  const slots = await getOnlineSchedulingAvailability(input.slug, tenantId);
  const selected = slots.find((slot) => slot.startsAt === input.startsAt && slot.providerId === input.providerId && slot.operatoryId === input.operatoryId);
  if (!selected) throw new Error("Selected appointment time is no longer available");
  const payerStatus = evaluatePayerPolicy(link.acceptedPayerNames, input.insurancePayerName);
  if (link.requiresInsurance && payerStatus === "BLOCKED") throw new Error("Selected insurance is not accepted for this booking link");

  return withTransaction(async (client) => {
    const lock = await client.query<{ locked: boolean }>(
      `select pg_try_advisory_xact_lock(hashtext($1 || ':' || $2 || ':' || $3 || ':' || $4)) as locked`,
      [tenantId, selected.providerId, selected.operatoryId, selected.startsAt],
    );
    if (!lock.rows[0]?.locked) throw new Error("Selected appointment time is being booked by another visitor. Please pick another time.");
    const conflict = await client.query<{ id: string }>(
      `select "id"
       from "PmsAppointment"
       where "tenantId" = $1
         and "status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
         and "startsAt" < $5::timestamp
         and "endsAt" > $4::timestamp
         and ("providerId" = $2 or "operatoryId" = $3)
       limit 1`,
      [tenantId, selected.providerId, selected.operatoryId, selected.startsAt, selected.endsAt],
    );
    if (conflict.rows.length) throw new Error("Selected appointment time is no longer available");

    const patient = await matchOrCreateOnlinePatientWithClient(client, {
      tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
      email: input.email,
      referralSource: link.sourceChannel,
    });
    const categoryName = link.categoryName ?? "Online booking";
    const appointmentId = newId("appt");
    const bookingId = newId("osbook");
    const appointmentStatus = link.reservationFeeCents > 0 ? "HELD" : "CONFIRMED";
    const production = await client.query<{ feeCents: string }>(
      `select coalesce(max(pc."defaultFeeCents"), 0)::text as "feeCents"
       from "PmsAppointmentCategory" c
       left join "PmsProcedureCode" pc on pc."tenantId" = $1 and pc."code" = any(c."defaultProcedureCodes")
       where c."id" = $2 and c."tenantId" = $1`,
      [tenantId, link.appointmentCategoryId],
    );

    await client.query(
      `insert into "PmsAppointment"
         ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "productionCents", "readinessStatus", "notes", "updatedAt")
       values ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, $9, $10, $11, $12, current_timestamp)`,
      [
        appointmentId,
        tenantId,
        patient.id,
        selected.providerId,
        selected.operatoryId,
        selected.startsAt,
        selected.endsAt,
        appointmentStatus,
        categoryName,
        Number(production.rows[0]?.feeCents ?? 0),
        payerStatus === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "READY",
        onlineBookingNote(link, input.patientNote, payerStatus),
      ],
    );
    await client.query(
      `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
       values ($1, $2, $3, 'online_scheduling', $4)`,
      [newId("apst"), appointmentId, appointmentStatus, `Booked from ${link.title}`],
    );
    await client.query(
      `insert into "PmsOnlineBooking"
         ("id", "tenantId", "linkId", "appointmentId", "patientId", "firstName", "lastName", "dateOfBirth", "phone", "email", "isReturningPatient", "appointmentCategoryId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "patientNote", "insurancePayerName", "subscriberId", "eligibilityStatus", "reservationFeeCents", "reservationPaymentStatus", "sourceChannel", "utmSource", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, $12, $13, $14, $15::timestamp, $16::timestamp, 'BOOKED', $17, $18, $19, $20, $21, $22, $23, $24, current_timestamp)`,
      [
        bookingId,
        tenantId,
        link.id,
        appointmentId,
        patient.id,
        input.firstName.trim(),
        input.lastName.trim(),
        input.dateOfBirth || null,
        input.phone?.trim() || null,
        input.email?.trim() || null,
        patient.isReturningPatient,
        link.appointmentCategoryId,
        selected.providerId,
        selected.operatoryId,
        selected.startsAt,
        selected.endsAt,
        input.patientNote?.trim() || null,
        input.insurancePayerName?.trim() || null,
        input.subscriberId?.trim() || null,
        payerStatus,
        link.reservationFeeCents,
        link.reservationFeeCents > 0 ? "DUE" : "NOT_REQUIRED",
        link.sourceChannel,
        input.utmSource?.trim() || null,
      ],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, 'online_scheduling', 'ONLINE_BOOKING_WRITTEN_TO_PMS', 'PmsAppointment', $3, 'ALLOWED', $4::jsonb)`,
      [newId("audit"), tenantId, appointmentId, JSON.stringify({ bookingId, patientId: patient.id, sourceChannel: link.sourceChannel })],
    );
    return { bookingId, appointmentId, patientId: patient.id, isReturningPatient: patient.isReturningPatient };
  });
}

async function getSchedulingPatientFinder(tenantId: string) {
  const result = await query<{ unscheduledHygiene: string; brokenAppointments: string; asapRequests: string; unscheduledTreatmentCents: string }>(
    `select
      (select count(*) from "PmsRecall" r join "PmsPatient" p on p."id" = r."patientId" where r."tenantId" = $1 and r."status" in ('DUE', 'OVERDUE') and p."status" = 'ACTIVE')::text as "unscheduledHygiene",
      (select count(*) from "PmsAppointment" where "tenantId" = $1 and "status" in ('BROKEN', 'CANCELED', 'NO_SHOW') and "startsAt" >= current_date - interval '90 days')::text as "brokenAppointments",
      (select count(*) from "PmsAppointmentRequest" where "tenantId" = $1 and "status" = 'OPEN')::text as "asapRequests",
      (select coalesce(sum(tpi."feeCents"), 0) from "PmsTreatmentPlan" tp join "PmsTreatmentPlanItem" tpi on tpi."treatmentPlanId" = tp."id" where tp."tenantId" = $1 and tp."status" in ('PRESENTED', 'DRAFT'))::text as "unscheduledTreatmentCents"`,
    [tenantId],
  );
  const row = result.rows[0];
  return {
    unscheduledHygiene: Number(row?.unscheduledHygiene ?? 0),
    brokenAppointments: Number(row?.brokenAppointments ?? 0),
    asapRequests: Number(row?.asapRequests ?? 0),
    unscheduledTreatmentCents: Number(row?.unscheduledTreatmentCents ?? 0),
  };
}

async function matchOrCreateOnlinePatientWithClient(client: { query: typeof query }, input: { tenantId: string; firstName: string; lastName: string; dateOfBirth?: string; phone?: string; email?: string; referralSource: string }) {
  const existing = await client.query<{ id: string }>(
    `select "id"
     from "PmsPatient"
     where "tenantId" = $1
       and (
        (lower(coalesce("email", '')) = lower($2::text) and $2::text <> '')
        or (regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g') = regexp_replace($3::text, '[^0-9]', '', 'g') and $3::text <> '')
        or (lower("firstName") = lower($4::text) and lower("lastName") = lower($5::text) and "dateOfBirth"::date = $6::date)
       )
     order by "updatedAt" desc
     limit 1`,
    [input.tenantId, input.email?.trim() || "", input.phone?.trim() || "", input.firstName.trim(), input.lastName.trim(), input.dateOfBirth || null],
  );
  const found = existing.rows[0];
  if (found) return { id: found.id, isReturningPatient: true };

  const id = newId("pat");
  const chartNumber = `NB${Date.now().toString().slice(-8)}`;
  await client.query(
    `insert into "PmsPatient"
       ("id", "tenantId", "chartNumber", "firstName", "lastName", "dateOfBirth", "phone", "email", "responsibleParty", "referralSource", "status", "privacyLevel", "patientNote", "updatedAt")
     values ($1, $2, $3, $4, $5, $6::timestamp, $7, $8, 'SELF', $9, 'ACTIVE', 'STANDARD', 'Created from online scheduling after identity search found no existing chart.', current_timestamp)`,
    [id, input.tenantId, chartNumber, input.firstName.trim(), input.lastName.trim(), input.dateOfBirth || null, input.phone?.trim() || null, input.email?.trim() || null, input.referralSource],
  );
  await client.query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, 'online_scheduling', 'PATIENT_CREATED_FROM_ONLINE_BOOKING', 'PmsPatient', $3, 'ALLOWED', $4::jsonb)`,
    [newId("audit"), input.tenantId, id, JSON.stringify({ source: input.referralSource, noPhiLogged: true })],
  );
  return { id, isReturningPatient: false };
}

function evaluatePayerPolicy(acceptedPayerNames: string[] | null, payerName?: string) {
  if (!payerName?.trim()) return "NOT_CHECKED";
  if (!acceptedPayerNames?.length) return "NEEDS_REVIEW";
  return acceptedPayerNames.some((payer) => payer.toLowerCase() === payerName.trim().toLowerCase()) ? "ACCEPTED_BY_POLICY" : "BLOCKED";
}

function payerNamesJson(value?: string) {
  const payers = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  return payers.length ? JSON.stringify(payers) : null;
}

function onlineBookingNote(link: PmsOnlineSchedulingLinkRow, patientNote: string | undefined, payerStatus: string) {
  const parts = [`Online booking link: ${link.title}`, `Source: ${link.sourceChannel}`, `Payer policy: ${payerStatus}`];
  if (link.reservationFeeCents > 0) parts.push(`Reservation fee due: ${cents(link.reservationFeeCents)}`);
  if (patientNote?.trim()) parts.push(`Patient note: ${patientNote.trim()}`);
  return parts.join(" | ");
}

export async function getChart(patientId: string) {
  const [patient, alerts, allergies, meds, conditions, notes, procedures] = await Promise.all([
    getPatient(patientId),
    query(`select * from "PmsMedicalAlert" where "patientId" = $1 and "active" = true order by "severity" desc`, [patientId]),
    query(`select * from "PmsAllergy" where "patientId" = $1 and "active" = true order by "severity" desc`, [patientId]),
    query(`select * from "PmsMedication" where "patientId" = $1 and "status" = 'ACTIVE' order by "name"`, [patientId]),
    query(`select * from "PmsToothCondition" where "patientId" = $1 order by "tooth", "surface"`, [patientId]),
    query(`select * from "PmsClinicalNote" where "patientId" = $1 order by "createdAt" desc limit 50`, [patientId]),
    query(
      `select pl.*, pc."code", pc."description"
       from "PmsProcedureLog" pl join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       where pl."patientId" = $1 order by pl."serviceDate" desc nulls last, pl."createdAt" desc`,
      [patientId],
    ),
  ]);
  return { patient, alerts: alerts.rows, allergies: allergies.rows, medications: meds.rows, conditions: conditions.rows, notes: notes.rows, procedures: procedures.rows };
}

export async function listProcedureCodes(tenantId = defaultTenantId) {
  return (await query<{ id: string; code: string; description: string; category: string; defaultFeeCents: number }>(
    `select "id", "code", "description", "category", "defaultFeeCents"
     from "PmsProcedureCode"
     where "tenantId" = $1
     order by "category", "code"`,
    [tenantId],
  )).rows;
}

export async function addToothCondition(patientId: string, input: { tooth: string; surface?: string; condition: string; status?: string; source?: string }) {
  const id = newId("tc");
  const result = await query(
    `insert into "PmsToothCondition" ("id", "patientId", "tooth", "surface", "condition", "status", "source", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, current_timestamp)
     returning *`,
    [id, patientId, input.tooth, input.surface || null, input.condition, input.status ?? "ACTIVE", input.source ?? "PROVIDER"],
  );
  await addAudit(defaultTenantId, "associate_provider", "TOOTH_CONDITION_CREATED", "PmsToothCondition", id, "ALLOWED");
  return result.rows[0];
}

export async function addProcedureLog(patientId: string, input: { procedureCodeId: string; tooth?: string; surface?: string; status?: string; feeCents?: number; providerId?: string }) {
  const id = newId("plog");
  const result = await query(
    `insert into "PmsProcedureLog"
       ("id", "patientId", "providerId", "procedureCodeId", "tooth", "surface", "status", "feeCents", "serviceDate", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::int, (select "defaultFeeCents" from "PmsProcedureCode" where "id" = $4)), current_date, current_timestamp)
     returning *`,
    [id, patientId, input.providerId ?? null, input.procedureCodeId, input.tooth ?? null, input.surface ?? null, input.status ?? "TREATMENT_PLANNED", input.feeCents ?? null],
  );
  await addAudit(defaultTenantId, "associate_provider", "PROCEDURE_LOG_CREATED", "PmsProcedureLog", id, "ALLOWED");
  return result.rows[0];
}

export async function addClinicalNote(patientId: string, body: string, noteType = "PROGRESS") {
  const id = newId("note");
  const result = await query(
    `insert into "PmsClinicalNote" ("id", "patientId", "noteType", "body", "status", "updatedAt")
     values ($1, $2, $3, $4, 'DRAFT', current_timestamp)
     returning *`,
    [id, patientId, noteType, body.trim()],
  );
  await addAudit(defaultTenantId, "associate_provider", "CLINICAL_NOTE_CREATED", "PmsClinicalNote", id, "ALLOWED");
  return result.rows[0];
}

export async function getPerio(patientId: string) {
  const exam = await query(
    `select * from "PmsPerioExam" where "patientId" = $1 order by "examDate" desc limit 1`,
    [patientId],
  );
  const examRow = exam.rows[0] ?? null;
  const measures = examRow
    ? await query(`select * from "PmsPerioMeasure" where "perioExamId" = $1 order by "tooth", "site"`, [examRow.id])
    : { rows: [] };
  return { patient: await getPatient(patientId), exam: examRow, measures: measures.rows };
}

export async function addPerioMeasure(patientId: string, input: { tooth: string; site: string; probingDepth: number; bleeding?: boolean; recession?: number }) {
  let exam = (await query<{ id: string }>(`select "id" from "PmsPerioExam" where "patientId" = $1 and "status" = 'IN_PROGRESS' order by "examDate" desc limit 1`, [patientId])).rows[0];
  if (!exam) {
    const created = await query<{ id: string }>(
      `insert into "PmsPerioExam" ("id", "patientId", "status", "updatedAt") values ($1, $2, 'IN_PROGRESS', current_timestamp) returning "id"`,
      [newId("perio"), patientId],
    );
    exam = created.rows[0];
  }

  const id = newId("pm");
  const result = await query(
    `insert into "PmsPerioMeasure" ("id", "perioExamId", "tooth", "site", "probingDepth", "bleeding", "recession")
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict ("perioExamId", "tooth", "site") do update set
       "probingDepth" = excluded."probingDepth", "bleeding" = excluded."bleeding", "recession" = excluded."recession"
     returning *`,
    [id, exam.id, input.tooth, input.site, input.probingDepth, Boolean(input.bleeding), input.recession ?? null],
  );
  await addAudit(defaultTenantId, "rdh", "PERIO_MEASURE_RECORDED", "PmsPerioMeasure", result.rows[0].id, "ALLOWED");
  return result.rows[0];
}

export async function listTreatmentPlans(tenantId = defaultTenantId) {
  return (await query(
    `select tp.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName",
       coalesce(items.item_count, 0)::int as "itemCount",
       coalesce(items.accepted_count, 0)::int as "acceptedItemCount"
     from "PmsTreatmentPlan" tp
     join "PmsPatient" p on p."id" = tp."patientId"
     left join "PmsProvider" pr on pr."id" = tp."providerId"
     left join (
       select "treatmentPlanId", count(*) as item_count, count(*) filter (where "status" = 'ACCEPTED') as accepted_count
       from "PmsTreatmentPlanItem"
       group by "treatmentPlanId"
     ) items on items."treatmentPlanId" = tp."id"
     where tp."tenantId" = $1
     order by tp."updatedAt" desc`,
    [tenantId],
  )).rows;
}

export async function createTreatmentPlan(input: {
  tenantId?: string;
  patientId: string;
  providerId?: string;
  name: string;
  presentationNote?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("txp");
  const result = await query(
    `insert into "PmsTreatmentPlan"
       ("id", "tenantId", "patientId", "providerId", "name", "presentationNote", "status", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'DRAFT', current_timestamp)
     returning *`,
    [id, tenantId, input.patientId, input.providerId ?? null, input.name.trim(), input.presentationNote?.trim() || null],
  );
  await addAudit(tenantId, "treatment_coordinator", "TREATMENT_PLAN_CREATED", "PmsTreatmentPlan", id, "ALLOWED");
  return result.rows[0];
}

export async function addTreatmentPlanItem(input: {
  treatmentPlanId: string;
  procedureCodeId: string;
  phase?: number;
  sequence?: number;
  tooth?: string;
  surface?: string;
}) {
  const code = (await query<{ defaultFeeCents: number }>(`select "defaultFeeCents" from "PmsProcedureCode" where "id" = $1`, [input.procedureCodeId])).rows[0];
  const feeCents = code?.defaultFeeCents ?? 0;
  const insuranceEstimateCents = Math.round(feeCents * 0.5);
  const patientEstimateCents = feeCents - insuranceEstimateCents;
  const id = newId("txi");
  const result = await query(
    `insert into "PmsTreatmentPlanItem"
       ("id", "treatmentPlanId", "procedureCodeId", "phase", "sequence", "tooth", "surface", "feeCents", "insuranceEstimateCents", "patientEstimateCents", "status", "updatedAt")
     values ($1, $2, $3, $4, coalesce($5::int, (select coalesce(max("sequence"), 0) + 1 from "PmsTreatmentPlanItem" where "treatmentPlanId" = $2)), $6, $7, $8, $9, $10, 'PROPOSED', current_timestamp)
     returning *`,
    [id, input.treatmentPlanId, input.procedureCodeId, input.phase ?? 1, input.sequence ?? null, input.tooth ?? null, input.surface ?? null, feeCents, insuranceEstimateCents, patientEstimateCents],
  );
  await recalculateTreatmentPlan(input.treatmentPlanId);
  return result.rows[0];
}

export async function updateTreatmentPlanStatus(treatmentPlanId: string, status: string) {
  const accepted = status === "ACCEPTED";
  const result = await query<{ id: string; tenantId: string; patientId: string }>(
    `update "PmsTreatmentPlan"
     set "status" = $2,
         "acceptedAt" = case when $3::boolean then current_timestamp else "acceptedAt" end,
         "updatedAt" = current_timestamp
     where "id" = $1
     returning "id", "tenantId", "patientId"`,
    [treatmentPlanId, status, accepted],
  );
  const plan = result.rows[0] ?? null;
  if (plan) {
    if (accepted) {
      await query(`update "PmsTreatmentPlanItem" set "status" = 'ACCEPTED', "updatedAt" = current_timestamp where "treatmentPlanId" = $1`, [treatmentPlanId]);
      await createTask({
        tenantId: plan.tenantId,
        patientId: plan.patientId,
        ownerRoleKey: "treatment_coordinator",
        title: "Schedule accepted treatment plan",
        taskType: "TREATMENT_SCHEDULING",
        priority: "HIGH",
      });
    }
    await addAudit(plan.tenantId, "treatment_coordinator", "TREATMENT_PLAN_STATUS_UPDATED", "PmsTreatmentPlan", treatmentPlanId, "ALLOWED");
  }
  return plan;
}

async function recalculateTreatmentPlan(treatmentPlanId: string) {
  await query(
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

export async function listLedger(tenantId = defaultTenantId) {
  return (await query(
    `select le.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber", c."status" as "claimStatus"
     from "PmsLedgerEntry" le
     join "PmsPatient" p on p."id" = le."patientId"
     left join "PmsClaim" c on c."id" = le."claimId"
     where le."tenantId" = $1
     order by le."postedAt" desc limit 100`,
    [tenantId],
  )).rows;
}

export async function getLedgerBoard(tenantId = defaultTenantId) {
  const [entries, payments, claims, balances] = await Promise.all([
    listLedger(tenantId),
    query(
      `select pay.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsPayment" pay
       join "PmsPatient" p on p."id" = pay."patientId"
       where pay."tenantId" = $1
       order by pay."postedAt" desc limit 50`,
      [tenantId],
    ),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", pi."subscriberId"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsPatientInsurance" pi on pi."id" = c."patientInsuranceId"
       where c."tenantId" = $1
       order by c."createdAt" desc limit 75`,
      [tenantId],
    ),
    query<{ totalBalanceCents: string; patientCount: string }>(
      `select coalesce(sum(patient_balance), 0)::text as "totalBalanceCents", count(*)::text as "patientCount"
       from (
         select "patientId", coalesce(sum("balanceCents"), 0) as patient_balance
         from "PmsLedgerEntry"
         where "tenantId" = $1
         group by "patientId"
         having coalesce(sum("balanceCents"), 0) <> 0
       ) balances`,
      [tenantId],
    ),
  ]);

  return {
    entries,
    payments: payments.rows,
    claims: claims.rows,
    totalBalanceCents: Number(balances.rows[0]?.totalBalanceCents ?? 0),
    patientCountWithBalance: Number(balances.rows[0]?.patientCount ?? 0),
  };
}

export async function listInsurance(tenantId = defaultTenantId) {
  return (await query(
    `select pi.*, p."firstName", p."lastName", p."chartNumber",
       ip."payerName", ip."payerId", ip."planName", ip."planType", ip."groupNumber", ip."employerName", ip."networkStatus",
       bs."benefitYear", bs."deductibleCents", bs."deductibleMetCents", bs."annualMaxCents", bs."annualUsedCents"
     from "PmsPatientInsurance" pi
     join "PmsPatient" p on p."id" = pi."patientId"
     join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     left join "PmsBenefitSummary" bs on bs."patientInsuranceId" = pi."id"
     where ip."tenantId" = $1
     order by pi."eligibilityStatus" asc, pi."lastVerifiedAt" asc nulls first, p."lastName", p."firstName"`,
    [tenantId],
  )).rows;
}

export async function listInsurancePlans(tenantId = defaultTenantId) {
  return (await query(
    `select ip.*, coalesce(covered.covered_patients, 0)::int as "coveredPatients"
     from "PmsInsurancePlan" ip
     left join (
       select "planId", count(*) as covered_patients
       from "PmsPatientInsurance"
       group by "planId"
     ) covered on covered."planId" = ip."id"
     where ip."tenantId" = $1
     order by ip."payerName", ip."planName"`,
    [tenantId],
  )).rows;
}

export async function getInsuranceBoard(tenantId = defaultTenantId) {
  const [coverage, plans, claims, readyProcedures] = await Promise.all([
    listInsurance(tenantId),
    listInsurancePlans(tenantId),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", coalesce(lines.line_count, 0)::int as "lineCount"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       left join (
         select "claimId", count(*) as line_count
         from "PmsClaimLine"
         group by "claimId"
       ) lines on lines."claimId" = c."id"
       where c."tenantId" = $1
       order by c."updatedAt" desc limit 50`,
      [tenantId],
    ),
    listClaimReadyProcedures(tenantId),
  ]);

  return { coverage, plans, claims: claims.rows, readyProcedures };
}

export async function createInsurancePlan(input: {
  tenantId?: string;
  payerName: string;
  payerId?: string;
  planName: string;
  planType?: string;
  groupNumber?: string;
  employerName?: string;
  networkStatus?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("iplan");
  const result = await query(
    `insert into "PmsInsurancePlan"
       ("id", "tenantId", "payerName", "payerId", "planName", "planType", "groupNumber", "employerName", "networkStatus", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.payerName.trim(),
      input.payerId?.trim() || null,
      input.planName.trim(),
      input.planType?.trim() || "PPO",
      input.groupNumber?.trim() || null,
      input.employerName?.trim() || null,
      input.networkStatus?.trim() || "UNKNOWN",
    ],
  );
  await addAudit(tenantId, "insurance_coordinator", "INSURANCE_PLAN_CREATED", "PmsInsurancePlan", id, "ALLOWED");
  return result.rows[0];
}

export async function attachInsuranceToPatient(input: {
  patientId: string;
  planId: string;
  subscriberId: string;
  memberNumber?: string;
  employer?: string;
  relationship: string;
  priority?: number;
  eligibilityStatus?: string;
  verificationNote?: string;
  benefitYear?: number;
  deductibleCents?: number;
  deductibleMetCents?: number;
  annualMaxCents?: number;
  annualUsedCents?: number;
}) {
  const id = newId("pins");
  const result = await query<{ id: string; planId: string }>(
    `insert into "PmsPatientInsurance"
       ("id", "patientId", "planId", "subscriberId", "memberNumber", "employer", "relationship", "priority", "eligibilityStatus", "lastVerifiedAt", "verificationNote", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::int, 1), $9, case when $9 <> 'NOT_CHECKED' then current_timestamp else null end, $10, current_timestamp)
     returning "id", "planId"`,
    [
      id,
      input.patientId,
      input.planId,
      input.subscriberId.trim(),
      input.memberNumber?.trim() || null,
      input.employer?.trim() || null,
      input.relationship.trim() || "SELF",
      input.priority ?? 1,
      input.eligibilityStatus?.trim() || "NOT_CHECKED",
      input.verificationNote?.trim() || null,
    ],
  );
  const benefitId = newId("ben");
  await query(
    `insert into "PmsBenefitSummary"
       ("id", "patientInsuranceId", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, current_timestamp)`,
    [
      benefitId,
      id,
      input.benefitYear ?? new Date().getFullYear(),
      input.deductibleCents ?? 0,
      input.deductibleMetCents ?? 0,
      input.annualMaxCents ?? 0,
      input.annualUsedCents ?? 0,
    ],
  );
  const plan = (await query<{ tenantId: string }>(`select "tenantId" from "PmsInsurancePlan" where "id" = $1`, [result.rows[0]?.planId])).rows[0];
  await addAudit(plan?.tenantId ?? defaultTenantId, "insurance_coordinator", "PATIENT_INSURANCE_ATTACHED", "PmsPatientInsurance", id, "ALLOWED");
  return result.rows[0];
}

export async function listClaimReadyProcedures(tenantId = defaultTenantId) {
  return (await query(
    `select pl."id", pl."patientId", pl."procedureCodeId", pl."tooth", pl."surface", pl."status", pl."feeCents", pl."serviceDate"::text as "serviceDate",
       pc."code", pc."description", p."firstName", p."lastName", p."chartNumber",
       pi."id" as "patientInsuranceId", ip."payerName", ip."planName"
     from "PmsProcedureLog" pl
     join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
     join "PmsPatient" p on p."id" = pl."patientId"
     left join "PmsClaimLine" cl on cl."procedureLogId" = pl."id"
     left join "PmsPatientInsurance" pi on pi."patientId" = pl."patientId" and pi."priority" = 1
     left join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     where p."tenantId" = $1 and cl."id" is null and pl."status" in ('COMPLETED', 'TREATMENT_PLANNED')
     order by pl."serviceDate" desc nulls last, p."lastName", pc."code"
     limit 100`,
    [tenantId],
  )).rows;
}

export async function createClaimFromProcedures(input: { tenantId?: string; patientId: string; patientInsuranceId: string; procedureLogIds: string[] }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const procedureIds = input.procedureLogIds.filter(Boolean);
  if (!input.patientId || !input.patientInsuranceId || procedureIds.length === 0) {
    throw new Error("A patient, insurance coverage, and at least one procedure are required to create a claim.");
  }
  const coverage = (await query<{ payerName: string }>(
    `select ip."payerName"
     from "PmsPatientInsurance" pi
     join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     where pi."id" = $1 and pi."patientId" = $2`,
    [input.patientInsuranceId, input.patientId],
  )).rows[0];
  if (!coverage) {
    throw new Error("Selected coverage does not belong to the selected patient.");
  }

  const procedures = (await query<{
    id: string;
    procedureCodeId: string;
    tooth: string | null;
    surface: string | null;
    feeCents: number;
    serviceDate: string | null;
  }>(
    `select pl."id", pl."procedureCodeId", pl."tooth", pl."surface", pl."feeCents", pl."serviceDate"::text as "serviceDate"
     from "PmsProcedureLog" pl
     left join "PmsClaimLine" cl on cl."procedureLogId" = pl."id"
     where pl."patientId" = $1 and pl."id" = any($2::text[]) and cl."id" is null`,
    [input.patientId, procedureIds],
  )).rows;
  if (!procedures.length) {
    throw new Error("No unclaimed procedures were available for the selected patient.");
  }

  const billedCents = procedures.reduce((sum, procedure) => sum + Number(procedure.feeCents ?? 0), 0);
  const claimId = newId("claim");
  const claimNumber = `CLM-${new Date().getFullYear()}-${claimId.slice(-6).toUpperCase()}`;
  await query(
    `insert into "PmsClaim"
       ("id", "tenantId", "patientId", "patientInsuranceId", "payerName", "claimNumber", "status", "billedCents", "lastStatusAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'READY', $7, current_timestamp, current_timestamp)`,
    [claimId, tenantId, input.patientId, input.patientInsuranceId, coverage.payerName, claimNumber, billedCents],
  );

  for (const procedure of procedures) {
    await query(
      `insert into "PmsClaimLine"
         ("id", "claimId", "procedureLogId", "procedureCodeId", "tooth", "surface", "serviceDate", "feeCents", "patientDueCents", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7::timestamp, $8, 0, current_timestamp)`,
      [newId("cline"), claimId, procedure.id, procedure.procedureCodeId, procedure.tooth, procedure.surface, procedure.serviceDate, procedure.feeCents],
    );
  }
  await addAudit(tenantId, "insurance_coordinator", "CLAIM_CREATED_FROM_PROCEDURES", "PmsClaim", claimId, "ALLOWED");
  return { id: claimId, claimNumber, billedCents };
}

export async function postLedgerCharge(input: { tenantId?: string; patientId: string; description: string; amountCents: number; procedureLogId?: string; claimId?: string; serviceDate?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("led");
  const result = await query(
    `insert into "PmsLedgerEntry"
       ("id", "tenantId", "patientId", "claimId", "procedureLogId", "entryType", "description", "amountCents", "balanceCents", "serviceDate")
     values ($1, $2, $3, $4, $5, 'CHARGE', $6, $7, $7, coalesce($8::timestamp, current_timestamp))
     returning *`,
    [id, tenantId, input.patientId, input.claimId ?? null, input.procedureLogId ?? null, input.description.trim(), input.amountCents, input.serviceDate ?? null],
  );
  await addAudit(tenantId, "billing_coordinator", "LEDGER_CHARGE_POSTED", "PmsLedgerEntry", id, "ALLOWED");
  return result.rows[0];
}

export async function postPatientPayment(input: { tenantId?: string; patientId: string; amountCents: number; paymentType: string; reference?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const ledgerEntryId = newId("led");
  const paymentId = newId("pay");
  await query(
    `insert into "PmsLedgerEntry"
       ("id", "tenantId", "patientId", "entryType", "description", "amountCents", "balanceCents")
     values ($1, $2, $3, 'PATIENT_PAYMENT', $4, $5, $5)`,
    [ledgerEntryId, tenantId, input.patientId, `${input.paymentType} patient payment`, -Math.abs(input.amountCents)],
  );
  const result = await query(
    `insert into "PmsPayment"
       ("id", "tenantId", "patientId", "ledgerEntryId", "paymentType", "amountCents", "reference", "unappliedCents", "status")
     values ($1, $2, $3, $4, $5, $6, $7, 0, 'POSTED')
     returning *`,
    [paymentId, tenantId, input.patientId, ledgerEntryId, input.paymentType.trim(), Math.abs(input.amountCents), input.reference?.trim() || null],
  );
  await addAudit(tenantId, "billing_coordinator", "PATIENT_PAYMENT_POSTED", "PmsPayment", paymentId, "ALLOWED");
  return result.rows[0];
}

export async function listDocuments(tenantId = defaultTenantId) {
  return (await query(
    `select d.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
     from "PmsDocument" d left join "PmsPatient" p on p."id" = d."patientId"
     left join "PmsClaim" c on c."id" = d."claimId"
     where d."tenantId" = $1 order by d."updatedAt" desc`,
    [tenantId],
  )).rows;
}

export async function createDocument(input: {
  tenantId?: string;
  patientId?: string;
  claimId?: string;
  appointmentId?: string;
  documentType: string;
  title: string;
  storageUri?: string;
  sourceModule?: string;
  signatureStatus?: string;
  status?: string;
  expiresAt?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("doc");
  const result = await query(
    `insert into "PmsDocument"
       ("id", "tenantId", "patientId", "claimId", "appointmentId", "documentType", "title", "storageUri", "sourceModule", "signatureStatus", "status", "expiresAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, coalesce($10, 'NOT_REQUIRED'), coalesce($11, 'RECEIVED'), $12::timestamp, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId || null,
      input.claimId || null,
      input.appointmentId || null,
      input.documentType.trim(),
      input.title.trim(),
      input.storageUri?.trim() || null,
      input.sourceModule?.trim() || "PMS",
      input.signatureStatus?.trim() || null,
      input.status?.trim() || null,
      input.expiresAt || null,
    ],
  );
  await addAudit(tenantId, "front_desk", "DOCUMENT_CREATED", "PmsDocument", id, "ALLOWED");
  return result.rows[0];
}

export async function updateDocumentStatus(documentId: string, status: string, actorRole = "front_desk") {
  const result = await query<{ id: string; tenantId: string }>(
    `update "PmsDocument"
     set "status" = $2, "reviewedByRole" = $3, "reviewedAt" = current_timestamp, "updatedAt" = current_timestamp
     where "id" = $1 returning "id", "tenantId"`,
    [documentId, status, actorRole],
  );
  const row = result.rows[0] ?? null;
  if (row) await addAudit(row.tenantId, actorRole, "DOCUMENT_STATUS_UPDATED", "PmsDocument", documentId, "ALLOWED");
  return row;
}

export async function listLabCases(tenantId = defaultTenantId) {
  return (await query(
    `select lc.*, p."firstName", p."lastName", p."chartNumber", a."startsAt"::text as "appointmentStartsAt"
     from "PmsLabCase" lc
     left join "PmsPatient" p on p."id" = lc."patientId"
     left join "PmsAppointment" a on a."id" = lc."appointmentId"
     where lc."tenantId" = $1
     order by lc."dueDate" asc nulls last, lc."updatedAt" desc`,
    [tenantId],
  )).rows;
}

export async function createLabCase(input: {
  tenantId?: string;
  patientId?: string;
  appointmentId?: string;
  labName: string;
  caseType: string;
  dueDate?: string;
  trackingNumber?: string;
  shade?: string;
  notes?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("lab");
  const result = await query(
    `insert into "PmsLabCase"
       ("id", "tenantId", "patientId", "appointmentId", "labName", "caseType", "status", "dueDate", "trackingNumber", "shade", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'ORDERED', $7::timestamp, $8, $9, $10, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId || null,
      input.appointmentId || null,
      input.labName.trim(),
      input.caseType.trim(),
      input.dueDate || null,
      input.trackingNumber?.trim() || null,
      input.shade?.trim() || null,
      input.notes?.trim() || null,
    ],
  );
  await addAudit(tenantId, "dental_assistant", "LAB_CASE_CREATED", "PmsLabCase", id, "ALLOWED");
  return result.rows[0];
}

export async function updateLabCaseStatus(labCaseId: string, status: string) {
  const result = await query<{ id: string; tenantId: string }>(
    `update "PmsLabCase" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "id", "tenantId"`,
    [labCaseId, status],
  );
  const row = result.rows[0] ?? null;
  if (row) await addAudit(row.tenantId, "dental_assistant", "LAB_CASE_STATUS_UPDATED", "PmsLabCase", labCaseId, "ALLOWED");
  return row;
}

export async function listImagingStudies(tenantId = defaultTenantId) {
  return (await query(
    `select img.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName"
     from "PmsImagingStudy" img
     join "PmsPatient" p on p."id" = img."patientId"
     left join "PmsProvider" pr on pr."id" = img."providerId"
     where img."tenantId" = $1
     order by img."takenAt" desc nulls first, img."updatedAt" desc`,
    [tenantId],
  )).rows;
}

export async function createImagingStudy(input: {
  tenantId?: string;
  patientId: string;
  providerId?: string;
  appointmentId?: string;
  studyType: string;
  acquisitionStatus?: string;
  tooth?: string;
  region?: string;
  dicomStudyUid?: string;
  storageUri?: string;
  findings?: string;
  aiReviewStatus?: string;
  takenAt?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("img");
  const result = await query(
    `insert into "PmsImagingStudy"
       ("id", "tenantId", "patientId", "providerId", "appointmentId", "studyType", "acquisitionStatus", "tooth", "region", "dicomStudyUid", "storageUri", "findings", "aiReviewStatus", "takenAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, coalesce($7, 'ORDERED'), $8, $9, $10, $11, $12, coalesce($13, 'NOT_REQUESTED'), $14::timestamp, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.providerId || null,
      input.appointmentId || null,
      input.studyType.trim(),
      input.acquisitionStatus?.trim() || null,
      input.tooth?.trim() || null,
      input.region?.trim() || null,
      input.dicomStudyUid?.trim() || null,
      input.storageUri?.trim() || null,
      input.findings?.trim() || null,
      input.aiReviewStatus?.trim() || null,
      input.takenAt || null,
    ],
  );
  await addAudit(tenantId, "associate_provider", "IMAGING_STUDY_CREATED", "PmsImagingStudy", id, "ALLOWED");
  return result.rows[0];
}

export async function listPrescriptions(tenantId = defaultTenantId) {
  return (await query(
    `select rx.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName"
     from "PmsPrescription" rx
     join "PmsPatient" p on p."id" = rx."patientId"
     left join "PmsProvider" pr on pr."id" = rx."providerId"
     where rx."tenantId" = $1
     order by rx."writtenAt" desc`,
    [tenantId],
  )).rows;
}

export async function createPrescription(input: {
  tenantId?: string;
  patientId: string;
  providerId?: string;
  medicationName: string;
  dosage?: string;
  directions: string;
  quantity?: string;
  refills?: number;
  pharmacyName?: string;
  pharmacyPhone?: string;
  status?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("rx");
  const result = await query(
    `insert into "PmsPrescription"
       ("id", "tenantId", "patientId", "providerId", "medicationName", "dosage", "directions", "quantity", "refills", "pharmacyName", "pharmacyPhone", "status", "sentAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::int, 0), $10, $11, coalesce($12, 'DRAFT'), case when $12 = 'SENT' then current_timestamp else null end, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.providerId || null,
      input.medicationName.trim(),
      input.dosage?.trim() || null,
      input.directions.trim(),
      input.quantity?.trim() || null,
      input.refills ?? 0,
      input.pharmacyName?.trim() || null,
      input.pharmacyPhone?.trim() || null,
      input.status?.trim() || null,
    ],
  );
  await addAudit(tenantId, "associate_provider", "PRESCRIPTION_CREATED", "PmsPrescription", id, "ALLOWED");
  return result.rows[0];
}

export async function listReferrals(tenantId = defaultTenantId) {
  return (await query(
    `select ref.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName"
     from "PmsReferral" ref
     join "PmsPatient" p on p."id" = ref."patientId"
     left join "PmsProvider" pr on pr."id" = ref."providerId"
     where ref."tenantId" = $1
     order by ref."dueAt" asc nulls last, ref."createdAt" desc`,
    [tenantId],
  )).rows;
}

export async function createReferral(input: {
  tenantId?: string;
  patientId: string;
  providerId?: string;
  referralType: string;
  referredToName: string;
  referredToSpecialty?: string;
  referredToPhone?: string;
  reason: string;
  status?: string;
  dueAt?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("ref");
  const result = await query(
    `insert into "PmsReferral"
       ("id", "tenantId", "patientId", "providerId", "referralType", "referredToName", "referredToSpecialty", "referredToPhone", "reason", "status", "dueAt", "sentAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, coalesce($10, 'DRAFT'), $11::timestamp, case when $10 = 'SENT' then current_timestamp else null end, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.providerId || null,
      input.referralType.trim(),
      input.referredToName.trim(),
      input.referredToSpecialty?.trim() || null,
      input.referredToPhone?.trim() || null,
      input.reason.trim(),
      input.status?.trim() || null,
      input.dueAt || null,
    ],
  );
  await addAudit(tenantId, "associate_provider", "REFERRAL_CREATED", "PmsReferral", id, "ALLOWED");
  return result.rows[0];
}

export async function getPmsReports(tenantId = defaultTenantId) {
  const [
    productionTiles,
    dailyAppointments,
    dailyProduction,
    unscheduledBuckets,
    unscheduledSummary,
    restorativeCase,
    hygieneCase,
    newPatients,
    hygieneReappointment,
    cancellations,
    noShows,
    collections,
    providers,
    insurance,
    aging,
  ] = await Promise.all([
    query<{ priorDayProductionCents: string; todayScheduledProductionCents: string; tomorrowScheduledProductionCents: string }>(
      `select
        coalesce((select sum("amountCents") from "PmsLedgerEntry" where "tenantId" = $1 and "amountCents" > 0 and "serviceDate"::date = current_date - interval '1 day'), 0)::text as "priorDayProductionCents",
        coalesce((select sum("productionCents") from "PmsAppointment" where "tenantId" = $1 and "startsAt"::date = current_date), 0)::text as "todayScheduledProductionCents",
        coalesce((select sum("productionCents") from "PmsAppointment" where "tenantId" = $1 and "startsAt"::date = current_date + interval '1 day'), 0)::text as "tomorrowScheduledProductionCents"`,
      [tenantId],
    ),
    query<{ day: string; scheduled: string; completed: string; broken: string }>(
      `with days as (
        select generate_series(current_date - interval '6 days', current_date, interval '1 day')::date as day
       )
       select d.day::text,
        count(a."id")::text as scheduled,
        count(a."id") filter (where a."status" = 'COMPLETED')::text as completed,
        count(a."id") filter (where a."status" in ('BROKEN', 'CANCELED', 'NO_SHOW'))::text as broken
       from days d
       left join "PmsAppointment" a on a."tenantId" = $1 and a."startsAt"::date = d.day
       group by d.day
       order by d.day`,
      [tenantId],
    ),
    query<{ day: string; scheduledCents: string; completedCents: string; restorativeCents: string; hygieneCents: string; otherCents: string }>(
      `with days as (
        select generate_series(current_date - interval '6 days', current_date, interval '1 day')::date as day
       ),
       ledger as (
        select le."serviceDate"::date as day,
          sum(le."amountCents") filter (where pc."category" in ('RESTORATIVE', 'IMPLANT', 'ORAL_SURGERY', 'ENDODONTIC', 'PROSTHODONTIC')) as restorative,
          sum(le."amountCents") filter (where pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE')) as hygiene,
          sum(le."amountCents") filter (where pc."category" is null or pc."category" not in ('RESTORATIVE', 'IMPLANT', 'ORAL_SURGERY', 'ENDODONTIC', 'PROSTHODONTIC', 'HYGIENE', 'PERIODONTAL', 'PREVENTIVE')) as other,
          sum(le."amountCents") as completed
        from "PmsLedgerEntry" le
        left join "PmsProcedureLog" pl on pl."id" = le."procedureLogId"
        left join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        where le."tenantId" = $1 and le."amountCents" > 0 and le."serviceDate"::date >= current_date - interval '6 days'
        group by le."serviceDate"::date
       )
       select d.day::text,
        coalesce((select sum(a."productionCents") from "PmsAppointment" a where a."tenantId" = $1 and a."startsAt"::date = d.day), 0)::text as "scheduledCents",
        coalesce(l.completed, 0)::text as "completedCents",
        coalesce(l.restorative, 0)::text as "restorativeCents",
        coalesce(l.hygiene, 0)::text as "hygieneCents",
        coalesce(l.other, 0)::text as "otherCents"
       from days d
       left join ledger l on l.day = d.day
       order by d.day`,
      [tenantId],
    ),
    query<{ bucket: string; patientCount: string }>(
      `with last_visit as (
        select p."id", max(coalesce(pl."serviceDate"::date, a."startsAt"::date)) as last_visit
        from "PmsPatient" p
        left join "PmsProcedureLog" pl on pl."patientId" = p."id" and pl."status" = 'COMPLETED'
        left join "PmsAppointment" a on a."patientId" = p."id" and a."status" = 'COMPLETED'
        where p."tenantId" = $1 and p."status" = 'ACTIVE'
        group by p."id"
       ),
       unscheduled as (
        select lv.*, current_date - coalesce(lv.last_visit, current_date - interval '24 months')::date as days_since
        from last_visit lv
        where not exists (
          select 1 from "PmsAppointment" a
          where a."patientId" = lv."id" and a."startsAt" >= current_date and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
        )
       )
       select
        case
          when days_since <= 180 then '0-6'
          when days_since <= 270 then '6-9'
          when days_since <= 365 then '9-12'
          when days_since <= 540 then '12-18'
          else '18-24'
        end as bucket,
        count(*)::text as "patientCount"
       from unscheduled
       group by bucket
       order by min(days_since)`,
      [tenantId],
    ),
    query<{ activePatients: string; unscheduledActivePatients: string; unscheduledOpportunityCents: string; rescheduledPatients: string; rescheduledProductionCents: string; annualOpportunityCents: string; annualProductionCents: string }>(
      `with hygiene_avg as (
        select coalesce(avg(pl."feeCents"), 0)::int as avg_fee
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" p on p."id" = pl."patientId"
        where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE')
       ),
       active_patients as (
        select p."id" from "PmsPatient" p where p."tenantId" = $1 and p."status" = 'ACTIVE'
       ),
       unscheduled as (
        select ap."id"
        from active_patients ap
        where not exists (
          select 1 from "PmsAppointment" a
          where a."patientId" = ap."id" and a."startsAt" >= current_date and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
        )
       ),
       rescheduled as (
        select distinct p."id", a."productionCents"
        from "PmsPatient" p
        join "PmsAppointment" a on a."patientId" = p."id"
        where p."tenantId" = $1 and a."startsAt" >= current_date and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
       )
       select
        (select count(*) from active_patients)::text as "activePatients",
        (select count(*) from unscheduled)::text as "unscheduledActivePatients",
        ((select count(*) from unscheduled) * greatest((select avg_fee from hygiene_avg), 15500))::text as "unscheduledOpportunityCents",
        (select count(*) from rescheduled)::text as "rescheduledPatients",
        coalesce((select sum("productionCents") from rescheduled), 0)::text as "rescheduledProductionCents",
        ((select count(*) from active_patients) * greatest((select avg_fee from hygiene_avg), 15500) * 2)::text as "annualOpportunityCents",
        coalesce((select sum("amountCents") from "PmsLedgerEntry" where "tenantId" = $1 and "amountCents" > 0 and "serviceDate" >= current_date - interval '12 months'), 0)::text as "annualProductionCents"`,
      [tenantId],
    ),
    query<{ presentedCents: string; acceptedCents: string; caseCount: string; acceptedCount: string; examCount: string }>(
      `select
        coalesce(sum(tp."totalFeeCents") filter (where exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('RESTORATIVE', 'IMPLANT', 'ORAL_SURGERY', 'ENDODONTIC', 'PROSTHODONTIC')
        )), 0)::text as "presentedCents",
        coalesce(sum(tp."totalFeeCents") filter (where tp."status" = 'ACCEPTED' and exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('RESTORATIVE', 'IMPLANT', 'ORAL_SURGERY', 'ENDODONTIC', 'PROSTHODONTIC')
        )), 0)::text as "acceptedCents",
        count(*) filter (where exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('RESTORATIVE', 'IMPLANT', 'ORAL_SURGERY', 'ENDODONTIC', 'PROSTHODONTIC')
        ))::text as "caseCount",
        count(*) filter (where tp."status" = 'ACCEPTED' and exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('RESTORATIVE', 'IMPLANT', 'ORAL_SURGERY', 'ENDODONTIC', 'PROSTHODONTIC')
        ))::text as "acceptedCount",
        (select count(*) from "PmsProcedureLog" pl join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId" join "PmsPatient" p on p."id" = pl."patientId" where p."tenantId" = $1 and pc."category" = 'DIAGNOSTIC' and pl."serviceDate" >= current_date - interval '30 days')::text as "examCount"
       from "PmsTreatmentPlan" tp
       where tp."tenantId" = $1 and tp."createdAt" >= current_date - interval '30 days'`,
      [tenantId],
    ),
    query<{ presentedCents: string; acceptedCents: string; caseCount: string; acceptedCount: string; visitCount: string }>(
      `select
        coalesce(sum(tp."totalFeeCents") filter (where exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE')
        )), 0)::text as "presentedCents",
        coalesce(sum(tp."totalFeeCents") filter (where tp."status" = 'ACCEPTED' and exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE')
        )), 0)::text as "acceptedCents",
        count(*) filter (where exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE')
        ))::text as "caseCount",
        count(*) filter (where tp."status" = 'ACCEPTED' and exists (
          select 1 from "PmsTreatmentPlanItem" tpi join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tpi."treatmentPlanId" = tp."id" and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE')
        ))::text as "acceptedCount",
        (select count(*) from "PmsProcedureLog" pl join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId" join "PmsPatient" p on p."id" = pl."patientId" where p."tenantId" = $1 and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE') and pl."serviceDate" >= current_date - interval '30 days')::text as "visitCount"
       from "PmsTreatmentPlan" tp
       where tp."tenantId" = $1 and tp."createdAt" >= current_date - interval '30 days'`,
      [tenantId],
    ),
    query<{ newCount: string; recapturedCount: string; lostCount: string; growth: string }>(
      `with first_service as (
        select p."id", min(coalesce(pl."serviceDate"::date, p."createdAt"::date)) as first_date
        from "PmsPatient" p
        left join "PmsProcedureLog" pl on pl."patientId" = p."id"
        where p."tenantId" = $1 and p."status" = 'ACTIVE'
        group by p."id"
       ),
       inactive as (
        select p."id"
        from "PmsPatient" p
        where p."tenantId" = $1 and p."status" = 'ACTIVE'
          and not exists (select 1 from "PmsAppointment" a where a."patientId" = p."id" and a."startsAt" >= current_date)
          and not exists (select 1 from "PmsProcedureLog" pl where pl."patientId" = p."id" and pl."serviceDate" >= current_date - interval '18 months')
       )
       select
        count(*) filter (where first_date >= current_date - interval '30 days')::text as "newCount",
        count(*) filter (where first_date < current_date - interval '18 months')::text as "recapturedCount",
        (select count(*) from inactive)::text as "lostCount",
        (count(*) filter (where first_date >= current_date - interval '30 days') - (select count(*) from inactive))::text as growth
       from first_service`,
      [tenantId],
    ),
    query<{ visits: string; reappointed: string; unscheduled: string; goalPercent: string }>(
      `with hygiene_visits as (
        select distinct pl."patientId", pl."serviceDate"::date as service_date
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" p on p."id" = pl."patientId"
        where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE') and pl."serviceDate" >= current_date - interval '30 days'
       ),
       reappointed as (
        select hv."patientId"
        from hygiene_visits hv
        where exists (
          select 1 from "PmsAppointment" a
          where a."patientId" = hv."patientId" and a."startsAt"::date > hv.service_date and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
        )
       )
       select
        (select count(*) from hygiene_visits)::text as visits,
        (select count(*) from reappointed)::text as reappointed,
        ((select count(*) from hygiene_visits) - (select count(*) from reappointed))::text as unscheduled,
        '90'::text as "goalPercent"`,
      [tenantId],
    ),
    query<{ scheduled: string; cancelled: string; unscheduled: string }>(
      `select count(*)::text as scheduled,
        count(*) filter (where "status" in ('CANCELED', 'BROKEN'))::text as cancelled,
        count(*) filter (where "status" in ('CANCELED', 'BROKEN') and not exists (
          select 1 from "PmsAppointment" future
          where future."patientId" = "PmsAppointment"."patientId" and future."startsAt" > "PmsAppointment"."startsAt" and future."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
        ))::text as unscheduled
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt" >= current_date - interval '30 days'`,
      [tenantId],
    ),
    query<{ scheduled: string; noShows: string; unscheduled: string }>(
      `select count(*)::text as scheduled,
        count(*) filter (where "status" = 'NO_SHOW')::text as "noShows",
        count(*) filter (where "status" = 'NO_SHOW' and not exists (
          select 1 from "PmsAppointment" future
          where future."patientId" = "PmsAppointment"."patientId" and future."startsAt" > "PmsAppointment"."startsAt" and future."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
        ))::text as unscheduled
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt" >= current_date - interval '30 days'`,
      [tenantId],
    ),
    query<{ chargesCents: string; paymentsCents: string; balanceCents: string }>(
      `select
        coalesce(sum(case when "amountCents" > 0 then "amountCents" else 0 end), 0)::text as "chargesCents",
        abs(coalesce(sum(case when "amountCents" < 0 then "amountCents" else 0 end), 0))::text as "paymentsCents",
        coalesce(sum("balanceCents"), 0)::text as "balanceCents"
       from "PmsLedgerEntry" where "tenantId" = $1`,
      [tenantId],
    ),
    query(
      `select coalesce(pr."displayName", 'Unassigned') as "providerName",
        count(a."id")::int as "appointmentCount",
        coalesce(sum(a."productionCents"), 0)::int as "productionCents"
       from "PmsAppointment" a
       left join "PmsProvider" pr on pr."id" = a."providerId"
       where a."tenantId" = $1 and a."startsAt" >= current_date - interval '30 days'
       group by pr."displayName"
       order by coalesce(sum(a."productionCents"), 0) desc`,
      [tenantId],
    ),
    query<{ openClaims: string; billedCents: string; paidCents: string }>(
      `select count(*)::text as "openClaims",
        coalesce(sum("billedCents"), 0)::text as "billedCents",
        coalesce(sum("paidCents"), 0)::text as "paidCents"
       from "PmsClaim" where "tenantId" = $1 and "status" not in ('PAID', 'CLOSED', 'VOID')`,
      [tenantId],
    ),
    query(
      `select bucket, count(*)::int as "claimCount", coalesce(sum("billedCents" - "paidCents"), 0)::int as "exposureCents"
       from (
         select "billedCents", "paidCents",
          case
            when "createdAt" >= current_date - interval '30 days' then '0-30'
            when "createdAt" >= current_date - interval '60 days' then '31-60'
            when "createdAt" >= current_date - interval '90 days' then '61-90'
            else '90+'
          end as bucket
         from "PmsClaim"
         where "tenantId" = $1 and "status" not in ('PAID', 'CLOSED', 'VOID')
       ) claims
       group by bucket
       order by bucket`,
      [tenantId],
    ),
  ]);

  return {
    productionTiles: {
      priorDayProductionCents: Number(productionTiles.rows[0]?.priorDayProductionCents ?? 0),
      todayScheduledProductionCents: Number(productionTiles.rows[0]?.todayScheduledProductionCents ?? 0),
      tomorrowScheduledProductionCents: Number(productionTiles.rows[0]?.tomorrowScheduledProductionCents ?? 0),
    },
    production: {
      productionCents: dailyProduction.rows.reduce((total, row) => total + Number(row.scheduledCents ?? 0), 0),
      completedCents: dailyProduction.rows.reduce((total, row) => total + Number(row.completedCents ?? 0), 0),
    },
    dailyAppointments: dailyAppointments.rows.map((row) => ({
      day: row.day,
      scheduled: Number(row.scheduled ?? 0),
      completed: Number(row.completed ?? 0),
      broken: Number(row.broken ?? 0),
    })),
    dailyProduction: dailyProduction.rows.map((row) => ({
      day: row.day,
      scheduledCents: Number(row.scheduledCents ?? 0),
      completedCents: Number(row.completedCents ?? 0),
      restorativeCents: Number(row.restorativeCents ?? 0),
      hygieneCents: Number(row.hygieneCents ?? 0),
      otherCents: Number(row.otherCents ?? 0),
    })),
    unscheduled: {
      buckets: unscheduledBuckets.rows.map((row) => ({ bucket: row.bucket, patientCount: Number(row.patientCount ?? 0) })),
      activePatients: Number(unscheduledSummary.rows[0]?.activePatients ?? 0),
      unscheduledActivePatients: Number(unscheduledSummary.rows[0]?.unscheduledActivePatients ?? 0),
      unscheduledOpportunityCents: Number(unscheduledSummary.rows[0]?.unscheduledOpportunityCents ?? 0),
      rescheduledPatients: Number(unscheduledSummary.rows[0]?.rescheduledPatients ?? 0),
      rescheduledProductionCents: Number(unscheduledSummary.rows[0]?.rescheduledProductionCents ?? 0),
      annualOpportunityCents: Number(unscheduledSummary.rows[0]?.annualOpportunityCents ?? 0),
      annualProductionCents: Number(unscheduledSummary.rows[0]?.annualProductionCents ?? 0),
    },
    restorativeCase: {
      presentedCents: Number(restorativeCase.rows[0]?.presentedCents ?? 0),
      acceptedCents: Number(restorativeCase.rows[0]?.acceptedCents ?? 0),
      caseCount: Number(restorativeCase.rows[0]?.caseCount ?? 0),
      acceptedCount: Number(restorativeCase.rows[0]?.acceptedCount ?? 0),
      examCount: Number(restorativeCase.rows[0]?.examCount ?? 0),
    },
    hygieneCase: {
      presentedCents: Number(hygieneCase.rows[0]?.presentedCents ?? 0),
      acceptedCents: Number(hygieneCase.rows[0]?.acceptedCents ?? 0),
      caseCount: Number(hygieneCase.rows[0]?.caseCount ?? 0),
      acceptedCount: Number(hygieneCase.rows[0]?.acceptedCount ?? 0),
      visitCount: Number(hygieneCase.rows[0]?.visitCount ?? 0),
    },
    newPatients: {
      newCount: Number(newPatients.rows[0]?.newCount ?? 0),
      recapturedCount: Number(newPatients.rows[0]?.recapturedCount ?? 0),
      lostCount: Number(newPatients.rows[0]?.lostCount ?? 0),
      growth: Number(newPatients.rows[0]?.growth ?? 0),
    },
    hygieneReappointment: {
      visits: Number(hygieneReappointment.rows[0]?.visits ?? 0),
      reappointed: Number(hygieneReappointment.rows[0]?.reappointed ?? 0),
      unscheduled: Number(hygieneReappointment.rows[0]?.unscheduled ?? 0),
      goalPercent: Number(hygieneReappointment.rows[0]?.goalPercent ?? 90),
    },
    cancellations: {
      scheduled: Number(cancellations.rows[0]?.scheduled ?? 0),
      cancelled: Number(cancellations.rows[0]?.cancelled ?? 0),
      unscheduled: Number(cancellations.rows[0]?.unscheduled ?? 0),
    },
    noShows: {
      scheduled: Number(noShows.rows[0]?.scheduled ?? 0),
      noShows: Number(noShows.rows[0]?.noShows ?? 0),
      unscheduled: Number(noShows.rows[0]?.unscheduled ?? 0),
    },
    collections: {
      chargesCents: Number(collections.rows[0]?.chargesCents ?? 0),
      paymentsCents: Number(collections.rows[0]?.paymentsCents ?? 0),
      balanceCents: Number(collections.rows[0]?.balanceCents ?? 0),
    },
    providers: providers.rows,
    schedule: {
      scheduled: dailyAppointments.rows.reduce((total, row) => total + Number(row.scheduled ?? 0), 0),
      completed: dailyAppointments.rows.reduce((total, row) => total + Number(row.completed ?? 0), 0),
      broken: dailyAppointments.rows.reduce((total, row) => total + Number(row.broken ?? 0), 0),
    },
    insurance: {
      openClaims: Number(insurance.rows[0]?.openClaims ?? 0),
      billedCents: Number(insurance.rows[0]?.billedCents ?? 0),
      paidCents: Number(insurance.rows[0]?.paidCents ?? 0),
    },
    aging: aging.rows,
  };
}

export async function listTasks(tenantId = defaultTenantId, role?: string) {
  return (await query(
    `select t.*, p."firstName", p."lastName"
     from "PmsTask" t left join "PmsPatient" p on p."id" = t."patientId"
     where t."tenantId" = $1 and ($2::text is null or t."ownerRoleKey" = $2)
     order by t."priority" desc, t."dueAt" asc nulls last, t."createdAt" desc`,
    [tenantId, role ?? null],
  )).rows;
}

export async function createTask(input: { tenantId?: string; patientId?: string; appointmentId?: string; ownerRoleKey: string; title: string; taskType: string; priority?: string; dueAt?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("task");
  const result = await query(
    `insert into "PmsTask" ("id", "tenantId", "patientId", "appointmentId", "ownerRoleKey", "title", "taskType", "priority", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp, current_timestamp) returning *`,
    [id, tenantId, input.patientId ?? null, input.appointmentId ?? null, input.ownerRoleKey, input.title.trim(), input.taskType, input.priority ?? "NORMAL", input.dueAt ?? null],
  );
  await addAudit(tenantId, input.ownerRoleKey, "TASK_CREATED", "PmsTask", id, "ALLOWED");
  return result.rows[0];
}

export function classifyEngagementWork(eventType: string) {
  if (eventType.includes("BOOKING_REQUEST")) return { ownerRoleKey: "front_desk", taskType: "BOOKING_REQUEST_FOLLOW_UP", priority: "HIGH" };
  if (eventType.includes("PRE_MED") || eventType.includes("MEDICAL_ALERT")) return { ownerRoleKey: "clinical_assistant", taskType: "MEDICAL_PREMED_REVIEW", priority: "HIGH" };
  if (eventType.includes("POST_OP")) return { ownerRoleKey: "clinical_assistant", taskType: "POST_OP_FOLLOW_UP", priority: "HIGH" };
  if (eventType.includes("RECALL") || eventType.includes("REACTIVATION") || eventType.includes("WAITLIST")) return { ownerRoleKey: "front_desk", taskType: "SCHEDULE_RECOVERY", priority: "NORMAL" };
  if (eventType.includes("NO_SHOW") || eventType.includes("CANCEL")) return { ownerRoleKey: "front_desk", taskType: "BROKEN_APPOINTMENT_RECOVERY", priority: "HIGH" };
  if (eventType.includes("PAYMENT") || eventType.includes("INSURANCE")) return { ownerRoleKey: "billing_rcm", taskType: "PATIENT_FINANCIAL_FOLLOW_UP", priority: "NORMAL" };
  if (eventType.includes("FORM") || eventType.includes("INTAKE") || eventType.includes("CONSENT")) return { ownerRoleKey: "front_desk", taskType: "FORMS_CONSENT_REVIEW", priority: "NORMAL" };
  if (eventType.includes("REVIEW") || eventType.includes("RECOVERY")) return { ownerRoleKey: "marketing_growth", taskType: "REPUTATION_OUTREACH_REVIEW", priority: "NORMAL" };
  return { ownerRoleKey: "marketing_growth", taskType: "PATIENT_ENGAGEMENT_REVIEW", priority: "NORMAL" };
}

async function safeEngagementRows<T>(label: string, promise: Promise<{ rows: T[] }>) {
  try {
    return await promise;
  } catch (error) {
    return {
      rows: [],
      readinessError: {
        area: label,
        control: error instanceof Error ? error.message : "This PMS lane could not be loaded.",
        status: "DATA_READINESS_REVIEW",
      },
    };
  }
}

export async function getEngagementCommandCenter(tenantId = defaultTenantId) {
  const [events, recoveryCases, sourceSignals, patients, lifecycle, bookingRequests, formPackets, recallQueue, brokenAppointments, waitlist, postOpQueue, medicalAlerts, crossModuleTasks, governance] = await Promise.all([
    query(
      `select e.*, p."firstName", p."lastName", p."chartNumber", p."phone", p."email",
        a."appointmentType", a."startsAt", a."status" as "appointmentStatus", a."readinessStatus",
        cp."consentStatus", cp."quietHoursStart", cp."quietHoursEnd",
        coalesce(forms."openForms", 0)::int as "openForms",
        coalesce(tasks."openTasks", 0)::int as "openTasks",
        coalesce(medical."medicalAlertCount", 0)::int as "medicalAlertCount",
        coalesce(medical."preMedAlertCount", 0)::int as "preMedAlertCount",
        pc."code" as "procedureCode", pc."description" as "procedureDescription"
       from "PatientEngagementEvent" e
       join "PmsPatient" p on p."id" = e."patientId"
       left join "PmsAppointment" a on a."id" = e."appointmentId"
       left join "PmsProcedureLog" pl on pl."id" = e."procedureLogId"
       left join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       left join lateral (
        select pref."consentStatus", pref."quietHoursStart", pref."quietHoursEnd"
        from "PmsPatientCommunicationPreference" pref
        where pref."patientId" = p."id" and pref."channel" = e."channel"
        order by pref."priority" asc, pref."updatedAt" desc
        limit 1
       ) cp on true
       left join (
        select "patientId", count(*) as "openForms"
        from "PmsFormAssignment"
        where "tenantId" = $1 and "status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')
        group by "patientId"
       ) forms on forms."patientId" = p."id"
       left join (
        select "patientId", count(*) as "openTasks"
        from "PmsTask"
        where "tenantId" = $1 and "status" = 'OPEN'
        group by "patientId"
       ) tasks on tasks."patientId" = p."id"
       left join lateral (
        select
          count(*) filter (where ma."active" = true)::int as "medicalAlertCount",
          count(*) filter (where ma."active" = true and (ma."title" ilike '%pre%med%' or ma."details" ilike '%pre%med%' or ma."title" ilike '%antibiotic%' or ma."details" ilike '%antibiotic%'))::int as "preMedAlertCount"
        from "PmsMedicalAlert" ma
        where ma."patientId" = p."id"
       ) medical on true
       where e."tenantId" = $1
       order by
        case e."status"
          when 'NEEDS_REVIEW' then 1
          when 'READY_FOR_APPROVAL' then 2
          when 'DRAFT' then 3
          when 'APPROVED_TO_SEND' then 4
          else 5
        end,
        e."scheduledFor" asc nulls last,
        e."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select r.*, p."firstName", p."lastName", p."chartNumber", a."appointmentType", a."startsAt"
       from "ReputationRecoveryCase" r
       join "PmsPatient" p on p."id" = r."patientId"
       left join "PmsAppointment" a on a."id" = r."appointmentId"
       where r."tenantId" = $1
       order by r."dueAt" asc nulls last, r."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select 'completed_procedures' as key, count(*)::int as value
       from "PmsProcedureLog" pl
       join "PmsPatient" p on p."id" = pl."patientId"
       where p."tenantId" = $1 and pl."status" = 'COMPLETED'
       union all
       select 'due_recalls' as key, count(*)::int as value
       from "PmsRecall" where "tenantId" = $1 and "status" in ('DUE', 'OVERDUE')
       union all
       select 'open_balances' as key, count(distinct "patientId")::int as value
       from "PmsLedgerEntry" where "tenantId" = $1 and "balanceCents" > 0
       union all
       select 'readiness_blocks' as key, count(*)::int as value
       from "PmsAppointment" where "tenantId" = $1 and "readinessStatus" <> 'READY'
       union all
       select 'open_forms' as key, count(*)::int as value
       from "PmsFormAssignment" where "tenantId" = $1 and "status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')
       union all
       select 'waitlist_requests' as key, count(*)::int as value
       from "PmsAppointmentRequest" where "tenantId" = $1 and "status" = 'OPEN'
       union all
       select 'booking_requests' as key, count(*)::int as value
       from "PmsAppointmentRequest" where "tenantId" = $1 and "status" = 'OPEN' and "requestType" in ('NEW_PATIENT','ONLINE_BOOKING','BOOKING_REQUEST','RECARE_BOOKING')
       union all
       select 'broken_appointments' as key, count(*)::int as value
       from "PmsAppointment" where "tenantId" = $1 and "status" in ('CANCELED','BROKEN','NO_SHOW')
       union all
       select 'medical_alerts' as key, count(*)::int as value
       from "PmsMedicalAlert" ma join "PmsPatient" p on p."id" = ma."patientId" where p."tenantId" = $1 and ma."active" = true
       union all
       select 'pre_med_alerts' as key, count(*)::int as value
       from "PmsMedicalAlert" ma join "PmsPatient" p on p."id" = ma."patientId"
       where p."tenantId" = $1 and ma."active" = true and (ma."title" ilike '%pre%med%' or ma."details" ilike '%pre%med%' or ma."title" ilike '%antibiotic%' or ma."details" ilike '%antibiotic%')
       union all
       select 'approved_no_send' as key, count(*)::int as value
       from "PatientEngagementEvent" where "tenantId" = $1 and "status" = 'APPROVED_TO_SEND'`,
      [tenantId],
    ),
    listPatients(tenantId),
    safeEngagementRows("Appointment lifecycle", query(
      `select a."id", a."patientId", a."appointmentType", a."startsAt", a."status", a."readinessStatus", p."firstName", p."lastName", p."chartNumber",
        cp."consentStatus", cp."quietHoursStart", cp."quietHoursEnd",
        coalesce(forms."openForms", 0)::int as "openForms",
        coalesce(reminders."reminderCount", 0)::int as "reminderCount",
        coalesce(medical."medicalAlertCount", 0)::int as "medicalAlertCount",
        coalesce(medical."preMedAlertCount", 0)::int as "preMedAlertCount",
        coalesce(medical."allergyCount", 0)::int as "allergyCount",
        coalesce(medical."medicationCount", 0)::int as "medicationCount"
       from "PmsAppointment" a
       join "PmsPatient" p on p."id" = a."patientId"
       left join lateral (
        select pref."consentStatus", pref."quietHoursStart", pref."quietHoursEnd"
        from "PmsPatientCommunicationPreference" pref
        where pref."patientId" = p."id" and pref."channel" in ('SMS','EMAIL')
        order by case pref."consentStatus" when 'OPTED_IN' then 0 when 'UNKNOWN' then 1 else 2 end, pref."priority"
        limit 1
       ) cp on true
       left join (
        select "patientId", count(*) as "openForms"
        from "PmsFormAssignment"
        where "tenantId" = $1 and "status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')
        group by "patientId"
       ) forms on forms."patientId" = p."id"
       left join (
        select "appointmentId", count(*) as "reminderCount"
        from "PatientEngagementEvent"
        where "tenantId" = $1 and "eventType" in ('APPOINTMENT_CONFIRMATION','APPOINTMENT_REMINDER','FORMS_REMINDER')
        group by "appointmentId"
       ) reminders on reminders."appointmentId" = a."id"
       left join lateral (
        select
          (select count(*) from "PmsMedicalAlert" ma where ma."patientId" = p."id" and ma."active" = true)::int as "medicalAlertCount",
          (select count(*) from "PmsMedicalAlert" ma where ma."patientId" = p."id" and ma."active" = true and (ma."title" ilike '%pre%med%' or ma."details" ilike '%pre%med%' or ma."title" ilike '%antibiotic%' or ma."details" ilike '%antibiotic%'))::int as "preMedAlertCount",
          (select count(*) from "PmsAllergy" al where al."patientId" = p."id" and al."active" = true)::int as "allergyCount",
          (select count(*) from "PmsMedication" med where med."patientId" = p."id" and med."status" = 'ACTIVE')::int as "medicationCount"
       ) medical on true
       where a."tenantId" = $1 and a."startsAt" >= current_date - interval '1 day' and a."startsAt" < current_date + interval '14 days'
       order by a."startsAt" asc
       limit 12`,
      [tenantId],
    )),
    safeEngagementRows("Booking request lifecycle", query(
      `select ar.*, p."firstName", p."lastName", p."chartNumber",
        cp."consentStatus", cp."quietHoursStart", cp."quietHoursEnd",
        coalesce(existing."stagedCount", 0)::int as "stagedCount"
       from "PmsAppointmentRequest" ar
       left join "PmsPatient" p on p."id" = ar."patientId"
       left join lateral (
        select pref."consentStatus", pref."quietHoursStart", pref."quietHoursEnd"
        from "PmsPatientCommunicationPreference" pref
        where pref."patientId" = p."id" and pref."channel" in ('SMS','EMAIL','PHONE')
        order by case pref."consentStatus" when 'OPTED_IN' then 0 when 'VERIFIED' then 0 when 'UNKNOWN' then 1 else 2 end, pref."priority"
        limit 1
       ) cp on true
       left join (
        select "patientId", count(*) as "stagedCount"
        from "PatientEngagementEvent"
        where "tenantId" = $1 and "eventType" in ('BOOKING_REQUEST_RESPONSE','APPOINTMENT_CONFIRMATION')
        group by "patientId"
       ) existing on existing."patientId" = ar."patientId"
       where ar."tenantId" = $1 and ar."status" = 'OPEN'
       order by case ar."urgency" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, ar."createdAt" asc
       limit 10`,
      [tenantId],
    )),
    safeEngagementRows("Forms and intake packets", query(
      `select fa."id", fa."patientId", fa."appointmentId", fa."status", fa."dueAt", ft."name" as "templateName", ft."formType",
        p."firstName", p."lastName", p."chartNumber", a."appointmentType", a."startsAt",
        cp."consentStatus", cp."quietHoursStart", cp."quietHoursEnd",
        coalesce(events."stagedCount", 0)::int as "stagedCount"
       from "PmsFormAssignment" fa
       join "PmsPatient" p on p."id" = fa."patientId"
       left join "PmsFormTemplate" ft on ft."id" = fa."templateId"
       left join "PmsAppointment" a on a."id" = fa."appointmentId"
       left join lateral (
        select pref."consentStatus", pref."quietHoursStart", pref."quietHoursEnd"
        from "PmsPatientCommunicationPreference" pref
        where pref."patientId" = p."id" and pref."channel" in ('SMS','EMAIL','PORTAL')
        order by case pref."consentStatus" when 'OPTED_IN' then 0 when 'VERIFIED' then 0 when 'UNKNOWN' then 1 else 2 end, pref."priority"
        limit 1
       ) cp on true
       left join (
        select "patientId", "appointmentId", count(*) as "stagedCount"
        from "PatientEngagementEvent"
        where "tenantId" = $1 and "eventType" in ('FORMS_REMINDER','INTAKE_PACKET_REMINDER','CONSENT_REVIEW')
        group by "patientId", "appointmentId"
       ) events on events."patientId" = fa."patientId" and coalesce(events."appointmentId", '') = coalesce(fa."appointmentId", '')
       where fa."tenantId" = $1 and fa."status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')
       order by fa."dueAt" asc nulls first, fa."updatedAt" desc
       limit 12`,
      [tenantId],
    )),
    safeEngagementRows("Recall queue", query(
      `select r.*, p."firstName", p."lastName", p."chartNumber", cp."consentStatus", cp."quietHoursStart", cp."quietHoursEnd"
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       left join lateral (
        select pref."consentStatus", pref."quietHoursStart", pref."quietHoursEnd"
        from "PmsPatientCommunicationPreference" pref
        where pref."patientId" = p."id" and pref."channel" in ('SMS','EMAIL')
        order by case pref."consentStatus" when 'OPTED_IN' then 0 when 'UNKNOWN' then 1 else 2 end, pref."priority"
        limit 1
       ) cp on true
       where r."tenantId" = $1 and r."status" in ('DUE','OVERDUE')
       order by r."dueDate" asc
       limit 10`,
      [tenantId],
    )),
    safeEngagementRows("Broken appointment recovery", query(
      `select a."id", a."patientId", a."appointmentType", a."startsAt", a."status", p."firstName", p."lastName", p."chartNumber"
       from "PmsAppointment" a
       join "PmsPatient" p on p."id" = a."patientId"
       where a."tenantId" = $1 and a."status" in ('CANCELED','BROKEN','NO_SHOW')
        and not exists (
          select 1 from "PmsAppointment" future
          where future."patientId" = a."patientId" and future."startsAt" > a."startsAt" and future."status" not in ('CANCELED','NO_SHOW','BROKEN')
        )
       order by a."startsAt" desc
       limit 10`,
      [tenantId],
    )),
    safeEngagementRows("Waitlist and ASAP fill", query(
      `select ar.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsAppointmentRequest" ar
       left join "PmsPatient" p on p."id" = ar."patientId"
       where ar."tenantId" = $1 and ar."status" = 'OPEN'
       order by case ar."urgency" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, ar."createdAt" asc
       limit 10`,
      [tenantId],
    )),
    safeEngagementRows("Post-op follow-up", query(
      `select pl."id", pl."patientId", pl."appointmentId", pl."serviceDate", pl."status",
        p."firstName", p."lastName", p."chartNumber", pc."code", pc."description",
        coalesce(events."postOpCount", 0)::int as "postOpCount"
       from "PmsProcedureLog" pl
       join "PmsPatient" p on p."id" = pl."patientId"
       join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       left join (
        select "procedureLogId", count(*) as "postOpCount"
        from "PatientEngagementEvent"
        where "tenantId" = $1 and "eventType" = 'POST_OP_INSTRUCTIONS'
        group by "procedureLogId"
       ) events on events."procedureLogId" = pl."id"
       where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pl."serviceDate" >= current_date - interval '14 days'
       order by pl."serviceDate" desc
       limit 10`,
      [tenantId],
    )),
    safeEngagementRows("Medical and pre-med safety", query(
      `select ma."id", ma."patientId", ma."severity", ma."title", ma."details", p."firstName", p."lastName", p."chartNumber",
        next_appt."id" as "appointmentId", next_appt."appointmentType", next_appt."startsAt",
        coalesce(events."stagedCount", 0)::int as "stagedCount"
       from "PmsMedicalAlert" ma
       join "PmsPatient" p on p."id" = ma."patientId"
       left join lateral (
        select a."id", a."appointmentType", a."startsAt"
        from "PmsAppointment" a
        where a."tenantId" = $1 and a."patientId" = p."id" and a."startsAt" >= current_timestamp and a."startsAt" < current_timestamp + interval '30 days'
        order by a."startsAt" asc
        limit 1
       ) next_appt on true
       left join (
        select "patientId", count(*) as "stagedCount"
        from "PatientEngagementEvent"
        where "tenantId" = $1 and "eventType" in ('MEDICAL_ALERT_REVIEW','PRE_MED_ALERT_REVIEW')
        group by "patientId"
       ) events on events."patientId" = p."id"
       where p."tenantId" = $1 and ma."active" = true
       order by case ma."severity" when 'HIGH' then 0 when 'CRITICAL' then 0 when 'NORMAL' then 1 else 2 end, next_appt."startsAt" asc nulls last
       limit 10`,
      [tenantId],
    )),
    safeEngagementRows("Cross-module PMS tasks", query(
      `select t.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsTask" t
       left join "PmsPatient" p on p."id" = t."patientId"
       where t."tenantId" = $1 and t."status" = 'OPEN'
        and t."taskType" in ('PATIENT_ENGAGEMENT_REVIEW','POST_OP_FOLLOW_UP','SCHEDULE_RECOVERY','BROKEN_APPOINTMENT_RECOVERY','BOOKING_REQUEST_FOLLOW_UP','MEDICAL_PREMED_REVIEW','FORMS_CONSENT_REVIEW','REPUTATION_RECOVERY','PATIENT_FINANCIAL_FOLLOW_UP')
       order by case t."priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, t."dueAt" asc nulls last, t."createdAt" desc
       limit 12`,
      [tenantId],
    )),
    Promise.resolve([
      { area: "Booking request", control: "Booking requests stage internal front-desk follow-up from PMS appointment-request records; no appointment writeback is claimed here.", status: "LIVE_PMS" },
      { area: "Consent", control: "SMS/email/portal outreach checks patient communication preferences and status before approval.", status: "LIVE_GATED" },
      { area: "Quiet hours", control: "Quiet-hour windows are checked before queue approval; approval is still queue-only and does not send.", status: "LIVE_GATED" },
      { area: "Forms and intake packets", control: "Open form assignments, consent packets, and intake due dates are linked before appointment reminders or check-in nudges.", status: "LIVE_PMS" },
      { area: "Medical and pre-med alerts", control: "Active medical alerts, allergies, medications, and pre-med flags create clinical review work before patient-facing reminders or post-op instructions.", status: "LIVE_GATED" },
      { area: "Recall and waitlist", control: "Due recalls, ASAP requests, and broken visits become front-desk scheduling tasks.", status: "LIVE_PMS" },
      { area: "Post-op and reputation", control: "Completed procedures can create clinical post-op work; poor experience blocks public review asks.", status: "LIVE_PMS" },
    ]),
  ]);

  return {
    events: events.rows,
    recoveryCases: recoveryCases.rows,
    sourceSignals: sourceSignals.rows,
    patients,
    lifecycle: lifecycle.rows,
    bookingRequests: bookingRequests.rows,
    formPackets: formPackets.rows,
    recallQueue: recallQueue.rows,
    brokenAppointments: brokenAppointments.rows,
    waitlist: waitlist.rows,
    postOpQueue: postOpQueue.rows,
    medicalAlerts: medicalAlerts.rows,
    crossModuleTasks: crossModuleTasks.rows,
    governance: [
      ...governance,
      ...[lifecycle, bookingRequests, formPackets, recallQueue, brokenAppointments, waitlist, postOpQueue, medicalAlerts, crossModuleTasks]
        .map((lane) => "readinessError" in lane ? lane.readinessError : null)
        .filter(Boolean),
    ],
  };
}

export async function stageEngagementEvent(input: {
  tenantId?: string;
  patientId: string;
  appointmentId?: string;
  procedureLogId?: string;
  sourceModule: string;
  eventType: string;
  channel: string;
  triggerReason: string;
  messageBody: string;
  scheduledFor?: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("eng");
  const workflow = classifyEngagementWork(input.eventType.trim());
  const result = await query(
    `insert into "PatientEngagementEvent"
       ("id", "tenantId", "patientId", "appointmentId", "procedureLogId", "sourceModule", "eventType", "channel", "status", "triggerReason", "messageBody", "approvalStatus", "scheduledFor", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'NEEDS_REVIEW', $9, $10, 'NEEDS_REVIEW', $11::timestamp, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.appointmentId?.trim() || null,
      input.procedureLogId?.trim() || null,
      input.sourceModule.trim(),
      input.eventType.trim(),
      input.channel.trim(),
      input.triggerReason.trim(),
      input.messageBody.trim(),
      input.scheduledFor || null,
    ],
  );
  await addAudit(tenantId, input.actorRole ?? "marketing_growth", "ENGAGEMENT_EVENT_STAGED", "PatientEngagementEvent", id, "ALLOWED");
  await createTask({
    tenantId,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    ownerRoleKey: workflow.ownerRoleKey,
    title: `${input.eventType.trim().replaceAll("_", " ")} approval and PMS handoff`,
    taskType: workflow.taskType,
    priority: workflow.priority,
    dueAt: input.scheduledFor,
  });
  return result.rows[0];
}

export async function updateEngagementEventStatus(input: {
  tenantId?: string;
  eventId: string;
  status: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const gate = input.status === "APPROVED_TO_SEND" ? await evaluateEngagementApprovalGate(tenantId, input.eventId) : { status: input.status, blockedReason: null };
  const appliedStatus = gate.status;
  const approvalStatus = appliedStatus === "APPROVED_TO_SEND" ? "APPROVED" : appliedStatus.startsWith("BLOCKED") ? "BLOCKED" : "NEEDS_REVIEW";
  const result = await query(
    `update "PatientEngagementEvent"
     set "status" = $1,
       "approvalStatus" = $2,
       "triggerReason" = case when $5::text is null then "triggerReason" else "triggerReason" || ' Gate: ' || $5::text end,
       "completedAt" = case when $1 = 'COMPLETED' then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "tenantId" = $3 and "id" = $4
     returning *`,
    [appliedStatus, approvalStatus, tenantId, input.eventId, gate.blockedReason],
  );
  await addAudit(tenantId, input.actorRole ?? "marketing_growth", "ENGAGEMENT_EVENT_STATUS_UPDATED", "PatientEngagementEvent", input.eventId, result.rowCount && !appliedStatus.startsWith("BLOCKED") ? "ALLOWED" : "BLOCKED");
  return result.rows[0] ?? null;
}

async function evaluateEngagementApprovalGate(tenantId: string, eventId: string) {
  const row = (await query<{
    id: string;
    patientId: string;
    appointmentId: string | null;
    eventType: string;
    channel: string;
    scheduledFor: string | null;
    consentStatus: string | null;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    openForms: string;
    openRecovery: string;
    medicalAlertCount: string;
    preMedAlertCount: string;
  }>(
    `select e."id", e."patientId", e."appointmentId", e."eventType", e."channel", e."scheduledFor",
      pref."consentStatus", pref."quietHoursStart", pref."quietHoursEnd",
      (select count(*)::text from "PmsFormAssignment" fa where fa."tenantId" = $1 and fa."patientId" = e."patientId" and (e."appointmentId" is null or fa."appointmentId" = e."appointmentId") and fa."status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')) as "openForms",
      (select count(*)::text from "ReputationRecoveryCase" rc where rc."tenantId" = $1 and rc."patientId" = e."patientId" and rc."status" not in ('RESOLVED','COMPLETED','CLOSED')) as "openRecovery",
      (select count(*)::text from "PmsMedicalAlert" ma where ma."patientId" = e."patientId" and ma."active" = true) as "medicalAlertCount",
      (select count(*)::text from "PmsMedicalAlert" ma where ma."patientId" = e."patientId" and ma."active" = true and (ma."title" ilike '%pre%med%' or ma."details" ilike '%pre%med%' or ma."title" ilike '%antibiotic%' or ma."details" ilike '%antibiotic%')) as "preMedAlertCount"
     from "PatientEngagementEvent" e
     left join lateral (
      select pcp."consentStatus", pcp."quietHoursStart", pcp."quietHoursEnd"
      from "PmsPatientCommunicationPreference" pcp
      where pcp."patientId" = e."patientId" and pcp."channel" = e."channel"
      order by pcp."priority", pcp."updatedAt" desc
      limit 1
     ) pref on true
     where e."tenantId" = $1 and e."id" = $2`,
    [tenantId, eventId],
  )).rows[0];
  if (!row) return { status: "BLOCKED_NOT_FOUND", blockedReason: "Engagement event was not found for this tenant." };

  const eventType = row.eventType.toUpperCase();
  if (!isVerifiedEngagementConsent(row.consentStatus)) {
    return { status: "BLOCKED_CONSENT", blockedReason: "Patient channel consent is not verified for this engagement item." };
  }
  if (isWithinQuietHours(row.scheduledFor, row.quietHoursStart, row.quietHoursEnd)) {
    return { status: "BLOCKED_QUIET_HOURS", blockedReason: "Scheduled time falls inside the patient's quiet-hour window." };
  }
  if ((eventType.includes("REVIEW") || eventType.includes("REPUTATION")) && Number(row.openRecovery) > 0) {
    return { status: "BLOCKED_SERVICE_RECOVERY", blockedReason: "Open service recovery must close before any review or reputation ask is approved." };
  }
  if (["APPOINTMENT_CONFIRMATION", "APPOINTMENT_REMINDER", "POST_OP_INSTRUCTIONS"].includes(eventType) && Number(row.preMedAlertCount) > 0) {
    return { status: "BLOCKED_PRE_MED_REVIEW", blockedReason: "Pre-medication alert requires clinical review before patient-facing appointment or post-op communication." };
  }
  if (["APPOINTMENT_CONFIRMATION", "APPOINTMENT_REMINDER", "POST_OP_INSTRUCTIONS"].includes(eventType) && Number(row.medicalAlertCount) > 0) {
    return { status: "BLOCKED_MEDICAL_REVIEW", blockedReason: "Active medical alert requires staff review before this patient-facing communication is queued." };
  }
  if (eventType === "APPOINTMENT_CONFIRMATION" && Number(row.openForms) > 0) {
    return { status: "BLOCKED_FORMS_INTAKE", blockedReason: "Open intake forms should be resolved or paired with a forms reminder before confirmation is queued." };
  }
  return { status: "APPROVED_TO_SEND", blockedReason: null };
}

function isVerifiedEngagementConsent(status: string | null) {
  return ["VERIFIED", "CONSENTED", "OPTED_IN", "ACTIVE"].includes(String(status ?? "").toUpperCase());
}

function isWithinQuietHours(scheduledFor: string | null, quietStart: string | null, quietEnd: string | null) {
  if (!scheduledFor || !quietStart || !quietEnd) return false;
  const date = new Date(scheduledFor);
  if (Number.isNaN(date.getTime())) return false;
  const current = date.getHours() * 60 + date.getMinutes();
  const [startHour, startMinute] = quietStart.split(":").map((part) => Number(part));
  const [endHour, endMinute] = quietEnd.split(":").map((part) => Number(part));
  if ([startHour, startMinute, endHour, endMinute].some((part) => Number.isNaN(part))) return false;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

export async function createReputationRecoveryCase(input: {
  tenantId?: string;
  patientId: string;
  appointmentId?: string;
  sourceEventId?: string;
  sentiment: string;
  reason: string;
  recoveryNote?: string;
  ownerRoleKey?: string;
  dueAt?: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("rep");
  const ownerRoleKey = input.ownerRoleKey ?? "practice_manager";
  const result = await query(
    `insert into "ReputationRecoveryCase"
       ("id", "tenantId", "patientId", "appointmentId", "sourceEventId", "sentiment", "status", "ownerRoleKey", "reason", "recoveryNote", "reviewRequestBlocked", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'OPEN', $7, $8, $9, true, $10::timestamp, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.appointmentId?.trim() || null,
      input.sourceEventId?.trim() || null,
      input.sentiment.trim(),
      ownerRoleKey,
      input.reason.trim(),
      input.recoveryNote?.trim() || null,
      input.dueAt || null,
    ],
  );
  await createTask({
    tenantId,
    patientId: input.patientId,
    ownerRoleKey,
    title: "Resolve service recovery before public review request",
    taskType: "REPUTATION_RECOVERY",
    priority: "HIGH",
    dueAt: input.dueAt,
  });
  await addAudit(tenantId, input.actorRole ?? "practice_manager", "REPUTATION_RECOVERY_CREATED", "ReputationRecoveryCase", id, "ALLOWED");
  return result.rows[0];
}

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string, outcome: string) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome")
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome],
  );
}
