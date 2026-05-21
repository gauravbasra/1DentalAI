alter table "PatientWebChatConversation"
  add column if not exists "sourceChannel" text not null default 'WEBSITE',
  add column if not exists "campaignSource" text,
  add column if not exists "referrerUrl" text,
  add column if not exists "landingPageSlug" text,
  add column if not exists "leadScore" integer not null default 0,
  add column if not exists "qualificationStage" text not null default 'NEW',
  add column if not exists "nextBestAction" text,
  add column if not exists "staffOwnerDueAt" timestamp(3);

create index if not exists "PatientWebChatConversation_tenantId_qualificationStage_leadScore_idx"
  on "PatientWebChatConversation" ("tenantId", "qualificationStage", "leadScore");

create index if not exists "PatientWebChatConversation_tenantId_campaignSource_idx"
  on "PatientWebChatConversation" ("tenantId", "campaignSource");

update "PatientWebChatConversation"
set "sourceChannel" = coalesce(nullif("sourceChannel", ''), 'WEBSITE'),
    "campaignSource" = coalesce("campaignSource", case
      when "sourcePage" ilike '%utm_source=google%' then 'GOOGLE_ADS'
      when "sourcePage" ilike '%utm_source=gbp%' then 'GOOGLE_BUSINESS_PROFILE'
      when "sourcePage" ilike '%implant%' then 'IMPLANT_LANDING_PAGE'
      when "sourcePage" ilike '%emergency%' then 'EMERGENCY_LANDING_PAGE'
      else 'DIRECT_WEBSITE'
    end),
    "landingPageSlug" = coalesce("landingPageSlug", case
      when "sourcePage" ilike '%implant%' then 'implants'
      when "sourcePage" ilike '%emergency%' then 'emergency-dentistry'
      when "sourcePage" ilike '%insurance%' then 'insurance'
      else 'general'
    end),
    "leadScore" = greatest("leadScore", case
      when "nlpIntent" = 'EMERGENCY_TRIAGE' then 95
      when "nlpIntent" = 'SCHEDULE_APPOINTMENT' then 82
      when "nlpIntent" = 'INSURANCE_OR_PRICE' then 68
      when "visitorPhone" is not null or "visitorEmail" is not null then 45
      else 25
    end),
    "qualificationStage" = case
      when "status" = 'CLOSED' then 'CLOSED'
      when "nlpIntent" = 'EMERGENCY_TRIAGE' then 'URGENT_TRIAGE'
      when "visitorPhone" is not null or "visitorEmail" is not null then 'QUALIFIED_LEAD'
      when "nlpIntent" is not null then 'NEEDS_CONTACT'
      else "qualificationStage"
    end,
    "nextBestAction" = coalesce("nextBestAction", case
      when "nlpIntent" = 'EMERGENCY_TRIAGE' then 'Call patient immediately, verify symptoms, and route to emergency appointment protocol.'
      when "nlpIntent" = 'SCHEDULE_APPOINTMENT' then 'Verify preferred time, check PMS availability, and confirm booking with staff approval.'
      when "nlpIntent" = 'INSURANCE_OR_PRICE' then 'Treatment coordinator should answer benefits, pricing, and financing questions after PMS/payer review.'
      else 'Review transcript, qualify contact information, and decide scheduling, RCM, or service-line handoff.'
    end),
    "staffOwnerDueAt" = coalesce("staffOwnerDueAt", current_timestamp + interval '30 minutes')
where "tenantId" = 'tenant_1dentalai_production';
