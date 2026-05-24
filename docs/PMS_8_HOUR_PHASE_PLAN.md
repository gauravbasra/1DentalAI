# PMS Eight-Hour Build Plan

This plan is the release contract for turning the PMS into an operating system, not a screen demo. QA must fail any phase that only renders UI, uses fake success, lacks tenant-scoped persistence, lacks audit trail, or marks external payer/clinical actions complete without evidence.

## Phase 1: Payer Matrix And Route Readiness

Build read-only payer search, payer resolution, route readiness, matrix coverage, non-PHI fixtures, stale snapshot blocking, and DB-backed route-readiness tests. This phase gates eligibility, prior auth, claims, ERA/EOB, and attachment workflows.

QA pass requires: supported clearinghouse route ready, unsupported route blocked, enrollment-required route blocked, portal-only route blocked until credentials are validated, stale matrix route blocked, route APIs authenticated, and no payer-facing status can bypass `assertPayerProductionGate`.

## Phase 2: Eligibility And Benefits Evidence

Build eligibility runs from payer route readiness through RPA/clearinghouse evidence capture, normalized benefits, PDFs, source trace IDs, confidence scoring, screenshot/artifact references, review workflow, and PMS writeback.

QA pass requires: no PHI in logs, failed payer portal selectors fail closed, PDF and screenshot artifact checksums exist, benefit summary writes to patient coverage only after review, and appointment readiness updates from real evidence.

## Phase 3: Claims, EOB, ERA, And Ledger Posting

Build 837D claim creation, line-level validation, 277CA ack handling, 276/277 claim status, 835 ERA import, EOB PDF generation, denial case creation, and idempotent ledger posting.

QA pass requires: claims cannot be marked submitted without ack/proof, ERA posting is line-idempotent, adjustments balance, EOB artifacts are traceable, and denial/appeal work queues are created from actual adjudication data.

## Phase 4: Treatment Plans And Prior Authorization

Build CDT-mapped treatment plan estimates, insurance benefit math, pre-auth packet generation, referral/attachment packets, provider approval, patient presentation, acceptance, financing, and signed consent.

QA pass requires: treatment estimates reconcile against benefits, prior-auth packet includes CDT, diagnosis, imaging/referral attachments, human approval and payer route evidence are mandatory, and accepted plans create scheduled/ledger-ready work without duplicate items.

## Phase 5: Clinical EHR, Scribing, Perio, Imaging, Referrals

Harden charting, process templates, CDT mapping, doctor/RDH/staff notes, AI-assisted recommendations, perio, orthodontic/pediatric workflows, imaging, prescriptions, referrals, attachments, and follow-ups.

QA pass requires: AI output has evidence and review state, signed notes are immutable with amendments, imaging/referrals attach to procedures and claims, perio measurements persist by site, and staff/doctor/RDH assignments are auditable.

## Phase 6: Reports, Morning Huddle, Security, And Production QA

Build morning huddle, provider/room productivity, RCM analytics, taxes/collections reports, audit exports, HIPAA/SOC 2 controls, role-based access, deployment gates, and the independent QA click-through agent.

QA pass requires: each screen is clicked end-to-end, every button either performs a persisted action or is removed, audit events prove sensitive workflows, production build passes, public smoke passes, and QA signs off before deploy.

## Standing Rules

- No fake success states.
- No placeholder integrations in production paths.
- No patient, payer, claim, eligibility, clinical, or ledger mutation without authenticated tenant scope.
- No external action marked submitted, verified, acknowledged, paid, enrolled, or complete without connector acknowledgement, portal evidence, or reviewed manual proof.
- QA is independent and can block deployment for build failures, missing fixture evidence, UI-only flows, missing audit, or competitor parity gaps.
