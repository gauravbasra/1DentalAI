# Phase 2 Implementation Report: Role Workbenches

Status: Implemented locally  
Date: 2026-05-20

## Implemented

Phase 2 replaces dashboard-only work-entry links with real role workbench routes and backend contracts.

Routes:

- `/app/work/pms-schedule`
- `/app/work/patient-chart`
- `/app/work/perio-charting`
- `/app/work/rcm-queue`
- `/app/work/phone-inbox`
- `/app/work/treatment-plans`
- `/app/work/imaging`
- `/app/work/labs-referrals`
- `/app/work/rooms-chairs`
- `/app/work/growth-reputation`
- `/app/work/marketing-studio`
- `/app/work/local-ai-seo`
- `/app/work/connector-setup`

APIs:

- `GET /api/workbenches?role=...`
- `GET /api/workbenches/[slug]?role=...`
- `POST /api/workbenches/[slug]/actions`

Domain contracts:

- `src/lib/workbench-data.ts`
- `src/components/workbench-action-button.tsx`
- `src/app/app/work/[slug]/page.tsx`

## Database Migration

Added Prisma 7 configuration and PostgreSQL migration:

- `prisma.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations/202605200001_phase2_workbenches/migration.sql`

Models:

- `Tenant`
- `Location`
- `TenantRole`
- `WorkbenchArea`
- `WorkbenchAreaRole`
- `WorkbenchQueueItem`
- `WorkbenchAction`
- `ConnectorReadinessItem`
- `WorkbenchAuditEvent`

The schema includes clinical, financial, marketing, source-system, connector-readiness, approval, action, and audit fields so workbenches are not just UI cards.

## Role Coverage

Added marketing/growth as a first-class operating role:

- reputation management
- service recovery
- review request queue
- AI Studio drafts
- Local SEO
- AI SEO
- campaigns
- listing/GBP readiness
- growth attribution

Updated existing roles to route daily work to workbench pages instead of module anchors.

## Action Behavior

Workbench action buttons call the backend action API.

Implemented action outcomes:

- local state actions are accepted
- approval actions are staged
- external live actions are blocked with explicit connector/compliance reasons
- role access is enforced before action evaluation
- audit response payloads are returned for every action

## Verification

Commands passed:

- `npm run test:workbenches`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run check`

API checks passed:

- `GET /api/workbenches?role=marketing_growth`
- `POST /api/workbenches/rcm-queue/actions` with blocked payer submission

Browser click test passed for all thirteen workbenches:

- PMS schedule
- patient chart
- perio charting
- RCM queue
- phone inbox
- treatment plans
- imaging
- labs/referrals
- rooms/chairs
- growth/reputation
- marketing studio
- Local SEO/AI SEO
- connector setup

Blocked action verified:

- live claim submission returns a payer connector/enrollment/approval blocked reason.

Screenshot:

- `docs/phase2-workbench-rdh-perio.png`

## Still Gated, Not Fake

The following are approved 1DentalAI product scope, but not falsely marked live in this implementation:

- live PMS/EHR writeback
- live payer submission
- live phone/SMS
- live review posting
- live campaign sending
- live GBP/listing/website publishing
- live AI scribing/perio
- live imaging AI
- live eRx
- live payments/financing

Each workbench exposes the database/action/connectivity contract for those capabilities and blocks live execution until credentials, policies, connectors, audit, and smoke tests are complete.
