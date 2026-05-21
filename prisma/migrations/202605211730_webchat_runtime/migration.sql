create table if not exists "PatientWebChatMessage" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text not null,
  "senderType" text not null,
  "senderName" text,
  "body" text not null,
  "intent" text,
  "sentiment" text,
  "confidence" integer not null default 0,
  "knowledgeSourceIds" text[] not null default '{}',
  "actionType" text,
  "actionStatus" text not null default 'NONE',
  "metadata" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientWebChatMessage_tenantId_conversationId_createdAt_idx" on "PatientWebChatMessage" ("tenantId", "conversationId", "createdAt");
create index if not exists "PatientWebChatMessage_tenantId_intent_idx" on "PatientWebChatMessage" ("tenantId", "intent");

create table if not exists "PatientWebChatEvent" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text,
  "eventType" text not null,
  "pageUrl" text,
  "payload" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientWebChatEvent_tenantId_conversationId_createdAt_idx" on "PatientWebChatEvent" ("tenantId", "conversationId", "createdAt");
create index if not exists "PatientWebChatEvent_tenantId_eventType_idx" on "PatientWebChatEvent" ("tenantId", "eventType");

create table if not exists "PatientEngagementKnowledgePage" (
  "id" text primary key,
  "tenantId" text not null,
  "url" text not null,
  "title" text not null,
  "status" text not null default 'CRAWLED',
  "contentHash" text,
  "extractedText" text not null,
  "lastCrawledAt" timestamp(3) not null default current_timestamp,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create unique index if not exists "PatientEngagementKnowledgePage_tenantId_url_key" on "PatientEngagementKnowledgePage" ("tenantId", "url");
create index if not exists "PatientEngagementKnowledgePage_tenantId_status_lastCrawledAt_idx" on "PatientEngagementKnowledgePage" ("tenantId", "status", "lastCrawledAt");

create table if not exists "PatientEngagementKnowledgeChunk" (
  "id" text primary key,
  "tenantId" text not null,
  "pageId" text not null,
  "chunkIndex" integer not null,
  "heading" text,
  "content" text not null,
  "tokenEstimate" integer not null default 0,
  "status" text not null default 'READY_FOR_RETRIEVAL',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create unique index if not exists "PatientEngagementKnowledgeChunk_pageId_chunkIndex_key" on "PatientEngagementKnowledgeChunk" ("pageId", "chunkIndex");
create index if not exists "PatientEngagementKnowledgeChunk_tenantId_status_idx" on "PatientEngagementKnowledgeChunk" ("tenantId", "status");

insert into "PatientEngagementKnowledgePage" ("id", "tenantId", "url", "title", "status", "contentHash", "extractedText")
values
  ('eng_kpage_home', 'tenant_1dentalai_production', 'https://1dentalai.com/', '1DentalAI public website', 'CRAWLED', 'seed_home', '1DentalAI connects phones, scheduling, patient messaging, insurance, RCM, reputation, clinical AI, analytics, and dental practice workflows. The website visitor can request early access, explore product suites, and ask about dental AI operations.'),
  ('eng_kpage_product', 'tenant_1dentalai_production', 'https://1dentalai.com/product', '1DentalAI product page', 'CRAWLED', 'seed_product', '1DentalAI product suites include patient engagement, PMS, RCM, reputation, marketing, AI Studio, clinical AI, practice intelligence, and universal connectors. Scheduling and PMS writeback require connector readiness and staff approval.')
on conflict ("tenantId", "url") do update set
  "title" = excluded."title",
  "extractedText" = excluded."extractedText",
  "lastCrawledAt" = current_timestamp,
  "updatedAt" = current_timestamp;

insert into "PatientEngagementKnowledgeChunk" ("id", "tenantId", "pageId", "chunkIndex", "heading", "content", "tokenEstimate")
values
  ('eng_kchunk_home_0', 'tenant_1dentalai_production', 'eng_kpage_home', 0, 'Product overview', '1DentalAI connects phones, scheduling, patient messaging, insurance, RCM, reputation, clinical AI, analytics, and dental practice workflows.', 22),
  ('eng_kchunk_product_0', 'tenant_1dentalai_production', 'eng_kpage_product', 0, 'Product suites', '1DentalAI product suites include patient engagement, PMS, RCM, reputation, marketing, AI Studio, clinical AI, practice intelligence, and universal connectors. Scheduling and PMS writeback require connector readiness and staff approval.', 31)
on conflict ("pageId", "chunkIndex") do update set
  "content" = excluded."content",
  "tokenEstimate" = excluded."tokenEstimate",
  "updatedAt" = current_timestamp;
