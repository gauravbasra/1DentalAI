# Deployment And Environment Strategy

Status: Phase 0 implementation artifact  
Date: 2026-05-20

## Current Deployment

| App | URL | Rule |
| --- | --- | --- |
| 1DentalAI | `http://162.243.186.191/` | Public marketing site and future 1DentalAI product root. |
| DentalRCM | `http://162.243.186.191:3000/` | Must remain untouched unless an approved phase explicitly changes it. |

## Deployment Principles

- Preserve DentalRCM isolation.
- Keep 1DentalAI deployable independently.
- Avoid vendor lock-in in business logic.
- Keep secrets, connector credentials, and PHI-bearing workflows out of marketing/runtime paths until product foundation is approved.
- Use Docker-friendly deployment on the current DO host for now.
- Future production may move to managed Postgres, managed Redis, object storage, Vercel/DO Apps/Kubernetes, or dedicated customer environments, but business logic should remain portable.

## Environment Modes

| Mode | Purpose | Data rule |
| --- | --- | --- |
| local | Developer work | Synthetic or local-only data. |
| demo | Sales/training | Synthetic demo data only; clearly labeled. |
| staging | Pre-production verification | No live PHI unless explicitly approved and protected. |
| production | Customer live workflow | PHI-safe, audited, tenant-scoped, approval-gated. |

## Required Infrastructure Direction

| Capability | Initial direction | Notes |
| --- | --- | --- |
| App runtime | Next.js in Docker | Current repo already supports Docker. |
| Database | Postgres | Phase 1 should decide Supabase vs DO managed Postgres vs self-hosted Postgres. |
| Queue/jobs | Redis-compatible queue | Needed for connector syncs, PDF jobs, AI jobs, EOB/OCR, reminders. |
| Object storage | S3-compatible storage | Needed for images, PDFs, EOBs, x-rays, recordings, attachments. |
| Secrets | Central secret wrapper | Tenant-owned connector credentials must not be raw env-only. |
| Observability | Structured logs and audit events | Avoid PHI in logs. |
| Email/SMS/phone | Connectors only | No direct product route calls. |
| PDF rendering | Async render jobs | Needed for treatment plans, statements, referrals, appeals. |

## Route Strategy

Near-term:

- Keep marketing pages at public root.
- Future authenticated product app should use `/app` or a future product domain/subdomain after approval.
- Health endpoint remains `/api/health`.

Do not expose product modules publicly until Phase 1 auth/RBAC/audit/demo-live foundations exist.

## Secrets And Credentials

- Vendor credentials must be tenant-scoped through connector installations.
- Application environment secrets are infrastructure secrets only.
- Tenant vendor API keys should not be hardcoded in `.env`.
- Credential rotation must be supported in connector governance.

## Rollback Strategy

- Marketing deploy rollback: revert/push previous commit or redeploy previous container.
- Product module rollback: feature flags and module availability states must allow disabling risky workflows.
- Connector rollback: pause connector installation, revoke credentials, and route to manual fallback.

## Phase 1 Deployment Decision Needed

Phase 1 packet must choose:

- database provider
- auth/session approach
- audit event persistence
- object storage strategy
- queue strategy
- route split between marketing and authenticated app
- whether to convert repo to monorepo now or defer
