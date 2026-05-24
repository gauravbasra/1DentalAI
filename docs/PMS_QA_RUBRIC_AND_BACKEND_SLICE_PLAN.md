# PMS QA Rubric And Backend Slice Plan

Status: Active gate  
Date: 2026-05-23  
Owner: Independent QA Gate

## Current Verdict

FAIL for broader PMS production readiness.

The current build has a working PMS spine and the checkout/auth slice now passes focused gates, but it is not yet a complete real-world PMS operation system. Production readiness requires proven end-to-end behavior across patient onboarding, EHR/charting, clinical documentation, treatment plans, payer integrations, RCM, ERA/EOB, eligibility, prior auth, imaging, referrals, reports, audit/security, and go-live deployment evidence.

Passing code-level gates is not enough. QA must observe functional behavior, database writes, audit records, rollback/idempotency, connector state, and blocked external actions where credentials or live network enrollment are not available.

## Competitive Baseline

The QA bar is set against:

- Open Dental: appointments, family/account, charting, treatment planning, insurance estimates, claims, eligibility/benefits, EOB/payment workflows, perio, and reports.
- Archy: cloud PMS operations, custom appointment categories with procedure defaults, insurance verification/claim/EOB workflow, integrated imaging, treatment pre-authorizations, AI scribe, and AI verification/communications positioning.
- Dentrix Ascend/Dentrix: cloud scheduling, charting, imaging, treatment planning, claims, eligibility, ERA/payment posting, RCM dashboards, patient communication, and access controls.
- Eaglesoft: scheduling, chart/perio/PSR, treatment plans, service code setup, insurance claims/eServices, reports, ledgers/statements, and imaging integrations.
- Epic-style EHR discipline: unified patient record, encounter documentation, meds/allergies/problems, orders/referrals/authorizations, billing, auditability, access controls, and deployment governance.

Sources reviewed on 2026-05-23:

- https://www.opendental.com/manual/manual.html
- https://www.opendental.com/manual/treatmentplan.html
- https://www.archy.com/platform/operations
- https://www.archy.com/platform/clinical-tools
- https://www.dentrixascend.com/
- https://www.dentrixascend.com/dental-solutions/dental-insurance-billing-and-collections/
- https://www.dentrix.com/about-us/dentrix-or-dentrix-ascend/
- https://pattersonsupport.custhelp.com/euf/assets/Webinar_Presentations/EagleSoft_Practice_Management_and_Clinical_Webinars_040512.pdf
- https://www.epic.com/software/access-and-revenue-cycle/

## Non-Negotiable QA Rules

1. FAIL if a screen only displays mock state and cannot write/read real tenant-scoped data.
2. FAIL if any PMS API accepts tenant, actor, patient, provider, or payment trust from the request body when session context is required.
3. FAIL if a financial workflow is not transactional, idempotent, audited, and rollback-tested.
4. FAIL if payer-facing actions can be marked submitted, verified, acknowledged, paid, enrolled, or complete without connector acknowledgement or manual proof.
5. FAIL if AI output writes clinical, billing, or payer data without source evidence, human approval state, and audit metadata.
6. FAIL if PHI-bearing workflows lack role access checks, audit events, and tenant scoping.
7. FAIL if deployment readiness is asserted without production build, migration validation, environment/secret checks, and browser/API smoke tests.

## Operational Control Acceptance Checks

- PHI-safe audit metadata: `PmsAuditEvent.metadata` may contain artifact IDs, checksums, hashes, counts, status, blockers, and route decisions, but No raw PHI such as names, phone numbers, email addresses, DOBs, subscriber/member IDs, transcripts, note bodies, meeting URLs, passwords, or payload dumps.
- tenant-scoped audit: every PMS audit record must carry `tenantId`, `actorRole`, `eventType`, `targetType`, `targetId`, `outcome`, and `createdAt` so QA can prove who did what, to which operational object, and whether it was allowed or blocked.
- session-derived actor: API and server-action mutations must derive tenant and actor context from the authenticated session, not from request body fields, before writing patient, clinical, billing, payer, or communication records.
- Evidence-first external actions: connector, payer, call, SMS, review, eligibility, prior-auth, claim, ERA/EOB, and ledger-posting workflows must record internal status only until there is connector acknowledgement, manual proof, or artifact evidence.

## Next Five Backend Slices

### 1. Payer Matrix And Route Readiness

Build canonical payer registry, payer aliases, transaction capability matrix, network/route policy, snapshot import, and route readiness service.

QA will run:

- Import a versioned Stedi-style payer matrix fixture and verify immutable snapshot checksum/row count.
- Search payer by card name, alias, payer ID, and fuzzy normalized name.
- Resolve a PMS insurance plan to canonical payer with confidence and unresolved reasons.
- Verify eligibility, 837D, 276/277, 835, attachment, and prior-auth route readiness.
- Block unsupported, stale, portal-only-without-proof, blocked-route, missing-enrollment, and missing-approval cases.

### 2. Eligibility And Benefits Evidence

Build eligibility request/readback records, benefit breakdowns, source evidence, appointment financial-clearance updates, and PDF summary generation.

QA will run:

- Create a patient insurance record and perform eligibility readiness decision through payer matrix.
- Ingest a 271-like fixture and map active/inactive status, deductibles, maximums, coverage percentages, limitations, waiting periods, frequencies, and plan notes.
- Confirm appointment readiness and patient estimate update.
- Generate a PDF benefits summary and verify document attachment to patient, appointment, and insurance record.
- Confirm missing connector/proof blocks eligibility from being marked verified.

### 3. Claims, EOB, ERA, And Ledger Posting

Build claim lifecycle beyond draft: claim validation, service lines, attachments, submission gate, EOB detail capture, ERA 835 fixture ingestion, denial/adjustment mapping, and ledger posting.

QA will run:

- Convert completed appointment procedures into a claim with CDT lines, tooth/surface, provider, diagnosis/narrative, and attachment requirements.
- Block claim submission without payer route readiness and required evidence.
- Ingest ERA/EOB fixture and map allowed, paid, deductible, coinsurance, write-off, denial codes, patient responsibility, and check/EFT trace.
- Post insurance payment atomically to ledger and claim; verify no duplicate posting on retry.
- Generate detailed EOB PDF and attach it to patient, claim, and payment records.

### 4. Treatment Plan And Prior Authorization

Build treatment plan case lifecycle with CDT mapping, estimates, alternatives, consent, provider approval, prior-auth packet/evidence, and acceptance conversion to appointments.

QA will run:

- Create phased treatment plans from chart conditions and CDT procedures.
- Calculate patient estimate from active benefits and fee schedule.
- Generate prior-auth packet with narrative, images/docs, perio/chart evidence where required.
- Block prior auth submission without route readiness, evidence checklist, and human approval.
- Accept a treatment plan and create scheduled/unscheduled appointments with linked procedure state.

### 5. Clinical EHR, Scribing, Perio, Imaging, Referrals

Build encounter-grade clinical record: signed notes, staff/RDH/doctor note separation, procedure templates, odontogram/perio support, imaging order/review, referral templates, follow-ups, and AI recommendation gating.

QA will run:

- Record staff intake, RDH perio note, doctor diagnosis, treatment recommendation, and signed encounter note.
- Verify AI scribe draft cannot become final without approval and source transcript metadata.
- Chart perio measurements and generate periodontal diagnosis/treatment recommendations.
- Attach imaging/X-ray evidence to diagnosis, treatment plan, prior auth, claim, and referral.
- Generate referral email/PDF from treatment/CDT mapping and verify follow-up task creation.

## Current Repo Gaps

- `src/lib/pms-repository.ts` contains core PMS functions and checkout is now transactional, but payer-facing lifecycle functions remain mostly internal workflow stubs rather than live eligibility/claim/ERA route integrations.
- `docs/PAYER_MATRIX_SCHEMA_SERVICE_SLICE.md` defines payer matrix direction, but Prisma models and services are not yet implemented.
- `scripts/validate-pms-production-gate.mjs` validates auth/tenant and checkout structural gates, but does not yet validate payer route readiness, EOB/ERA idempotency, prior-auth proof, PDF generation, or clinical AI approval gates.
- `src/lib/operating-system-repository.ts` contains RCM concepts such as prior auth, denials, ERA posting, and payer follow-ups, but they need PMS-integrated route-readiness gates and QA fixtures.
- PMS pages under `src/app/app/pms/**` exist, but QA must still click every workflow and prove real database state changes before any go-live claim.

## QA Sign-Off Format

Each build receives:

- Verdict: PASS or FAIL.
- Scope tested: exact screens, APIs, commands, fixtures, and database records.
- Evidence: screenshots/log excerpts/API responses where relevant.
- Blockers: ordered by go-live risk.
- Retest requirements: concrete commands and user flows QA will run after fixes.

No deployment can be called go-live until the verdict is PASS for the full PMS operating scope.
