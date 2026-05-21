# PMS Competitive Screen Depth Gap Matrix

Date: 2026-05-21

## Purpose

This is the working comparison for making 1DentalAI PMS production-grade against modern cloud PMS expectations. It compares our current PMS screens and data model against public Archy, Open Dental, and Dentrix Ascend evidence.

Important limitation: Archy and Dentrix Ascend do not expose complete product screens or full internal schemas publicly. Where exact screens are not public, this matrix uses official public product pages, help docs, API docs, and visible workflow descriptions. Open Dental is deeper because its API and schema behavior are openly documented.

## Research Sources Used

- Archy operations: scheduling, online forms, auto-verify, insurance hub, lab tracking, reporting, auto-drafted claims after appointment completion.
- Archy clinical tools: treatment plan options, online signatures, pre-auth workflow, integrated imaging, Pearl AI, x-ray comparison, smart clinical notes auto-attached to appointments/procedure codes.
- Open Dental API patients: duplicate prevention, balances, family/guarantor aging, language, schema dependency.
- Open Dental API appointments: planned appointments, scheduling planned treatment, break appointment, append note, confirm appointment.
- Open Dental FHIR: Patient, Appointment, Practitioner, Procedure, Condition, AllergyIntolerance, Medication, MedicationStatement, Location, Organization.
- Open Dental ClaimProcs: procedure-level estimates, payments, writeoffs, deductible, copay, claim status rules, claim payment tracking.
- Dentrix Ascend official pages/help: connected scheduling, eligibility, digital forms, chart/imaging, payments, claims, real-time dashboards, patient engagement.
- Dentrix Ascend patient visit help: bill-to-insurance procedure flag, claim creation from unattached billable procedures, claim warnings when required treatment data is missing.
- Henry Schein One API Exchange / Ascend platform announcements: approved integration ecosystem, 700+ API endpoints, unified clinical workflow, eligibility, image quality, voice notes, claims/payments.

## Competitive Product Principle

The gap is not only missing fields. Mature PMS products make every field participate in a workflow:

- Patient demographics drive duplicate detection, family balances, forms, communication rules, appointment reminders, eligibility, privacy, and analytics.
- Appointment status drives confirmation, broken appointment workflow, unscheduled list, production, provider utilization, and claim readiness.
- Procedure fields drive charting, treatment plan estimates, insurance estimates, claim line creation, patient portion, writeoff, and provider production.
- Clinical notes and imaging are not documents only; they attach to appointments, procedure codes, claims, treatment plans, and denial prevention.
- Insurance data is not a plan list; it is benefit year, subscriber, coordination of benefits, deductibles, remaining maximum, frequencies, limitations, eligibility source, claimproc/estimate lineage, writeoff rules, and EOB/ERA posting.

## Screen-by-Screen Gap Matrix

| Product area | Competitor depth expected | Current 1DentalAI state | Gap | Build acceptance standard |
| --- | --- | --- | --- | --- |
| Daily command / home | Role-specific daily work: schedule readiness, production, collections, claims exceptions, uncompleted notes, recare, forms, lab cases, unscheduled treatment. Dentrix Ascend markets homepage metrics; Archy emphasizes huddle and automation. | PMS dashboard has metrics and queues, but not enough actionable state machines. | Needs exception-first cockpit with actual links to tasks, claims, patients, notes, labs, recalls, and forms. | Every card links to a filtered work queue. No static metric without drill-down. |
| Patient directory | Search by name/chart/contact; family/guarantor context; active/inactive/non-patient; balances; duplicate detection. Open Dental compares new patient to existing by name, DOB, email/phone. | Patient list exists, create patient exists, basic family account exists. | No true duplicate merge workflow, no inactive/non-patient handling, no language/preferences, no tags, no patient-level access restrictions. | Create patient must surface possible duplicates before insert; merge must preserve audit and linked records. |
| Patient record | Full demographics, guarantor, emergency contact, forms, consent, medical history, language, privacy, communications, family balances, preferred provider/hygienist/pharmacy. | Added admin profile, communication prefs, consent, medical history, pharmacy, safety records. | Still lacks dedupe/merge, language, pronouns, preferred provider/hygienist editing, employer, ID verification, patient photo, portal account, inactive/deceased/minor handling. | Patient profile must be segmented into demographics, family/guarantor, health, consents, communication, portal, insurance, account, timeline, audit. |
| Online forms / intake | Archy: forms auto-sent, kiosk mode, patient answers populate profile, custom medical history/consent forms. Ascend: digital forms, highlighted changes, signatures. | Consent and profile forms are staff-entered only. | No patient-facing form builder, assignments, completion status, field-level review/diff, signature capture, kiosk workflow. | Form responses create pending profile changes requiring review; accepted answers update canonical PMS fields with audit. |
| Schedule | Appointment categories, provider/chair/operatory, preferences, appointment finder, confirmations, waitlist, broken appointment/unscheduled list, production, insurance readiness. Open Dental has confirm/break/note/schedule planned endpoints. | Schedule board, holds, categories, blockouts, recall/request/lab queues exist. | No appointment finder, no conflict engine, no waitlist ranking, no recurring appointments, no confirmation lifecycle, no broken appointment fee/unscheduled list. | Scheduling must prevent conflicts, find slots by duration/provider/chair/preference, move broken visits to unscheduled list, and keep status history. |
| Appointment detail / checkout | Patient popout, appointment procedures, readiness, forms, benefits, copay, payment collection, completed procedures, next appointment, claims. Dentrix creates claims during checkout. | No dedicated appointment detail/checkout screen. | Big gap. | Appointment detail must be the visit control surface: arrive, seat, complete, checkout, collect, schedule next, create claim, trigger post-visit engagement. |
| Clinical chart / odontogram | Tooth/surface charting with existing vs planned vs completed, restorations, conditions, procedure history, images, notes, treatment plan linking. Dentrix Ascend shows chart and imaging together. | Odontogram, conditions, procedure log, notes. | Too shallow: no dental surface morphology, no restoration types/materials, no visual layers, no provider signatures, no procedure lifecycle from treatment plan to completed to claim. | Procedure must carry status, provider, tooth, surfaces, fee, bill-to-insurance flag, diagnosis, note linkage, appointment linkage, claim readiness. |
| Perio | Six-point charting, bleeding, suppuration, recession, furcation, mobility, plaque, calculus, diagnosis, comparisons, voice perio. | Basic perio measure entry. | Needs full mouth grid, measurement history, comparison, diagnosis, maintenance recall automation. | RDH can complete full six-site perio exam and generate recall/clinical note. |
| Clinical notes / scribe | Templates tied to appointment/provider/procedure; completion tracking in huddle; voice notes; structured note creation; signature. Archy notes auto-attach by procedure code. | Free-text notes, simple note types. | No note template builder, no appointment/procedure auto-attach, no signature workflow, no AI scribe queue, no incomplete note huddle. | Notes must have template variables, structured sections, provider signature, linked appointment/procedures, completion status. |
| Imaging | Native image capture, sensors/TWAIN, offline capture, comparisons, AI, image quality. Ascend uses image quality agent; Archy has integrated imaging and Pearl. | Imaging study records only. | No acquisition workflow, mount, image assets, DICOM series/items, annotations, quality score, comparison, claim attachment readiness. | Imaging must support asset/mount metadata, annotation records, AI/quality review status, and claim attachment linkage. |
| Treatment planning | Alternative plans, phases, sequencing, estimates, insurance/frequency limits, patient signature, preauth. | Treatment plans/items, add item, accept status. | Needs alternatives, versioning, presentation, financing, consent, preauth creation, scheduling accepted procedures, acceptance audit. | Accepted treatment must produce schedule-ready procedures, estimates, consent/signature, and optional preauth. |
| Insurance eligibility / benefits | Auto-verify 1-10 days before appointment, exceptions, benefits loaded into patient record. | Plans, coverage, benefit summary, eligibility status. | No eligibility job, source, timestamp, payer transaction, frequency usage, remaining max calculation, portal/API fallback. | Eligibility result must be structured and drive appointment readiness/treatment estimates. |
| Claims / RCM | Auto-draft claim on appointment complete; centralized claims center; attachments; EOB processing; comments/tags/flags. Dentrix requires billable procedures, coverage dates, warnings for missing ortho/treatment data. Open Dental claimprocs deeply model estimates/payments/writeoffs. | Claim creation from ready procedures, claim lines, basic statuses. | No claimproc-equivalent, no preauth, no attachments rules, no EOB/ERA posting, no denial workflow, no comments/tags/SLA. | Claim lifecycle must include claim line estimates, deductible/writeoff/copay, submission readiness, attachments, EOB/ERA payment, denial/appeal tasks. |
| Ledger / payments | Ledger updates, patient payments, statements, autopay, payment plans, credits, allocations. | Ledger entries and payments can be posted. | No allocations, aging by guarantor, payment plans, statement generation, deposits, refunds, family billing logic. | Every payment must allocate to charges or unapplied credit; statements and aging must be reproducible. |
| Documents / consents | Intake, consent, EOB, claim attachments, statements, signatures, patient upload. | Documents exist; consents added separately. | Needs document generation, upload/review workflow, signature capture, template library, attachment bundling. | Any generated PDF must persist, link to patient/claim/appointment, and show signature/review state. |
| Labs | Lab case tracking, due dates, appointments at risk. | Lab cases exist. | No lab slips, digital send, remake, received/seat readiness, provider review. | Crown seat appointment readiness must depend on lab status. |
| Reporting / analytics | Real-time production, collections, team performance, multi-location dashboards. | Basic reports. | No drill-down, no provider/hygiene/case acceptance/AR/claim aging advanced dashboards. | Every KPI must reconcile to source records and drill into filtered rows. |
| Security / audit | SOC2/HIPAA, RBAC, immutable audit, PHI controls. | Roles and audit events exist, no real auth. | Critical gap before live PHI. | Authentication, RBAC enforcement, audit viewer, session controls, PHI masking, BAA/admin controls. |
| Third-party PMS mode | Open Dental/Dentrix style APIs sync canonical records without corrupting source. Open Dental warns API behavior is safe compared with direct DB writes. | No connector adapter yet. | Need connector abstraction and capability map. | Same modules must run on canonical records; writeback only through approved connector actions with explicit status and audit. |

## Canonical Objects We Still Need

The current model is a good start, but not PMS-complete. Add:

- `PmsPatientIdentity`: language, pronouns, photo, ID verification, portal status, deceased/inactive/minor flags.
- `PmsPatientMergeCandidate` and `PmsPatientMergeAudit`.
- `PmsFormTemplate`, `PmsFormAssignment`, `PmsFormResponse`, `PmsFormFieldMapping`, `PmsProfileChangeRequest`.
- `PmsAppointmentConfirmation`, `PmsWaitlistEntry`, `PmsBrokenAppointment`, `PmsCheckoutSession`.
- `PmsProcedureDiagnosis`, `PmsProcedureStatusHistory`, `PmsProcedureFinancial`, `PmsProcedureNoteLink`.
- `PmsClinicalNoteTemplate`, `PmsClinicalNoteSection`, `PmsClinicalSignature`.
- `PmsImageAsset`, `PmsImageMount`, `PmsImageAnnotation`, `PmsImageQualityReview`, `PmsImageClaimAttachment`.
- `PmsEligibilityRequest`, `PmsEligibilityResult`, `PmsBenefitUsage`, `PmsFrequencyRule`.
- `PmsClaimProcedure` equivalent to Open Dental claimproc: estimate/payment/writeoff/deductible/copay per procedure.
- `PmsEra`, `PmsEob`, `PmsDenial`, `PmsAppeal`, `PmsClaimComment`, `PmsClaimFlag`.
- `PmsPaymentAllocation`, `PmsPaymentPlan`, `PmsStatementBatch`, `PmsDeposit`.
- `PmsConnector`, `PmsConnectorCapabilityMap`, `PmsExternalObjectMap`, `PmsWritebackJob`, `PmsSyncCursor`.

## Rebuild Order

### Phase PMS-A: Patient + Forms Foundation

Build patient identity, duplicate prevention, form templates, form assignments, profile-diff review, patient signatures, document generation. This makes intake real and eliminates manual re-entry.

Acceptance:
- Create patient checks duplicate candidates first.
- New patient packet can be assigned.
- Submitted form answers create pending changes.
- Staff can accept/reject each field update.
- Accepted fields update patient/medical/consent/insurance records.
- PDF copy is generated and linked.

### Phase PMS-B: Appointment Detail + Checkout

Build appointment detail as the daily visit surface: readiness, forms, benefits, clinical, procedures, payments, next visit, claim draft.

Acceptance:
- Appointment cannot complete if required checklist fails, unless authorized override is audited.
- Completing appointment completes selected procedures.
- Checkout computes patient due, collects payment, creates next recall/appointment request.
- Completed billable procedures create claim-draft candidates.

### Phase PMS-C: Procedure and ClaimProc Depth

Add Open Dental-style procedure financial model and claim procedure records.

Acceptance:
- Every procedure has bill-to-insurance, fee, provider, clinic/location, tooth/surface, diagnosis/status history.
- Claim procedure stores estimate, deductible, copay, writeoff, insurance paid, patient portion, remarks, tracking status.
- Changes recalculate claim totals and patient portion.

### Phase PMS-D: Insurance and Eligibility

Build eligibility requests/results, structured benefits, limitations, usage/frequency, appointment auto-verify queue.

Acceptance:
- Eligibility result is structured, timestamped, and sourced.
- Benefits drive treatment estimate and appointment readiness.
- Failed/partial verification creates staff task with payer/contact path.

### Phase PMS-E: Clinical Chart + Notes + Imaging

Build real chart depth: restorations, visual layers, note templates, signatures, image assets/mounts/annotations/quality, claim attachments.

Acceptance:
- Clinical note templates attach to appointment/procedure codes.
- Image review can satisfy claim attachment requirements.
- Provider signature freezes note version.

### Phase PMS-F: Ledger, Statements, Payments

Build payment allocation, guarantor aging, statement generation, payment plans, deposits/refunds.

Acceptance:
- Payment allocation is explicit.
- Statement PDF generated from ledger.
- Aging matches guarantor/family account logic.

### Phase PMS-G: Connector Mode

Build adapters for Open Dental first because its API/schema is public and deep; then Dentrix Ascend via authorized API Exchange path.

Acceptance:
- External PMS records map to canonical records.
- Capability map decides what can be read/write.
- No writeback unless connector supports it and approval policy allows it.
- Each sync and writeback has immutable audit.

## Immediate Engineering Rule

Do not add “send,” “call,” “verify,” “submit,” “post,” “generate PDF,” “capture image,” “AI diagnose,” or “writeback” as UI actions unless the backend actually executes that action. If the external connector is not live, label the action as draft/stage/review only and show the exact blocker.

