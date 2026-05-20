# Phase 2 Plan: Role Workbenches

Status: Pending approval  
Date: 2026-05-20  
Phase owner: 1DentalAI

## Phase Goal

Replace dashboard-only work-entry text with real role-specific workbench areas where dental teams perform daily work across clinical, PMS, RCM, communications, growth, reputation, AI Studio, Local SEO, AI SEO, and connector operations. This phase does not create fake PMS, fake claims, fake perio writeback, fake phone execution, fake review posting, fake SEO publishing, fake campaign execution, or fake AI results. It creates production-grade work surfaces with owned queues, permission checks, actionable local state changes, truthful setup/blocked states, and audit-ready activity.

## Research Basis

Dental Intelligence confirms the huddle pattern: yesterday/today/tomorrow views, actionable tiles, provider/operatory schedules, suggested patients, follow-up tasks, and permission controls over production visibility. The lesson for 1DentalAI is that huddle data must open work, not sit as static reporting.

Archy sets the PMS-grade product benchmark: scheduling, online forms, insurance verification, lab tracking, reporting, built-in imaging, perio charting, treatment planning, pre-authorization management, auto-drafted claims, EOB processing, payments, team management, and AI scribe. The lesson for 1DentalAI is that the daily dashboard must route into PMS, clinical, imaging, insurance, lab, and payment work areas.

Denti.AI sets the clinical AI benchmark: scribe, voice perio, imaging analysis, auto-charting, PMS integration, provider review, patient education reports, and clinical-note writeback. The lesson for 1DentalAI is that perio and charting workbenches need tooth/measurement structure, confidence/review states, and signed clinical approval gates.

Weave, Adit, and Flex set the communication/growth benchmark: phones, call pop, softphone, missed-call text, texting, reviews, reminders, online scheduling, forms, payments, insurance verification, and PMS integration. The lesson for 1DentalAI is that the front-desk workbench must be an inbox plus schedule/follow-up execution surface, not a generic communications module.

Birdeye, Adit digital marketing, Weave reviews, and current dental local-search research confirm that growth is a daily operating function, not a side report. Reputation management includes review requests, response approvals, service recovery, rating/review velocity, competitive review gaps, listing accuracy, Google Business Profile content, local page quality, campaign attribution, and AI search visibility. The lesson for 1DentalAI is that marketing/reputation users need their own work area, with tasks connected back to appointments, calls, treatments, locations, and production.

Open Dental API documentation confirms connector-grade dental objects for claims and perio exams/measures, including claim status, service dates, providers, plans, preauthorization, and perio records. The lesson for 1DentalAI is that workbench data models must map to real PMS/EHR objects rather than invented dashboard labels.

## Source App Reuse

DentalRCM reuse candidates:

- RCM stage/workflow spec: patient intake, insurance capture, eligibility, benefits, estimate, prior auth, claim readiness, submission/acknowledgement, ERA/EOB posting, denial, collections, revenue integrity.
- Existing route patterns: eligibility, claim status, ERA import, payer portal tasks, denial actions, denial evidence requests, claim/appeal drafts, connector health checks, PMS connector onboarding, direct payer adapter setup.
- Data model patterns: payer profile, claim, claim line, credentialing case/task, EOB/ERA, workflow attachment, audit event, underpayment/revenue integrity.

Outreachhubphonesystem reuse candidates:

- Tenant provider approval and runtime policy gate patterns.
- Telephony provider contract and Twilio-compatible webhook approach.
- Softphone/call/SMS/review/form/payment/fax/team-chat action patterns.
- Reputation, review request, AI response, survey, campaign, Local SEO, AI SEO, and AI Studio concepts.
- UI contract audit discipline: every visible control maps to backend behavior or a truthful blocked state.
- AI Studio/governed bot pattern for draft generation that stops at human approval.

## Phase Scope

Create these production workbench routes:

- `/app/work/pms-schedule`
- `/app/work/patient-chart`
- `/app/work/perio-charting`
- `/app/work/rcm-queue`
- `/app/work/phone-inbox`
- `/app/work/treatment-plans`
- `/app/work/imaging`
- `/app/work/labs-referrals`
- `/app/work/rooms-chairs`
- `/app/work/growth-reputation`
- `/app/work/marketing-studio`
- `/app/work/local-ai-seo`
- `/app/work/connector-setup`

Update dashboard work-entry cards to link to these workbenches instead of module anchors.

## Workbench Requirements

Every workbench must include:

- role-aware queue ownership
- patient/practice context appropriate to the role
- actionable buttons with implemented local behavior or truthful blocked/setup behavior
- permission and approval checks
- clear integration/source status
- audit-event preview or persisted local audit state within Phase 2 scope
- no dead buttons
- no vendor-name dependency in product copy unless it is a connector setup detail
- UI language that matches a production SaaS dental operations product
- marketing, reputation, SEO, and AI Studio work must be tied to dental outcomes: booked patients, recall, treatment acceptance, service recovery, reviews, local visibility, and attributed production

## Workbench Details

### PMS Schedule Workbench

Users: owner dentist, practice manager, front desk, provider, RDH, assistant.

Core surface:

- provider columns
- operatory/chair timeline
- appointment status
- production estimate visibility by permission
- confirmation status
- insurance/forms/radiograph readiness indicators
- gaps and fill opportunities
- same-day treatment capacity

Actions:

- open patient chart
- open appointment readiness
- assign follow-up task
- mark local work status
- blocked state for live PMS writeback until connector approval

### Patient Chart Workbench

Users: provider, RDH, assistant, treatment coordinator, owner dentist.

Core surface:

- patient header
- medical alerts, allergies, meds
- active treatment
- procedure history
- imaging status
- perio status
- clinical notes/signoff
- prescriptions/referrals/labs
- payer evidence needed for claims

Actions:

- open perio chart
- review AI note draft status
- request missing evidence
- route chart item to provider signoff
- blocked state for EHR/PMS writeback until clinical approval rules exist

### Perio Charting Workbench

Users: RDH, provider, assistant where permitted.

Core surface:

- tooth-aware perio grid
- probing depth, bleeding, recession, mobility, furcation, plaque/calculus, diagnosis support
- exam status
- voice capture readiness
- measurement confidence/review state
- doctor exam flags

Actions:

- record local measurement status
- flag provider review
- generate patient education summary as blocked/setup until AI policy is approved
- blocked state for PMS writeback until connector and clinical approval are complete

### RCM Queue Workbench

Users: billing/RCM, owner dentist, practice manager.

Core surface:

- eligibility due
- benefit gaps
- estimates
- prior auth
- claim readiness
- attachments
- claim status
- ERA/EOB posting
- denials
- revenue leakage
- credentialing blockers

Actions:

- open claim detail
- request clinical evidence
- mark claim ready for approval
- draft appeal using local source data if available
- blocked state for payer submission until connector/approval is complete

### Phone Inbox Workbench

Users: front desk, practice manager, owner dentist, support where permitted.

Core surface:

- missed calls
- active call queue
- voicemail/transcript status
- AI summary status
- patient match
- booking intent
- emergency routing
- message consent
- review/service-recovery follow-up

Actions:

- assign call follow-up
- prepare reply
- open scheduling context
- route emergency to provider
- blocked state for outbound phone/SMS until phone provider, consent, and policy are approved

### Growth and Reputation Workbench

Users: marketing/growth manager, practice manager, owner dentist, DSO regional, compliance admin where approvals are needed.

Core surface:

- review request queue
- negative feedback and service recovery cases
- AI response drafts awaiting approval
- review velocity by location/provider/service line
- rating/review gaps versus local competitors
- patient consent and contact eligibility
- appointments/treatment that should trigger review request, survey, or service recovery
- unresolved patient experience issues that must pause automation

Actions:

- approve local review request batch
- assign service recovery owner
- draft response for human approval
- pause review automation for unresolved unhappy-patient cases
- open related call, appointment, or chart context when permissions allow
- blocked state for external review posting until review-site connector, consent, and approval policy are configured

### Marketing Studio Workbench

Users: marketing/growth manager, owner dentist, DSO regional, compliance admin.

Core surface:

- campaign backlog for recall, reactivation, whitening, implants, perio maintenance, membership, unscheduled treatment, and referral growth
- audience rules and exclusions
- channel readiness for SMS, email, phone, web chat, landing pages, and ads
- AI Studio draft queue for campaigns, landing-page copy, review replies, GBP posts, FAQs, and patient education content
- compliance review for clinical claims, PHI boundaries, opt-out, quiet hours, and brand voice
- attribution plan from campaign to booked appointment, accepted treatment, production, and review outcome

Actions:

- create draft campaign from approved template
- submit AI content for approval
- assign compliance review
- mark audience rule ready or blocked
- blocked state for external send/publish until connectors, consent, and approval policy are complete

### Local SEO and AI SEO Workbench

Users: marketing/growth manager, owner dentist, DSO regional, support admin.

Core surface:

- location listing health
- NAP consistency
- Google Business Profile content readiness
- service/category coverage by location
- photo/post/update backlog
- local landing-page checklist
- review/topic sentiment influencing local search
- AI search visibility checks for "best dentist near me" and service-line prompts
- source/citation gaps that AI engines and local search may use

Actions:

- stage listing correction
- prepare GBP post/update for approval
- create local page task
- flag AI-search reputation issue
- assign location owner
- blocked state for external publishing until listing/GBP/website connectors and approval policy are configured

### Treatment Plans Workbench

Users: treatment coordinator, provider, owner dentist.

Core surface:

- presented treatment
- accepted-not-scheduled
- financing/membership/payment-plan options
- benefits estimate status
- patient portion
- case acceptance notes
- follow-up timeline

Actions:

- prepare patient estimate package
- assign follow-up
- request benefit verification
- open financing/membership readiness
- blocked state for external financing/payment execution until connector approval

### Imaging Workbench

Users: provider, RDH, assistant.

Core surface:

- needed radiographs
- captured images
- missing evidence for diagnosis/claims
- AI imaging status
- CBCT/pano/intraoral source readiness
- attachment readiness

Actions:

- mark image needed/captured
- request image from assistant/RDH
- attach evidence to RCM request
- blocked state for AI image analysis or DICOM/PACS connector until approved

### Labs and Referrals Workbench

Users: provider, assistant, treatment coordinator, practice manager.

Core surface:

- open lab cases
- due dates
- scan/impression status
- remake risk
- referral packets
- specialist follow-up
- incoming results

Actions:

- assign lab follow-up
- request missing scan/image/chart packet
- mark received locally
- blocked state for vendor submission until lab/referral connector setup is complete

### Rooms and Chairs Workbench

Users: assistant, practice manager, owner dentist, front desk.

Core surface:

- operatory occupancy
- provider/RDH/staff assignment
- room readiness
- patient seated/late/ready status
- blockers
- sterilization/material needs

Actions:

- update local room status
- escalate blocker
- open patient/appointment workbench
- no fake PMS schedule writeback

### Connector Setup Workbench

Users: support admin, compliance admin, owner dentist, DSO regional.

Core surface:

- PMS/EHR connectors
- payer/clearinghouse connectors
- phone/SMS/email
- reputation/listings
- marketing, Local SEO, AI SEO, campaign, analytics, and website connectors
- payments/financing/memberships
- imaging/labs/eRx
- credential status
- capability map
- cost telemetry placeholder as truthful setup state
- approval policies and BAA/compliance requirements

Actions:

- stage connector setup request
- run local readiness check
- mark approval required
- show blocked runtime reason

## Data Model Additions In Phase 2

Use typed local domain data first, structured to map to future persistence:

- `WorkbenchArea`
- `WorkbenchQueueItem`
- `WorkbenchAction`
- `WorkbenchAuditEvent`
- `AppointmentWorkItem`
- `ClinicalChartWorkItem`
- `PerioExamWorkItem`
- `RcmWorkItem`
- `CommunicationWorkItem`
- `ReputationWorkItem`
- `MarketingCampaignWorkItem`
- `AiStudioDraftWorkItem`
- `LocalSeoWorkItem`
- `AiSearchVisibilityWorkItem`
- `TreatmentPlanWorkItem`
- `ImagingWorkItem`
- `LabReferralWorkItem`
- `ConnectorReadinessItem`

These are not final database migrations. They are the typed domain contract for the UI and future API/database implementation. No local type may invent fields that cannot be mapped to researched PMS/EHR/RCM/communications workflows.

## UI/UX Requirements

- The workbench must look like the existing 1DentalAI app, not like a marketing page.
- First viewport must show the user’s queue and primary work, not explanatory content.
- Use dense, scannable operational layouts.
- Use tables, timelines, split work/detail panes, status chips, icon buttons, and drawers where appropriate.
- Do not use generic cards as the main work surface when a table, queue, chart grid, or timeline is the natural work area.
- Role switcher remains available for QA but each role must show materially different work.
- Every button must be clickable and verified.

## Implementation Plan

1. Add typed workbench domain data and service helpers in `src/lib/workbench-data.ts`.
2. Add shared components for workbench shell, queue table, action panel, setup/blocked state, and audit strip.
3. Add the thirteen `/app/work/*` routes.
4. Add marketing/growth role data and dashboard work areas for reputation, AI Studio, Local SEO, AI SEO, campaigns, and attribution.
5. Update dashboard work-area routes to point to workbench pages.
6. Add route-level copy that uses production dental operations language.
7. Add local action handlers where Phase 2 can support local state safely.
8. Add truthful blocked/setup handling for external execution.
9. Add tests or static checks for route/data integrity.
10. Run browser click testing for all workbench routes and primary buttons.
11. Capture screenshots for owner, RDH, billing/RCM, front-desk, and marketing/growth workbenches.

## Acceptance Criteria

- `/app` no longer routes "Where to work today" cards to module anchors.
- Every listed workbench route exists.
- Every workbench has a role-appropriate queue and primary work surface.
- RDH can see a real perio charting workbench surface.
- Provider can see a real patient chart workbench surface.
- Billing/RCM can see a real RCM queue with eligibility, claims, ERA/EOB, denials, and leakage.
- Front desk can see a real phone/messaging/scheduling inbox surface.
- Marketing/growth can see real reputation, AI Studio, Local SEO, AI SEO, campaign, listing, and attribution work surfaces.
- Owner/practice manager can see PMS schedule, rooms/chairs, RCM, and approvals.
- Connector setup shows capability maps and blocked runtime reasons without pretending live integrations exist.
- No dead links or dead buttons.
- DentalRCM at `http://162.243.186.191:3000/` remains untouched.
- 1DentalAI root deployment remains at `http://162.243.186.191/`.

## Verification Plan

Commands:

- `npm run check`
- `npm run build`
- health check for 1DentalAI
- health check for DentalRCM after deploy

Browser click test:

- `/app`
- each `/app/work/*` route
- role switcher from owner, RDH, billing/RCM, front desk, provider
- marketing/growth role across reputation, marketing studio, and Local SEO/AI SEO workbenches
- every primary workbench action button
- every back/navigation link
- blocked/setup state buttons

Screenshots:

- `docs/phase2-workbench-owner-pms.png`
- `docs/phase2-workbench-rdh-perio.png`
- `docs/phase2-workbench-provider-chart.png`
- `docs/phase2-workbench-rcm.png`
- `docs/phase2-workbench-front-desk-phone.png`
- `docs/phase2-workbench-growth-reputation.png`
- `docs/phase2-workbench-marketing-studio.png`
- `docs/phase2-workbench-local-ai-seo.png`

## Approved Product Scope Beyond Phase 2 Workbench UI

Gaurav approved the previously out-of-scope items as in-scope for 1DentalAI. They are not excluded from the product. They must be delivered as production capabilities through small approved phases, not as fake buttons or unsafe live shortcuts.

Approved product scope:

- production auth
- production database migrations
- live PHI handling
- live PMS/EHR writeback
- live payer submission
- live phone/SMS execution
- live review posting
- live campaign sending
- live listing, GBP, website, and SEO publishing
- live AI scribing/perio transcription
- live imaging AI analysis
- live eRx
- live payments and financing
- controlled extraction or integration from DentalRCM and the phone/reputation app when a phase plan explicitly approves the files, contracts, and runtime boundary

Delivery rule:

- Phase 2 may build the workbench surfaces and action/control contracts that these live capabilities will use.
- Live execution must be enabled only when the relevant phase includes credentials, database schema, audit trail, rollback plan, compliance/BAA posture, permission model, connector tests, browser click tests, and production smoke tests.
- No workbench may claim a live action succeeded until the corresponding live path is actually implemented and verified.

## Approval Request

Approve Phase 2 to implement the role workbench routes above. Once approved, implementation must match this plan; if implementation reality changes, the plan must be updated and approved before coding continues.
