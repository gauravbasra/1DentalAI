# Phase 0 Approval Packet: Research, Reuse, Architecture, And Phase Gate

Status: Draft for Gaurav approval  
Created: 2026-05-20  
Project: 1DentalAI  
Phase: 0 - Program Architecture And Repo Strategy  
Coding status: No product feature coding started in this phase

## 1. Phase 0 Rule

Phase 0 exists to make the next build move precise.

Before any product implementation starts, we will research the market and workflow, inspect the source apps, identify reuse candidates, define the architecture, and get Gaurav's approval. The approved plan becomes the contract for the next phase. If reality changes during implementation, coding stops until the plan is updated and re-approved.

No shells. No placeholders. No fake connector success. No dead buttons. No public feature claims that the product cannot actually support.

Source-of-truth rule: local repos are implementation inputs and reusable accelerators, not the authority. The authority for every phase is current industry research, competitor/workflow research, regulatory/compliance research, integration/protocol research, and Gaurav's approved phase plan derived from that research.

Validation rule: every phase will be tested against its own research baseline for completeness and industry acceptability. Passing local tests is necessary but not sufficient if the workflow is incomplete from a dental practice, doctor-owner, payer, patient, or compliance lens.

## 2. Source Apps Access Confirmed

| Source | Local path | Repo role | Access status |
| --- | --- | --- | --- |
| 1DentalAI | `/Users/gauravbasra/Developer/1DentalAI` | New product repo and live marketing site | Confirmed |
| DentalRCM | `/Users/gauravbasra/Developer/dentalrcm` | RCM, payer, PMS, connector governance, DentalRCM process logic | Confirmed |
| Phone/Reputation/AI Studio/SEO | `/Users/gauravbasra/Developer/Outreachhubphonesystem` | Phone, SMS, reputation, campaigns, AI studio, local SEO, AI SEO, provider policy, workflow contracts | Confirmed |
| OutreachHub Enterprise | `/Users/gauravbasra/Developer/outreachhub-enterprise-app` | Possible extra reusable enterprise/marketing patterns | Available as secondary reference, not primary after repo clarification |

## 3. Current 1DentalAI Baseline

The 1DentalAI repo is currently a separate Next.js app with a production-deployed marketing website and health endpoint. It is hosted at `http://162.243.186.191/`. DentalRCM remains isolated at `http://162.243.186.191:3000/`.

Existing `AGENTS.md` already captures the global rule:

- Build in small approved phases.
- Each phase requires research and a written plan.
- Approved plan and code must match.
- No shells, placeholders, fake success, dead buttons, or pretend production states.
- Existing DentalRCM remains separate unless a phase plan explicitly approves shared code extraction.

## 4. Research Summary

### Competitive Product Patterns

PatientXpress sets the all-in-one AI dental operating system bar: clinical notes, insurance verification, patient communication, digital registration, billing, SmartCaller-style patient lookup, reporting, AI receptionist, two-way texting, online scheduling, reputation, team chat, treatment plans, voice perio, x-ray integration, and unified web app expectations.

Weave sets the communications and practice growth workflow bar: phones, call pop, reviews, billing/payments, missed-call text, online scheduling, appointment reminders, forms, softphones, phone analytics, PMS writeback, and DSO/service-organization positioning.

Flex Dental sets the Open Dental-depth bar: real-time Open Dental integration, recalls, two-way texting, reminders, treatment planning, forms, mobile, intraoffice chat, instant photo capture, online scheduling, payments, statements, financing, analytics, and automated eligibility.

Archy sets the cloud-native PMS plus native AI bar: scheduling, online forms, insurance auto-verification, lab case tracking, reporting, patient communication, charting, treatment planning, imaging, clinical notes, ePrescribe, online scheduling, reviews, marketing source tracking, team chat, time tracking, payments, A/R reporting, mobile access, AI scribe, voice perio, AI verification, AI communications, AI revenue, and natural-language reporting.

The product standard for 1DentalAI is not a wrapper around one vendor or a thin marketing shell. It is an owned dental AI operating system that combines:

- AI phone and receptionist
- AI chat and patient messaging
- Reputation and local growth
- Scheduling, forms, reminders, recalls, reactivation
- Payments, financing, balances, and collections
- RCM, eligibility, claims, denials, ERA/EOB, payer workflows
- Clinical AI, scribing, charting, perio, treatment plan support
- DSO controls, audit, cost telemetry, routing, approval policies

### Clinical AI Product Patterns

The clinical AI market is already splitting into several product categories, and 1DentalAI has to cover them as first-class product domains rather than treating them as future side modules.

Clinical scribe and charting products are selling speed and accuracy at the chair: ambient listening, dental-specific SOAP/procedure notes, provider review, CDT suggestions, insurance narratives, and PMS-ready documentation. The architectural implication is that 1DentalAI needs a clinical documentation pipeline, not just a generic transcript summarizer.

Voice perio products are selling assistant-free periodontal charting: probing depths, bleeding, recession, mobility, furcation, plaque/calculus, perio diagnosis support, and provider review. The architectural implication is that 1DentalAI needs structured perio data capture, dental voice parsing, confidence/error review, and PMS chart writeback controls.

Dental imaging AI products are selling caries, bone-loss, calculus, restorations, anatomy/tooth numbering, radiographic overlays, patient education, claim evidence, and treatment planning support. The architectural implication is that 1DentalAI needs imaging ingestion, DICOM/image metadata, model output storage, clinician review, diagnostic disclaimers, FDA/regulatory awareness, and evidence packet linking.

Treatment planning AI products are selling case acceptance, code suggestions, patient-friendly explanations, financing/payment handoff, clinical evidence, and follow-up automation. The architectural implication is that treatment plans must connect clinical findings, imaging evidence, insurance benefits, estimates, financing, patient messaging, and claim readiness.

Practice AI products are also expanding beyond patient and RCM workflows into SOPs, huddles, lab cases, referrals, inventory, HR, compliance, team coaching, local SEO, AI SEO, and marketing analytics. The architectural implication is that 1DentalAI needs a practice operations layer, not only a patient workflow layer.

### Integration And Protocol Research

PMS/EHR connectivity requires an owned routing layer. NexHealth-style synchronizers can accelerate access to multiple PMS/EHR systems, but 1DentalAI must call its own PMS router, not product-code vendor APIs. Open Dental deserves the first owned direct PMS connector because its REST API covers dental resources such as appointments, patients, benefits, claims, insurance plans, perio exams/measures, procedure logs, providers, recalls, schedules, statements, tasks, and treatment plans.

Archy should be treated as both a PMS integration target and a PMS capability benchmark. If Archy exposes usable APIs or approved partnership paths, 1DentalAI should support it through the PMS router. Independently, 1DentalAI's own product architecture should match or exceed the PMS capabilities Archy is bundling natively: cloud scheduling, charting, imaging, clinical notes, eRx, communications, forms, insurance verification, lab cases, payments, reporting, time tracking, team chat, and AI agents.

Payer connectivity requires an owned payer transaction router. Stedi-style clearinghouse APIs can accelerate eligibility, dental claims, claim status, acknowledgments, ERAs, attachments, and testing, but 1DentalAI must own transaction selection, capability maps, payer registry, routing policies, cost telemetry, and fallback workflows.

Communication connectivity requires an owned communications router. The phone repo already has Twilio-compatible webhooks, mock telephony, provider gating, SMS workflows, call state transitions, softphone actions, and audit events. Future providers such as SIP/PBX, Telnyx, Bandwidth, RingCentral, Asterisk, or FreeSWITCH should sit behind the same internal interface.

Reputation and growth connectivity requires a reputation connector category with Google Business Profile, review request, review response, campaign attribution, local SEO, AI SEO, and approval-controlled posting.

### Industry Rules And Compliance Research

HIPAA Security Rule expectations require administrative, physical, and technical safeguards for electronic protected health information. 1DentalAI must therefore treat audit, access control, encryption, PHI-safe logs, BAA/subprocessor state, least privilege, environment separation, and security risk management as core product behavior.

Patient communications require consent, opt-out, quiet-hour, call recording disclosure, AI disclosure, and message purpose controls. Phone/SMS, AI voice, review requests, payment reminders, recalls, and campaigns cannot be treated as generic marketing automation.

Payer workflows require transaction evidence, eligibility/benefit traceability, payer IDs/trading partner details, claim validation, acknowledgments, ERAs/EOBs, exception handling, and human approval for submissions, writebacks, appeals, and payments.

## 5. Local Reuse Findings

### DentalRCM Reuse

DentalRCM already contains a meaningful connector and RCM foundation. It is not a finished owned connector network, but it has the right reusable bones.

DentalRCM is a reuse source, not the source of truth. Any DentalRCM workflow we carry forward must be tested against current RCM research, payer workflow expectations, industry documentation requirements, and the approved 1DentalAI phase plan before it is considered acceptable.

Reusable assets:

- Adapter registry
- Integration requirements
- Setup workflow
- Credential vault
- Integration action guard
- Smoke test service
- Integration readiness service
- PMS adapter interface
- Canonical PMS models
- NexHealth client/sync foundations
- Stedi eligibility/client/benefit normalizer foundations
- Integration run lifecycle
- EDI transaction persistence
- RCM claim, claim line, ERA, payer profile, credentialing, document, task, and audit patterns
- Revenue integrity, leakage, underpayment, denial recovery, EOB/ERA reconciliation, appeal, write-off review, and historical claim review patterns
- Patient engagement endpoint ideas for AI phone, reviews, forms, recalls, reminders, payment links, financing prompts, and voice routing

Known limitations:

- Direct Open Dental and Dentrix adapters are not production-complete.
- Vendor-specific paths exist and must be moved behind owned 1DentalAI routers.
- Some routes are scaffolded around generic vendor calls and need stronger canonical builders/parsers.
- Cost telemetry is absent.
- Payer registry/trading partner routing is not complete enough for national payer coverage.

Phase 0 conclusion: reuse DentalRCM as source material for connector governance, RCM process logic, data model migration, and audit patterns. Do not merge the full app wholesale.

Reuse rule: if DentalRCM has an implementation that is narrower than the researched workflow, the researched workflow wins and the implementation must be expanded or rejected.

### Phone/Reputation/AI Studio/SEO Reuse

The phone system repo contains phone, reputation, AI studio, local SEO, AI SEO, campaigns, forms, surveys, payments, insurance, fax, team chat, provider orchestration, policy gates, raw payloads, domain events, and audit events.

The phone system repo is also a reuse source, not the source of truth. Phone, reputation, communications, SEO, campaign, and AI-studio workflows must be validated against current market expectations, dental workflows, patient communication rules, consent requirements, and the approved 1DentalAI plan.

Reusable assets:

- Telephony state machine
- Mock and Twilio telephony provider pattern
- Provider-neutral adapter thinking
- Twilio voice and SMS webhook runbooks
- Softphone workflow contracts
- Call pop and caller context workflow
- Two-way SMS, missed-call text, missed-text auto-reply, bulk text, reminders, recalls, waitlist, scheduling, forms, reviews, surveys, email marketing, payments, insurance, fax, team chat workflows
- Integration orchestration and tenant-owned credential ingestion
- Provider approval policy
- PHI/PII/data-class gating
- Raw payload, domain event, canonical profile, and audit-event pattern
- AI runtime and agentic bot governance ideas
- UI contract audit discipline

Known limitations:

- Current persistence is local JSON in staging, not production Postgres.
- Static HTML/vanilla JS UI is not the right long-term 1DentalAI product UI foundation.
- Live provider calls are intentionally gated behind credentials, approvals, BAA posture, and policy controls.
- It should be ported as workflow/domain logic, not copied as a finished production app.

Phase 0 conclusion: reuse the workflow contracts, provider policy, communications domain, and QA discipline. Rebuild UI and persistence inside the 1DentalAI platform.

## 6. Proposed Architecture Decision

1DentalAI stays its own repo and product. DentalRCM and the phone/reputation app become source systems for extraction and porting.

Recommended target shape:

- `apps/web`: 1DentalAI web application, marketing plus future authenticated product surface
- `packages/domain`: canonical dental models and shared types
- `packages/connectors`: connector SDK interfaces and adapters
- `packages/connector-governance`: setup, credential, readiness, smoke test, action guard, audit, cost telemetry
- `packages/rcm`: payer, eligibility, claims, denials, ERA/EOB, credentialing, RCM process logic
- `packages/comms`: phone, SMS, chat, reminders, call events, softphone, communications timeline
- `packages/reputation-growth`: reviews, surveys, campaigns, local SEO, AI SEO, service recovery
- `packages/clinical-ai`: scribing, clinical notes, charting, perio, diagnosis-support workflow, clinician review
- `packages/imaging-ai`: radiograph/image ingestion, model outputs, overlays, findings, claim evidence, treatment evidence
- `packages/treatment`: treatment plans, case presentation, estimates, acceptance, financing, follow-up
- `packages/practice-ops`: huddles, tasks, lab cases, referrals, inventory, SOPs, HR/admin workflows
- `packages/analytics`: practice intelligence, DSO rollups, payer performance, growth attribution, AI impact
- `packages/ai-governance`: AI provider policy, data-class gates, prompt/tool audit, approval workflow

If we keep the current single-app Next.js structure for one more phase, the same boundaries should be represented as `src/domain`, `src/connectors`, `src/modules/rcm`, `src/modules/comms`, `src/modules/reputation-growth`, `src/modules/clinical-ai`, `src/modules/imaging-ai`, `src/modules/treatment`, `src/modules/practice-ops`, `src/modules/analytics`, and `src/modules/ai-governance` until a monorepo conversion is explicitly approved.

## 6A. Full Product Domain Architecture

The product architecture must include every major dental operating domain from the beginning, even if later phases implement them one at a time.

Detailed doctor-owner operating workflows live in [Doctor-Owner Operating Model](./DOCTOR_OWNER_OPERATING_MODEL.md).

### Platform Foundation

- Practice, DSO, location, room, operatory, chair, provider, doctor, RDH, assistant, front desk, billing, manager, team, role, permission, audit, feature availability, demo/live mode
- Patient identity, source evidence, PHI-safe audit, consent, approvals, task ownership
- Navigation and truth states that can show configured, blocked, unavailable, manual fallback, or ready
- Location-scoped, role-scoped, and responsibility-scoped access so users only see what they need
- Tenant-configurable workflow templates, rules, forms, approvals, automations, and module visibility

### 1DentalAI PMS Layer

1DentalAI should not only integrate with PMS systems. It should also grow toward an owned PMS-grade operating layer that can run core practice workflows where a tenant wants 1DentalAI as the primary system of action.

- Patient and household records
- Provider, RDH, assistant, staff, room, operatory, and chair setup
- Scheduling and appointment finder
- Appointment categories with default procedure codes and default lengths
- ASAP/waitlist
- Morning huddle
- Online forms and consent packets
- Medical history, allergies, medications, alerts
- Restorative and existing-condition charting
- Perio charting
- Treatment planning and patient signatures
- Imaging and x-ray review
- Clinical notes and custom templates
- ePrescribe
- Insurance plans, benefits, verification, frequency limits
- Claims, claim notes, attachments, and needs-attention flags
- Lab case tracking
- Payments, text-to-pay, statements, A/R reporting
- Patient communications
- Online scheduling
- Reviews and marketing source tracking
- Team chat
- Time tracking
- Mobile access to schedule, patient communication, notes, and x-rays
- Reporting and natural-language analytics
- AI scribe, AI verification, AI revenue, AI communications, and AI reporting agents

PMS layer rule: 1DentalAI can integrate with external PMS platforms, but its internal domain model must be strong enough to represent PMS-grade scheduling, charting, billing, clinical, imaging, communication, lab, staff, and reporting workflows without being shaped by one vendor.

### Modular Workflow Engine

- Workflow templates by domain, role, and practice type
- Tenant-specific workflow overrides
- DSO-level workflow templates inherited by locations
- Location-level customization
- Provider/RDH/team-specific task routing
- Rule builder for eligibility, reminders, recalls, reviews, membership, financing, claims, clinical review, chair flow, and approvals
- Form builder and packet builder
- Communication template builder
- AI prompt/tool policy builder
- Approval policy builder
- Work queue designer
- Status and stage designer
- SLA/deadline/escalation designer
- Automation schedule builder
- Trigger/action workflow designer
- Workflow versioning and rollback
- Sandbox/test run for workflow changes
- Change approval and audit trail
- Import/export of workflow templates
- Marketplace workflow packs
- API/webhook extension points
- No-code configuration where safe, code/plugin extension where needed

### Connector And Data Control Plane

- PMS/EHR/CRM connectors
- Payer/clearinghouse/direct-payer connectors
- Phone/SMS/chat connectors
- Reputation/listing connectors
- Payment/financing connectors
- Imaging/device/document connectors
- Pharmacy/eRx connectors
- Lab connectors
- Referral partner connectors
- Clinical AI connectors
- Local SEO/AI SEO connectors
- Marketing/ad platform connectors
- AI model/provider connectors
- Capability maps, routing, fallback, setup tests, smoke tests, cost telemetry, approval policies

### Front Office And Communications

- AI phone
- AI receptionist
- AI chat
- Call pop
- Softphone
- Two-way texting
- Unified inbox
- Appointment reminders
- Recalls/reactivation
- Digital forms
- Team chat
- Fax/document intake
- Call recording, transcription, summaries, QA, coaching

### Growth, Reputation, And Marketing

- Review requests
- Review monitoring
- AI review response drafts
- Service recovery
- Local SEO
- AI SEO
- Campaign studio
- Referral tracking
- Reactivation campaigns
- Treatment follow-up campaigns
- Google Business Profile/listing workflows
- Attribution from campaign to booked patient, treatment, production, and review

### Revenue Cycle And Payer Operations

- Eligibility and benefits
- Insurance capture and correction
- Insurance credentialing and payer enrollment
- Provider/entity/location credentialing readiness
- Revenue integrity
- Historical claim audits
- Past claim checks for missed revenue
- Underpayment detection
- Missed charge and unbilled procedure detection
- Bad write-off and contract variance detection
- Patient estimates
- Prior authorization and predetermination
- Claim scrubber
- Dental claim submission
- Attachments and evidence packets
- Claim status
- ERA/EOB ingestion
- Payment posting recommendations
- Denials and appeals
- Underpayment detection
- Revenue recovery workqueues
- Credentialing and payer enrollment
- Payer registry, aliases, trading partner readiness, transaction capability map

### Doctor-Owner Clinical And Business Control

- Full patient EHR/chart review before care
- Emergency triage and after-hours escalation
- Doctor callback workflow
- Hospital/ER and specialist referral handoffs
- Credentialing blockers before billing or provider onboarding
- EOB/ERA posting and underpayment review
- Historical claim checks and revenue leakage recovery
- SOP adherence and process deviation tracking
- PDF generation for treatment plans, referrals, appeals, statements, consents, post-op instructions, and owner reports
- Incident, quality, and corrective-action tracking

### Clinical AI

- Ambient dental scribe
- Visit transcript capture
- SOAP/procedure note generation
- Clinical note templates by visit type
- CDT suggestion support
- Insurance narrative drafting
- Patient follow-up instructions
- Clinical documentation improvement checks
- Provider review, edit, sign, and writeback workflow
- Audit trail for source transcript, model output, provider edits, final note, and PMS writeback

### AI Charting And Perio

- Voice perio charting
- Tooth/surface-aware dental charting
- Probing depths
- Bleeding on probing
- Suppuration
- Recession
- Mobility
- Furcation
- Plaque/calculus
- Missing teeth, implants, crowns, restorations, existing conditions
- Structured chart review queue
- Confidence/error flags
- PMS chart writeback behind approval

### Imaging AI

- Radiograph/image import
- DICOM and common image metadata
- Tooth numbering and anatomy detection support
- Caries, bone loss, calculus, restoration, pathology finding workflow
- AI overlay review
- Clinician accept/reject/correct findings
- Patient education visuals
- Claim attachment and evidence linking
- Treatment plan evidence linking
- Regulatory/FDA status metadata for model outputs

### Treatment Planning And Case Acceptance

- Treatment plan creation/import
- Procedure grouping and sequencing
- Clinical evidence and imaging evidence
- Benefit/coverage-aware estimate
- Patient financing offers
- In-house payment plan options
- Membership/discount plan eligibility
- Practice plan/subscription eligibility
- Patient-friendly explanation
- Financing/payment option handoff
- Consent and document capture
- Case presentation tracking
- Accepted/declined/deferred outcomes
- Treatment follow-up automation
- Claim readiness handoff

### Patient Financial Products

- Patient financing marketplace
- In-house payment plans
- Card-on-file agreements
- Recurring billing
- Membership plans
- Discount plans
- Preventive care plans
- Perio maintenance plans
- Family plans
- Employer/group plans
- DSO-level plan templates
- Practice plan subscription management
- Plan enrollment forms and signatures
- Fee schedule/discount attachment
- Membership renewal and cancellation
- Failed payment recovery
- Plan eligibility during treatment presentation
- Production and recurring revenue analytics
- PMS writeback for membership status, fee schedule, documents, and payment records

### Practice Operations

- Rooms, operatories, and chairs
- Chair occupancy and status
- Provider schedules
- Doctor/RDH/assistant assignment
- Staff availability
- Room turnover
- Hygiene/provider production blocks
- Multi-location staff routing
- Morning huddle
- Task queues
- SOP and policy knowledge base
- Lab case tracking
- Referral management
- Inventory and supply intelligence
- Equipment/service maintenance
- HR/admin onboarding
- Compliance tasks
- Staff coaching and quality review

### Analytics And DSO Intelligence

- Practice command center
- DSO rollups
- Location/provider/payer performance
- Front office conversion
- Call answer/missed opportunity metrics
- Review and local SEO performance
- Treatment acceptance
- Hygiene recall performance
- RCM leakage
- Denial root cause
- Underpayment recovery
- AI productivity impact
- Connector cost and margin telemetry

## 6B. Dental Ecosystem Coverage Map

This map is the coverage guardrail for future phase plans. A future phase may implement only a small approved slice, but the architecture cannot ignore any of these dental ecosystem domains.

| Domain | Workflows 1DentalAI must account for | Connector/vendor needs |
| --- | --- | --- |
| PMS/EHR core | Patient chart, family/account, scheduling, provider/operatory, medical history, allergies, meds, notes, tasks, ledgers, recalls, fee schedules, treatment plans, charting, imaging, eRx, lab cases, team/time tracking, reporting | Open Dental, Dentrix, Eaglesoft, Denticon, Curve, CareStack, tab32, Oryx, axiUm, Archy, Cloud 9, enterprise PMS, connector/sync partners |
| Scheduling and front desk | Online scheduling, confirmations, waitlist, recare, recall, reactivation, no-show recovery, check-in/out, forms, consent, estimates, room/chair assignment, provider/RDH assignment | PMS schedule APIs, patient comms, forms/signature, payment, eligibility, room/operatory status |
| Phone and patient comms | AI receptionist, calls, softphone, voicemail, fax, SMS/MMS, chat, email, call recording, transcription, summaries, QA | Telecom carriers, SIP/PBX, Twilio-style providers, fax, STT/TTS, AI voice, email |
| Reputation and growth | Reviews, responses, service recovery, listings, local SEO, AI SEO, campaigns, referral marketing, attribution | Google Business Profile, review sites, SEO tools, ad platforms, CRM, call tracking |
| RCM and insurance | Eligibility, benefits, estimates, predetermination, prior auth, claims, attachments, claim status, ERA/EOB, denials, appeals, underpayments | Clearinghouses, payer APIs, payer portals, attachment networks, OCR, document storage |
| Revenue integrity | Historical claim checks, missed revenue, underpayments, contract variances, bad write-offs, unbilled procedures, missed secondary claims, credentialing leakage, attachment-denial patterns, recoverable opportunities | PMS ledger, claims, ERA/EOB, fee schedules, payer contracts, credentialing, document/evidence, DentalRCM reuse |
| Credentialing and payer enrollment | Provider profiles, payer applications, CAQH, NPI, license, malpractice, W-9, contracts, EFT/ERA enrollment, recredentialing, expirations | Credentialing platforms, payer portals, CAQH/NPI/source verification, document storage |
| Payer registry | Payer aliases, payer IDs, trading partners, transaction support, enrollment status, documentation rules, timely filing | Clearinghouse networks, direct payer APIs, payer manuals, policy sources |
| Clinical documentation | Ambient scribe, SOAP notes, procedure notes, narratives, CDT suggestions, provider review/sign, writeback | PMS/EHR, AI scribe vendors, LLM/STT, document storage |
| Charting and odontogram | Existing conditions, restorations, tooth/surface charting, diagnosis, treatment chart, provider approvals | PMS chart APIs, dental chart engines, voice charting |
| Perio | Perio exams, probing, bleeding, recession, mobility, furcation, diagnosis, SRP evidence, maintenance tracking | PMS perio APIs, voice perio, imaging, payer documentation |
| Imaging and x-ray | Bitewings, PAs, pano, ceph, CBCT, intraoral photos, DICOM, overlays, measurements, image quality, patient education | Imaging systems, sensors, DICOM/PACS, radiograph AI, CBCT vendors, cloud imaging |
| Clinical AI diagnostics | Caries, bone loss, calculus, restorations, pathology support, risk flags, treatment evidence, claim evidence | FDA-aware AI imaging vendors, model registry, review/correction workflows |
| Treatment planning | Treatment options, sequencing, case presentation, benefits, estimates, financing, consent, acceptance, follow-up | PMS treatment plans, imaging, financing, payments, forms, patient portal |
| Patient financial products | Memberships, discounts, subscriptions, in-house payment plans, third-party financing, card-on-file, recurring billing | Financing providers, payment processors, membership platforms, PMS fee schedules |
| Payments and collections | Payment links, in-office payments, statements, recurring payments, refunds, reconciliations, ledger posting | Payment processors, ACH, card vaults, financing, PMS ledger writeback |
| Pharmacy and eRx | Prescriptions, EPCS, refill/change/cancel, medication history, formulary/RTPB, drug/allergy checks | Surescripts-network vendors, DoseSpot/ScriptSure/DrFirst/NewCrop-style vendors, pharmacy networks |
| Labs and prosthetics | Lab cases, orders, due dates, shipments, remake/issues, scanner files, crowns, bridges, dentures, appliances, aligners | Dental labs, lab portals, intraoral scanners, CAD/CAM, shipping APIs |
| Referrals and specialists | Outbound/inbound referrals, referral packets, imaging/chart attachments, specialist updates, outcome tracking | Specialist portals, secure messaging, imaging/document exchange |
| Emergency and triage | Emergency intake, red flags, doctor callback, urgent slots, after-hours escalation, ER/hospital referral, self-care instructions pending visit | Phone/AI receptionist, secure photo intake, provider schedule, referral network, hospital/specialist contacts |
| Orthodontics and aligners | Ortho records, ceph/pano, photos, scans, aligner cases, progress tracking, refinements, retention | Ortho PMS, aligner vendors, scanner vendors, imaging/ceph tools |
| Oral surgery and implants | Implant planning, CBCT, surgical guides, sedation, consent, post-op, grafts, claims/evidence | CBCT, implant planning software, labs, pharmacy, anesthesia/sedation documentation |
| Endodontics | Endo diagnosis, PA imaging, canal treatment notes, referrals, post-op imaging, claim evidence | Imaging, specialist referrals, PMS charting, payer docs |
| Pediatrics | Guardian/household consent, school forms, recalls, behavior notes, fluoride/sealants, growth tracking | Forms/signatures, family accounts, comms |
| Sleep/airway/TMJ | Screening, appliances, medical insurance crossover, referrals, sleep study docs, device/lab workflows | Medical claims/RCM, labs, referrals, document exchange |
| Teledentistry | Virtual consults, async photos, triage, prescriptions, referrals, follow-up, consent | Video, forms, imaging/photo intake, eRx, scheduling |
| Inventory and procurement | Supplies, implants, materials, reorder points, vendor purchasing, cost tracking, expiry/lot tracking | Supply vendors, procurement systems, accounting |
| Equipment and IT | Device inventory, imaging machines, sensors, phone devices, kiosks, maintenance, support, managed IT | Device vendors, MSP/IT providers, monitoring, ticketing |
| HR and team ops | Huddles, training, SOPs, staffing, performance, call coaching, compliance training | LMS/HR, payroll, internal knowledge base |
| Rooms/chair utilization | Operatory setup, chair occupancy, room status, turnover, provider/RDH utilization, schedule capacity, production by chair | PMS schedules, chair sensors/future devices, staff scheduling, analytics |
| Compliance and security | HIPAA, TCPA, consent, call recording, EPCS, audit, access, BAA/subprocessors, incident response, retention | Identity, SIEM, audit exports, consent systems, vendor compliance records |
| SOPs and quality | SOPs, training, acknowledgements, workflow bindings, deviations, quality audits, incidents, corrective actions | Knowledge base, LMS/training, audit/reporting, AI policy engine |
| Document/PDF generation | Treatment plan PDFs, consents, statements, appeals, referral packets, post-op instructions, clinical summaries, owner reports | PDF renderer, e-signature, fax/email/portal delivery, PMS document writeback |
| Analytics and DSO | Production, collections, AR, payer performance, phone performance, growth, reputation, clinical productivity, AI ROI | BI/data warehouse, accounting, PMS exports, connector cost telemetry |
| Workflow customization | Tenant templates, DSO templates, location overrides, rules, approvals, forms, queues, automations, escalations, workflow marketplace packs | Workflow engine, rules engine, template marketplace, webhook/API/plugin extensions |

Phase planning rule: every phase packet must state which ecosystem domains it touches, which domains it intentionally does not touch, and what truth state the UI will show for untouched domains.

Workflow customization rule: every phase packet must state which behavior is hardcoded product logic, which behavior is tenant-configurable, which behavior is DSO-inherited, and which behavior is locked for compliance/safety.

Research validation rule: every phase packet must include an industry acceptance checklist. That checklist must be based on fresh research and must be used during final verification. The implementation is not acceptable just because it matches an existing repo pattern.

## 7. Connector Control Plane Direction

1DentalAI must own routing and capability maps.

Core connector categories:

- `PmsConnector`
- `InsuranceTransactionConnector`
- `CommunicationConnector`
- `ReputationConnector`
- `PaymentConnector`
- `FinancingConnector`
- `ClinicalConnector`
- `ImagingConnector`
- `DeviceConnector`
- `PharmacyConnector`
- `LabConnector`
- `ReferralConnector`
- `MarketingConnector`
- `SeoConnector`
- `ReviewPlatformConnector`
- `MembershipPlanConnector`
- `SubscriptionBillingConnector`
- `PatientPlanConnector`
- `CrmConnector`
- `DocumentConnector`
- `AiProviderConnector`
- `AnalyticsConnector`

Every connector must expose:

- Metadata and version
- Auth requirements
- Capability map
- Supported objects and operations
- Read/write/webhook/batch/real-time/fallback support
- Health checks
- Setup tests
- Webhook verification
- Retry and idempotency behavior
- Cost telemetry
- PHI/PII/data class posture
- Approval policy requirements
- Audit event contract

Product workflows must call 1DentalAI-owned routers:

- PMS router
- Payer transaction router
- Communications router
- Reputation/growth router
- Payment router
- Financing router
- Patient financial products router
- Membership/subscription router
- Clinical AI router
- Imaging AI router
- Pharmacy/eRx router
- Lab router
- Referral router
- Marketing/SEO router
- Treatment planning router
- Practice operations router
- Analytics/export router
- Document/evidence router

They must not call vendor APIs directly.

## 7A. Vendor Marketplace And Integration Ecosystem

1DentalAI needs a marketplace/control plane for vendors across every operating domain. This is not a decorative app-store page. It is the operational system that tells a practice which vendors are available, which capabilities are live, what data can flow, what approvals are required, what it costs, and what fallback exists when a connector is not available.

Marketplace categories:

- PMS/EHR: Open Dental, Dentrix, Eaglesoft, Denticon, Curve, CareStack, tab32, Oryx, axiUm, Archy, Cloud 9, and connector/synchronizer partners
- Payer/clearinghouse: eligibility, benefits, dental claims, claim status, ERA/EOB, attachments, prior auth, payer portal, direct payer APIs, and clearinghouse networks
- Phone/SMS/voice: Twilio-style providers, SIP/PBX, carrier trunks, softphone providers, call recording, transcription, voicemail, fax, AI voice, call QA
- AI clinical: scribe, charting, perio, treatment planning, clinical note review, CDT suggestions, narrative drafting
- Imaging: radiograph AI, CBCT, intraoral camera, sensors, imaging management systems, overlay/review systems
- Pharmacy/eRx: Surescripts-network vendors, DoseSpot-style, ScriptSure-style, DrFirst/NewCrop-style, EPCS, medication history, formulary/RTPB, refill/change/cancel workflows
- Labs/devices: dental labs, lab case portals, intraoral scanners, mills, 3D printers, aligner workflows, appliance workflows, shipment tracking
- Payments/financing: card processing, ACH, payment links, payment plans, lending/financing, statements, ledger posting
- Patient financial products: membership plans, discount plans, in-house payment plans, card-on-file, recurring billing, patient financing networks, subscription plan administrators
- Reputation/listings: Google Business Profile, reviews, Facebook, Yelp, healthcare review sources, listings, local SEO, AI SEO, review response posting
- Marketing/CRM: email, SMS campaigns, ads, landing pages, web chat, lead forms, referral campaigns, call tracking, attribution
- Documents/storage: forms, consent, signatures, fax, attachment clearinghouses, object storage, OCR
- Analytics/export: BI, data warehouse, accounting, SIEM, compliance exports, DSO reporting

Marketplace records needed:

- `Vendor`
- `VendorProduct`
- `VendorCategory`
- `VendorCapability`
- `VendorRegion`
- `VendorComplianceProfile`
- `VendorSubprocessorStatus`
- `VendorContract`
- `VendorCredentialRequirement`
- `VendorConnectorDefinition`
- `VendorConnectorVersion`
- `VendorCertification`
- `VendorCostSchedule`
- `VendorIncident`
- `MarketplaceListing`
- `MarketplaceInstallationRequest`
- `MarketplaceApproval`

Connector certification requirements:

- API contract documented
- Auth method documented
- PHI/PII data classes declared
- BAA/subprocessor status recorded
- Required credentials listed
- Webhook signature verification documented
- Retry/idempotency rules documented
- Rate limits documented
- Cost model documented
- Failure modes documented
- Setup test implemented
- Smoke test implemented
- Sandbox/test mode available or truthful unavailable state implemented
- Audit events mapped
- Support/escalation contact captured
- Version and deprecation policy captured

Marketplace user workflows:

- Admin browses available vendors by category and PMS/region/support status
- Admin compares capabilities, cost, data access, BAA/subprocessor posture, and limitations
- Admin requests installation
- Compliance/admin approves vendor and data classes
- Admin enters tenant-owned credentials
- 1DentalAI runs setup tests and smoke tests
- Connector becomes active only after policy, credential, and health gates pass
- Operators see live/setup-required/degraded/manual-fallback states in product workflows
- Connector usage emits cost events and audit events
- Admin can pause, rotate credentials, revoke, or replace connector

Marketplace rule: no workflow may pretend a connector works just because a vendor exists in the marketplace. A listing means available. An installation means configured. A healthy capability means usable for a specific practice/location/workflow/action.

## 8. Data Model Direction

Phase 0 does not approve migrations. It defines the model direction for the next approved phase.

Core platform models needed:

- `Practice`
- `PracticeLocation`
- `PracticeRoom`
- `Operatory`
- `Chair`
- `ChairStatus`
- `ChairOccupancyEvent`
- `Provider`
- `ProviderCredential`
- `ProviderSchedule`
- `ProviderAvailability`
- `ProviderProductionGoal`
- `StaffMember`
- `StaffCredential`
- `StaffSchedule`
- `StaffAssignment`
- `Team`
- `TeamMembership`
- `PracticeUser`
- `Role`
- `Permission`
- `PermissionScope`
- `AccessPolicy`
- `RoleAssignment`
- `LocationAccess`
- `ModuleAccess`
- `PatientAccessGrant`
- `ProviderAccessGrant`
- `WorkQueueAccess`
- `AuditEvent`
- `FeatureAvailability`
- `EnvironmentMode`
- `TenantSetting`
- `TenantFeatureFlag`
- `TenantOverride`
- `DsoTemplate`
- `LocationOverride`

Workflow engine models needed:

- `WorkflowDefinition`
- `WorkflowVersion`
- `WorkflowTemplate`
- `WorkflowPack`
- `WorkflowInstance`
- `WorkflowStage`
- `WorkflowTransition`
- `WorkflowRule`
- `WorkflowTrigger`
- `WorkflowAction`
- `WorkflowCondition`
- `WorkflowVariable`
- `WorkflowAssignmentRule`
- `WorkflowSlaPolicy`
- `WorkflowEscalationPolicy`
- `WorkflowApprovalPolicy`
- `WorkflowChangeRequest`
- `WorkflowTestRun`
- `WorkflowAuditEvent`
- `QueueDefinition`
- `QueueView`
- `QueueFilter`
- `StatusDefinition`
- `StageDefinition`
- `FormDefinition`
- `FormVersion`
- `FormPacketDefinition`
- `TemplateDefinition`
- `CommunicationTemplate`
- `AiPromptPolicy`
- `AiToolPolicy`
- `WebhookSubscription`
- `ApiExtension`
- `PluginInstallation`
- `MarketplaceWorkflowPack`

Connector models needed:

- `ConnectorDefinition`
- `ConnectorInstallation`
- `ConnectorCapability`
- `ConnectorCredential`
- `ConnectorRun`
- `ConnectorWebhookEvent`
- `ConnectorCostEvent`
- `ConnectorApprovalPolicy`
- `ConnectorFallbackPolicy`
- `ConnectorRouteDecision`
- `ConnectorHealthCheck`
- `ConnectorSmokeTestResult`
- `ConnectorDataClassPolicy`
- `ConnectorVersion`
- `ConnectorIncident`
- `ConnectorSlaMetric`
- `ConnectorUsageLimit`
- `ConnectorCertification`

Marketplace and vendor models needed:

- `Vendor`
- `VendorProduct`
- `VendorCategory`
- `VendorCapability`
- `VendorComplianceProfile`
- `VendorSubprocessorStatus`
- `VendorCredentialRequirement`
- `VendorCostSchedule`
- `VendorContract`
- `VendorCertification`
- `MarketplaceListing`
- `MarketplaceInstallationRequest`
- `MarketplaceApproval`
- `VendorIncident`

Doctor-owner operations models needed:

- `EmergencyCase`
- `TriageAssessment`
- `TriageQuestionnaire`
- `TriageDisposition`
- `EmergencyInstruction`
- `DoctorCallback`
- `AfterHoursEscalation`
- `UrgentReferral`
- `EmergencySlot`
- `CredentialingProfile`
- `PayerEnrollment`
- `PayerApplication`
- `CredentialingDocument`
- `CredentialingTask`
- `CredentialingStatusEvent`
- `PayerContract`
- `FeeScheduleContract`
- `EftEnrollment`
- `EraEnrollment`
- `CaqhProfile`
- `CredentialExpiration`
- `RecredentialingCycle`
- `EobDocument`
- `EraTransaction`
- `RemittanceAdvice`
- `RemittanceClaim`
- `RemittanceLine`
- `AdjustmentCode`
- `DenialReason`
- `PaymentPostingBatch`
- `PaymentPostingItem`
- `DepositReconciliation`
- `UnderpaymentFinding`
- `AppealCase`
- `CorrectedClaim`
- `WriteOffReview`
- `RevenueIntegrityAudit`
- `HistoricalClaimReview`
- `RevenueLeakageFinding`
- `LeakageType`
- `RecoverableOpportunity`
- `RecoveryCase`
- `RecoveryAction`
- `RecoveryEvidence`
- `RecoveryDeadline`
- `RecoveredRevenueEvent`
- `WriteOffVariance`
- `ContractVariance`
- `MissedChargeFinding`
- `DuplicateChargeFinding`
- `UnbilledProcedureFinding`
- `SecondaryClaimOpportunity`
- `CredentialingLeakageFinding`
- `AttachmentDenialPattern`
- `PayerUnderpaymentPattern`
- `SopVersion`
- `SopAcknowledgement`
- `SopWorkflowBinding`
- `TrainingAssignment`
- `TrainingCompletion`
- `ProcessDeviation`
- `QualityAudit`
- `IncidentReport`
- `CorrectiveAction`
- `DocumentTemplate`
- `DocumentTemplateVersion`
- `GeneratedDocument`
- `PdfRenderJob`
- `DocumentSignature`
- `DocumentDelivery`
- `DocumentArchive`

Canonical dental models needed:

Detailed workflow definitions for each canonical model live in [Canonical Dental Model Workflow Catalog](./CANONICAL_DENTAL_MODEL_WORKFLOW_CATALOG.md).

- `Patient`
- `PatientIdentifier`
- `PatientContactPoint`
- `PatientDemographic`
- `PatientPreference`
- `PatientConsent`
- `PatientAlert`
- `PatientMedicalHistory`
- `PatientAllergy`
- `PatientMedication`
- `PatientProblem`
- `PatientVitals`
- `Appointment`
- `AppointmentCategory`
- `AppointmentFinderRule`
- `AsapListEntry`
- `WaitlistEntry`
- `AppointmentProvider`
- `AppointmentProcedure`
- `ScheduleBlock`
- `InsurancePlan`
- `InsuranceSubscriber`
- `InsuranceCarrier`
- `InsuranceBenefit`
- `InsuranceVerification`
- `Coverage`
- `TreatmentPlan`
- `Procedure`
- `ProcedureCode`
- `ProcedureSurface`
- `ProcedureTooth`
- `Diagnosis`
- `Claim`
- `ClaimLine`
- `EraPayment`
- `PatientBalance`
- `Payment`
- `PaymentPlan`
- `PaymentPlanSchedule`
- `PaymentPlanInstallment`
- `PaymentMethod`
- `CardOnFileAgreement`
- `Statement`
- `PatientFinancingApplication`
- `PatientFinancingOffer`
- `PatientFinancingDecision`
- `PatientFinancingAgreement`
- `MembershipPlan`
- `MembershipPlanTier`
- `MembershipPlanBenefit`
- `MembershipEnrollment`
- `MembershipDependent`
- `MembershipRenewal`
- `MembershipCancellation`
- `MembershipPayment`
- `DiscountPlan`
- `PracticePlan`
- `PracticePlanTemplate`
- `PlanEligibilityRule`
- `PlanFeeSchedule`
- `PlanEnrollmentForm`
- `PlanConsentSignature`
- `RecurringBillingProfile`
- `FailedPaymentEvent`
- `CommunicationThread`
- `CommunicationMessage`
- `ClinicalNote`
- `ClinicalTranscript`
- `ClinicalNoteDraft`
- `ClinicalReview`
- `DentalChart`
- `DentalChartFinding`
- `Tooth`
- `ToothSurface`
- `OdontogramCondition`
- `Restoration`
- `ExistingCondition`
- `PerioExam`
- `PerioMeasure`
- `PerioDiagnosis`
- `PerioTreatmentPlan`
- `ImageStudy`
- `ImageAsset`
- `RadiographSeries`
- `RadiographImage`
- `DicomStudy`
- `DicomSeries`
- `DicomInstance`
- `ImageFinding`
- `ImageAnnotation`
- `ImageOverlay`
- `ImageMeasurement`
- `AiModelOutput`
- `AiFindingReview`
- `TreatmentPlanCase`
- `TreatmentPlanOption`
- `TreatmentPlanAcceptance`
- `Prescription`
- `PrescriptionMedication`
- `Pharmacy`
- `ErxTransaction`
- `ErxRenewalRequest`
- `ErxChangeRequest`
- `MedicationHistoryRequest`
- `DrugInteractionAlert`
- `FormularyBenefitCheck`
- `LabCase`
- `LabOrder`
- `LabVendor`
- `LabShipment`
- `LabResult`
- `Referral`
- `ReferralPartner`
- `ReferralAttachment`
- `SpecialistCommunication`
- `Device`
- `DeviceConnection`
- `IntraoralScannerCase`
- `CbctScan`
- `Document`
- `DocumentType`
- `Attachment`
- `AttachmentRequirement`
- `EvidencePacket`
- `SourceEvidence`

Practice operations models needed:

- `PracticeTask`
- `MorningHuddle`
- `TimeClockEntry`
- `StaffTimeOffRequest`
- `PayrollExport`
- `RoomTurnoverTask`
- `ChairUtilizationMetric`
- `ProviderUtilizationMetric`
- `StaffUtilizationMetric`
- `Referral`
- `InventoryItem`
- `EquipmentAsset`
- `SopDocument`
- `ComplianceTask`
- `StaffCoachingNote`

### Canonical Model Research Notes

The model list must remain broader than the first build phase because dental data is not only PMS demographics plus claims.

X-ray and imaging workflows need study/series/image/finding/annotation concepts so radiographs, CBCT, intraoral photos, AI overlays, measurements, patient education, treatment evidence, and claim attachments are all traceable. A single `ImageAsset` is not enough.

Pharmacy and eRx workflows need prescription, medication, pharmacy, renewal, change, cancel, medication history, formulary/benefit, drug interaction, allergy, and EPCS-aware approval models. Dental eRx commonly flows through networks such as Surescripts and vendors such as DoseSpot, ScriptSure, NewCrop, or DrFirst-style integrations, and it cannot be treated as a generic note.

Lab workflows need lab vendor, lab order, case, shipment, result, due date, appointment linkage, scanner linkage, and remake/issue tracking. This connects crown/bridge, aligner, denture, implant, night guard, and appliance workflows to appointments and treatment plans.

Referral workflows need referral partners, specialist communication, referral packet, status, appointment result, and inbound/outbound handoffs. Oral surgery, endodontics, orthodontics, periodontics, implant, pathology, and imaging referrals need evidence and follow-up tracking.

Device workflows need device and device connection records for intraoral scanners, imaging systems, CBCT, sensors, phone/SIP devices, kiosks, signature pads, and future chairside capture devices.

Patient financial products need their own models because dental practices sell care through several financial paths: third-party financing, in-house payment plans, recurring card-on-file plans, uninsured membership/discount plans, preventive care subscriptions, perio maintenance plans, family plans, and DSO/practice plan templates. These workflows must connect treatment plans, estimates, eligibility rules, fee schedules, signed agreements, recurring payments, failed-payment recovery, PMS membership/discount writeback, and recurring revenue analytics.

Practice operations need first-class room, chair, provider, RDH, assistant, and staff models because dental production depends on physical capacity and team assignment. A schedule is not enough. The product needs to know which room/chair is occupied, which provider or hygienist owns the appointment, which assistant is assigned, whether the room is turning over, and how utilization affects production, wait time, missed opportunities, and patient flow.

Role-based access is a platform foundation requirement. A front desk user should not see clinical note drafts unless granted. A hygienist should not see full financial collections by default. A biller should not edit clinical findings. A DSO regional manager should see rollups without unnecessary patient-level PHI unless a workflow requires drilldown. Every module needs location, role, responsibility, data-class, and action-level permission checks.

Modularity is a product requirement. Workflows cannot be hardcoded around one imagined dental office. A single-location general dentist, a perio office, an ortho group, an oral surgery office, an FQHC, and a DSO central billing team will need different statuses, queues, approvals, SLAs, forms, templates, routing rules, and automations. 1DentalAI must ship opinionated best-practice workflow templates but allow tenant-safe customization with versioning, test runs, rollback, approval, and audit.

## 9. UI/UX Direction

Competitors win by making daily office work obvious. 1DentalAI should not start as a giant admin console.

Primary product surfaces:

- Operator command center: what needs attention now, why, evidence, next safe action
- Patient 360: patient, appointment, phone/SMS/chat, forms, insurance, treatment, balance, claim, review, clinical context
- Unified inbox: calls, texts, chats, forms, appointment requests, review responses, payment replies, internal tasks
- Connector control center: setup, readiness, cost, approval policies, smoke tests, failure states
- RCM workbench: eligibility, benefits, estimates, claims, attachments, denials, ERA/EOB, underpayments
- Growth/reputation workbench: review requests, responses, service recovery, recalls, reactivation, local/AI SEO
- Clinical workbench: scribe drafts, chart notes, perio exams, imaging findings, treatment evidence, provider review
- Treatment workbench: treatment options, estimates, financing, patient explanations, acceptance, follow-up
- Patient financial products workbench: financing offers, in-house payment plans, memberships, practice plans, recurring billing, failed payments, renewals
- Practice operations workbench: huddles, tasks, lab/referral/inventory/SOP/compliance workflows
- DSO intelligence workbench: locations, providers, payer performance, communications, RCM leakage, growth, AI productivity
- AI control center: allowed actions, confidence, citations, tools, human approval, audit trail

UI rule: any visible control must have a backend path or a truthful setup-required/unavailable state. No future-looking active buttons.

## 10. Phase 0 Deliverables To Complete After Approval

If this packet is approved, Phase 0 implementation should produce documentation and architecture artifacts only:

- Architecture decision record for repo strategy
- Reuse matrix for DentalRCM and phone/reputation/SEO source apps
- Connector extraction map
- Data model migration map from `Rcm*` and phone-app JSON concepts to generalized 1DentalAI models
- Deployment topology note preserving DentalRCM at `:3000` and 1DentalAI at root
- Environment strategy for local, demo, staging, production
- First phase recommendation packet for Phase 1

No product feature UI, auth, connector runtime, database migration, AI action, payer transaction, phone live path, review posting, or PMS writeback should be built in Phase 0 without separate approval.

## 11. Recommended Next Phase

The first build phase should be Phase 1: Core Platform Foundation.

Why:

- Connector, phone, reputation, RCM, and clinical workflows all need the same practice/location/user/audit/demo/live foundation.
- Building UI-first before practice boundaries and audit would create rework.
- Building connector-first before platform boundaries risks leaking tenant, PHI, and approval assumptions.

Phase 1 should build:

- Authenticated app shell
- Practice/location/provider/user model
- Rooms, operatories, chairs, chair status, and staff/provider assignment foundation
- Role and permission model
- Location-scoped and module-scoped access control
- Data-class and action-level access policies for PHI, financial, clinical, payer, communications, and admin data
- Demo/live separation
- Audit event foundation
- Feature availability/setup-required truth states
- Tenant settings and feature flag foundation
- Initial workflow/template configuration foundation with versioned definitions, audit, and truthful locked/unavailable states
- Dense operator-oriented navigation
- Product dashboard that only exposes real completed foundation actions and truthful unavailable module states

Phase 1 should not build phone, RCM, payer, PMS, reputation, or clinical feature workflows yet. Those start in later approved phases once the foundation can enforce ownership, audit, and safety.

## 12. Validation Checklist

Research used:

- PatientXpress feature research: https://www.patientxpress.us/features
- Weave dental product research: https://www.getweave.com/industry/dentistry/
- Flex Dental feature research: https://flex.dental/
- Denti.AI scribe, voice perio, and imaging research: https://www.denti.ai/
- MintyNotes dental AI charting research: https://mintynotes.ai/
- Muntra dental ambient scribe and perio charting research: https://muntra.ai/
- OraCore ambient dental scribe research: https://oracoreai.com/oracore-dental-platform/ambient-ai-scribe/
- ChatPerio voice perio research: https://www.chatperio.com/
- Dental Document practice AI research: https://dentaldocument.com/
- Flex membership plan workflow research: https://flexdental.zendesk.com/hc/en-us/articles/13393660838676
- Flex financing option research: https://flexdental.zendesk.com/hc/en-us/articles/4537610123540-Financing-Options
- DentalHQ membership plan platform research: https://dentalhq.com/
- Smile Advantage membership/payment research: https://smileadvantage.com/
- PatientPayments dental payment, financing, and membership research: https://www.patientpayments.com/Dental-PatientPayments
- ADA CDT and claim form research: https://www.ada.org/publications/cdt
- Archy all-in-one PMS and AI platform research: https://www.archy.com/
- Archy operations, scheduling, auto-verify, lab cases, reporting, and mobile research: https://www.archy.com/platform/operations
- Archy clinical tools, imaging, treatment planning, eRx, and Pearl AI research: https://www.archy.com/platform/clinical-tools
- Archy AI scribe launch research: https://www.prnewswire.com/news-releases/archy-launches-native-ai-scribe-inside-its-dental-pms-302760729.html
- Archy Intelligence agent research: https://www.archy.com/ai
- Dentrix Ascend all-in-one dental workflow research: https://www.dentrixascend.com/
- Curve Dental all-in-one PMS, imaging, eRx, payments, and analytics research: https://www.curvedental.com/feature-overview
- iDentalSoft administrative/clinical workflow research: https://www.identalsoft.com/administrative
- Oryx dental PMS ecosystem research: https://www.oryxdental.com/what-is-dental-practice-management-software/
- Planmeca Romexis imaging/CAD-CAM/orthodontic module research: https://www.planmeca.com/dental-software/planmeca-romexis/modules/
- DentiMax Flow referral/imaging/multi-location research: https://dentimax.com/flow-cloud-dental-software
- Open Dental medication API research: https://www.opendental.com/site/apimedications.html
- Open Dental DoseSpot/eRx research: https://www.opendental.com/site/dosespot.html
- Surescripts e-prescribing workflow research: https://surescripts.com/what-we-do/e-prescribing
- axiUm eRx/lab-medication workflow research: https://www.exansoftware.com/axium-erx/
- NexHealth Synchronizer research: https://docs.nexhealth.com/docs/whats-possible-with-the-nexhealth-api and https://docs.nexhealth.com/docs/nexhealth-synchronizer-installation-guide
- Stedi healthcare research: https://www.stedi.com/docs/healthcare
- Open Dental API research: https://www.opendental.com/site/apispecification.html
- HIPAA Security Rule research: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- FCC robocall/texting guidance reference: https://www.fcc.gov/consumers/guides/stop-unwanted-robocalls-and-texts

Local validation performed:

- Confirmed 1DentalAI repo and `AGENTS.md`
- Confirmed DentalRCM repo and `AGENTS.md`
- Reviewed DentalRCM connector reuse audit, phase plan, product requirements, and competitive gap docs
- Searched DentalRCM code/schema/docs for connector, payer, eligibility, PMS, phone, reputation, and review assets
- Confirmed phone/reputation/AI studio/local SEO/AI SEO source app in `Outreachhubphonesystem`
- Reviewed phone system package, docs, server, integration orchestration, telephony, policy, feature execution matrix, architecture, and QA reports

## 13. Approval Gate

Gaurav approval needed before any Phase 1 coding:

- Approve 1DentalAI as separate repo with extraction/porting from source apps
- Approve Phase 1 as Core Platform Foundation, not UI-only and not connector-first
- Approve that Phase 0 remains documentation/architecture only
- Approve that product workflows must call 1DentalAI-owned routers, not direct vendor APIs
- Approve that phone/reputation/AI studio/local SEO/AI SEO reuse comes from `Outreachhubphonesystem`

Approval:

- [ ] Approved as written
- [ ] Approved with edits
- [ ] Not approved
