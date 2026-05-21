# Core PMS Production Readiness Matrix

## Current Priority

Active build focus: Layer 1 Core PMS plus patient experience foundations.

## Core PMS Readiness

| Module | Production expectation | Current state | Next build requirement |
| --- | --- | --- | --- |
| Patient management | Demographics, family accounts, guarantors, contacts, notes, consents, insurance profile, medical history | Family/guarantor account exists; patient profile exists; account context appears on patient page | Add consent/forms, dedupe/merge, patient history editor |
| Scheduling | Provider/chair/operatory calendar, blockouts, recurring visits, recall, waitlists, status lifecycle | Operatory day sheet, pinboard, categories, blockouts, recall/request/lab queues | Add recurring visits, conflict prevention, double-book rules, confirmation lifecycle |
| Clinical charting | Odontogram, tooth/surface conditions, restorations, procedures, notes, SOAP | Odontogram, tooth conditions, procedure log, notes | Add restoration-specific charting, procedure templates, signed SOAP |
| Perio | Six-point charting, bleeding, recession, mobility, furcation, plaque, comparisons | Basic measurement entry | Add full six-site grid, comparisons, diagnosis and perio maintenance recall |
| Imaging | X-rays, CBCT, intraoral photos, DICOM, storage, patient linkage | Schema has documents, not imaging-grade | Add imaging asset model and patient/chart linkage |
| Treatment planning | Phases, procedures, estimates, insurance estimates, signatures, acceptance | Basic treatment plan tables/list | Build treatment-plan builder and status flow |
| Insurance | Plans, eligibility, fee schedules, benefits, frequency limits, deductibles | Basic insurance tables/list | Add plan editor, benefits/frequency model, eligibility readiness |
| Billing | Ledger, invoices, statements, balances, adjustments, write-offs, posting | Basic ledger entries | Add charge posting from accepted/completed procedures, adjustments, statements |
| Claims | Electronic claims, attachments, EOB/ERA, tracking, denial management | Basic claim table | Add claim builder from completed procedures and insurance profile |
| Payments | Card/ACH/financing/payment plans/autopay | Basic payment table | Add posting workflow, payment allocation, payment plan model |
| Reporting | Production, collections, provider, scheduling, insurance aging | Dashboard counters only | Add PMS reports with database-backed aggregations |
| Security/audit | Staff auth, roles, PHI access, immutable audit | Audit tables exist; no login gate | Add staff identity/session/RBAC before live PHI |

## Non-Negotiable Rule

A module is not production-ready until it has durable data, real workflow actions, validation, audit trail, error handling, and a UI that matches how dental offices actually work.
