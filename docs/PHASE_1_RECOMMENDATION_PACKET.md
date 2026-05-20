# Phase 1 Recommendation Packet: Core Platform Foundation

Status: Draft recommendation, not approved for coding  
Date: 2026-05-20  
Depends on: Phase 0 approval and artifacts

## Recommendation

Start Phase 1 with the Core Platform Foundation.

Do not start with UI-only screens, connectors, phone, RCM, clinical AI, or PMS feature workflows. Those modules all require a secure tenant foundation, RBAC, audit, workflow configuration, and demo/live separation first.

## Business Objective

Create the real operating foundation for 1DentalAI so future phases can safely build production modules without fake states or rework.

## Phase 1 Research Required Before Coding

Fresh Phase 1 research must cover:

- dental SaaS RBAC and role expectations
- HIPAA access-control/audit expectations
- doctor-owner, provider, RDH, assistant, front desk, biller, manager, DSO, support admin roles
- multi-location practice and DSO access patterns
- room/operatory/chair scheduling expectations
- workflow engine configuration patterns
- tenant feature flags and module availability patterns
- Next.js auth/RBAC patterns current to the repo version
- Postgres/Supabase/DO managed Postgres decision

## Proposed Scope

- Authenticated app shell
- Practice, DSO, location foundation
- Users, staff, providers, RDH, assistants, managers
- Roles, permissions, role assignments
- Location/module/data-class/action-scoped access policies
- Rooms, operatories, chairs, chair status foundation
- Audit event foundation
- Demo/live separation
- Tenant settings and feature flags
- Truthful module availability/setup-required states
- Initial workflow definition/config foundation
- Dense operator navigation with no dead buttons

## Explicit Non-Scope

- Live PMS connector
- Live payer/clearinghouse connector
- Phone/SMS provider execution
- Clinical AI or scribe execution
- Imaging AI
- eRx
- Payment processing
- Claim submission
- Patient communications
- PDF generation
- Revenue integrity audits

Non-scope modules may appear only as truthful unavailable/setup-required states if included in navigation.

## Data Models Likely In Scope

- `Practice`
- `PracticeLocation`
- `PracticeRoom`
- `Operatory`
- `Chair`
- `ChairStatus`
- `Provider`
- `StaffMember`
- `PracticeUser`
- `Role`
- `Permission`
- `RoleAssignment`
- `AccessPolicy`
- `LocationAccess`
- `ModuleAccess`
- `AuditEvent`
- `EnvironmentMode`
- `TenantSetting`
- `TenantFeatureFlag`
- `FeatureAvailability`
- `WorkflowDefinition`
- `WorkflowVersion`
- `WorkflowTemplate`
- `QueueDefinition`
- `StatusDefinition`

Final schema requires Phase 1 approval before migrations.

## Industry Acceptance Checklist

Phase 1 is acceptable only if:

- A front desk user cannot see unrelated clinical/financial/admin data.
- A hygienist can access clinical and schedule information needed for hygiene work without default full collections access.
- A biller can work financial/RCM tasks without editing clinical findings.
- A provider can review/sign clinical work assigned to them.
- A DSO/regional manager can view rollups without unnecessary patient-level PHI by default.
- Support/admin access is audited and scoped.
- Demo mode cannot access live data.
- Every visible module state is either functional within scope or truthfully unavailable/setup-required.
- Audit events exist for sensitive access and foundation changes.
- Room/chair/provider/staff concepts exist as first-class setup objects.
- Workflow configuration exists as versioned definitions, even if advanced workflow execution is deferred.

## Verification Plan

Phase 1 should include:

- unit tests for RBAC/access policies
- route/action tests for foundation APIs
- migration verification
- lint/build/test
- browser verification of navigation, role states, and no dead buttons
- manual industry checklist review against the approved Phase 1 research

## Approval Gate

This document is a recommendation only. Before Phase 1 coding starts, create a full Phase 1 plan with fresh research and get Gaurav approval.
