import crypto from "node:crypto";
import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

export type PatientMapFilters = {
  service: string;
  insurance: string;
  ageBand: string;
  gender: string;
  provider: string;
  referralSource: string;
  valueBand: string;
  mapMode: string;
  highValueOnly: boolean;
  membershipOnly: boolean;
};

export type PatientMapPoint = {
  id: string;
  familyAccountId: string;
  label: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  patientCount: number;
  familyMemberCount: number;
  productionCents: number;
  treatmentCents: number;
  highValuePatientCount: number;
  membershipSignalCount: number;
  serviceLines: string[];
  payerNames: string[];
  providerNames: string[];
  referralSources: string[];
  ageBands: string[];
  genderSegments: string[];
  samplePatients: string[];
  opportunityScore: number;
};

export type PatientMapAnalytics = {
  points: PatientMapPoint[];
  zipAnalytics: PatientMapBreakdownRow[];
  serviceAnalytics: PatientMapBreakdownRow[];
  payerAnalytics: PatientMapBreakdownRow[];
  referralAnalytics: PatientMapBreakdownRow[];
  savedSegments: PatientMapSavedSegment[];
  filters: {
    services: string[];
    insurances: string[];
    ageBands: string[];
    genders: string[];
    providers: string[];
    referralSources: string[];
    valueBands: string[];
  };
  stats: {
    mappedFamilies: number;
    mappedPatients: number;
    unmappedFamilies: number;
    highValuePatients: number;
    membershipSignals: number;
    productionCents: number;
    treatmentCents: number;
  };
  geocoding: {
    enabled: boolean;
    attempted: number;
    updated: number;
    failed: number;
    missingAddressCount: number;
  };
};

export type PatientMapBreakdownRow = {
  label: string;
  mappedFamilies: number;
  mappedPatients: number;
  productionCents: number;
  treatmentCents: number;
  highValuePatients: number;
  membershipSignals: number;
};

export type PatientMapSavedSegment = {
  id: string;
  segmentName: string;
  description: string | null;
  filters: PatientMapFilters;
  lastRunAt: string | null;
  lastPatientCount: number;
  lastValueCents: number;
};

type FamilyAddressRow = {
  id: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  addressHash: string | null;
};

type GeocodeResult = {
  ok: boolean;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  precision?: string;
  failureReason?: string;
};

const AGE_BANDS = ["0-17", "18-34", "35-49", "50-64", "65+", "Unknown"];

export function parsePatientMapFilters(input: Record<string, string | string[] | undefined>): PatientMapFilters {
  return {
    service: cleanFilter(input.service, "all"),
    insurance: cleanFilter(input.insurance, "all"),
    ageBand: cleanFilter(input.ageBand, "all"),
    gender: cleanFilter(input.gender, "all"),
    provider: cleanFilter(input.provider, "all"),
    referralSource: cleanFilter(input.referralSource, "all"),
    valueBand: cleanFilter(input.valueBand, "all"),
    mapMode: cleanFilter(input.mapMode, "markers"),
    highValueOnly: cleanFilter(input.highValue, "false") === "true",
    membershipOnly: cleanFilter(input.membership, "false") === "true",
  };
}

export async function getPatientMapAnalytics(tenantId = defaultTenantId, filters: PatientMapFilters): Promise<PatientMapAnalytics> {
  const geocoding = await geocodeMissingFamilyAccounts(tenantId);
  const [points, filterValues, stats, missingAddress, zipAnalytics, serviceAnalytics, payerAnalytics, referralAnalytics, savedSegments] = await Promise.all([
    queryPatientMapPoints(tenantId, filters),
    queryPatientMapFilterValues(tenantId),
    queryPatientMapStats(tenantId),
    query<{ count: string }>(
      `select count(*)::text
       from "PmsFamilyAccount" fa
       where fa."tenantId" = $1
         and exists (select 1 from "PmsPatient" p where p."familyAccountId" = fa."id" and p."tenantId" = fa."tenantId" and p."status" = 'ACTIVE')
         and nullif(trim(concat_ws(' ', fa."addressLine1", fa."city", fa."state", fa."postalCode")), '') is null`,
      [tenantId],
    ),
    queryPatientMapBreakdown(tenantId, filters, "zip"),
    queryPatientMapBreakdown(tenantId, filters, "service"),
    queryPatientMapBreakdown(tenantId, filters, "payer"),
    queryPatientMapBreakdown(tenantId, filters, "referral"),
    queryPatientMapSavedSegments(tenantId),
  ]);

  return {
    points,
    zipAnalytics,
    serviceAnalytics,
    payerAnalytics,
    referralAnalytics,
    savedSegments,
    filters: filterValues,
    stats: {
      mappedFamilies: Number(stats.rows[0]?.mappedFamilies ?? 0),
      mappedPatients: Number(stats.rows[0]?.mappedPatients ?? 0),
      unmappedFamilies: Number(stats.rows[0]?.unmappedFamilies ?? 0),
      highValuePatients: Number(stats.rows[0]?.highValuePatients ?? 0),
      membershipSignals: Number(stats.rows[0]?.membershipSignals ?? 0),
      productionCents: Number(stats.rows[0]?.productionCents ?? 0),
      treatmentCents: Number(stats.rows[0]?.treatmentCents ?? 0),
    },
    geocoding: {
      ...geocoding,
      missingAddressCount: Number(missingAddress.rows[0]?.count ?? 0),
    },
  };
}

export async function createPatientMapSavedSegment(input: {
  tenantId?: string;
  actorRole?: string;
  segmentName: string;
  description?: string;
  filters: PatientMapFilters;
  mappedPatients?: number;
  valueCents?: number;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const result = await query(
    `insert into "PmsPatientMapSavedSegment"
       ("id", "tenantId", "segmentName", "filters", "description", "createdByRole", "lastRunAt", "lastPatientCount", "lastValueCents", "updatedAt")
     values ($1, $2, $3, $4::jsonb, $5, $6, current_timestamp, $7, $8, current_timestamp)
     on conflict ("tenantId", "segmentName") do update set
       "filters" = excluded."filters",
       "description" = excluded."description",
       "lastRunAt" = current_timestamp,
       "lastPatientCount" = excluded."lastPatientCount",
       "lastValueCents" = excluded."lastValueCents",
       "status" = 'ACTIVE',
       "updatedAt" = current_timestamp
     returning *`,
    [
      newId("map_segment"),
      tenantId,
      input.segmentName.trim(),
      JSON.stringify(input.filters),
      input.description?.trim() || null,
      input.actorRole ?? "practice_manager",
      input.mappedPatients ?? 0,
      input.valueCents ?? 0,
    ],
  );
  await addPatientMapAudit(tenantId, input.actorRole ?? "practice_manager", "PATIENT_MAP_SEGMENT_SAVED", result.rows[0]?.id, { segmentName: input.segmentName, filters: input.filters });
  return result.rows[0];
}

export async function createPatientMapReportSnapshot(input: {
  tenantId?: string;
  actorRole?: string;
  reportName: string;
  segmentId?: string;
  filters: PatientMapFilters;
  analytics: PatientMapAnalytics;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const result = await query(
    `insert into "PmsPatientMapReportSnapshot"
       ("id", "tenantId", "segmentId", "reportName", "filters", "mappedFamilies", "mappedPatients", "productionCents", "treatmentCents", "payload", "createdByRole")
     values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10::jsonb, $11)
     returning *`,
    [
      newId("map_report"),
      tenantId,
      input.segmentId || null,
      input.reportName.trim(),
      JSON.stringify(input.filters),
      input.analytics.stats.mappedFamilies,
      input.analytics.stats.mappedPatients,
      input.analytics.stats.productionCents,
      input.analytics.stats.treatmentCents,
      JSON.stringify({
        zipAnalytics: input.analytics.zipAnalytics,
        serviceAnalytics: input.analytics.serviceAnalytics,
        payerAnalytics: input.analytics.payerAnalytics,
        referralAnalytics: input.analytics.referralAnalytics,
        pointCount: input.analytics.points.length,
      }),
      input.actorRole ?? "practice_manager",
    ],
  );
  await addPatientMapAudit(tenantId, input.actorRole ?? "practice_manager", "PATIENT_MAP_REPORT_SNAPSHOT_CREATED", result.rows[0]?.id, { reportName: input.reportName });
  return result.rows[0];
}

async function queryPatientMapPoints(tenantId: string, filters: PatientMapFilters) {
  const result = await query<{
    familyAccountId: string;
    label: string;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    latitude: string;
    longitude: string;
    patientCount: string;
    familyMemberCount: string;
    productionCents: string;
    treatmentCents: string;
    highValuePatientCount: string;
    membershipSignalCount: string;
    serviceLines: string[];
    payerNames: string[];
    providerNames: string[];
    referralSources: string[];
    ageBands: string[];
    genderSegments: string[];
    samplePatients: string[];
  }>(
    `
      with patient_features as (
        select
          p."id",
          p."familyAccountId",
          p."firstName",
          p."lastName",
          coalesce(nullif(p."referralSource", ''), 'Unknown') as "referralSource",
          coalesce(nullif(p."genderIdentity", ''), nullif(p."sex", ''), 'Unknown') as gender,
          case
            when p."dateOfBirth" is null then 'Unknown'
            when date_part('year', age(current_date, p."dateOfBirth")) < 18 then '0-17'
            when date_part('year', age(current_date, p."dateOfBirth")) < 35 then '18-34'
            when date_part('year', age(current_date, p."dateOfBirth")) < 50 then '35-49'
            when date_part('year', age(current_date, p."dateOfBirth")) < 65 then '50-64'
            else '65+'
          end as "ageBand",
          coalesce(appt."productionCents", 0) + coalesce(proc."productionCents", 0) as "productionCents",
          coalesce(tx."treatmentCents", 0) as "treatmentCents",
          coalesce(appt."serviceLines", array[]::text[]) || coalesce(proc."serviceLines", array[]::text[]) || coalesce(tx."serviceLines", array[]::text[]) as "serviceLines",
          coalesce(ins."payerNames", array[]::text[]) as "payerNames",
          coalesce(prov."providerNames", array[]::text[]) as "providerNames",
          (
            coalesce(appt."productionCents", 0) + coalesce(proc."productionCents", 0) + coalesce(tx."treatmentCents", 0) >= 100000
            or exists (
              select 1
              from unnest(coalesce(appt."serviceLines", array[]::text[]) || coalesce(proc."serviceLines", array[]::text[]) || coalesce(tx."serviceLines", array[]::text[])) service
              where service ~* 'implant|ortho|prostho|oral surgery|restorative|endodontic'
            )
          ) as "isHighValue",
          (
            coalesce(fa."billingType", '') ~* 'member|membership|practice plan'
            or coalesce(fa."financialNote", '') ~* 'member|membership|practice plan|in-house plan'
            or coalesce(p."patientNote", '') ~* 'member|membership|practice plan|in-house plan'
          ) as "membershipSignal"
        from "PmsPatient" p
        join "PmsFamilyAccount" fa on fa."id" = p."familyAccountId" and fa."tenantId" = p."tenantId"
        left join lateral (
          select coalesce(sum(a."productionCents"), 0)::int as "productionCents",
                 array_remove(array_agg(distinct nullif(a."appointmentType", '')), null) as "serviceLines"
          from "PmsAppointment" a
          where a."patientId" = p."id" and a."tenantId" = p."tenantId"
        ) appt on true
        left join lateral (
          select coalesce(sum(pl."feeCents"), 0)::int as "productionCents",
                 array_remove(array_agg(distinct nullif(pc."category", '')), null) as "serviceLines"
          from "PmsProcedureLog" pl
          join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
          where pl."patientId" = p."id" and coalesce(pl."tenantId", p."tenantId") = p."tenantId"
        ) proc on true
        left join lateral (
          select coalesce(sum(tpi."feeCents"), 0)::int as "treatmentCents",
                 array_remove(array_agg(distinct nullif(pc."category", '')), null) as "serviceLines"
          from "PmsTreatmentPlan" tp
          join "PmsTreatmentPlanItem" tpi on tpi."treatmentPlanId" = tp."id"
          join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
          where tp."patientId" = p."id" and tp."tenantId" = p."tenantId"
        ) tx on true
        left join lateral (
          select array_remove(array_agg(distinct nullif(ip."payerName", '')), null) as "payerNames"
          from "PmsPatientInsurance" pi
          join "PmsInsurancePlan" ip on ip."id" = pi."planId" and ip."tenantId" = pi."tenantId"
          where pi."patientId" = p."id" and pi."tenantId" = p."tenantId"
        ) ins on true
        left join lateral (
          select array_remove(array_agg(distinct nullif(provider."displayName", '')), null) as "providerNames"
          from (
            select a."providerId" from "PmsAppointment" a where a."patientId" = p."id" and a."tenantId" = p."tenantId" and a."providerId" is not null
            union
            select pl."providerId" from "PmsProcedureLog" pl where pl."patientId" = p."id" and coalesce(pl."tenantId", p."tenantId") = p."tenantId" and pl."providerId" is not null
          ) provider_ref
          join "PmsProvider" provider on provider."id" = provider_ref."providerId" and provider."tenantId" = p."tenantId"
        ) prov on true
        where p."tenantId" = $1 and p."status" = 'ACTIVE' and p."familyAccountId" is not null
      ), filtered as (
        select *
        from patient_features pf
        where ($2 = 'all' or exists (select 1 from unnest(pf."serviceLines") service where lower(service) = lower($2)))
          and ($3 = 'all' or exists (select 1 from unnest(pf."payerNames") payer where lower(payer) = lower($3)))
          and ($4 = 'all' or pf."ageBand" = $4)
          and ($5 = 'all' or lower(pf.gender) = lower($5))
          and ($6 = 'all' or exists (select 1 from unnest(pf."providerNames") provider where lower(provider) = lower($6)))
          and ($7 = 'all' or lower(pf."referralSource") = lower($7))
          and ($8 = 'all'
            or ($8 = 'under_1k' and pf."productionCents" + pf."treatmentCents" < 100000)
            or ($8 = '1k_5k' and pf."productionCents" + pf."treatmentCents" >= 100000 and pf."productionCents" + pf."treatmentCents" < 500000)
            or ($8 = '5k_10k' and pf."productionCents" + pf."treatmentCents" >= 500000 and pf."productionCents" + pf."treatmentCents" < 1000000)
            or ($8 = '10k_plus' and pf."productionCents" + pf."treatmentCents" >= 1000000)
          )
          and ($9::boolean = false or pf."isHighValue")
          and ($10::boolean = false or pf."membershipSignal")
      )
      select
        fa."id" as "familyAccountId",
        fa."displayName" as label,
        fa."city",
        fa."state",
        fa."postalCode",
        geo."latitude"::text as latitude,
        geo."longitude"::text as longitude,
        count(filtered."id")::text as "patientCount",
        (select count(*) from "PmsPatient" member where member."tenantId" = fa."tenantId" and member."familyAccountId" = fa."id" and member."status" = 'ACTIVE')::text as "familyMemberCount",
        coalesce(sum(filtered."productionCents"), 0)::text as "productionCents",
        coalesce(sum(filtered."treatmentCents"), 0)::text as "treatmentCents",
        count(*) filter (where filtered."isHighValue")::text as "highValuePatientCount",
        count(*) filter (where filtered."membershipSignal")::text as "membershipSignalCount",
        coalesce((select array_agg(distinct service order by service) from filtered f2, unnest(f2."serviceLines") service where f2."familyAccountId" = fa."id"), array[]::text[]) as "serviceLines",
        coalesce((select array_agg(distinct payer order by payer) from filtered f3, unnest(f3."payerNames") payer where f3."familyAccountId" = fa."id"), array[]::text[]) as "payerNames",
        coalesce((select array_agg(distinct provider order by provider) from filtered f4, unnest(f4."providerNames") provider where f4."familyAccountId" = fa."id"), array[]::text[]) as "providerNames",
        coalesce(array_agg(distinct filtered."referralSource") filter (where filtered."referralSource" is not null), array[]::text[]) as "referralSources",
        coalesce(array_agg(distinct filtered."ageBand") filter (where filtered."ageBand" is not null), array[]::text[]) as "ageBands",
        coalesce(array_agg(distinct filtered.gender) filter (where filtered.gender is not null), array[]::text[]) as "genderSegments",
        coalesce((array_agg(filtered."firstName" || ' ' || filtered."lastName" order by filtered."lastName", filtered."firstName"))[1:4], array[]::text[]) as "samplePatients"
      from filtered
      join "PmsFamilyAccount" fa on fa."id" = filtered."familyAccountId"
      join "PmsPatientGeoCoordinate" geo on geo."tenantId" = fa."tenantId" and geo."familyAccountId" = fa."id" and geo."status" = 'GEOCODED'
      where geo."latitude" is not null and geo."longitude" is not null
      group by fa."id", fa."tenantId", fa."displayName", fa."city", fa."state", fa."postalCode", geo."latitude", geo."longitude"
      order by (coalesce(sum(filtered."productionCents"), 0) + coalesce(sum(filtered."treatmentCents"), 0)) desc, count(filtered."id") desc
      limit 500
    `,
    [tenantId, filters.service, filters.insurance, filters.ageBand, filters.gender, filters.provider, filters.referralSource, filters.valueBand, filters.highValueOnly, filters.membershipOnly],
  );

  return result.rows.map((row) => ({
    id: row.familyAccountId,
    familyAccountId: row.familyAccountId,
    label: row.label,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    patientCount: Number(row.patientCount),
    familyMemberCount: Number(row.familyMemberCount),
    productionCents: Number(row.productionCents),
    treatmentCents: Number(row.treatmentCents),
    highValuePatientCount: Number(row.highValuePatientCount),
    membershipSignalCount: Number(row.membershipSignalCount),
    serviceLines: row.serviceLines ?? [],
    payerNames: row.payerNames ?? [],
    providerNames: row.providerNames ?? [],
    referralSources: row.referralSources ?? [],
    ageBands: row.ageBands ?? [],
    genderSegments: row.genderSegments ?? [],
    samplePatients: row.samplePatients ?? [],
    opportunityScore: Math.round((Number(row.productionCents) + Number(row.treatmentCents)) / 10000) + Number(row.highValuePatientCount) * 15 + Number(row.membershipSignalCount) * 8 + Number(row.patientCount) * 3,
  }));
}

async function queryPatientMapFilterValues(tenantId: string) {
  const [services, insurances, genders, providers, referralSources] = await Promise.all([
    query<{ value: string }>(
      `select distinct value
       from (
         select nullif(a."appointmentType", '') as value from "PmsAppointment" a where a."tenantId" = $1
         union
         select nullif(pc."category", '') as value
         from "PmsProcedureLog" pl join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
         where coalesce(pl."tenantId", $1) = $1
         union
         select nullif(pc."category", '') as value
         from "PmsTreatmentPlan" tp join "PmsTreatmentPlanItem" tpi on tpi."treatmentPlanId" = tp."id" join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
         where tp."tenantId" = $1
       ) values
       where value is not null
       order by value`,
      [tenantId],
    ),
    query<{ value: string }>(
      `select distinct ip."payerName" as value
       from "PmsPatientInsurance" pi
       join "PmsInsurancePlan" ip on ip."id" = pi."planId" and ip."tenantId" = pi."tenantId"
       where pi."tenantId" = $1 and nullif(ip."payerName", '') is not null
       order by ip."payerName"`,
      [tenantId],
    ),
    query<{ value: string }>(
      `select distinct coalesce(nullif("genderIdentity", ''), nullif("sex", ''), 'Unknown') as value
       from "PmsPatient"
       where "tenantId" = $1 and "status" = 'ACTIVE'
       order by value`,
      [tenantId],
    ),
    query<{ value: string }>(
      `select distinct provider."displayName" as value
       from "PmsProvider" provider
       where provider."tenantId" = $1 and provider."status" = 'ACTIVE'
       order by provider."displayName"`,
      [tenantId],
    ),
    query<{ value: string }>(
      `select distinct coalesce(nullif("referralSource", ''), 'Unknown') as value
       from "PmsPatient"
       where "tenantId" = $1 and "status" = 'ACTIVE'
       order by value`,
      [tenantId],
    ),
  ]);
  return {
    services: services.rows.map((row) => row.value),
    insurances: insurances.rows.map((row) => row.value),
    ageBands: AGE_BANDS,
    genders: genders.rows.map((row) => row.value),
    providers: providers.rows.map((row) => row.value),
    referralSources: referralSources.rows.map((row) => row.value),
    valueBands: ["under_1k", "1k_5k", "5k_10k", "10k_plus"],
  };
}

async function queryPatientMapBreakdown(tenantId: string, filters: PatientMapFilters, dimension: "zip" | "service" | "payer" | "referral"): Promise<PatientMapBreakdownRow[]> {
  const points = await queryPatientMapPoints(tenantId, filters);
  const grouped = new Map<string, PatientMapBreakdownRow>();
  for (const point of points) {
    const labels =
      dimension === "zip"
        ? [point.postalCode || "Unknown ZIP"]
        : dimension === "service"
          ? point.serviceLines.length ? point.serviceLines : ["No service history"]
          : dimension === "payer"
            ? point.payerNames.length ? point.payerNames : ["No payer"]
            : point.referralSources.length ? point.referralSources : ["Unknown referral"];
    for (const label of labels) {
      const current = grouped.get(label) ?? {
        label,
        mappedFamilies: 0,
        mappedPatients: 0,
        productionCents: 0,
        treatmentCents: 0,
        highValuePatients: 0,
        membershipSignals: 0,
      };
      current.mappedFamilies += 1;
      current.mappedPatients += point.patientCount;
      current.productionCents += point.productionCents;
      current.treatmentCents += point.treatmentCents;
      current.highValuePatients += point.highValuePatientCount;
      current.membershipSignals += point.membershipSignalCount;
      grouped.set(label, current);
    }
  }
  return Array.from(grouped.values()).sort((a, b) => (b.productionCents + b.treatmentCents) - (a.productionCents + a.treatmentCents)).slice(0, 20);
}

async function queryPatientMapSavedSegments(tenantId: string): Promise<PatientMapSavedSegment[]> {
  const result = await query<{
    id: string;
    segmentName: string;
    description: string | null;
    filters: PatientMapFilters;
    lastRunAt: string | null;
    lastPatientCount: number;
    lastValueCents: number;
  }>(
    `select "id", "segmentName", "description", "filters", "lastRunAt"::text as "lastRunAt", "lastPatientCount", "lastValueCents"
     from "PmsPatientMapSavedSegment"
     where "tenantId" = $1 and "status" = 'ACTIVE'
     order by "updatedAt" desc
     limit 20`,
    [tenantId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    segmentName: row.segmentName,
    description: row.description,
    filters: row.filters,
    lastRunAt: row.lastRunAt,
    lastPatientCount: Number(row.lastPatientCount ?? 0),
    lastValueCents: Number(row.lastValueCents ?? 0),
  }));
}

async function queryPatientMapStats(tenantId: string) {
  return query<{
    mappedFamilies: string;
    mappedPatients: string;
    unmappedFamilies: string;
    highValuePatients: string;
    membershipSignals: string;
    productionCents: string;
    treatmentCents: string;
  }>(
    `
      with patient_values as (
        select
          p."id",
          p."familyAccountId",
          coalesce(appt."productionCents", 0) + coalesce(proc."productionCents", 0) as "productionCents",
          coalesce(tx."treatmentCents", 0) as "treatmentCents",
          (
            coalesce(appt."productionCents", 0) + coalesce(proc."productionCents", 0) + coalesce(tx."treatmentCents", 0) >= 100000
          ) as "isHighValue",
          (
            coalesce(fa."billingType", '') ~* 'member|membership|practice plan'
            or coalesce(fa."financialNote", '') ~* 'member|membership|practice plan|in-house plan'
            or coalesce(p."patientNote", '') ~* 'member|membership|practice plan|in-house plan'
          ) as "membershipSignal"
        from "PmsPatient" p
        left join "PmsFamilyAccount" fa on fa."id" = p."familyAccountId" and fa."tenantId" = p."tenantId"
        left join lateral (select coalesce(sum("productionCents"), 0)::int as "productionCents" from "PmsAppointment" a where a."patientId" = p."id" and a."tenantId" = p."tenantId") appt on true
        left join lateral (select coalesce(sum("feeCents"), 0)::int as "productionCents" from "PmsProcedureLog" pl where pl."patientId" = p."id" and coalesce(pl."tenantId", p."tenantId") = p."tenantId") proc on true
        left join lateral (select coalesce(sum(tpi."feeCents"), 0)::int as "treatmentCents" from "PmsTreatmentPlan" tp join "PmsTreatmentPlanItem" tpi on tpi."treatmentPlanId" = tp."id" where tp."patientId" = p."id" and tp."tenantId" = p."tenantId") tx on true
        where p."tenantId" = $1 and p."status" = 'ACTIVE'
      )
      select
        count(distinct pv."familyAccountId") filter (where geo."status" = 'GEOCODED')::text as "mappedFamilies",
        count(pv."id") filter (where geo."status" = 'GEOCODED')::text as "mappedPatients",
        count(distinct pv."familyAccountId") filter (where pv."familyAccountId" is not null and coalesce(geo."status", 'MISSING') <> 'GEOCODED')::text as "unmappedFamilies",
        count(*) filter (where pv."isHighValue")::text as "highValuePatients",
        count(*) filter (where pv."membershipSignal")::text as "membershipSignals",
        coalesce(sum(pv."productionCents"), 0)::text as "productionCents",
        coalesce(sum(pv."treatmentCents"), 0)::text as "treatmentCents"
      from patient_values pv
      left join "PmsPatientGeoCoordinate" geo on geo."tenantId" = $1 and geo."familyAccountId" = pv."familyAccountId"
    `,
    [tenantId],
  );
}

async function addPatientMapAudit(tenantId: string, actorRole: string, eventType: string, targetId: string | null, metadata: Record<string, unknown>) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, 'PmsPatientMap', $5, 'ALLOWED', $6::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetId, JSON.stringify(metadata)],
  );
}

async function geocodeMissingFamilyAccounts(tenantId: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const response = { enabled: Boolean(apiKey), attempted: 0, updated: 0, failed: 0 };
  if (!apiKey) return response;

  const candidates = await query<FamilyAddressRow>(
    `
      select fa."id", fa."addressLine1", fa."addressLine2", fa."city", fa."state", fa."postalCode", geo."addressHash"
      from "PmsFamilyAccount" fa
      left join "PmsPatientGeoCoordinate" geo on geo."tenantId" = fa."tenantId" and geo."familyAccountId" = fa."id"
      where fa."tenantId" = $1
        and exists (select 1 from "PmsPatient" p where p."tenantId" = fa."tenantId" and p."familyAccountId" = fa."id" and p."status" = 'ACTIVE')
        and nullif(trim(concat_ws(' ', fa."addressLine1", fa."city", fa."state", fa."postalCode")), '') is not null
      order by geo."geocodedAt" asc nulls first, fa."updatedAt" desc
      limit $2
    `,
    [tenantId, Number(process.env.PMS_PATIENT_MAP_GEOCODE_LIMIT || 25)],
  );

  for (const family of candidates.rows) {
    const address = formatAddress(family);
    const addressHash = hashAddress(address);
    if (family.addressHash === addressHash) continue;
    response.attempted += 1;
    const geocode = await geocodeAddress(address, apiKey);
    if (geocode.ok) response.updated += 1;
    else response.failed += 1;
    await upsertGeocodeResult(tenantId, family.id, addressHash, geocode);
  }

  return response;
}

async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult> {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json() as {
      status?: string;
      error_message?: string;
      results?: Array<{ formatted_address?: string; geometry?: { location?: { lat?: number; lng?: number }; location_type?: string } }>;
    };
    const result = payload.results?.[0];
    const location = result?.geometry?.location;
    if (!result || !response.ok || payload.status !== "OK" || typeof location?.lat !== "number" || typeof location?.lng !== "number") {
      return { ok: false, failureReason: payload.error_message || payload.status || `HTTP ${response.status}` };
    }
    return {
      ok: true,
      formattedAddress: result.formatted_address,
      latitude: location.lat,
      longitude: location.lng,
      precision: result.geometry?.location_type || "UNKNOWN",
    };
  } catch (error) {
    return { ok: false, failureReason: error instanceof Error ? error.message : "Unknown geocoding error" };
  }
}

async function upsertGeocodeResult(tenantId: string, familyAccountId: string, addressHash: string, result: GeocodeResult) {
  await query(
    `insert into "PmsPatientGeoCoordinate"
       ("id", "tenantId", "familyAccountId", "addressHash", "formattedAddress", "latitude", "longitude", "precision", "status", "failureReason", "geocodedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, current_timestamp, current_timestamp)
     on conflict ("tenantId", "familyAccountId") do update set
       "addressHash" = excluded."addressHash",
       "formattedAddress" = excluded."formattedAddress",
       "latitude" = excluded."latitude",
       "longitude" = excluded."longitude",
       "precision" = excluded."precision",
       "status" = excluded."status",
       "failureReason" = excluded."failureReason",
       "geocodedAt" = current_timestamp,
       "updatedAt" = current_timestamp`,
    [
      newId("geo"),
      tenantId,
      familyAccountId,
      addressHash,
      result.formattedAddress ?? null,
      result.latitude ?? null,
      result.longitude ?? null,
      result.precision ?? null,
      result.ok ? "GEOCODED" : "FAILED",
      result.failureReason ?? null,
    ],
  );
}

function formatAddress(row: Pick<FamilyAddressRow, "addressLine1" | "addressLine2" | "city" | "state" | "postalCode">) {
  return [row.addressLine1, row.addressLine2, row.city, row.state, row.postalCode, "USA"].filter(Boolean).join(", ");
}

function hashAddress(address: string) {
  return crypto.createHash("sha256").update(address.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex");
}

function cleanFilter(value: string | string[] | undefined, fallback: string) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = String(raw ?? "").trim();
  return trimmed || fallback;
}
