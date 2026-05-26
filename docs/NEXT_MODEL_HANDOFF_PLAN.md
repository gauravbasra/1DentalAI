# 1DentalAI Phase 0 Handoff Plan (For Next Model)

Last updated: 2026-05-25 (Denver time)

This document is the authoritative handoff for the next model (Cursor/DeepSeek/Ollama) to continue Phase 0 production work without re-tracing decisions.

It focuses on the active slice: **Patient Engagement Voice (inbound phone) + Vapi transport path + scheduling brain**, while also recording the state of recent Phase 0 work that was committed and deployed.

## 0) Current Production State (What Is Actually Live)

Repository: `gauravbasra/1DentalAI` (branch `main`)

Latest deploy status:
- A successful deploy to DigitalOcean completed after the last push (verify in GitHub Actions: “Deploy 1DentalAI to DigitalOcean”).
- Public health check should be green at `GET https://app.1dentalai.com/api/health`.

Important behavior changes already shipped:
- Twilio inbound AI receptionist: **Realtime streaming is now opt-in** (prevents broken websocket stream usage unless explicitly enabled).
- Twilio inbound AI fallback (Gather-based turn-taking) now routes **inbound scheduling turns** through the **stateful scheduling brain** (voice-agent module) so it stops repeating first/last name loops and can do slot selection.
- Vapi webhook endpoint exists and supports tool-calls (scheduling tools) with a shared-token authentication model.

## 1) What Was Built (High-Signal Inventory)

### 1.1 Provider-Agnostic “Scheduling Brain” (Voice Agent Core)

Purpose: stateful scheduling logic that does NOT depend on Twilio/Vapi/Retell specifics.

Files:
- `src/lib/voice-agent/types.ts`
- `src/lib/voice-agent/state-manager.ts`
- `src/lib/voice-agent/prompt-builder.ts`
- `src/lib/voice-agent/orchestrator.ts`
- `src/lib/voice-agent/repository.ts`
- `src/lib/voice-agent/scheduling/adapters.ts`
- `src/lib/voice-agent/scheduling/online-scheduling-adapter.ts`

Database + migrations:
- Prisma models added: `VoiceAgentCall`, `VoiceAgentSession`, `AppointmentRequest`, `PracticeSchedulingRule`, `AppointmentSlotCache`
- Migration: `prisma/migrations/202605251430_voice_agent_scheduling_brain/migration.sql`

Notes:
- This brain stores structured conversation state to prevent repeated questions.
- Slot selection: supports “first/second/third” and time matching (basic).
- Scheduling adapter pattern exists (Mock + OnlineSchedulingAdapter).
- OnlineSchedulingAdapter currently books via the canonical internal PMS “online scheduling” engine (not NexHealth/OpenDental API direct yet).
- Slot filtering is timezone-safe using `ONE_DENTAL_PRACTICE_TIMEZONE` (defaults to `America/Denver`).

### 1.2 Twilio Inbound Voice: Ring-Then-AI Takeover

Inbound TwiML builder:
- `src/lib/twilio-webhooks.ts` has `buildInboundVoiceTwiML(...)`:
  - starts transcription
  - dials the practice bridge number for `ringThreshold * 5` seconds
  - if no answer, redirects to `/api/twilio/voice/ai/start`

Twilio routes:
- `src/app/api/twilio/voice/incoming/route.ts`
- `src/app/api/twilio/voice/ai/start/route.ts`
- `src/app/api/twilio/voice/ai/turn/route.ts`
- `src/app/api/twilio/voice/transcription/route.ts`
- `src/app/api/twilio/voice/status/route.ts`

Key change already shipped:
- In `src/lib/voice-ai-repository.ts`, realtime streaming is only used if `ONE_DENTAL_ENABLE_TWILIO_REALTIME=1`.
- In `handleVoiceAiTurn(...)`, for `scenario === "inbound_takeover"` it routes the caller’s speech into the voice-agent scheduling brain via `handleSchedulingBrainTurn(...)`.

Scheduling source used for now:
- `OnlineSchedulingAdapter` (calls `getOnlineSchedulingAvailability(...)` + `submitOnlineBooking(...)`).

### 1.3 Vapi Transport Path (Webhook + Tool Calls)

Goal: Use Vapi for audio pipeline + barge-in + turn-taking, while keeping all business logic and scheduling actions on our servers.

Files:
- `src/app/api/webhooks/vapi/route.ts`
- `src/lib/vapi-webhooks.ts`

Supported tools (names must match Vapi assistant config):
- `get_available_slots`
- `hold_appointment_slot`
- `confirm_appointment`
- `escalate_to_human`

Authentication:
- Shared token via `Authorization: Bearer <token>` (also checks `x-vapi-token` variants).
- Token read from env `VAPI_WEBHOOK_TOKEN` OR vault credential providerKey `VAPI`, label `webhook_token`.

## 2) Known Gaps (Why Users Still Experience “Dumb AI”)

This is the main gap analysis driving next work. Do not do UI-first work until these are closed.

### 2.1 Voice Quality + Turn Logic

Symptoms reported:
- Caller asks for Wednesday slots but hears Tuesday.
- Name is misheard (“Gust”) and the agent repeats name requests or loses it.
- Flow can still feel rigid or repetitive.

Root causes:
- STT errors must be handled with confirmation/correction (“Did I get that right?”).
- The new scheduling brain is only used for `inbound_takeover` in the Twilio Gather fallback path.
- Calendar/time parsing is currently basic; preferences like “Wednesday morning” must be enforced at the slot-offer layer, not only prompt text.

### 2.2 Provider Readiness (NexHealth + Open Dental)

What exists:
- PMS has a connector readiness surface (`getPmsDataSourceStatus`).
- Internal online scheduling engine can book appointments (canonical tables + locking).

What is missing:
- A real external adapter:
  - `NexHealthSchedulingAdapter` (fetch availability + create appointment)
  - `OpenDentalSchedulingAdapter` (direct DB or API, depending on chosen integration approach)
- A routing policy that chooses adapter per practice/location.

### 2.3 Call Controls (Weave-like)

Twilio call-control exists elsewhere in codebase (conference participant hold/mute).
Missing for production:
- Real inbound call console reliability
- Park/hold/warm transfer flows tied to operatories/departments/extensions
- Screen pop integration for matched patients (partially present in phone ingestion; needs UX + correctness work)

### 2.4 Security / Compliance Gaps

Vapi webhook auth currently uses shared token but does NOT implement signature-based verification.

Missing:
- Dedicated per-tenant webhook secrets + rotation
- Hard PHI boundary enforcement for which fields are ever sent to Vapi
- Centralized integration settings UX (single place for keys) and enforcement that modules do not duplicate secrets.

## 3) Required Environment / Config (Production)

These must be set for correct behavior. If missing, features will appear broken.

Twilio:
- Ensure Twilio inbound voice webhook points to:
  - `POST https://app.1dentalai.com/api/twilio/voice/incoming`

Practice bridge number (human front desk line):
- In DB routing tables OR env fallback:
  - `TWILIO_OPERATOR_BRIDGE_NUMBER` or `PRACTICE_BRIDGE_NUMBER`

Time zone:
- Set `ONE_DENTAL_PRACTICE_TIMEZONE` per tenant/practice if not Denver.

Vapi:
- `VAPI_WEBHOOK_TOKEN` (env) OR vault credential `VAPI:webhook_token`
- Vapi server URL should be:
  - `https://app.1dentalai.com/api/webhooks/vapi`

Realtime streaming:
- Do NOT enable `ONE_DENTAL_ENABLE_TWILIO_REALTIME=1` unless the websocket sidecar is truly deployed and reachable at `/api/twilio/voice/realtime`.

## 4) Next Build Order (Do This In This Exact Sequence)

This sequence is designed to produce a working “better-than-Weave” inbound scheduling experience quickly, while keeping the architecture provider-agnostic.

### Step 1: Make Scheduling Brain the Single Source of Truth for Inbound Scheduling

Goal: Remove the split-brain behavior where some turns use old memory logic and some use the new brain.

Tasks:
1. Ensure Twilio inbound AI (Gather) ALWAYS routes scheduling turns into voice-agent brain.
2. Persist offered slots and selected slot robustly (don’t lose state between turns).
3. Add “confirm spelling” micro-flow when STT gives an unlikely name or caller corrects it.
4. Add a deterministic preference guard:
   - If caller says “Wednesday morning”, do not offer slots outside that preference unless you explicitly say “I don’t see Wednesday morning; closest is Tuesday morning, would that work?”

Acceptance:
- No repeated first/last name asks after captured.
- Day preference is respected.
- Caller corrections update state.

### Step 2: Add NexHealthSchedulingAdapter (Read + Write)

Goal: Use real NexHealth availability and appointment creation if credentials are configured.

Tasks:
1. Create `src/lib/voice-agent/scheduling/nexhealth-adapter.ts` implementing `SchedulingAdapter`.
2. Add connector config:
   - read NexHealth credentials from vault (`providerKey=NEXHEALTH` or `PMS_NEXHEALTH`)
3. Add adapter selection:
   - If NexHealth credential present and practice is configured for NexHealth, use it; else fall back to OnlineSchedulingAdapter.

Acceptance:
- Tool `get_available_slots` returns slots from NexHealth (with connector status shown if blocked).
- Booking creates a real NexHealth appointment when enabled.

### Step 3: Add OpenDentalSchedulingAdapter (Read + Write)

Goal: For practices on Open Dental, availability + booking should be real.

Tasks:
1. Implement adapter with connector readiness gating.
2. Decide integration approach:
   - direct Open Dental DB connection (preferred for internal deployments) OR Open Dental API if available in this environment.

Acceptance:
- Same as NexHealth.

### Step 4: Switch Voice Transport to Vapi (Primary) While Keeping Twilio Fallback

Goal: Vapi handles audio quality now; Twilio Gather remains as backup and for later full-stack work.

Tasks:
1. Configure Vapi assistant to call our tools.
2. Implement minimal “assistant-request” flow to return an assistantId (optional).
3. Add PHI boundary in `vapi-webhooks.ts`:
   - redact anything not required
4. Add audit events for every tool call with outcome and blocked reasons.

Acceptance:
- Live inbound call via Vapi can:
  - capture name + reason + preference
  - fetch slots
  - book
  - confirm

### Step 5: Own Full Stack (Later)

Goal: Replace Vapi transport progressively.

Tasks:
1. Deploy the websocket realtime bridge for Twilio Media Streams in production.
2. Replace shared-token auth with signed webhooks (Twilio signature already exists; do Vapi/Retell signatures too).
3. Build a proper call state machine for barge-in, interruptions, and latency handling.

## 5) Testing / Verification Checklist (Must Be Run Before “Done”)

1. `npm run lint`
2. Confirm API behavior:
   - `GET https://app.1dentalai.com/api/health` returns ok.
3. Twilio:
   - Place inbound call to practice number.
   - Let it ring out to AI takeover.
   - Ask: “My name is Gaurav. I want Wednesday morning for a cleaning.”
   - Verify it does not offer Tuesday unless explicitly stated as fallback.
4. Vapi webhook:
   - Send a signed/authenticated test request to `/api/webhooks/vapi` to ensure tool-calls return `results[]`.

## 6) Notes About Cursor/DeepSeek/Ollama Local Build

The repo currently includes a Next.js app with a PostgreSQL-backed DB layer (via `pg` and raw SQL), plus Prisma schema/migrations.

If you run a local stack:
- Ensure `DATABASE_URL` is set and migrations applied.
- Confirm “online scheduling” has at least one ACTIVE link in `PmsOnlineSchedulingLink` or the scheduling adapter will return no slots.

