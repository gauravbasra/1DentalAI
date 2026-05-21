# AGENTS.md

## Global Development Rule

- Build 1DentalAI in small, explicit phases.
- Before any phase starts, create a written phase plan and get Gaurav's approval.
- Every phase plan must include fresh research: competition, UI/UX, product features, workflows, integrations, database fields, migrations, protocols, handoffs, audit/compliance needs, and verification strategy.
- The approved phase plan is the contract. Code must match the approved plan.
- If implementation reality changes, stop, update the plan, explain the change, and get approval before continuing.
- Items previously marked out of scope are approved as 1DentalAI product scope. They still must be delivered in small production phases with explicit research, implementation, credentials/configuration needs, compliance gates, tests, and user approval before each phase starts.
- No shells, placeholders, fake success responses, dead buttons, decorative-only UI, fake connectors, or pretend production states.
- 1DentalAI is not a prototype, mockup, demo app, or shell. Every screen is part of the production product from Day 1.
- If a capability is not live yet, show a production-grade setup, approval, or integration state. Do not label product surfaces as demo versions.
- Dashboard work-entry cards such as "Where to work today" are not a final product surface. They must be replaced with real role-specific workbench areas where users perform the work: PMS schedule, patient chart, perio charting, RCM queues, phone inbox, forms/intake, treatment plans, imaging, labs/referrals, rooms/chairs, reputation management, AI Studio, Local SEO, AI SEO, campaign/growth marketing, and connector setup.
- Workbench pages must include role-owned queues, actionable buttons, permission checks, truthful setup or blocked states, audit trail, and clear next actions. Text-only descriptions are allowed only as temporary orientation while the production workbench for that phase is being built.
- Do not use one generic module renderer or one generic phase/workbench renderer as the primary product experience. Every major product domain must have its own page/component architecture, data contract, task model, and interaction pattern: PMS is not RCM, perio is not phone, phone is not reputation, AI Studio is not Local SEO, and owner dashboards are not hygienist dashboards.
- Generic components are allowed only as small primitives such as shell, buttons, status pills, tables, tabs, and form controls. They must not determine the workflow, information architecture, task list, or visual structure of a domain-specific page.
- High-level product surfaces must always keep the full dental ecosystem visible: PMS/EHR, scheduling, forms, phone, AI receptionist, chat, reputation, digital marketing, local SEO, AI SEO, AI Studio, RCM, payer workflows, revenue integrity, clinical AI, scribing, charting, perio, imaging, labs, referrals, pharmacy/eRx, patient financing, memberships, payments, analytics, marketplace, security, and DSO controls.
- A phase is not complete until UI, backend, persistence/integration behavior or truthful unavailable state, validation, errors, audit/logging, tests, and verification are complete within that phase's approved scope.

## Product Direction

- 1DentalAI is a full dental AI operating system: phone, AI receptionist, AI chat, reputation, RCM, payer workflows, PMS/EHR/CRM connectivity, payments, scheduling, forms, AI scribing, AI charting, AI perio, analytics, DSO controls, and automation.
- Product layers must remain distinct during planning and implementation: Layer 1 Core PMS, Layer 2 Patient Experience, Layer 3 RCM and Financial Operations, Layer 4 Clinical AI, Layer 5 Enterprise AI Operating System. The active build priority is Core PMS plus patient experience foundations before RCM, Clinical AI, or enterprise AI orchestration.
- Core PMS means patient/family management, scheduling, charting, imaging, treatment planning, insurance, billing, claims, payments, reporting, and the required security/audit controls. Do not call adjacent communications, AI, or RCM surfaces "PMS" unless the true PMS workflow is complete.
- NexHealth and Stedi are launch accelerators, not permanent product dependencies.
- Product workflows must call 1DentalAI-owned routers and connector contracts, not vendor APIs directly.
- Existing DentalRCM remains separate unless a phase plan explicitly approves shared code extraction.

## Current Phase

This repository is currently in Phase 1 core platform foundation:

- Separate repo
- Independent Next.js runtime
- Health endpoint
- DigitalOcean deployment isolation
- Production product surface for core practice views
- High-level product map across the full dental ecosystem
- No live PHI, no fake connectors, no pretend automation
