# PMS Scribe and Notes Plan

## Research Summary

- AI scribes are ambient documentation tools: they listen to clinician-patient conversations, transcribe the visit, extract clinically relevant details, and produce structured notes for clinician review.
- Dental scribes must be separate from perio charting. Perio can contribute findings when available, but scribing must support exams, restorative, emergency, hygiene, consults, referrals, implants, and treatment discussions.
- Strong dental scribe workflows combine PMS context, customizable templates, transcript review, editable summaries, one-click chart save, CDT-coded treatment-plan rows, and task handoff.
- Human review is mandatory. AI output should remain draft/proposed until the provider approves it.
- Safety and implementation guidance emphasizes patient consent, privacy, clear audio capture, clinical review, auditability, and fallback manual documentation.

## Product Scope

Build a standalone PMS module at `/app/pms/scribe`.

The first version will:
- Select patient and visit template.
- Capture transcript/free dictation text.
- Generate an editable clinical note draft.
- Suggest treatment plan rows with CDT codes, tooth, surface, and priority.
- Generate role-based tasks from the plan and documentation gaps.
- Save approved output into existing PMS tables:
  - `PmsClinicalNote`
  - `PmsTreatmentPlan`
  - `PmsTreatmentPlanItem`
  - `PmsTask`

## Non-Goals

- Do not build this as a perio charting module.
- Do not require perio data.
- Do not mark generated notes as signed automatically.
- Do not silently write CDT codes, treatment plans, or tasks without explicit save.
- Do not claim live model behavior until the model connector is wired and governed.

## Implementation Approach

- Add a `Scribe` PMS nav item.
- Add a client workspace for draft generation and edit-in-place review.
- Add a server-side scribe helper that maps transcript content to note sections, CDT suggestions, analytics, and tasks.
- Add an API endpoint to generate drafts and another endpoint to save approved drafts into the PMS.
- Reuse existing PMS repository functions for clinical notes, treatment plans, treatment-plan items, and tasks.

## Sources Reviewed

- Denti.AI Scribe: ambient capture, customizable templates, PMS save, multi-speaker clinical notes.
- Denti.AI Auto-Chart: transcript extraction, CDT code mapping, teeth/surface association, edit before PMS save.
- Denti.AI PMS integrations: patient/provider context, one-click PMS writeback, patient validation.
- DeepCura dental scribe comparison: dental terminology, ambient capture, PMS integration, CDT code suggestions, treatment-plan generation.
- AIDH AI scribe implementation guidance: clinician accountability, patient consent, privacy/security, quality assurance, integration planning, ongoing monitoring.
