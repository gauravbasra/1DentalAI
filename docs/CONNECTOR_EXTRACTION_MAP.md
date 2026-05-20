# Connector Extraction Map

Status: Phase 0 implementation artifact  
Date: 2026-05-20

## Principle

1DentalAI owns connector routing, capability maps, cost telemetry, credential policy, approval policy, and fallback behavior. Product workflows do not call vendor APIs directly.

## Connector Categories

| Connector | Purpose | First source/input | Key capabilities |
| --- | --- | --- | --- |
| `PmsConnector` | PMS/EHR sync and writeback | DentalRCM PMS adapters, Open Dental/Archy research | Patients, appointments, providers, operatories, procedures, chart, perio, claims, documents, ledgers |
| `InsuranceTransactionConnector` | Payer and clearinghouse transactions | DentalRCM Stedi/EDI patterns | Eligibility, benefits, claims, claim status, ERA/EOB, attachments, prior auth, payer routing |
| `CommunicationConnector` | Phone/SMS/chat/fax/email | Outreachhubphonesystem | Calls, SMS, MMS, softphone, voicemail, fax, transcription, call pop, emergency intake |
| `ReputationConnector` | Reviews and listing reputation | Outreachhubphonesystem plus market research | Review requests, review monitoring, AI drafts, posting approvals, service recovery |
| `MarketingConnector` | Campaigns, ads, attribution | Outreachhubphonesystem | Email/SMS campaigns, landing pages, referral campaigns, local/AI SEO |
| `PaymentConnector` | Payments and ledger handoff | Phone app patterns, payment research | Payment links, card/ACH, refunds, reconciliation, ledger writeback |
| `FinancingConnector` | Third-party patient financing | Financial product research | Applications, offers, decisions, agreements, disclosures |
| `MembershipPlanConnector` | Membership/discount plan platforms | Financial product research | Plans, tiers, enrollment, renewals, discounts, PMS fee schedules |
| `PharmacyConnector` | eRx and medication history | Surescripts/eRx research | NewRx, renewals, changes, cancel, EPCS, medication history, formulary |
| `LabConnector` | Lab/prosthetic workflows | Archy/PMS/lab research | Lab orders, case status, scan files, shipping, results/remakes |
| `ReferralConnector` | Specialist/hospital handoffs | Doctor-owner research | Referral packets, secure delivery, status, returned reports |
| `ImagingConnector` | X-ray/CBCT/imaging systems | Imaging/DICOM research | Image import, DICOM, findings, overlays, measurements |
| `DeviceConnector` | Devices and chairside tools | Practice ops research | Sensors, scanners, kiosks, phones, signature pads, health |
| `AiProviderConnector` | AI/LLM/STT/TTS/imaging AI | Clinical AI research | Scribe, voice, chat, clinical review, image findings, safety policy |
| `AnalyticsConnector` | BI/export/SIEM/accounting | DSO research | Warehouse, reports, audit exports, accounting, SIEM |

## Shared Connector Contract

Every connector must define:

- metadata and version
- marketplace listing metadata
- auth/credential requirements
- PHI/PII/data-class policy
- BAA/subprocessor/compliance profile
- capability map by object/action
- read/write/webhook/batch/realtime/manual-fallback support
- setup test
- smoke test
- health check
- retry/idempotency behavior
- rate limits and usage limits
- cost telemetry events
- audit event mapping
- approval policy requirements
- error states and operator-facing blocker copy
- deprecation/versioning policy

## Router Layers

| Router | Calls connectors | Must decide |
| --- | --- | --- |
| PMS router | PMS connectors and synchronizers | Which source is authoritative, read/write scope, conflict behavior |
| Payer transaction router | Clearinghouse, direct payer, portal/RPA/manual | Eligibility/claim/ERA route, cost, payer support, fallback |
| Communications router | Phone/SMS/chat/fax/email | Consent, channel, quiet hours, emergency escalation |
| Reputation/growth router | Review/listing/marketing connectors | Approval, posting policy, attribution |
| Financial products router | Payment/financing/membership connectors | Offer eligibility, agreement, billing cadence, writeback |
| Clinical AI router | AI scribe/chart/perio providers | Provider approval, source evidence, finalization |
| Imaging AI router | Imaging and model connectors | Review workflow, regulatory status, evidence linking |
| Pharmacy/eRx router | eRx vendors | Prescriber authority, EPCS, pharmacy route, safety alerts |
| Lab/referral router | Labs and specialists | Packet completeness, delivery, status, follow-up |
| Analytics/export router | BI/SIEM/accounting | Scope, PHI minimization, schedule, audit |

## Extraction Notes

DentalRCM connector code should be extracted for patterns, not blindly copied. Where existing code is vendor-specific, wrap it behind the connector SDK. Where it is incomplete, the industry acceptance checklist defines the missing work.

Outreachhubphonesystem communication provider code should be ported as provider and policy concepts. The static UI and local JSON store should not become production architecture.
