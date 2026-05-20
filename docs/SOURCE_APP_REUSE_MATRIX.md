# Source App Reuse Matrix

Status: Phase 0 implementation artifact  
Date: 2026-05-20

## Source-Of-Truth Rule

DentalRCM, Outreachhubphonesystem, and any other local repo are reusable inputs only. They do not define product completeness. Every reused idea must be validated against current dental ecosystem research and the approved phase plan.

## Reuse Summary

| Source | Reuse decision | Why |
| --- | --- | --- |
| DentalRCM | Reuse selectively | Strong RCM, connector governance, payer, ERA/EOB, credentialing, revenue integrity, audit, and approval patterns. |
| Outreachhubphonesystem | Reuse selectively | Strong phone, SMS, AI voice, reputation, campaigns, AI studio, local SEO/AI SEO, provider policy, and workflow QA patterns. |
| OutreachHub Enterprise | Secondary reference | Potential enterprise patterns, but user clarified phone/reputation/AI studio/SEO lives in Outreachhubphonesystem. |
| 1DentalAI current repo | Keep and evolve | New independent product home with marketing site and future authenticated app. |

## DentalRCM Reuse

| Domain | Reusable assets | Reuse approach | Validation requirement |
| --- | --- | --- | --- |
| Connector governance | Adapter registry, setup, credential vault, action guard, smoke tests, readiness | Port concepts into 1DentalAI connector control plane | Must support marketplace, capability maps, cost telemetry, fallback, tenant policy |
| PMS integration | Canonical PMS models, PMS adapter interface, NexHealth/Open Dental/Dentrix source ideas | Use as first pass for PMS connector SDK | Validate against PMS-grade model and Archy/Open Dental/Dentrix/Curve/Dentrix Ascend research |
| Payer/clearinghouse | Stedi client, eligibility, EDI transaction patterns, claim/ERA scaffolds | Move behind InsuranceTransactionRouter | Validate against 270/271, 837D, 835, 276/277, attachments, prior auth, direct payer/portal fallback |
| RCM workqueues | Eligibility, claim readiness, ERA/EOB, denials, collections | Reuse process shape | Must be doctor-owner and billing-manager acceptable |
| Revenue integrity | Leakage, underpayment, recovery, historical claim ideas | Promote to first-class 1DentalAI domain | Must support past claim audits, missed billing, contract variance, write-off review, recovered revenue |
| Credentialing | Provider/payer enrollment models and queues | Reuse and generalize | Must support provider/entity/location/payer readiness, CAQH, EFT/ERA, expirations |
| Documents/OCR | EOB, denial, appeal, attachment extraction ideas | Reuse as document intelligence source | Must support PDF generation, OCR, evidence packets, document retention |
| Audit/approval | Approval gates, audit patterns, demo/live separation | Reuse strongly | Must apply across clinical, payer, PMS writeback, communications, payments, eRx |

## Outreachhubphonesystem Reuse

| Domain | Reusable assets | Reuse approach | Validation requirement |
| --- | --- | --- | --- |
| Phone and SMS | Telephony state machine, Twilio-compatible webhook, mock provider, softphone actions | Port to CommunicationConnector and CommunicationsRouter | Validate against dental call pop, consent, AI disclosure, after-hours, emergency triage |
| Reputation | Review request, AI response, approval/post concepts | Port to Reputation/Growth module | Validate against Google Business Profile/review workflow, service recovery, patient consent |
| AI Studio | Campaign/creative/AI workflow ideas | Port to Growth and AI governance modules | Validate against dental-specific content, approval, compliance |
| Local SEO/AI SEO | Listings, content, local visibility concepts | Port to reputation-growth domain | Validate against dental growth workflows and source attribution |
| Workflow engine | Provider policy, raw payloads, domain events, audit events | Reuse as pattern | Must become tenant-configurable and versioned in 1DentalAI |
| QA discipline | UI contract audit and smoke test discipline | Reuse strongly | Every workflow needs UI-to-backend verification or truthful unavailable state |

## What Not To Reuse Directly

- Static HTML/vanilla JS UI from Outreachhubphonesystem.
- Local JSON persistence as production storage.
- Vendor-specific product routes that bypass 1DentalAI routers.
- Demo-only data as live product behavior.
- Any scaffolded adapter that cannot pass industry workflow acceptance.

## Extraction Order Recommendation

1. Phase 1: platform/auth/RBAC/audit/workflow foundation.
2. Phase 2: connector governance and marketplace control plane.
3. Phase 3: canonical dental data/PMS layer.
4. Phase 4: communications and emergency-aware patient front door.
5. Phase 5: RCM, payer, credentialing, EOB/ERA, and revenue integrity.

This order may change only through a new approved phase packet.
