# Doctor-Owner Operating Model

Status: Draft research model  
Created: 2026-05-20  
Purpose: View 1DentalAI from the dentist-owner perspective: the platform is responsible for helping run the business, protect patients, protect revenue, and keep the practice clinically and operationally ready.

## Doctor-Owner Promise

1DentalAI should answer the questions a dentist-owner asks every day:

- Are patients safe and clinically handled?
- Are emergencies triaged correctly?
- Are rooms, chairs, providers, hygienists, and assistants being used well?
- Are charts, notes, x-rays, perio, prescriptions, referrals, lab cases, and consents complete?
- Are claims clean and supported by the right evidence?
- Are EOBs/ERAs posted correctly and are underpayments or denials being caught?
- Are providers credentialed with the right payers before we bill under them?
- Are SOPs being followed by the team?
- Are patients accepting treatment and able to pay?
- Are we compliant, auditable, and protected?
- If something is missing, who owns it and what happens next?

## Source Of Truth

The source of truth for the doctor-owner workflow is not DentalRCM, the phone app, or any existing internal repo. Those repos are implementation accelerators only.

The source of truth is:

- current dental industry workflow research
- doctor-owner operating requirements
- payer and RCM workflow research
- clinical documentation and patient safety expectations
- regulatory and compliance requirements
- competitive product benchmarks
- Gaurav's approved phase plan

Any reused workflow from DentalRCM or another repo must be validated against this research baseline before it is accepted.

## 1. Clinical Care And Patient Chart

Doctor-facing workflows:

- Review the full patient EHR before care: medical history, allergies, medications, problems, vitals, alerts, past treatment, chart, x-rays, perio, notes, prescriptions, referrals, lab cases, consent, insurance, balance, and communication history.
- Start or review an encounter from the schedule, room, chair, or patient chart.
- See planned procedures, clinical risks, required x-rays, due perio chart, open lab cases, unsigned forms, and financial clearance before treatment.
- Document care with scribe, templates, voice charting, manual notes, and provider signoff.
- Generate patient-facing education, post-op instructions, prescriptions, referrals, and treatment plan explanations.
- Lock the final chart note and keep amendments auditable.

Required product behavior:

- Patient chart must be a doctor-grade EHR, not just a CRM profile.
- AI clinical drafts are never final without provider review/signoff.
- Clinical evidence must connect to claims, treatment plans, referrals, and patient education.
- Chart access must be role/data-class scoped.

## 2. Emergency And Triage

Doctor-facing workflows:

- AI phone/chat/front desk captures emergency complaint, onset, swelling, trauma, bleeding, fever, airway/swallowing issues, pain level, pregnancy/medical risks, medications, allergies, and photos if appropriate.
- System classifies emergency severity: same-day dental, next-available dental, oral surgery referral, endodontic referral, hospital/ER red flag, after-hours doctor callback, or self-care instructions pending appointment.
- System shows open emergency slots, provider availability, chair availability, and referral partners.
- Provider can approve instructions, prescriptions, referral, or appointment override.
- Every emergency triage action is audited.

Safety rules:

- Airway compromise, rapidly spreading swelling, severe facial trauma, uncontrolled bleeding, systemic illness/red flags, or medical emergency cues must escalate to emergency medical care or doctor review.
- AI may triage and draft, but high-risk instructions, prescriptions, and clinical disposition need provider-approved rules.

Required models:

- `EmergencyCase`
- `TriageAssessment`
- `TriageQuestionnaire`
- `TriageDisposition`
- `EmergencyInstruction`
- `DoctorCallback`
- `AfterHoursEscalation`
- `UrgentReferral`
- `EmergencySlot`

## 3. Referrals, Hospitals, And Specialist Handoffs

Doctor-facing workflows:

- Refer to oral surgery, endodontics, periodontics, orthodontics, pathology, hospital, ER, sleep medicine, primary care, or imaging center.
- Build referral packet with chart notes, x-rays, CBCT, perio chart, medical history, medications, allergies, consent, and reason for referral.
- Track specialist appointment status, outcome, returned report, and recommended next steps.
- Handle inbound referrals with patient registration, imaging upload, triage, consult scheduling, and report back.

Required product behavior:

- Referrals need status, packet completeness, specialist communication, and follow-up tasks.
- Hospital/ER referrals need clear escalation reason, handoff documentation, and contact pathway.
- Referral evidence should reuse the same document/image/evidence packet system used for claims.

## 4. Credentialing, Payer Enrollment, And Provider Readiness

Doctor-owner workflows:

- Know whether each provider is credentialed with each payer at each practice/location/entity.
- Track NPI, CAQH, state license, DEA where applicable, malpractice, W-9, business entity, tax ID, EFT/ERA enrollment, payer contracts, fee schedules, effective dates, recredentialing, revalidation, and expirations.
- Upload provider documents once and reuse them across payer applications.
- Submit and track applications, payer follow-ups, missing info, approvals, denials, effective dates, network status, fee schedules, and payer maintenance.
- Prevent billing under the wrong provider or before effective dates unless policy explicitly allows a governed exception.

Required product behavior:

- Credentialing is a revenue gate, not an HR note.
- Claims, eligibility, scheduling, and provider onboarding should be aware of credentialing readiness.
- Expiration/recredentialing windows must create proactive tasks.
- Provider/entity/location enrollment must be represented because some payers require provider plus entity/location enrollment.

Required models:

- `CredentialingProfile`
- `ProviderCredential`
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

## 5. EOB, ERA, Payment Posting, And Underpayment Control

Doctor-owner workflows:

- Receive EOB/ERA.
- Match remittance to claims, patients, procedures, providers, and deposits.
- Post insurance payments and adjustments.
- Identify denials, partial pays, underpayments, missing attachments, frequency-limit denials, bundling/downgrades, coordination-of-benefits issues, and patient responsibility.
- Generate follow-up tasks, appeals, corrected claims, patient balances, or write-off review.
- Reconcile deposits with bank/processor/clearinghouse.

Required product behavior:

- EOB/ERA cannot be a static PDF drawer. It must feed payment posting, denial management, patient balance, underpayment detection, and analytics.
- OCR/manual EOB entry and electronic ERA ingestion should normalize into the same model.
- Write-offs and appeal decisions need approval policy and audit.

## 5A. Revenue Integrity And Historical Claim Recovery

Doctor-owner workflows:

- Import or sync historical claims, procedures, ledger lines, payments, EOBs, ERAs, adjustments, write-offs, denials, appeals, attachments, and payer/provider credentialing state.
- Compare what was produced, what was billed, what was allowed, what was paid, what was adjusted, what was written off, and what should have happened under contract/payer rules.
- Find missed billing, missed charges, duplicate charges, unbilled completed procedures, stale unsubmitted claims, claims paid below contract, incorrect write-offs, unresolved denials, missing secondary claims, stale patient balances, payer pattern issues, credentialing-caused leakage, attachment-driven denials, timely-filing risk, and recurring coding/documentation leakage.
- Estimate recoverable value, confidence, deadline, required evidence, and recommended recovery path.
- Create revenue integrity cases, assign owners, assemble evidence, draft corrected claims/appeals/refunds/write-off reversal recommendations, and require approval before external action.
- Track recovered dollars, written-off dollars, nonrecoverable findings, root causes, and process fixes.

Required product behavior:

- Revenue integrity is not a dashboard metric. It is a workqueue with evidence, recovery actions, deadlines, approvals, and actual dollars recovered.
- Past claim checks must work from PMS ledger, claims, ERA/EOB, payer rules, fee schedules, credentialing, attachments, and clinical documentation.
- Historical audits must preserve source evidence and never mutate PMS/ledger/write-off state without governed approval.
- DentalRCM already contains reusable revenue integrity concepts and should be the primary source for this domain.

Required models:

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

DentalRCM reuse:

- Revenue integrity stage/workqueue concepts from `docs/VIEW3_RCM_OPERATIONAL_DASHBOARD_SPEC.md`
- Enterprise RCM requirements from `docs/DENTAL_RCM_FEATURE_REQUIREMENTS.md`
- Denial, ERA/EOB, underpayment, recovery, credentialing, and leakage services under `src/lib/rcm`
- Prisma enums and models for RCM workflow domains, ERA, EOB, claim, credentialing, integration runs, and revenue integrity

Reuse caveat: if DentalRCM is narrower than current RCM/revenue-integrity research, the researched workflow wins. DentalRCM code can accelerate implementation, but it cannot lower the acceptance bar.

Required models:

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

## 6. SOPs, Knowledge, And Team Execution

Doctor-owner workflows:

- Define SOPs for emergency calls, check-in, medical history updates, x-rays, perio charting, consent, checkout, membership offers, insurance verification, claim attachments, EOB posting, refunds, reviews, referrals, lab cases, sterilization, incidents, and after-hours handling.
- Assign SOPs by role/location.
- Train staff and track acknowledgement.
- Detect workflow deviations.
- Create tasks, coaching notes, and audits.

Required product behavior:

- SOPs must be versioned and tied to workflows, roles, forms, templates, and audits.
- AI agents must cite approved SOPs before advising staff or taking actions.
- A doctor-owner must see whether the practice is following the process, not just whether tasks exist.

Required models:

- `SopDocument`
- `SopVersion`
- `SopAcknowledgement`
- `SopWorkflowBinding`
- `TrainingAssignment`
- `TrainingCompletion`
- `ProcessDeviation`
- `QualityAudit`
- `IncidentReport`
- `CorrectiveAction`

## 7. PDF, Forms, Reports, And Document Generation

Doctor-owner workflows:

- Generate treatment plan PDFs, consent forms, referral packets, claim appeal packets, EOB summaries, patient statements, membership agreements, payment plans, clinical summaries, post-op instructions, school/work notes, emergency visit summaries, and DSO reports.
- Include correct signatures, dates, patient/provider/location identity, source evidence, and versioned templates.
- Store generated documents in patient chart and optionally write them back to PMS.

Required product behavior:

- PDF generation must be template-driven, auditable, and tied to source data.
- Generated documents must have immutable copies plus versioned templates.
- Patient-facing documents must be understandable; payer-facing documents must be evidence-heavy.

Required models:

- `DocumentTemplate`
- `GeneratedDocument`
- `PdfRenderJob`
- `DocumentSignature`
- `DocumentDelivery`
- `DocumentArchive`
- `DocumentTemplateVersion`

## 8. Business Operations From Doctor Seat

Doctor-owner daily command center should include:

- Today's clinical risks
- Emergencies awaiting triage or callback
- Patients in chairs and chair turnover status
- Provider/RDH utilization
- Unsigned notes and clinical drafts
- Missing x-rays/perio/consents
- Lab cases due or delayed
- Referrals awaiting response
- Claims needing evidence
- EOBs/ERAs needing posting
- Denials and underpayments needing approval
- Credentialing blockers
- Membership/financing opportunities
- Patient balances and collections risk
- Reviews/service recovery
- SOP deviations and staff coaching
- Compliance/incident alerts
- Production, collections, hygiene, treatment acceptance, and payer velocity

## Sources

- ADA EOB/ERA guidance: https://www.ada.org/resources/practice/dental-insurance/explanation-of-benefits-statement
- ADA eligibility/benefits workflow guidance: https://www.ada.org/-/media/project/ada-organization/ada/ada-org/files/resources/practice/dental-insurance/eligibility_and_benefits_verification.pdf
- ADA patient record documentation guidance: https://www.ada.org/resources/practice/practice-management/documentation-patient-records
- Dental credentialing workflow references: https://oneexpert.ai/, https://cloux.co/, https://www.dentalhub.com/dental-practices/provider-credentialing, https://payerready.com/
- Dental emergency triage references: https://www.mndental.org/files/Telephone-Triage.pdf, https://www.wda.org/docs/statewiwisconsinlibraries/default-document-library/dental-triage-2025.pdf
- Dental triage AI benchmark context: https://arxiv.org/abs/2604.13060
