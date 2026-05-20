# ADR 0001: Phase 0 Repo And Architecture Strategy

Status: Approved for Phase 0 implementation  
Date: 2026-05-20  
Decision owner: Gaurav Basra  
Project: 1DentalAI

## Context

1DentalAI is a new product, not a rename of DentalRCM and not a wrapper around any single vendor. It must become a dental AI operating system covering PMS-grade workflows, phone, AI receptionist, AI chat, reputation, RCM, payer workflows, clinical AI, scribing, charting, perio, imaging, eRx, labs, referrals, membership/financing, practice operations, marketplace integrations, analytics, and DSO controls.

Existing local repos are useful but not authoritative:

- DentalRCM contains reusable RCM, connector governance, payer, ERA/EOB, denial, revenue integrity, credentialing, audit, and approval patterns.
- Outreachhubphonesystem contains reusable phone, reputation, AI studio, local SEO, AI SEO, communications, provider policy, workflow, and QA patterns.
- 1DentalAI is the new independent product repo and currently hosts the public marketing site at `http://162.243.186.191/`.

Per the approved Phase 0 rule, source of truth is current industry research plus the approved phase plan. Local repos are accelerators only.

## Decision

Keep 1DentalAI as a separate repo and product. Do not merge DentalRCM or the phone/reputation app wholesale.

Use a research-led extraction strategy:

- Extract/port proven patterns from existing repos only after validating them against current dental ecosystem research.
- Treat DentalRCM and Outreachhubphonesystem as source material, not acceptance criteria.
- Build 1DentalAI around stable domain boundaries so future phases can implement one production-ready slice at a time.

## Target Architecture

Long-term repo shape should support either a monorepo or a single Next.js app with clear module boundaries.

Preferred long-term structure:

- `apps/web`: marketing, authenticated app, admin, operator workbenches
- `packages/domain`: canonical dental models, shared types, source evidence
- `packages/workflow-engine`: tenant workflows, rules, queues, stages, approvals, versioning, rollback
- `packages/connectors`: connector SDK interfaces and adapters
- `packages/connector-governance`: setup, credentials, smoke tests, cost telemetry, policy, audit
- `packages/pms`: PMS-grade scheduling, charting, patient EHR, provider, operatory, ledger abstractions
- `packages/rcm`: eligibility, claims, ERA/EOB, denials, revenue integrity, credentialing
- `packages/comms`: phone, SMS, chat, AI receptionist, call events, unified inbox
- `packages/reputation-growth`: reviews, local SEO, AI SEO, campaigns, service recovery
- `packages/clinical-ai`: scribing, charting, perio, clinical note review
- `packages/imaging-ai`: x-ray, CBCT, DICOM, findings, overlays, evidence
- `packages/treatment`: case presentation, financing, membership, acceptance
- `packages/practice-ops`: rooms, chairs, huddles, staff, labs, referrals, SOPs, inventory
- `packages/analytics`: DSO rollups, practice intelligence, revenue integrity, connector cost telemetry
- `packages/ai-governance`: AI providers, prompts, tools, data classes, approval policies

Short-term structure may stay as one Next.js repo if Phase 1 needs speed. If so, use equivalent boundaries under `src/modules/*`, `src/domain`, `src/workflows`, and `src/connectors`.

## Non-Negotiables

- No phase starts without fresh research and Gaurav approval.
- No code path may call external vendors directly from product workflow code. Workflows call 1DentalAI-owned routers.
- No fake connector success, fake clinical result, fake claim submission, fake writeback, or dead buttons.
- Demo mode must be synthetic and clearly separated from live mode.
- High-risk actions require approval gates unless an approved tenant policy explicitly permits automation.
- Every phase must include an industry acceptance checklist and verify against it.

## Consequences

Positive:

- 1DentalAI can become bigger than DentalRCM without inheriting old architectural limits.
- Existing repos can accelerate implementation while research remains the acceptance bar.
- Connector routing, workflow customization, and marketplace design stay central from the beginning.

Tradeoffs:

- Phase 1 must build foundation before visible feature breadth.
- Some existing code will be ported slowly because it must be validated against the canonical model and safety rules.
- The architecture creates more upfront documentation, but prevents throwaway shells.

## Phase 0 Exit Criteria

Phase 0 is complete when the repo contains:

- Approved architecture ADR
- Source-app reuse matrix
- Connector extraction map
- Canonical model migration map
- Deployment and environment strategy
- Phase 1 recommendation packet
- Validation notes showing the artifacts match approved Phase 0 rules
