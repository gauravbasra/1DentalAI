# Generic Renderer Correction

Status: Active product correction  
Date: 2026-05-20

## Problem

The current app overuses generic renderers:

- `src/app/app/modules/page.tsx` renders all product areas with one generic card pattern.
- `src/app/app/work/[slug]/page.tsx` renders every workbench with one generic workbench pattern.

This is not acceptable for 1DentalAI production work. A PMS schedule, perio chart, RCM denial queue, phone inbox, reputation recovery queue, AI Studio, and Local SEO workbench do not have the same users, objects, urgency, data density, actions, or mental model.

## Product Rule

Every major domain must have its own route and component architecture:

- PMS
- patient chart
- perio
- treatment planning
- RCM
- phone/messaging
- reputation
- AI Studio
- Local SEO / AI SEO
- connector setup

Shared components may be used for primitives only: shell, nav, tabs, buttons, status pills, tables, forms, modals, and empty/error states. Shared components must not flatten the domain workflow.

## Required Refactor Direction

Phase 3 must start with PMS-specific pages:

- `/app/pms`
- `/app/pms/patients`
- `/app/pms/patients/[patientId]`
- `/app/pms/schedule`
- `/app/pms/chart/[patientId]`
- `/app/pms/perio/[patientId]`
- `/app/pms/treatment-plans`
- `/app/pms/ledger`
- `/app/pms/insurance`
- `/app/pms/documents`
- `/app/pms/tasks`

After PMS is built, the generic workbench route should become a temporary index/fallback, not the primary product surface.
