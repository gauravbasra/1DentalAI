# AGENTS.md

## Global Development Rule

- Build 1DentalAI in small, explicit phases.
- Before any phase starts, create a written phase plan and get Gaurav's approval.
- Every phase plan must include fresh research: competition, UI/UX, product features, workflows, integrations, database fields, migrations, protocols, handoffs, audit/compliance needs, and verification strategy.
- The approved phase plan is the contract. Code must match the approved plan.
- If implementation reality changes, stop, update the plan, explain the change, and get approval before continuing.
- No shells, placeholders, fake success responses, dead buttons, decorative-only UI, fake connectors, or pretend production states.
- A phase is not complete until UI, backend, persistence/integration behavior or truthful unavailable state, validation, errors, audit/logging, tests, and verification are complete within that phase's approved scope.

## Product Direction

- 1DentalAI is a full dental AI operating system: phone, AI receptionist, AI chat, reputation, RCM, payer workflows, PMS/EHR/CRM connectivity, payments, scheduling, forms, AI scribing, AI charting, AI perio, analytics, DSO controls, and automation.
- NexHealth and Stedi are launch accelerators, not permanent product dependencies.
- Product workflows must call 1DentalAI-owned routers and connector contracts, not vendor APIs directly.
- Existing DentalRCM remains separate unless a phase plan explicitly approves shared code extraction.

## Current Phase

This repository is currently in Phase 0 bootstrap only:

- Separate repo
- Independent Next.js runtime
- Health endpoint
- DigitalOcean deployment isolation
- No product feature implementation until the Phase 0 architecture packet is approved
