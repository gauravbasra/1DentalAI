alter table "PmsClaimLine"
  add column if not exists "deductibleCents" integer not null default 0,
  add column if not exists "copayCents" integer not null default 0,
  add column if not exists "coinsuranceCents" integer not null default 0,
  add column if not exists "writeoffCents" integer not null default 0,
  add column if not exists "denialCents" integer not null default 0,
  add column if not exists "otherAdjustmentCents" integer not null default 0,
  add column if not exists "carcCodes" jsonb,
  add column if not exists "rarcCodes" jsonb,
  add column if not exists "eraPostingId" text,
  add column if not exists "adjudicatedAt" timestamp(3);

create index if not exists "PmsClaimLine_eraPostingId_idx" on "PmsClaimLine" ("eraPostingId");
