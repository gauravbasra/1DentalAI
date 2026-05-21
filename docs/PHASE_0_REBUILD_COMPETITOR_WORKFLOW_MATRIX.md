# Phase 0 Rebuild: Competitor Workflow Matrix

Status: active reset document
Last updated: 2026-05-21

This document replaces any loose interpretation of Phase 0 module completion. A module is not complete because it has a screen. A module is complete only when it has the real dental workflow, durable data model, role-specific workbench, safe action semantics, audit trail, connector readiness, and click-tested UI.

## Global Acceptance Rules

- No fake external success. If SMS, email, phone, payment, claim, eligibility, or AI voice is not connected to a live provider, the action must show `connector required`, `staged`, `blocked`, or `ready for approval`; it must not say sent, called, paid, submitted, posted, or completed.
- Every workflow must start from or write back to a PMS object where applicable: patient, appointment, provider, operatory, procedure, chart note, insurance, claim, ledger, payment, recall, document, lab case, or task.
- Every patient-facing communication must check consent, channel preference, quiet hours, service recovery holds, balance/insurance sensitivity, and role approval policy.
- Every module needs role-specific daily work: owner, office manager, front desk, billing/RCM, provider, hygienist, marketing, and admin do not see the same workbench.
- Every action must create an audit event with actor role, source object, target object, outcome, and blocked reason when blocked.
- Every page must pass a screen/click test for desktop and mobile before it can be called usable.
- Every module must expose setup readiness: missing provider credentials, webhook status, phone/carrier status, listing sync status, PMS connector status, payer connector status, and database migration status.
- Every launch-ready module must have a live matrix row with UI depth, backend, integrations/connector state, process logic, DB migrations, audit, tests, and live status.
- Every launch-ready module must have route/API/table validation in `scripts/validate-phase0-depth.mjs`; a UI page without required APIs and migration-backed tables is not launch-ready.

## Phone System Rebuild

Competitor references:
- Mango Voice: PMS contact sync, call logging to PMS, voicemail logging, call summary in PMS, patient caller ID, AI call analytics, web app search/call/text/fax.
- Weave/Mango category expectations: webphone and deskphone, SMS from office number, reminders, missed-call workflows, payment links, forms links, call queues, phone trees, voicemail, AI summaries, call analytics, patient screen pop.

Production workbench requirements:
- Live call console with active calls, answer, hold, resume, transfer, park, warm transfer, outbound dial, voicemail, and call disposition.
- Carrier/provider setup with trunk domain, caller ID, number porting, E911, SMS registration, recording policy, webhook status, smoke test result, and blocked next action.
- Extensions and physical devices with MAC address, provisioning state, registration state, assigned staff, desk/room location, voicemail policy, and failover route.
- PMS screen pop from caller number to patient/family/guarantor, appointments, ledger balance, open treatment, next recall, missed forms, and communication preferences.
- AI call analytics with transcript, summary, sentiment, intent, booking opportunity, service recovery risk, and required staff follow-up.
- Call logging that writes a communication note/task to the patient timeline; if PMS connector is not live, it must stage the note with an explicit blocked connector state.

Not acceptable:
- A static phone dashboard with call-looking cards.
- Buttons that only create internal rows without modeling carrier status and provider result.
- Claiming call, SMS, transfer, hold, or AI voice worked without a live telephony provider response.

## Reputation Rebuild

Competitor references:
- Birdeye: reviews, listings, referrals, surveys, integrations/open APIs/SFTP/bulk upload, multi-location reputation, AI response suggestions.
- RevenueWell: review and survey request campaigns, SMS reviews, one-patient review invitation, review widget/microsite/social display, recurring review cooldown.

Production workbench requirements:
- PMS-triggered review eligibility queue after completed visit, with suppressions for recovery cases, consent, provider restriction, billing dispute, clinical incident, duplicate cooldown, and patient preference.
- Private survey before public review for service-risk patients; low scores create service recovery work and block public review requests.
- Review response queue with source site, rating, public text, AI draft, provider/location/service context, HIPAA-safe response guardrails, approval, publication connector status, and blocked reason.
- Listings dashboard with Google/Facebook/Healthgrades/Apple/Yelp-like profile completeness, NAP consistency, sync status, issue summary, and owner action.
- Referral/testimonial requests with consent, offer/compliance text, conversion status, and attribution to new patient bookings.

Not acceptable:
- Review cards without eligibility logic.
- “Posted response” status without a connected listing/review provider.
- Reputation work not tied to PMS visit/provider/location context.

## Marketing, AI Studio, Local SEO, AI SEO Rebuild

Competitor references:
- RevenueWell category: dental marketing platform, websites, SEO, campaigns with ready-to-use content, patient engagement, reputation management.
- Dental marketing practice expectation: audience segmentation, landing pages, campaign attribution, new patient flow, recall/reactivation, treatment-specific funnels.

Production workbench requirements:
- Campaign builder with source audience from PMS/RCM/reputation: unscheduled treatment, overdue hygiene, inactive patients, implants, whitening, clear aligners, memberships, referrals, failed appointments, balance follow-up.
- Channel plan with SMS/email/phone/landing page/AI voice eligibility and connector status.
- AI Studio queue with brief, source data, generated copy, compliance notes, reviewer, approval state, revision state, and use target.
- Landing page management with slug, service line, offer, provider/location, CTA, tracking plan, form mapping, booking routing, and conversion attribution.
- Local SEO workbench with listings, GBP-like posts, reviews, services, location pages, citations, issue queue, and ranking/visibility tasks.
- Attribution to booked appointments, accepted treatment, production, collection, and review/referral outcomes.

Not acceptable:
- Generic marketing tiles.
- AI copy that is not tied to an audience, service line, compliance note, and approval flow.
- Landing pages that do not route leads into PMS/CRM work.

## Connector Control Plane Rebuild

Production workbench requirements:
- Connector definitions for PMS, payer, phone, reputation/listings, marketing/analytics, webchat, forms, payments, and future marketplace routes.
- Installation readiness with credential status, webhook status, approval status, health status, fallback mode, cost policy, and next action.
- Capability map by workflow area, transaction direction, supported transactions, required fields, missing fields, approval policy, and fallback policy.
- Route decision records that explicitly choose live connector, direct API, vendor route, SFTP/bulk import, or manual queue.
- Health checks and cost telemetry that can block actions before external execution.

Not acceptable:
- Marking a connector active without validated credentials, verified webhooks, approval, and a healthy check.
- Generic “integrations connected” copy that does not name capability-level readiness.
- Running a module-specific send/post/submit action without a connector route decision or manual proof gate.

## Launch-Readiness QA Harness

The live QA harness is `scripts/validate-phase0-depth.mjs`. It must fail fast on:

- Missing product routes for active modules, including Patient Engagement, PMS, Phone, RCM, Reputation, Marketing, Connector control, Huddle, and Patient Finder.
- Missing API endpoints for PMS CRUD/workflow routes, appointment checkout, webchat widget/session/message/settings/transcript/crawl routes, leads, workbenches, database health, and app health.
- Missing Prisma models or migration-backed DB tables for the product feature set named in `docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md`.
- Fake external success copy, including patient sends, phone calls, payment completion, payer submission, review publication, listing sync, webchat scheduling, and PMS writeback claims that do not show connector/manual-proof blocking.
- Matrix drift: every live module row must retain UI depth, backend, integration state, process logic, DB migrations, audit, tests, and live-status cells.

Passing validation does not mean external vendors are live. It means the repo honestly represents what is internal-live, connector-blocked, approval-staged, or manual-proof gated.

## Patient Engagement Rebuild

Production workbench requirements:
- Appointment lifecycle: booking request, confirmation, reminder, forms, pre-med/medical alert, post-op, recall, no-show, cancellation, waitlist, reactivation.
- Every outreach item must show source PMS object, patient consent, channel, owner, scheduled time, approval status, delivery connector, and next action.
- Engagement must feed reputation, RCM, phone, marketing, and PMS task queues instead of living as a separate message list.

Not acceptable:
- Manual “stage outreach” only.
- Any send state that does not validate consent and connector status.

## RCM Rebuild

Production workbench requirements:
- Eligibility and benefits with payer, plan, deductible, annual max, used amount, frequencies, limitations, missing info, last verified, and connector status.
- Treatment plan estimate and prior authorization with required evidence, imaging/document checklist, deadline, payer follow-up, and patient financial responsibility.
- Claims with 837 lifecycle, scrubber checks, attachments, submission state, 277CA/276/277 status, denial reason, appeal package, ERA/EOB/835 posting, adjustment/write-off, and patient balance.
- Revenue integrity with historical claim checks, underpayment, missing billing, coding mismatch, timely filing risk, frequency limitation errors, and recovery workflow.

Not acceptable:
- RCM overview cards without claim/benefit/ledger actions.
- Any claim, eligibility, or ERA status marked submitted/verified/posted without a real payer/clearinghouse connector or explicit manual proof.

## Immediate Build Order

1. Stabilize app host and session flow on `app.1dentalai.com`.
2. Rebuild Phone as the first real module because it touches PMS, engagement, reputation, payments, and AI summaries.
3. Rebuild Reputation on top of PMS events and service recovery.
4. Rebuild RCM workbench with benefits, claims, prior auth, ERA/EOB, denial, and revenue leakage as real work areas.
5. Rebuild Marketing and AI Studio with PMS audience generation, landing pages, local SEO, and attribution.
6. Re-run screen/click tests after every slice and document what is real, staged, blocked, or connector-dependent.
