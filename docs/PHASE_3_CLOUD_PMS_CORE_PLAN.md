# Phase 3 Plan: Cloud PMS Core

Status: Pending approval  
Date: 2026-05-20  
Phase owner: 1DentalAI

## Why This Phase Exists

The current 1DentalAI app has PMS workbenches, connector contracts, and a production Postgres foundation. It does not yet have a true PMS. That is the wrong center of gravity for the product. A dental operating system must start from the PMS spine: patients, families, providers, operatories, schedules, charts, perio, treatment plans, ledger, insurance, documents, imaging, tasks, audit, and permissions.

Phase 3 builds the cloud PMS core first. After that, RCM, phone, reputation, AI Studio, Local SEO, AI scribe, AI perio, imaging, payments, and analytics become workflows around real PMS entities instead of disconnected pages.

## Research Basis

Archy shows the product direction: cloud PMS, scheduling, online forms, insurance verification, lab tracking, reporting, imaging, payments, team management, AI scribe, AI verification, AI communications, and AI reporting in one platform.

Dentrix Ascend shows the cloud PMS benchmark: scheduling, charting, imaging, insurance, claims, ERA/payment posting, patient communications, reminders, forms, treatment presentation, real-time dashboards, and location access restrictions.

Open Dental API shows the canonical dental object map that 1DentalAI should be able to represent internally: appointments, patients, providers, operatories/schedules, procedure logs, treatment plans, benefits, insurance plans, claims, claim payments, perio exams/measures, recalls, tasks, statements, and documents.

Eaglesoft shows mature chairside PMS expectations: clinical charting, perio/PSR, treatment planning, service code configuration, insurance claims, office totals, and role/security features.

Epic is not dental PMS, but it matters for EHR-grade expectations: patient identity, encounter records, orders, clinical documentation, medications, allergies, auditability, RBAC, interoperability, and safe clinical workflows. 1DentalAI should borrow the EHR discipline without becoming a medical-hospital clone.

## Phase Goal

Build the first production-grade cloud PMS vertical slice:

- real database models
- seeded production-safe tenant data
- PMS navigation
- patient search/list
- patient profile
- family/account view
- appointment book
- provider/operatories schedule
- patient chart shell
- odontogram-ready charting model
- perio exam model
- treatment plan model
- ledger/insurance model
- documents/forms model
- tasks and audit trail
- API routes backed by Postgres
- browser click tests
- no fake writebacks

## Product Surfaces

Create these PMS routes:

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

## Database Models

Add Prisma models:

- `PmsPatient`
- `PmsPatientIdentifier`
- `PmsFamilyAccount`
- `PmsProvider`
- `PmsStaffMember`
- `PmsOperatory`
- `PmsAppointment`
- `PmsAppointmentProcedure`
- `PmsMedicalAlert`
- `PmsMedication`
- `PmsAllergy`
- `PmsClinicalNote`
- `PmsToothChart`
- `PmsToothCondition`
- `PmsProcedureCode`
- `PmsProcedureLog`
- `PmsPerioExam`
- `PmsPerioMeasure`
- `PmsTreatmentPlan`
- `PmsTreatmentPlanItem`
- `PmsInsurancePlan`
- `PmsPatientInsurance`
- `PmsBenefitSummary`
- `PmsClaim`
- `PmsLedgerEntry`
- `PmsPayment`
- `PmsDocument`
- `PmsTask`
- `PmsAuditEvent`

## Core Workflows

### Patient Search And Profile

User can:

- search patients by name, phone, DOB, chart number, insurance subscriber, or family account
- open patient profile
- see demographics, contact, emergency contact, alerts, insurance, balance, appointments, open treatment, documents, and communication history placeholders
- navigate to chart, perio, treatment, ledger, insurance, documents, and tasks

### Appointment Book

User can:

- view day schedule by provider and operatory
- see appointment status, patient readiness, forms, insurance, balance, planned procedures, production, and room status
- create a local appointment hold
- move appointment status through allowed local states
- block live external sync until PMS connector policy allows it

### Patient Chart

User can:

- open patient clinical chart
- see medical alerts, allergies, meds, existing conditions, completed procedures, planned treatment, imaging/document evidence, notes, and provider signoff state
- add a local clinical note draft with provider approval status
- route chart item to provider signoff

### Perio

User can:

- open perio exam
- see tooth/site measurement grid
- record local measurements for depths, bleeding, recession, mobility, furcation, plaque/calculus
- mark exam ready for provider review
- block PMS writeback until approved

### Treatment Planning

User can:

- create treatment plan groups
- sequence plan items
- tie items to CDT/procedure code, tooth/surface, fee, insurance estimate, patient portion, status, and provider
- prepare estimate package
- route financing/membership follow-up

### Ledger And Insurance

User can:

- view patient ledger
- see charges, payments, adjustments, insurance estimate, patient balance, claim status, ERA/EOB placeholder state
- open insurance plan and benefit summary
- create claim-ready task when procedure evidence exists

### Documents And Forms

User can:

- see intake forms, consent, insurance card, referral packet, imaging attachment, EOB/ERA upload, and clinical document records
- mark missing documents
- connect document requirement to appointment, claim, or treatment plan

### Tasks And Audit

User can:

- see PMS tasks by role and patient
- assign owner
- complete local task
- see audit trail for patient access and PMS actions

## API Routes

Add:

- `GET /api/pms/patients`
- `GET /api/pms/patients/[patientId]`
- `GET /api/pms/schedule`
- `POST /api/pms/schedule/holds`
- `POST /api/pms/appointments/[appointmentId]/status`
- `GET /api/pms/chart/[patientId]`
- `POST /api/pms/chart/[patientId]/notes`
- `GET /api/pms/perio/[patientId]`
- `POST /api/pms/perio/[patientId]/measurements`
- `GET /api/pms/treatment-plans`
- `POST /api/pms/treatment-plans`
- `GET /api/pms/ledger`
- `GET /api/pms/insurance`
- `GET /api/pms/documents`
- `GET /api/pms/tasks`
- `POST /api/pms/tasks/[taskId]/complete`

## UI Rules

- This must look like a working PMS, not a dashboard.
- First screen should be appointment book, patient search, and work queues.
- Use provider columns, operatory lanes, patient header, tabs, chart panels, perio grid, treatment-plan table, ledger table, and document/task lists.
- Do not use marketing-page hero language.
- Every button must call an API or show a real permission/setup block.

## Acceptance Criteria

- PMS has its own nav and routes.
- Patient search opens a real patient profile from Postgres.
- Schedule renders provider/operatories and appointments from Postgres.
- Patient chart renders clinical data from Postgres.
- Perio renders tooth/site data from Postgres.
- Treatment plans and ledger are linked to patient and procedure entities.
- Insurance and claim-ready data are linked to patient/account.
- Tasks and audit events are persisted.
- Workbench pages link into PMS routes instead of remaining isolated.
- Browser test clicks through patient search, schedule, chart, perio, treatment plan, ledger, insurance, documents, tasks.
- `npm run check`, Prisma validate, migrations, and live DB health pass.

## Out Of Scope For This Phase Only

These remain approved product scope but are not completed in this single PMS-core phase:

- live Dentrix/Open Dental/Eaglesoft/Archy connector sync
- live payer transactions
- live SMS/phone
- live AI scribe/perio voice
- live imaging AI
- live eRx
- live payment processing

The PMS core must create the internal data model these live systems attach to.

## Approval Request

Approve Phase 3 Cloud PMS Core. Once approved, implementation starts with database models and migrated Postgres data, then PMS APIs, then PMS UI, then browser/API verification.
