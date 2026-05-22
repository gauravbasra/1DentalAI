# Product Rebuild Architecture

Status: active reset
Last updated: 2026-05-21

This document resets the build shape for 1DentalAI. The product is not one cramped dashboard. It is a portfolio of separate production apps that can talk to each other through shared dental objects, events, connector policies, and audit trails. The wrapper comes later.

## Product Boundaries

### PMS

Owns the practice system of record: patients, families, appointments, providers, operatories, charting, perio, imaging, treatment plans, insurance, ledger, claims, documents, labs, tasks, and practice intelligence.

PMS must not be a dumping ground for phone, marketing, reputation, or RCM dashboards. Those products can read/write PMS objects through explicit handoffs.

### Patient Engagement

Owns phone, SMS, missed calls, voicemail, AI receptionist, AI voice, webchat, appointment handoff, appointment reminders, forms handoff, consent-aware messaging, and patient communication settings.

This product competes with Weave and Mango-style workflows. It needs a front desk daily console, live inbox, phone console, webchat console, appointment handoff queue, and setup/settings.

### Reputation Management

Owns review eligibility, private surveys, service recovery, public review requests, review response approvals, listings, testimonials, referrals, and reputation reporting.

This product competes with Birdeye and RevenueWell reputation workflows. It reads PMS visit events and Patient Engagement delivery outcomes, but it has its own workbench.

### Digital Marketing, Local SEO, and AI Studio

Owns campaigns, audiences, AI content briefs, landing pages, websites, local SEO, AI SEO, citations, GBP-style posts, source attribution, campaign reporting, and growth workflows.

It can use PMS audiences, reputation proof, and Patient Engagement channels, but it has separate onboarding and approvals.

### RCM

Owns eligibility, benefits, prior authorization, claim lifecycle, attachments, ERA/EOB, denial management, underpayment, patient billing, collections, and revenue integrity.

It reads PMS treatment/ledger/insurance objects and returns financial task outcomes to PMS.

### Clinical AI

Owns AI scribing, clinical notes, chart assistance, perio assistance, imaging AI, treatment intelligence, and provider review workflows.

It must always keep provider approval, clinical audit, and source evidence visible.

### Wrapper

The wrapper is built only after separate apps are real. It shows cross-product command center views, handoffs, analytics, and governance. It must never become the primary work area for a product.

## Shared Contracts

- Shared dental objects: patient, appointment, provider, operatory, chart note, treatment plan, insurance, claim, ledger entry, payment, recall, form, document, review request, communication, campaign, task, connector, audit event.
- Shared app-to-app event pattern: product source, source object, target product, target object, patient/practice context, action requested, approval policy, connector state, blocked reason, audit event.
- Shared external action rule: no external send, post, call, payment, claim, eligibility, review publication, or PMS writeback may be marked complete without a provider response or manual proof.

## Routing Strategy

- `/pms` is the PMS product.
- `/patient-engagement` is phone, SMS, AI voice, webchat, appointment handoff, reminders, and communication settings.
- `/reputation-management` is review, survey, service recovery, listings, referrals, and testimonials.
- `/digital-marketing` is campaigns, Local SEO, AI SEO, AI Studio, websites, landing pages, and attribution.
- `/wrapper` is a future cross-product operating layer and must remain secondary.
- Legacy `/app/*` routes are salvage/reference only until replaced.

## Current First Build Slice

Build separate app entry points and rebuild Patient Engagement first:

1. Product selector with explicit app boundaries.
2. Patient Engagement daily console: missed calls, active inbox, webchat, appointment requests, follow-up work.
3. Phone console: numbers, extensions, live call states, voicemail, call tasks, Twilio/FreeSWITCH readiness.
4. Webchat console: install script, widget settings, knowledge base, lead capture, transcript, staff reply, scheduling handoff.
5. Patient Engagement settings: Twilio, AI voice, webchat theme, consent policy, quiet hours, scheduling/PMS handoff, forms handoff.

## Non-Negotiable UI Rule

Do not show every subsystem on one page. Every product page must have a primary work area, a focused queue, a patient/practice context panel, and a setup/settings path. Admin configuration must not pollute daily operator work unless it blocks that operator’s current action.
