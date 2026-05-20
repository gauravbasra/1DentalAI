# AGENTS.md

## Global Development Rule

- Build 1DentalAI in small, explicit phases.
- Before any phase starts, create a written phase plan and get Gaurav's approval.
- Every phase plan must include fresh research: competition, UI/UX, product features, workflows, integrations, database fields, migrations, protocols, handoffs, audit/compliance needs, and verification strategy.
- The approved phase plan is the contract. Code must match the approved plan.
- If implementation reality changes, stop, update the plan, explain the change, and get approval before continuing.
- No shells, placeholders, fake success responses, dead buttons, decorative-only UI, fake connectors, or pretend production states.
- 1DentalAI is not a prototype, mockup, demo app, or shell. Every screen is part of the production product from Day 1.
- If a capability is not live yet, show a production-grade setup, approval, or integration state. Do not label product surfaces as demo versions.
- High-level product surfaces must always keep the full dental ecosystem visible: PMS/EHR, scheduling, forms, phone, AI receptionist, chat, reputation, digital marketing, local SEO, AI SEO, AI Studio, RCM, payer workflows, revenue integrity, clinical AI, scribing, charting, perio, imaging, labs, referrals, pharmacy/eRx, patient financing, memberships, payments, analytics, marketplace, security, and DSO controls.
- A phase is not complete until UI, backend, persistence/integration behavior or truthful unavailable state, validation, errors, audit/logging, tests, and verification are complete within that phase's approved scope.

## Product Direction

- 1DentalAI is a full dental AI operating system: phone, AI receptionist, AI chat, reputation, RCM, payer workflows, PMS/EHR/CRM connectivity, payments, scheduling, forms, AI scribing, AI charting, AI perio, analytics, DSO controls, and automation.
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
