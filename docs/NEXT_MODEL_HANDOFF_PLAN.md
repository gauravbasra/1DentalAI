# Next Model Handoff Plan (1DentalAI PMS/RCM/Phone)

Date: 2026-05-26  
Repo: `/Users/gauravbasra/Developer/1DentalAI`  
Branch: `main`  

This document is the operational handoff for the next model (Cursor/Deepseek/Ollama). It captures what is verifiably working in code and production, what is only scaffolded, and the next phases required to close the competitive gap (OpenDental/Dentrix/Eaglesoft/Curve/Archy, etc.) and meet the QA rubric in `docs/PMS_QA_RUBRIC_AND_BACKEND_SLICE_PLAN.md`.

## Current Production State (Verified)

Deployment target:

- Public marketing + product entry: `https://1dentalai.com`
- Product host used by login redirect / app runtime: `https://app.1dentalai.com`
- PMS patient map (fresh UI route): `https://app.1dentalai.com/app/pms/patient-map`

Health checks (post-deploy verification):

- `GET https://1dentalai.com/api/health` returns `{ ok: true, ... }`
- `GET https://1dentalai.com/api/database/health` returns `{ ok: true, database: "ready", presentTables: [...] }`

Latest “build is green” commit and deploy:

- Commit: `8fc4e22` (“Fix build: isolate StatusPill + route typings”)
- GitHub Actions workflow: `.github/workflows/deploy-digitalocean.yml`
- Recent deploy run succeeded and includes health + DB health verification.

## What Is Working End-to-End (Not Just UI)

### PMS: Scribe + Perio E2E (Production)

Validated via the existing script:

- `scripts/validate-pms-scribe-perio-e2e.mjs`

What it proves:

- Authenticated API access
- Patient lookup/create
- Scribe draft generation
- Scribe save into chart notes
- Perio exam creation/measurement persistence

Notes:

- The script expects a clinical role. Use an `owner_doctor` test account for QA automation.
- The host to test against is `https://app.1dentalai.com` (not `https://1dentalai.com`) due to login redirect behavior in `src/app/login/route.ts`.

### PMS: Patient Map (Production)

Validated with:

- `scripts/validate-pms-patient-map-e2e.mjs` (added in this repo)

What it proves:

- `GET /api/pms/patient-map/export` returns a CSV with real household rows (not empty).
- `GET /app/pms/patient-map` renders the expected server-side content under an authenticated session.

Manual verification (in browser):

- The map loads and plotted household circles are visible on `https://app.1dentalai.com/app/pms/patient-map`.

### RCM: API Route Coverage (Structural + Some Functional)

RCM route surfaces now exist for:

- Prior auth packet endpoints
- Denial appeal packet endpoints
- ERA post-to-PMS endpoints

Important: “exists” is not “integrated”. See “Pending / Gap Analysis” below for the missing lifecycle depth.

## Architecture Constraints / Known Operational Reality

### Local Docker Is Unreliable On This Mac

Local Docker Desktop was hanging at the time of development. Do not assume local `docker compose` is a stable path for DB-backed testing.

Practical workaround used:

- Operate directly against the production droplet and DB via SSH, and validate via live URLs + scripts.

### Production Runs On A Droplet (Not DO Apps / Managed DB)

DigitalOcean context:

- Deployment runs on a DO droplet (example name previously used: `dentalrcm-demo-20260507`).
- App is running in Docker Compose on the droplet at `/var/www/1DentalAI`.
- Nginx proxies public domains to the app container (typically port 3001).

### Security Note (Immediate Action For Humans)

Multiple secrets were pasted into chat historically (Twilio/OpenAI/ElevenLabs/Google Maps). Assume they are compromised and rotate them. Do not commit secrets into git. Prefer DO env / vault.

## QA Contract (Non-Negotiable)

The required QA standard is documented here:

- `docs/PMS_QA_RUBRIC_AND_BACKEND_SLICE_PLAN.md`

The product is considered “done” only when:

1. Each workflow is end-to-end functional, with DB records + audits + idempotency and no placeholder buttons.
2. QA can click through each screen and verify real writes (not optimistic UI).
3. External mutations go through `PmsWritebackJob` and store evidence, external response, and audit trail.

## How To Validate Quickly (Next Model Checklist)

1. Lint and schema checks:
   - `npm run lint` (warnings are allowed today; errors are not)
   - `npm run test:pms`
   - `npm run build`

2. Production smoke:
   - `curl -fsS https://1dentalai.com/api/health`
   - `curl -fsS https://1dentalai.com/api/database/health`

3. E2E (requires an authenticated clinical account):
   - `PMS_E2E_BASE_URL=https://app.1dentalai.com node scripts/validate-pms-scribe-perio-e2e.mjs`
   - `PMS_E2E_BASE_URL=https://app.1dentalai.com node scripts/validate-pms-patient-map-e2e.mjs`

Important: the repository currently has no safe committed mechanism to mint test users/cookies. Previous runs created QA accounts directly in production DB. Replace that with a first-class admin/test harness (see Phase 9 / Pending).

## Completed vs Pending (Gap Analysis)

This is organized to match the phased plan (`docs/PHASED_PRODUCT_IMPROVEMENT_CODE_PLAN.md`) and the competitive gap matrix/rubric.

### Completed (Working or Substantively Implemented)

Phase 1–5 are partially to substantially implemented in codebase (see implementation reports in `docs/PHASE_*_IMPLEMENTATION_REPORT.md`).

1. PMS Connector foundation (partial):
   - Capability tables and writeback job pattern exist in schema and codebase.
   - Connector pages exist under `/app/connectors/pms`.
   - OpenDental/NexHealth stubs exist; smoke test endpoints exist.

2. PMS core objects (substantial):
   - Patients, appointments, schedule, chart page surfaces, documents/imaging placeholders, ledger/insurance/inventory surfaces exist.
   - Auth + session + role scoping exists (with known host-canonicalization patterns).

3. Clinical scribe workflow (substantial + validated):
   - Scribe generate/save APIs exist and are validated E2E against production.
   - Writeback endpoints exist (PMS connector mutation gating still needs deeper evidence enforcement).

4. Perio workflow (substantial + validated):
   - Perio APIs exist (exam/measurements/complete).
   - Voice command endpoint exists and basic writeback workflow exists.

5. Patient Map analytics (validated):
   - DB has geo rows and the map renders plotted clusters.
   - Export endpoint works and returns non-empty CSV.

6. RCM core route coverage (structural):
   - Prior auth packet endpoints, denial appeal packet endpoints, ERA post-to-PMS endpoints exist.

### Pending (Must Be Built To Match Competition + QA Rubric)

This is the real backlog. Treat it as the “no-excuses” list.

#### A) Insurance Eligibility + Benefits (Deep, Evidence-Driven)

Needed to match real-world payer portal workflows:

- Eligibility run orchestration:
  - Store payer portal login URL (per payer registry).
  - Run RPA/bot runner to login, navigate benefits screens, capture screenshots/PDFs, and extract facts.
  - Persist raw evidence + extracted facts + normalization confidence.

- Benefits mapping depth:
  - Deductibles (individual/family, in-network/out-of-network, used/remaining, year basis).
  - Maximums (annual, lifetime where applicable, used/remaining).
  - Frequencies and limitations (exam, prophy, BW, perio maintenance, SRP, crowns, implants).
  - Waiting periods, missing tooth clauses, downgrades, alternative benefits.
  - Past claims / remaining balance (eligibility “active” is not sufficient).

- Output artifacts:
  - A human-readable, payer-safe benefits PDF summary.
  - Attachments stored in `PmsDocument` and linked to patient/appointment/insurance.

References:

- `docs/PAYER_MATRIX_SCHEMA_SERVICE_SLICE.md`
- `docs/PMS_QA_RUBRIC_AND_BACKEND_SLICE_PLAN.md` sections 1–2

#### B) Claims / EOB / ERA / Ledger Posting (Real Finance)

Needed to match OpenDental/Dentrix:

- Claim creation from completed procedures with CDT/tooth/surface/provider/diagnosis/narrative.
- Attachments enforcement (images, perio charts, narratives).
- Submission gates based on payer matrix route readiness + required evidence.
- ERA ingestion (835) + mapping to ledger adjustments:
  - Allowed/paid/deductible/coinsurance/writeoff/denial codes/PR amounts.
  - Idempotent posting (no double post on retries).
- EOB PDF generation and attachment storage.

References:

- QA rubric section 3.

#### C) Treatment Plans + Prior Auth Case Lifecycle (Operational Depth)

Needed:

- Treatment plan case building with CDT mapping + alternatives + staging.
- Estimates computed from benefit facts and fee schedules.
- Prior auth packet builder:
  - Structured narrative by CDT category (endo/prosth/implant/ortho/perio).
  - Evidence checklist + attachments.
  - Review/approval gate before submission.
- Conversion of accepted plans into scheduled appointments and procedure logs.

References:

- QA rubric section 4.

#### D) Clinical EHR “Whole Process” Completion

Needed:

- Staff vs RDH vs doctor note separation with signatures.
- Process templates + CDT-procedure templates:
  - Intake, exams, hygiene/perio flows, restorative, endo, oral surgery, pediatric, ortho.
- Imaging workflows:
  - X-rays capture/import linkage, annotations, “used as evidence” tags for claims/prior auth/referrals.
- Referrals workflows:
  - Referral letters/emails + attachments auto-generated from CDT and treatment plan context.
- Follow-ups and scribing integration with tasks.

References:

- `docs/CANONICAL_DENTAL_MODEL_WORKFLOW_CATALOG.md`
- QA rubric section 5.

#### E) Inventory: Make It A Real System (Not Pages)

Needed to meet earlier stated product requirements:

- Barcode scanning + label printing (lots/expiry).
- Cycle counts and reconciliation.
- Purchase order workflow:
  - approvals, receiving, variances.
- Vendor portal:
  - self-service login, bid submission, marketplace gating, subscription/payment.
- Usage analytics:
  - daily/weekly/monthly consumption, per-chair/per-provider/per-CDT usage.
  - ROI: purchase cost vs usage patterns, expiration waste, vendor price variance.
- Cross-practice benchmarks:
  - requires anonymization and aggregation (not just seeded baselines).

#### F) Phone / AI Voice Live Readiness (Phase 6)

Needed (explicitly called out by phase plan):

- Implement `/api/phone/live/*` routes and the live-call provider gate model.
- Provider readiness gating: webhook configured, number provisioned, E911, Twilio credentials, etc.
- Screen pop, transcript, summary, disposition, and PMS communication-note writeback job.

Current state:

- Non-live routes exist (e.g., `/api/phone/softphone/dial`, `/api/phone/call-control`, `/api/phone/screen-pop`).
- Phase 6 “live” contract and UI panels are not yet complete.

#### G) Readiness Dashboard (Phase 7) + Role-Based Daily Workflows (Phase 8)

Needed:

- A single place to see which modules are truly live (by smoke test evidence).
- Role-based daily queues (front desk vs rdh vs billing/rcm vs doctor).

#### H) Demo + Go-Live Pack (Phase 9)

Needed:

- Demo seed fixture and deterministic E2E pack:
  - `appointment -> scribe -> treatment plan -> perio -> benefits -> prior auth -> claim -> ERA -> ledger -> phone follow-up`
- Product smoke test runner and Playwright E2E specs.
- Remove any reliance on manual production DB edits for test accounts.

## Immediate Next Sprint Recommendation (Concrete)

Priority order for the next model:

1. Phase 6 (Phone live readiness): complete `/api/phone/live/*` + UI panels + readiness gates + writeback.
2. Phase 2/3 of QA rubric for RCM: eligibility benefit extraction + PDF + evidence storage, then claim/ERA idempotent ledger posting.
3. Inventory operationalization: barcode/labels/cycle counts + vendor portal skeleton with real auth and bid submission.
4. Phase 7/8 dashboards: readiness cards + daily role queues to stop the “giant UI page” regressions.
5. Phase 9 go-live pack: deterministic demo seed + e2e suite.

## Pointers: Where Things Live In Code

- Auth/session: `src/lib/auth.ts`, `src/app/login/route.ts`, `src/app/logout/route.ts`
- PMS core: `src/lib/pms-repository.ts`, `src/app/app/pms/**`, `src/app/api/pms/**`
- Scribe: `src/app/api/pms/scribe/*`, `src/components/pms-scribe-workspace.tsx`, `src/lib/clinical-scribe-workflow.ts`
- Perio: `src/app/api/pms/perio/*`, `src/components/perio/*`, `src/lib/perio-workflow.ts`, `src/lib/perio-command-parser.ts`
- Patient map: `src/lib/pms-patient-map-repository.ts`, `src/app/app/pms/patient-map/*`
- RCM: `src/app/api/rcm/*`, `src/lib/rcm-*`
- Deploy: `.github/workflows/deploy-digitalocean.yml`, `docs/DEPLOYMENT.md`, `docs/DEPLOYMENT_AND_ENVIRONMENT_STRATEGY.md`

