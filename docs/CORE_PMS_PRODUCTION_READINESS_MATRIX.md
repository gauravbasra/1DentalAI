# Core PMS Production Readiness Matrix

## Current Priority

Active build focus: Layer 1 Core PMS plus patient experience foundations.

## Core PMS Readiness

| Module | Production expectation | Current state | Next build requirement |
| --- | --- | --- | --- |
| Patient management | Demographics, family accounts, guarantors, contacts, notes, consents, insurance profile, medical history | Family/guarantor account exists; patient profile exists; account context appears on patient page | Add consent/forms, dedupe/merge, patient history editor |
| Scheduling | Provider/chair/operatory calendar, blockouts, recurring visits, recall, waitlists, status lifecycle, appointment detail and checkout | Operatory day sheet, pinboard, categories, blockouts, recall/request/lab queues, appointment control surface, checkout sessions, procedure completion, ledger charges, internal claim drafts | Add recurring visits, conflict prevention, double-book rules, confirmation lifecycle |
| Clinical charting | Odontogram, tooth/surface conditions, restorations, procedures, notes, SOAP | Odontogram, tooth conditions, procedure log, notes | Add restoration-specific charting, procedure templates, signed SOAP |
| Perio | Six-point charting, bleeding, recession, mobility, furcation, plaque, comparisons | Basic measurement entry | Add full six-site grid, comparisons, diagnosis and perio maintenance recall |
| Imaging | X-rays, CBCT, intraoral photos, DICOM, storage, patient linkage | Schema has documents, not imaging-grade | Add imaging asset model and patient/chart linkage |
| Treatment planning | Phases, procedures, estimates, insurance estimates, signatures, acceptance | Basic treatment plan tables/list | Build treatment-plan builder and status flow |
| Insurance | Plans, eligibility, fee schedules, benefits, frequency limits, deductibles | Basic insurance tables/list | Add plan editor, benefits/frequency model, eligibility readiness |
| Billing | Ledger, invoices, statements, balances, adjustments, write-offs, posting | Checkout posts completed appointment procedures to the ledger; manual ledger entries still exist | Add allocations, adjustments, statements |
| Claims | Electronic claims, attachments, EOB/ERA, tracking, denial management | Checkout can create an internal READY claim draft from completed procedures and primary insurance; no fake clearinghouse submission | Add attachment rules, EOB/ERA posting, denial workflow |
| Payments | Card/ACH/financing/payment plans/autopay | Checkout records patient payment and audit-backed checkout session; manual posting still exists | Add payment allocation, payment plan model |
| Reporting | Production, collections, provider, scheduling, insurance aging | Dashboard counters only | Add PMS reports with database-backed aggregations |
| Security/audit | Staff auth, roles, PHI access, immutable audit | Audit tables exist; no login gate | Add staff identity/session/RBAC before live PHI |

## Non-Negotiable Rule

A module is not production-ready until it has durable data, real workflow actions, validation, audit trail, error handling, and a UI that matches how dental offices actually work.
