# Phase 1 Approval Plan: Core Platform Foundation

Status: Draft for Gaurav approval  
Created: 2026-05-20  
Project: 1DentalAI  
Phase: 1 - Core Platform Foundation  
Coding status: Not started

## 1. Phase Gate

This plan does not approve coding by itself. Coding starts only after Gaurav approves this Phase 1 plan.

Phase 1 must follow the global rule:

- fresh research before implementation
- no shells or placeholder features
- no dead buttons
- no fake connector success
- no product workflow without backend/persistence or truthful unavailable state
- UI must match the current 1DentalAI website style
- browser/screen click testing is required for every visible interaction built in scope
- implementation is tested against this research-backed industry acceptance checklist, not merely against local tests

## 2. Research Baseline

### Industry And Compliance Research

HIPAA minimum-necessary access requires limiting PHI access to the users/classes of users who need it for their job duties. Phase 1 therefore cannot use broad "logged-in means see everything" access. Roles, permission scopes, data classes, and audit events must exist from the foundation.

Dental PMS and DSO products show that multi-location permissions, provider/RDH/staff roles, chair/operatory scheduling, and centralized reporting are standard expectations. Products and references reviewed include Oryx DSO permissions, Purechart multi-location/RBAC positioning, DentTracks custom dental roles, CareStack operatory permissions, Dentrix/PracticeWorks scheduling/operatories references, and current dental operations tools that emphasize chair status and role-based access.

Current dental workflow research also shows that operatories/chairs are not decorative. Room/chair utilization, provider assignment, hygiene blocks, assistant/provider time, room turnover, emergency slots, and staff availability shape the practice day.

### Phase 0 Documents Used

Phase 1 must be checked against:

- `docs/PHASE_0_APPROVAL_PACKET.md`
- `docs/ADR-0001-PHASE-0-REPO-ARCHITECTURE.md`
- `docs/DOCTOR_OWNER_OPERATING_MODEL.md`
- `docs/CANONICAL_DENTAL_MODEL_WORKFLOW_CATALOG.md`
- `docs/DEPLOYMENT_AND_ENVIRONMENT_STRATEGY.md`
- `docs/PHASE_0_VALIDATION_REPORT.md`

### Local Code Findings

Current 1DentalAI repo is a lean Next.js 16 App Router marketing site:

- marketing pages live under `src/app/*`
- shared website style/components live under `src/components` and `src/lib/site-data.ts`
- no auth, database, Prisma, app shell, or product routes exist yet
- `npm run check` currently means lint plus build

This makes Phase 1 a clean foundation build. The authenticated product surface should be added separately from the marketing site, likely under `/app`, without disrupting current public pages.

## 3. Business Objective

Create the first real 1DentalAI product foundation:

- practices, locations, rooms/operatories/chairs
- staff, providers, doctors, RDHs, assistants, front desk, billing, managers
- role-based, location-scoped, module-scoped, data-class-scoped access
- audit events
- demo/live separation
- tenant settings and feature flags
- initial workflow definition/config foundation
- product UI shell that visually matches the marketing website
- truthful unavailable/setup-required module states for out-of-scope domains

This phase creates the operating base for every later phase: PMS, phone, RCM, clinical AI, imaging, eRx, labs, referrals, payments, memberships, and revenue integrity.

## 4. Exact Scope

### Product Surface

Build an authenticated-style product foundation at `/app`.

Since Phase 1 should not require paid auth/vendor activation, use a deterministic local/demo session model with clear demo labeling. The implementation must be truthful: "demo workspace" means synthetic data, not production auth.

Visible product areas in scope:

- App shell
- Practice switcher, read-only for seeded demo practices if multi-practice exists
- Location view
- Team and roles view
- Rooms/operatories/chairs view
- Module availability view
- Audit activity view
- Workflow definitions/settings preview view

### Foundation Data

Use code-defined seed data or lightweight local persistence only if explicitly documented as demo foundation. No live PHI. No external vendor calls.

Entities in scope:

- Practice
- PracticeLocation
- PracticeRoom
- Operatory
- Chair
- ChairStatus
- Provider
- StaffMember
- PracticeUser
- Role
- Permission
- RoleAssignment
- AccessPolicy
- LocationAccess
- ModuleAccess
- AuditEvent
- EnvironmentMode
- TenantSetting
- TenantFeatureFlag
- FeatureAvailability
- WorkflowDefinition
- WorkflowVersion
- WorkflowTemplate
- QueueDefinition
- StatusDefinition

### RBAC

Define role templates:

- Owner dentist
- Associate dentist/provider
- Hygienist/RDH
- Dental assistant
- Front desk
- Treatment coordinator
- Billing/RCM specialist
- Practice manager
- DSO regional manager
- Compliance/security admin
- Support admin

Define permission scopes:

- location
- module
- patient PHI
- clinical
- financial
- payer/RCM
- communications
- settings/admin
- audit/security
- AI governance

The UI should show permission outcomes clearly. For example, a hygienist role may see schedule/chair/clinical items but not full collections. A biller may see financial/RCM modules but not edit clinical findings.

### Truthful Module Availability

Show major 1DentalAI domains as unavailable/setup-required, not active features:

- PMS connector
- Phone/AI receptionist
- RCM/payer
- Clinical AI/scribe
- Imaging AI
- eRx
- Labs/referrals
- Membership/financing/payments
- Reputation/local SEO
- Revenue integrity

Each unavailable module must explain what foundation exists and what future phase is required.

## 5. Explicit Non-Scope

Do not build:

- production auth
- production database migrations
- PMS connector runtime
- phone/SMS/AI voice runtime
- payer/clearinghouse runtime
- claim submission
- payment processing
- eRx
- imaging AI
- clinical AI/scribe execution
- real patient chart/EHR workflows
- real document/PDF generation
- live workflows with PHI
- production marketplace install flow

Any navigation to these areas must be a truthful setup-required state, not a fake module.

## 6. UI/UX Requirements

The UI must match the current 1DentalAI marketing website:

- same visual language: clean white/soft backgrounds, confident product copy, refined cards, dark text, controlled accent colors
- no generic admin template look
- dense enough for dental operators, but still polished
- no oversized marketing hero inside the product app
- no decorative-only cards pretending to be workflows
- every button must work, navigate, filter, toggle, or clearly be disabled with a reason
- compact role/module/chair views should be scannable
- mobile must not overlap text or controls

Required product screens:

- `/app`
- `/app/locations`
- `/app/team`
- `/app/rooms`
- `/app/modules`
- `/app/workflows`
- `/app/audit`

If a page is included, it must have real data and working controls within Phase 1 scope.

## 7. API And Backend Plan

Because no production database is approved yet, use internal service modules with typed seed data and route handlers only where needed.

Required behavior:

- Foundation data loaded from typed domain modules.
- Role/access checks implemented as reusable service functions.
- Route handlers or server actions must back interactive views where data is read/filtered.
- Audit events for foundation interactions that Phase 1 supports.
- No external services.
- No fake "saved successfully" for things not persisted.

If a setting cannot be saved in Phase 1, the UI must say it is read-only until the persistence phase.

## 8. Data/Persistence Plan

No production migration is approved in this phase plan yet.

Implementation option for approval:

- Use typed in-repo demo foundation data for Phase 1.
- Build domain interfaces and service functions so Phase 2/3 can move to Postgres without rewriting UI.
- Persist no live data.
- Clearly label demo/synthetic state.

If Gaurav wants real database persistence in Phase 1, this plan must be updated before coding.

## 9. Security And Compliance Requirements

Phase 1 must demonstrate:

- minimum-necessary access model
- role-scoped module visibility
- location-scoped visibility
- data-class access examples
- audit events for viewed/changed foundation items where applicable
- support/admin access modeled separately
- no live PHI
- no external data egress
- demo/live separation visible in UI

## 10. Industry Acceptance Checklist

Phase 1 is acceptable only if:

- Front desk role does not see clinical note drafts or security admin controls.
- Hygienist/RDH role can see schedule/chair/clinical availability but not full collections by default.
- Biller/RCM role can see financial/RCM availability but cannot edit clinical findings.
- Owner dentist can see practice-wide clinical, operational, financial, and audit foundation.
- DSO regional manager can see location rollups without unnecessary patient-level PHI.
- Support admin role is visible as special and audit-heavy, not normal practice staff.
- Rooms, operatories, chairs, chair status, provider assignment, and staff roles exist as first-class concepts.
- Module availability states are truthful and not fake product modules.
- Workflow definitions exist as versioned configuration concepts.
- UI and interactions match the current 1DentalAI brand style.
- Every visible button/filter/tab/link works or is disabled with an explicit reason.
- Browser click test verifies each included screen.

## 11. Test And Verification Plan

After implementation, run:

- `npm run lint`
- `npm run build`
- `npm run check`
- browser verification of `/app`, `/app/locations`, `/app/team`, `/app/rooms`, `/app/modules`, `/app/workflows`, `/app/audit`
- click every visible button/link/tab/filter/toggle in the Phase 1 product surface
- verify no broken links
- verify no text overlap on desktop and mobile
- verify public marketing site still works

If a dev server is required, start it and test in browser. If current port is busy, use another port.

## 12. Deployment Plan

After Phase 1 passes local verification:

- build locally
- commit changes if requested
- deploy to existing 1DentalAI DO root only after local verification
- preserve DentalRCM at `http://162.243.186.191:3000/`
- verify live `/api/health`
- verify live marketing pages
- verify live `/app` only if deployed

## 13. Approval Decision

Gaurav approval required before coding:

- [ ] Approved as written
- [ ] Approved with edits
- [ ] Not approved
