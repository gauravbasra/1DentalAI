# Phone System Rebuild — Weave-Plus Scope

Status: active implementation scope
Last updated: 2026-05-23

## Research Baseline

Weave-class dental phone products win because the phone is not isolated from the practice record. The front desk sees caller identity, patient context, reminders, missed-call recovery, texting, payments, forms, reviews, scheduling, team chat, analytics, and call intelligence in the same operating flow. User reports repeatedly call out call pops, patient texting, reminders, payment links, forms, AI call summaries, call intelligence, and “most important patient stats when the phone rings” as the reason the product is sticky.

Twilio gives the carrier primitives but not the dental workflow. Programmable Voice webhooks receive inbound call events and must return TwiML. Twilio Conference supports hold, mute, remove, warm transfer, cold transfer, coaching/whisper, recording, and multi-participant management. Real-time transcription can stream spoken words during the call so the product can drive live captions, sentiment, workflow triggers, and AI assistance. Media Streams can also fork raw call audio over WebSockets for transcription, sentiment analysis, and real-time AI voice.

## Product Target

1DentalAI Phone must be better than Weave by making the call pop an operational cockpit, not a notification. A ring should create a matched patient context, show PMS actions immediately, transcribe the call live, classify revenue/service intent, and allow front desk or AI voice to solve the patient need without opening five screens.

## Backend Contract

### Ring-Time Patient Resolution

- Normalize caller number.
- Match against patient phone, family account phone, communication preference destinations, and emergency contact phone.
- If exactly one patient matches, attach `patientId` to the call conversation.
- If multiple patients match, store family/member candidates and require staff confirmation.
- If no match, classify as new caller and create lead/new-patient path without pretending a chart exists.

### Screen-Pop Snapshot

Persist a point-in-time screen-pop snapshot for every inbound call:

- Patient demographics, chart number, preferred name, DOB, status, privacy level, photo/document reference when present.
- Family account and household members.
- Communication preferences, consent, quiet hours.
- Medical alerts, allergies, medications, pharmacy.
- Next and recent appointments.
- Open and past procedure history.
- Active treatment plans and patient/insurance estimates. Pricing cannot be quoted without human policy.
- Lab cases.
- Claims, insurance plans, eligibility status, benefit summary.
- Ledger balance, recent payments, overdue/open balance.
- Documents/forms needing action.
- PMS tasks and recommended next actions.
- Link map to the exact PMS pages: patient chart, schedule, ledger, insurance, treatment plan, labs, documents, tasks.

### Call Control

The backend must record every call-control request with actor, target, provider readiness, result, and audit event.

- Answer
- Hold/resume
- Park/pickup park
- Warm transfer
- Blind transfer
- Send to voicemail
- End call
- Outbound dial
- AI voice takeover

Real carrier execution requires a provider connector. With Twilio direct, call control uses Call/Conference/Participant APIs where possible. For richer desk-phone/PBX behavior, FreeSWITCH/SignalWire remains the media-control layer.

### Live Intelligence

- Store live transcript segments with speaker, language, confidence, sequence, provider event id, and PHI-safe metadata.
- Store translation segments when enabled.
- Create AI assist events: summary draft, service tags, revenue opportunity, scheduling intent, billing intent, angry/unhappy patient, urgent symptom, missed-call recovery, staff coaching.
- Update call analytics and PMS tasks after call end.

### AI Voice Backup Receptionist

- Tenant setting controls ring threshold before AI interjects.
- AI can answer routine service, appointment, forms, insurance status, and billing workflow questions from approved KB/PMS context.
- AI can book/reschedule only through scheduling availability and policy gates.
- AI cannot quote pricing, diagnose, prescribe, or guarantee benefits.
- AI can collect details, transfer to staff, or route callback.

### Tenant Setup

- Twilio credentials are stored once in the shared encrypted connector vault.
- Phone settings choose whether to use tenant Twilio credentials or 1DentalAI-managed credentials.
- Required setup: Account SID, Auth Token, webhook signing secret, voice number, SMS/A2P status, E911, recording policy, inbound webhook, status webhook, recording webhook, transcription webhook.

## Acceptance Tests

- Simulated inbound Twilio payload creates conversation, active call, patient match, screen-pop snapshot, and audit event.
- Screen-pop API returns the same PMS context shown in UI.
- Control action API never claims carrier success unless the provider API actually returns success.
- Transcription webhook stores segments and updates transcript summary.
- Pricing requests are flagged for human handling.
- Patient links open the correct PMS page.
- Desktop and mobile UI click test passes.
