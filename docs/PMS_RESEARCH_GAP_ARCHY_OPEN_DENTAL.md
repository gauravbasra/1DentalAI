# PMS Research Gap: Archy, Open Dental, Dentrix Ascend, Eaglesoft

## Rejection accepted

The first PMS slice was technically persisted, but it was not PMS-grade. It looked like a SaaS dashboard with PMS labels. A real dental PMS is a working operating system for the practice day: appointment book, family/patient record, account/ledger, treatment planning, clinical chart, perio, imaging/documents, insurance/claims, payments, reporting, recall, lab cases, and management queues.

## Research baseline

### Archy

Archy positions itself as an all-in-one cloud PMS with scheduling, online forms, auto insurance verification, insurance hub, lab case tracking, reporting, charting, treatment planning, imaging, clinical notes, ePrescribe, payments, patient portal, and AI-supported insurance/clinical/communication/billing workflows.

Required product implication:

- Appointment categories must carry durations and default procedure codes.
- Schedule must include ASAP list, huddle, appointment finder, forms, insurance verification, lab case tracking, and production visibility.
- Treatment planning must support multiple options, patient signatures, insurance coverage, frequency limits, and patient financial responsibility.
- Insurance must run from verification through claim submission, attachments, EOB processing, and payment receipt.
- Imaging and clinical charting must be native enough that providers can move from image to diagnosis to treatment plan to note.

### Open Dental

Open Dental exposes the clearest product architecture: seven primary modules:

- Appointments
- Family
- Account
- Treatment Plan
- Chart
- Imaging
- Manage

Open Dental appointment workflows include appointment views, operatories, providers, pinboard, searching for openings, recall scheduling, ASAP list, confirmation list, unscheduled list, insurance verification list, production totals, daily goals, blockouts, lab case status, appointment tasks, routing slips, and appointment history.

Open Dental family workflows include family members, guarantor, clones, super family, recall, patient information, referral, insurance plans, discount plans, and insurance history.

Open Dental account workflows include claims, payments, payment splits, payment plans, family balance, patient balance, insurance estimates, write-offs, claim status history, and audit trail.

Open Dental chart workflows include clinical charting, prescriptions/eRx, perio, treatment planned procedures, progress notes, imaging save/export, and customizable chart layout/colors.

Required product implication:

- 1DentalAI PMS must use module-grade work surfaces, not generic cards.
- Schedule must be a grid/day sheet by time and operatory.
- Patient record must be family/account aware, not a flat demographic row.
- Ledger must allocate payments to charges/claims/procedures.
- Treatment plan must flow from charted procedure to estimate to acceptance to appointment.
- Chart/perio must use dental semantics: teeth, surfaces, conditions, procedure status, perio sites, imaging, and clinical notes.

### Dentrix Ascend

Dentrix Ascend emphasizes cloud access, smart scheduling, reminders, online booking, insurance verification, imaging/AI, voice notes, claims, ERAs, payment posting, patient payments, forms, messaging, and real-time dashboards.

Required product implication:

- Insurance and forms must be visible before seating the patient.
- Schedule and billing cannot be separate islands.
- Imaging and AI charting must live in the provider workflow.
- Payments and ERAs must update the ledger and claim state.

### Eaglesoft / Dentrix classic pattern

Classic systems are dense and operational: appointment book, clinical chart, perio, treatment planning, account ledger, insurance/claims, reports, document center, provider/staff setup, and practice definitions. Users expect fast keyboard/mouse workflows, dense tables, and direct action surfaces.

Required product implication:

- Avoid landing-page spacing inside PMS.
- Use dense data grids, day sheets, timelines, tooth/perio grids, queues, tabs, and status controls.
- Every action must update database state or truthfully be blocked by a missing production dependency.

## Current build gaps

- Schedule was a list, not an operatory appointment book.
- No appointment categories with procedure defaults and durations.
- No blockouts, daily goals, production totals, pinboard, ASAP list, recall, confirmation, lab case risk, or appointment status history.
- Patient record lacked family/guarantor/account mechanics.
- Ledger lacked payment allocation, claim linkage, adjustments, payment plans, and splits.
- Treatment planning lacked phases, options, insurance estimate logic, patient signatures, and scheduling flow.
- Chart/perio lacked odontogram-grade interaction, surfaces, condition colors, planned/completed status, image linkage, procedure progress notes, and provider signoff.
- Insurance lacked payer/plan/benefit frequency logic, verification queue, claim builder, attachments, EOB/ERA posting, and denial/appeal workflow.

## Correction started in this commit

The schedule is being rebuilt first because it forces PMS realism:

- Appointment categories with default CDT codes, duration, color, production type, provider type
- Operatory day sheet grid
- Blockouts
- Appointment status history
- Appointment request/ASAP queue
- Recall queue
- Lab case tracking
- Production totals

Next PMS corrections must extend from this same operating-system pattern:

- Family module
- Account/ledger module
- Chart/odontogram module
- Treatment plan builder
- Insurance and claim center
- Imaging/document center
- Manage module

Sources used:

- Archy operations and clinical product pages
- Dentrix Ascend product pages
- Open Dental manual: modules, appointments, family, chart, account, treatment, claims, payments
- Eaglesoft/Dentrix workflow research and dental office user reports
