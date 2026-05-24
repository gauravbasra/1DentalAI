create table if not exists "RcmEraAdjudicationLine" (
  "id" text primary key,
  "tenantId" text not null,
  "eraPostingId" text not null,
  "claimId" text not null,
  "claimLineId" text not null,
  "procedureCode" text not null,
  "serviceDate" timestamp(3),
  "tooth" text,
  "surface" text,
  "billedCents" integer not null default 0,
  "allowedCents" integer not null default 0,
  "paidCents" integer not null default 0,
  "deductibleCents" integer not null default 0,
  "copayCents" integer not null default 0,
  "coinsuranceCents" integer not null default 0,
  "writeoffCents" integer not null default 0,
  "denialCents" integer not null default 0,
  "otherAdjustmentCents" integer not null default 0,
  "patientResponsibilityCents" integer not null default 0,
  "carcCodes" jsonb,
  "rarcCodes" jsonb,
  "status" text not null default 'IMPORTED',
  "sourceTraceId" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "RcmEraAdjudicationLine_tenantId_eraPostingId_idx"
  on "RcmEraAdjudicationLine" ("tenantId", "eraPostingId");

create index if not exists "RcmEraAdjudicationLine_claimId_claimLineId_idx"
  on "RcmEraAdjudicationLine" ("claimId", "claimLineId");

create unique index if not exists "RcmEraAdjudicationLine_tenantId_eraPostingId_claimLineId_key"
  on "RcmEraAdjudicationLine" ("tenantId", "eraPostingId", "claimLineId");

create unique index if not exists "PmsPayment_tenantId_paymentType_reference_key"
  on "PmsPayment" ("tenantId", "paymentType", "reference")
  where "reference" is not null;
