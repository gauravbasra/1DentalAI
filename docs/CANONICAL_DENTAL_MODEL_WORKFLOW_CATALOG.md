# Canonical Dental Model Workflow Catalog

Status: Draft research catalog  
Created: 2026-05-20  
Purpose: Explain each canonical dental model in workflow terms so 1DentalAI models are not just names.

## Research Baseline

This catalog is based on dental PMS/API, payer, imaging, pharmacy, and practice workflow research from Open Dental, Archy, Dentrix Ascend, Curve, ADA CDT/claim form guidance, payer documentation requirements, Surescripts/eRx workflows, DICOM/CBCT imaging concepts, membership/payment platforms, and dental operations benchmarks.

Existing local repos are not the source of truth for these models. DentalRCM, the phone/reputation app, and any other local code are reusable inputs only. A model is considered valid when it is supported by dental workflow research, integration/protocol research, compliance needs, and the approved phase plan.

Key takeaways:

- Dental PMS data is not generic EHR data. Tooth, surface, perio, treatment plan, benefits, fee schedule, chair, provider, claim, attachment, and imaging workflows have dental-specific semantics.
- Clinical, billing, imaging, and payer workflows are tied together. A crown claim may need chart notes, tooth/surface, pre-op radiograph, narrative, treatment plan, fee estimate, and insurance benefit evidence.
- PMS APIs expose useful concepts such as patients, appointments, benefits, claims, documents, lab cases, medication/allergy records, operatories, referrals, schedules, perio measures, procedures, recalls, statements, and tasks, but different vendors represent them differently.
- The canonical model must be stronger than any one vendor so 1DentalAI can work as a PMS-grade system, an integration layer, or an overlay.
- Model acceptance must be judged from the industry workflow lens, not from whether an existing repo already has a similar table or service.

## 1. Patient And Household

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Patient` | The canonical person receiving care. | Central object for chart, appointments, insurance, communications, balances, treatment, prescriptions, referrals, and claims. | Must support active/inactive/non-patient, merged duplicates, source IDs, household/account links, and PHI access audit. |
| `PatientIdentifier` | IDs from PMS, payer, portal, phone, CRM, imaging, eRx, or legacy imports. | Identity resolution, sync, dedupe, patient lookup by chart number, payer member ID, phone, email, or external ID. | Needs type, issuer, source system, confidence, active/retired state. |
| `PatientContactPoint` | Phone, SMS, email, address, portal, preferred contact paths. | Reminders, recalls, treatment follow-up, billing, review requests, emergency contact, consent-aware outreach. | Must store consent, opt-out, verified status, preferred channel, quiet-hour behavior. |
| `PatientDemographic` | DOB, sex, gender identity where collected, language, address, responsible party, household fields. | Eligibility, claims, patient matching, forms, clinical context, communication personalization. | Must preserve source evidence and support required claim demographics. |
| `PatientPreference` | Communication, language, scheduling, provider, accessibility, financial, and care preferences. | Makes patient experience personalized and helps staff avoid mistakes. | Should drive reminders, interpreter needs, appointment times, and patient-facing materials. |
| `PatientConsent` | Signed or recorded permission for communications, treatment, forms, AI/recording, financial plans, PHI sharing. | TCPA/SMS, call recording, AI voice, treatment consent, membership enrollment, payment plans, referrals. | Needs versioned form, signature, date, scope, revocation, source document. |
| `PatientAlert` | Critical banner-style warning or operational note. | Front desk, clinical, billing, safety, allergy, balance, legal, behavior, accessibility, or scheduling alerts. | Must be role/data-class scoped so not every alert is visible to every user. |
| `PatientMedicalHistory` | Structured and narrative health history. | Clinical risk review, prescriptions, treatment planning, anesthesia/sedation, claims documentation. | Needs reviewed date, provider signoff, patient-submitted versions, change history. |
| `PatientAllergy` | Allergy or adverse reaction. | Clinical safety and eRx drug-allergy checks. | Should sync to PMS/eRx where supported; severity and reaction matter. |
| `PatientMedication` | Current/past medication record. | Medical history, eRx, interaction checks, clinical note context. | Distinguish patient-reported, medication-history network, and prescribed-by-practice sources. |
| `PatientProblem` | Medical/dental problem list or condition. | Clinical documentation, risk assessment, treatment planning, claim narratives. | Should support ICD/SNOMED-style codes where needed but not force medical coding onto every dental workflow. |
| `PatientVitals` | BP, pulse, weight, A1c/point-of-care style values where applicable. | Oral surgery, sedation, medical necessity, diabetes screening, pre-op risk. | Timestamped and encounter-linked. |

## 2. Scheduling, Rooms, And Capacity

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Appointment` | Scheduled care event. | Daily schedule, confirmations, chair occupancy, clinical encounter, eligibility check, treatment/claim trigger. | Needs patient, provider/RDH, operatory/chair, status, duration, category, planned procedures, confirmation, production estimate. |
| `AppointmentCategory` | Configured visit type. | Speeds scheduling and standardizes duration, color, codes, forms, reminders, and room/provider rules. | Example: prophy, SRP quad, crown prep, crown seat, consult, emergency, ortho adjustment. |
| `AppointmentFinderRule` | Logic for finding open slots. | Online scheduling, waitlist, ASAP list, reschedule, recall fill-ins. | Uses provider availability, operatory constraints, duration, appointment category, location, patient preference. |
| `AsapListEntry` | Patient wants sooner appointment. | Fill cancellations and schedule gaps. | Needs priority, procedure type, preferred times, expiration, contact attempts. |
| `WaitlistEntry` | Patient waiting for a specific opening or treatment slot. | Hygiene, treatment, surgery, ortho, emergency scheduling. | Similar to ASAP but often tied to a specific procedure/provider/location. |
| `AppointmentProvider` | Provider/RDH/assistant assignment for an appointment. | Enables split provider visits, hygiene exams, assistant coverage, production allocation. | Must support primary/secondary roles and time slices. |
| `AppointmentProcedure` | Procedure planned or completed during appointment. | Treatment plan, estimate, charting, claims, room setup, lab/device needs. | Links `Appointment`, `Procedure`, `ProcedureCode`, tooth/surface, fee, status. |
| `ScheduleBlock` | Provider/operatory unavailable or reserved time. | Lunch, meetings, surgery blocks, hygiene blocks, vacation, emergency slots. | Affects appointment finder and online scheduling. |

## 3. Insurance, Benefits, And Coverage

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `InsurancePlan` | Plan-level benefit product. | Treatment estimates, eligibility, claims, payer routing. | Stores employer/group, plan type, fee schedule, network, max, deductible, limitations. |
| `InsuranceSubscriber` | Subscriber/member relationship. | Eligibility and claims. | Patient may be subscriber or dependent; supports family and coordination of benefits. |
| `InsuranceCarrier` | Payer/carrier entity. | Payer registry, claims, eligibility, status, ERA, contacts. | Must map aliases, payer IDs, trading partner IDs, portals, network rules. |
| `InsuranceBenefit` | Structured benefit details. | Estimate patient portion, frequency limits, waiting periods, downgrades, categories. | Needs category-level and code-level benefits, source, confidence, effective date. |
| `InsuranceVerification` | Verification event and result. | Front desk readiness, treatment estimate, RCM queue. | Tracks route used, raw response, normalized benefits, blockers, last verified, next action. |
| `Coverage` | Patient-specific active/inactive coverage snapshot. | Determines whether patient is financially cleared. | Links plan, subscriber, eligibility, dates, coordination order, source evidence. |

## 4. Treatment, Procedures, Diagnosis, And Claim Codes

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `TreatmentPlan` | Proposed care plan from provider. | Case presentation, estimate, consent, financing, scheduling, claim readiness. | May contain phases, alternatives, accepted/declined/deferred states. |
| `Procedure` | Clinical procedure instance. | Charting, treatment plan, appointment, claim, ledger, narrative. | Has status: proposed, referred, scheduled, completed, billed, voided. |
| `ProcedureCode` | CDT/procedure code catalog entry. | Claim form, fee schedules, treatment plans, documentation rules. | CDT is authoritative in US dental claims; store code versions and payer documentation rules separately. |
| `ProcedureSurface` | Surface associated with procedure. | Restorative charting and ADA claim anatomy fields. | Supports MODBL-style dental surfaces and must validate by tooth type. |
| `ProcedureTooth` | Tooth or oral cavity anatomy associated with procedure. | Treatment plan, chart, claim, imaging evidence. | Must support permanent/primary numbering, arches/quadrants, supernumerary edge cases. |
| `Diagnosis` | Clinical diagnosis or finding. | Clinical notes, treatment justification, payer narratives, medical crossover. | May be dental-specific narrative, ICD, SNOMED, perio diagnosis, caries risk, pathology finding. |

## 5. Claims, ERA, Balances, And Payments

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Claim` | Dental payer claim or predetermination packet. | Submit, track, attach evidence, receive status, post payment, appeal. | Needs payer, subscriber, procedures, provider, billing entity, status, route, attachments, errors. |
| `ClaimLine` | Procedure line on claim. | Payment adjudication and denial analysis. | Links procedure, CDT, tooth/surface, fee, allowed, paid, adjustment, denial reason. |
| `EraPayment` | Electronic remittance/payment record. | Payment posting, reconciliation, denial/underpayment detection. | Represents 835/ERA/EOB normalized data and link to claim lines. |
| `PatientBalance` | Patient owed amount. | Statements, text-to-pay, collections, financing, payment plans. | Needs aging, source ledger, responsibility source, disputed/hold state. |
| `Payment` | Posted or attempted payment. | In-office, online, text-to-pay, recurring billing, refunds, reconciliation. | Links patient, ledger, processor, payment method, claim/patient responsibility. |
| `PaymentPlan` | Agreement to pay balance over time. | Patient financial workflow and collections. | Needs terms, down payment, schedule, status, signed agreement. |
| `PaymentPlanSchedule` | Payment schedule for plan. | Recurring billing and forecast. | Holds due dates, amounts, grace periods. |
| `PaymentPlanInstallment` | Individual scheduled payment. | Collections and failed payment recovery. | Can be paid, failed, skipped, forgiven, rescheduled. |
| `PaymentMethod` | Stored card/bank/cash/check reference. | Card-on-file, recurring billing, payment links. | Must tokenize; never store raw card data. |
| `CardOnFileAgreement` | Consent to store/use payment method. | Recurring billing, payment plans, memberships. | Needs signed terms, scope, revocation, expiration. |
| `Statement` | Patient bill/statement. | A/R collections and patient communication. | Tracks generated, sent, viewed, paid, disputed. |

## 5A. Credentialing, Payer Enrollment, And Provider Readiness

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `CredentialingProfile` | Provider credentialing master profile. | Stores reusable provider facts for payer enrollment. | Links provider, licenses, NPI, CAQH, malpractice, CV, W-9, documents. |
| `PayerEnrollment` | Provider/entity/location enrollment with payer. | Determines whether a provider can be billed in-network. | Needs payer, provider, location/entity, status, effective date, recredentialing date. |
| `PayerApplication` | Application packet/submission. | Tracks initial credentialing, add-location, recredentialing, network changes. | Stores submitted forms, payer responses, missing items, follow-up dates. |
| `CredentialingDocument` | License, NPI, W-9, malpractice, CV, DEA, CAQH proof, etc. | Reused across payer applications. | Needs expiration, verification, source, secure storage. |
| `CredentialingTask` | Work item for credentialing team. | Follow-up, missing doc, payer call, attestation, renewal. | Should create proactive reminders before expirations. |
| `CredentialingStatusEvent` | Timeline event. | Audit and visibility. | Submitted, returned, pending payer, approved, denied, effective, terminated. |
| `PayerContract` | Contract relationship with payer. | Fee schedule and network status. | Links payer, entity/location/provider, dates, terms, plan networks. |
| `FeeScheduleContract` | Contracted fee schedule. | Estimates, write-offs, underpayment detection. | Needs effective dates and payer/plan specificity. |
| `EftEnrollment` | Electronic funds transfer setup. | Deposit/reconciliation readiness. | Links payer, bank/deposit account, status. |
| `EraEnrollment` | Electronic remittance enrollment. | ERA ingestion readiness. | Links payer/clearinghouse route, status, effective date. |
| `CaqhProfile` | CAQH identity/attestation status. | Credentialing readiness. | Tracks profile ID, attestation date, expiration, missing fields. |
| `CredentialExpiration` | Expirable credential. | Prevent lapse. | License, DEA, malpractice, board cert, CPR, sedation permits. |
| `RecredentialingCycle` | Recurring payer/provider renewal window. | Keeps providers in-network. | Creates future task queue and owner accountability. |

## 5B. EOB, ERA, Posting, Denials, And Underpayments

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `EobDocument` | Paper/PDF/image explanation of benefits. | OCR/manual posting, patient responsibility, denial analysis. | Links to payer, patient, claim, document OCR, source file. |
| `EraTransaction` | Electronic remittance transaction. | Automated posting and reconciliation. | Normalized 835/ERA-style data. |
| `RemittanceAdvice` | Canonical remittance. | Unified EOB/ERA model. | Supports both electronic ERA and OCR/manual EOB. |
| `RemittanceClaim` | Claim-level payment result. | Claim status and denial workflow. | Links claim, payer trace, paid/denied/adjusted totals. |
| `RemittanceLine` | Procedure-line adjudication. | Payment posting and underpayment detection. | Links claim line, allowed, paid, adjustment, CARC/RARC-like codes. |
| `AdjustmentCode` | Normalized denial/adjustment code. | Denial analytics and appeal logic. | Supports payer-specific mapping and narrative. |
| `DenialReason` | Business reason for denial. | Staff follow-up and root-cause analytics. | Missing x-ray, perio chart, narrative, frequency, credentialing, eligibility, timely filing. |
| `PaymentPostingBatch` | Batch of posting work. | Biller workflow. | Groups EOB/ERA, checks/deposits, claims, exceptions. |
| `PaymentPostingItem` | Individual posting action. | Human/AI-assisted posting. | Needs approval for write-off or uncertain match. |
| `DepositReconciliation` | Match posted payments to bank/processor deposit. | Owner cash control. | Links EFT/check/card deposits and posting batches. |
| `UnderpaymentFinding` | Suspected payer underpayment. | Recovery workflow. | Compares contract fee schedule, allowed, paid, write-off. |
| `AppealCase` | Appeal work item. | Denial recovery. | Links evidence packet, narrative, deadlines, payer response. |
| `CorrectedClaim` | Corrected/resubmitted claim. | Fix claim errors. | Tracks original claim, correction reason, supporting docs. |
| `WriteOffReview` | Approval workflow for write-offs. | Financial control. | Requires reason, amount, approver, policy. |

## 5C. Revenue Integrity And Historical Claim Audits

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `RevenueIntegrityAudit` | A scoped audit run. | Reviews historical claims/ledger/payments for leakage. | Scope by practice, location, payer, provider, date range, procedure family. |
| `HistoricalClaimReview` | Review record for a past claim. | Determines whether historical claim was billed/paid/adjusted correctly. | Links claim, procedures, EOB/ERA, ledger, fee schedule, payer rule, attachments. |
| `RevenueLeakageFinding` | Detected money leakage. | Workqueue item for recovery or process fix. | Has leakage type, amount, confidence, evidence, deadline, owner. |
| `LeakageType` | Classification. | Analytics and prioritization. | Underpayment, missed charge, duplicate charge, unbilled procedure, missing secondary, bad write-off, credentialing, attachment, timely filing, coding. |
| `RecoverableOpportunity` | Finding likely worth pursuing. | Revenue recovery queue. | Stores estimated recovery, effort, deadline, recommended path. |
| `RecoveryCase` | Active case to recover money. | Appeal, corrected claim, payer call, write-off reversal, patient balance correction. | Needs status, owner, evidence packet, approval. |
| `RecoveryAction` | Step in recovery. | Operational execution. | Draft appeal, call payer, submit corrected claim, attach x-ray, reverse write-off. |
| `RecoveryEvidence` | Evidence for recovery. | Supports appeal/correction. | Claim, EOB, ERA, x-ray, perio chart, narrative, contract, fee schedule, credentialing proof. |
| `RecoveryDeadline` | Time-sensitive recovery deadline. | Prevents timely filing/appeal misses. | Tied to payer rules and denial/claim dates. |
| `RecoveredRevenueEvent` | Money recovered. | ROI analytics. | Links payment/ERA/ledger adjustment to recovery case. |
| `WriteOffVariance` | Incorrect or suspicious write-off. | Manager review. | Compares contract, payer response, staff action, policy. |
| `ContractVariance` | Paid/allowed amount differs from contract. | Underpayment detection. | Needs payer contract/fee schedule and remittance line. |
| `MissedChargeFinding` | Work performed but not charged. | Charge capture correction. | Links completed procedures, clinical note, appointment, ledger. |
| `DuplicateChargeFinding` | Duplicate billing risk. | Prevent refunds/compliance issues. | Links duplicate procedure/claim/ledger lines. |
| `UnbilledProcedureFinding` | Completed procedure with no claim/charge. | Revenue recovery. | Important for hygiene, x-rays, perio, adjunctive procedures. |
| `SecondaryClaimOpportunity` | Secondary claim not submitted or underworked. | COB recovery. | Links primary EOB, secondary coverage, patient balance. |
| `CredentialingLeakageFinding` | Revenue lost because provider/location/entity was not credentialed. | Credentialing fix and recovery. | Links payer enrollment, claim denial, provider, effective dates. |
| `AttachmentDenialPattern` | Recurring denial due to missing evidence. | Process improvement and claim scrubber rules. | Links payer/procedure/documentation requirement. |
| `PayerUnderpaymentPattern` | Recurring underpayment by payer/plan/code/provider. | Contract enforcement and payer escalation. | Aggregates contract variance findings. |

## 6. Patient Financial Products

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `PatientFinancingApplication` | Application to third-party financing. | Treatment case acceptance. | Stores requested amount, applicant, treatment context, consent, provider. |
| `PatientFinancingOffer` | Financing terms shown to patient. | Compare monthly options and approval paths. | Needs APR/term/payment/disclosures; provider fees may affect practice economics. |
| `PatientFinancingDecision` | Approval/decline/prequal outcome. | Treatment presentation and audit. | Must store source, timestamp, offer IDs, adverse action handling where applicable. |
| `PatientFinancingAgreement` | Accepted financing plan. | Payment handoff and treatment acceptance. | Links offer, treatment plan, signed disclosures, funding status. |
| `MembershipPlan` | In-house dental membership/discount plan. | Uninsured patient retention and recurring revenue. | Often ties to PMS fee schedule and included preventive services. |
| `MembershipPlanTier` | Individual/family/perio/child/etc. tier. | Plan pricing and benefit design. | Supports DSO template with location override. |
| `MembershipPlanBenefit` | Included services and discounts. | Eligibility during treatment estimates. | Example: 2 prophys, exams, x-rays, 15 percent restorative discount. |
| `MembershipEnrollment` | Patient enrolled in plan. | Active membership, renewal, discount application. | Needs effective/term dates, payment status, signed form, PMS writeback. |
| `MembershipDependent` | Family member under membership. | Family plan support. | Links household members and tier rules. |
| `MembershipRenewal` | Renewal cycle. | Revenue and patient retention. | Tracks auto-renew, notices, renewal payment, cancellation window. |
| `MembershipCancellation` | End of membership. | Compliance, billing, and discount stop. | Needs reason, effective date, refund/proration rules. |
| `MembershipPayment` | Payment for membership. | Recurring revenue and failed payment recovery. | Links recurring billing profile and enrollment. |
| `DiscountPlan` | Non-insurance discount arrangement. | Treatment estimate and fee reduction. | Must avoid representing as insurance. |
| `PracticePlan` | Practice-owned care/subscription plan. | Preventive, perio, family, employer/group plan operations. | May be broader than membership and include service bundles. |
| `PracticePlanTemplate` | Reusable plan blueprint. | DSO standardization and fast rollout. | Locations can inherit and override safely. |
| `PlanEligibilityRule` | Who can see/enroll/use a plan. | Financing/membership presentation logic. | Includes insurance status, treatment amount, location, age, perio status. |
| `PlanFeeSchedule` | Fee/discount schedule linked to plan. | Estimates, patient portion, PMS writeback. | Must map to PMS fee schedules where possible. |
| `PlanEnrollmentForm` | Enrollment agreement document. | Legal consent and patient signature. | Versioned with plan details and disclosures. |
| `PlanConsentSignature` | Signature for plan enrollment. | Audit and PMS document writeback. | Needs signer, timestamp, method, document hash. |
| `RecurringBillingProfile` | Automated billing setup. | Memberships and payment plans. | Must include payment method token, cadence, retry policy. |
| `FailedPaymentEvent` | Failed auto-payment. | Recovery workflow. | Triggers patient outreach, retry, suspension, or manual review. |

## 7. Communications

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `CommunicationThread` | Conversation across SMS, email, phone, portal, chat. | Unified inbox and patient timeline. | Links patient/lead/household, assigned user, topic, consent state. |
| `CommunicationMessage` | Individual message/call/chat item. | Reminders, reviews, billing, treatment follow-up, service recovery. | Needs channel, direction, delivery, template, PHI class, opt-out handling. |

## 8. Clinical Documentation And Review

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `ClinicalNote` | Final signed clinical documentation. | Legal record, continuity of care, claim narrative source. | Needs author, signer, encounter, locked state, amendments. |
| `ClinicalTranscript` | Audio-derived transcript or dictation. | AI scribe, call/visit record, note source evidence. | PHI-heavy; retention and access must be controlled. |
| `ClinicalNoteDraft` | AI or template-generated note before signoff. | Provider review workflow. | Must never become final without approval/signing. |
| `ClinicalReview` | Human review of AI/clinical output. | Safety, correction, audit. | Tracks accept/reject/edit, reviewer, reasons, confidence. |

## 9. Charting, Teeth, Surfaces, And Existing Conditions

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `DentalChart` | Snapshot or live odontogram/chart. | Operatory charting, diagnosis, treatment planning, claims. | Links patient, provider, date, source PMS, chart findings. |
| `DentalChartFinding` | Finding on tooth/surface/oral cavity. | Existing conditions, caries, restorations, missing teeth, watch areas. | May be provider-entered or AI-suggested, requiring review. |
| `Tooth` | Tooth identity. | Charting, imaging, claims, treatment, perio. | Must support adult/primary numbering and missing/supernumerary cases. |
| `ToothSurface` | Surface on tooth. | Restorative charting and claim anatomy. | Dental-specific validation required. |
| `OdontogramCondition` | Visual chart condition category. | Existing work, disease, proposed/completed treatment display. | Used in chart UI and PMS sync. |
| `Restoration` | Existing or completed restoration. | Treatment planning, replacement justification, imaging context. | Links tooth/surface/material/date/source. |
| `ExistingCondition` | Non-treatment historical/current condition. | Chart context and claim/treatment justification. | Example missing tooth, crown, implant, bridge, watch lesion. |

## 10. Perio

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `PerioExam` | Periodontal charting encounter. | Hygiene, diagnosis, SRP/maintenance evidence, claim attachments. | Needs provider/RDH, date, full/partial exam, linked x-rays and notes. |
| `PerioMeasure` | Site-level measurement. | Probing, bleeding, recession, furcation, mobility, plaque/calculus. | Six-point charting and tooth/site semantics are critical. |
| `PerioDiagnosis` | Periodontal diagnosis/stage/grade or clinical assessment. | Treatment planning, SRP justification, maintenance interval. | Should cite perio measures, radiographs, provider note. |
| `PerioTreatmentPlan` | Perio-specific plan. | SRP quads, maintenance, perio referral, re-evaluation. | Links perio exam, benefits, claims, recalls. |

## 11. Imaging, X-Ray, DICOM, And AI Findings

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `ImageStudy` | Imaging exam/study. | Organizes x-ray series, CBCT, intraoral photos. | Links patient, date, modality, provider, source device/system. |
| `ImageAsset` | Stored image/file asset. | Display, attachment, AI processing, patient education. | Needs storage location, hash, metadata, retention, PHI classification. |
| `RadiographSeries` | Dental 2D series. | Bitewings, PA, FMX, pano, ceph groupings. | Claim evidence often uses selected images from a series. |
| `RadiographImage` | Individual 2D radiograph. | Diagnosis, AI overlay, claim attachment. | Needs tooth/region tags, quality, acquisition date. |
| `DicomStudy` | DICOM study-level entity. | CBCT and advanced imaging. | Maps to DICOM StudyInstanceUID. |
| `DicomSeries` | DICOM series within study. | CBCT slices/reconstructions. | Maps to SeriesInstanceUID and modality. |
| `DicomInstance` | Individual DICOM object/slice. | 3D imaging storage and analysis. | Maps to SOPInstanceUID; large storage and viewer needs. |
| `ImageFinding` | Human or AI imaging finding. | Diagnosis support, treatment evidence, claim evidence. | Needs finding type, tooth/region, confidence, source model/provider. |
| `ImageAnnotation` | Markup on image. | Patient education and reviewer correction. | Arrows, boxes, segmentation, labels. |
| `ImageOverlay` | Rendered AI/clinical overlay. | Imaging AI review and patient presentation. | Must be versioned and reviewable. |
| `ImageMeasurement` | Distance/angle/ratio/clinical measurement. | CBCT, ortho, perio bone loss, implant planning. | Needs units, calibration, reviewer. |
| `AiModelOutput` | Raw/normalized AI result. | Audit and reproducibility. | Tracks model, version, input, output, confidence, regulation status. |
| `AiFindingReview` | Clinician review of AI finding. | Safety and finalization. | Stores accepted/rejected/edited finding and reason. |

## 12. Case Presentation And Acceptance

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `TreatmentPlanCase` | Patient-facing case presentation. | Acceptance workflow, financing, consent, follow-up. | Bundles clinical, imaging, insurance, estimate, narrative. |
| `TreatmentPlanOption` | Alternative option inside case. | Compare ideal/limited/phased options. | Links procedures, costs, benefits, financing. |
| `TreatmentPlanAcceptance` | Patient decision. | Scheduling, consent, claim readiness, follow-up. | Accepted/declined/deferred; needs signature and reason. |

## 13. Pharmacy And eRx

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Prescription` | Prescriber order for medication. | eRx, post-op meds, antibiotics, pain control. | Must handle EPCS, cancel, renew, print/fax fallback, provider identity. |
| `PrescriptionMedication` | Drug and sig details. | Clinical safety and pharmacy transmission. | Dose, route, frequency, quantity, refills, substitution, days supply. |
| `Pharmacy` | Destination pharmacy. | eRx routing. | Needs address, NCPDP/NPI identifiers where available, patient preference. |
| `ErxTransaction` | Network/vendor transaction. | NewRx, CancelRx, RxChange, RxRenewal, status tracking. | Stores route, response, errors, audit, provider approval. |
| `ErxRenewalRequest` | Refill/renewal request. | Provider queue. | Must support approve/deny/change workflow. |
| `ErxChangeRequest` | Pharmacy requested change. | Prescriber-pharmacist collaboration. | Reason, requested alternative, provider decision. |
| `MedicationHistoryRequest` | Request for external medication history. | Medical history reconciliation. | Requires consent/permissions and source tracking. |
| `DrugInteractionAlert` | Safety alert. | Prescribing review. | Drug-drug, drug-allergy, duplicate therapy, contraindication. |
| `FormularyBenefitCheck` | Drug coverage/cost check. | Select affordable medication. | Links payer/pharmacy benefit where available. |

## 13A. Emergency, Triage, And Doctor Callback

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `EmergencyCase` | Patient emergency episode. | Same-day/after-hours triage, doctor review, referral. | Links patient/unknown caller, complaint, photos, triage, disposition, appointment/referral. |
| `TriageAssessment` | Structured clinical triage result. | Decide severity and next action. | Must include red flags and reviewer. |
| `TriageQuestionnaire` | Questions asked by AI/front desk/doctor. | Standardizes emergency intake. | Versioned and practice-configurable but safety-locked for red flags. |
| `TriageDisposition` | Outcome of triage. | Appointment, doctor callback, ER/hospital, oral surgery, endo, self-care pending visit. | High-risk dispositions need policy controls. |
| `EmergencyInstruction` | Approved instructions given to patient. | After-hours and urgent care guidance. | Needs provider-approved template/source and delivery audit. |
| `DoctorCallback` | Callback task for doctor/on-call provider. | Emergency handling and risk management. | Tracks owner, deadline, completion, note. |
| `AfterHoursEscalation` | After-hours escalation route. | On-call routing. | Links phone, AI receptionist, doctor schedule, policy. |
| `UrgentReferral` | High-priority referral. | Oral surgery/hospital/specialist handoff. | Links referral packet and urgency reason. |
| `EmergencySlot` | Reserved urgent-care capacity. | Schedule emergencies without wrecking planned day. | Links room/chair/provider/category. |

## 14. Labs And Prosthetics

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `LabCase` | Lab work case. | Crown/bridge, denture, aligner, night guard, implant guide, appliance. | Links patient, appointment, procedure, lab order, due date, status. |
| `LabOrder` | Specific order sent to lab. | Instructions, shade, material, scanner files, documents. | Needs provider approval and lab acknowledgment. |
| `LabVendor` | Dental lab or manufacturing partner. | Routing and status. | Marketplace/vendor connector candidate. |
| `LabShipment` | Physical/digital shipment. | Track inbound/outbound cases. | Carrier/tracking, pickup, received, delayed. |
| `LabResult` | Returned appliance/report/result. | Seat appointment readiness and quality issues. | Tracks accepted/remake/adjustment. |

## 15. Referrals And Specialist Communication

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Referral` | Referral request or incoming referral. | Oral surgery, endo, perio, ortho, pathology, imaging, sleep/TMJ. | Needs reason, urgency, status, partner, packet, result. |
| `ReferralPartner` | Specialist or referring provider/entity. | Network and routing. | Stores specialty, contacts, preferred packet method, agreements. |
| `ReferralAttachment` | Document/image attached to referral. | Clinical handoff. | X-rays, chart notes, perio chart, treatment plan, consent. |
| `SpecialistCommunication` | Messages with specialist/referrer. | Follow-up and outcome tracking. | Secure messaging/fax/email/portal notes. |

## 16. Devices, Scanners, And CBCT

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Device` | Physical or software device/integration endpoint. | Imaging sensors, CBCT, scanners, kiosks, phones, signature pads. | Tracks vendor, model, location, status, connector. |
| `DeviceConnection` | Connection/config for device. | Health checks, ingestion, troubleshooting. | Needs credentials/config, last sync, capabilities. |
| `IntraoralScannerCase` | Digital impression/scanner workflow. | Crowns, aligners, appliances, labs, patient education. | Links scans, lab order, treatment plan. |
| `CbctScan` | CBCT-specific scan record. | Implant planning, oral surgery, ortho, TMJ, pathology. | Links DICOM study, measurements, findings, viewer. |

## 17. Documents, Attachments, And Evidence

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `Document` | Generic document record. | Forms, consents, medical history, EOBs, narratives, lab reports, referrals. | Needs type, source, storage, signature state, OCR. |
| `DocumentType` | Classification. | Routing and required-document rules. | Example consent, insurance card, x-ray, perio chart, narrative, lab bill. |
| `Attachment` | File attached to claim/referral/treatment/patient. | Claim evidence, referral packet, chart. | Can point to document/image/perio/narrative. |
| `AttachmentRequirement` | Rule saying what evidence is needed. | Claim scrubber and prior auth. | Payer/procedure-specific requirements. |
| `EvidencePacket` | Bundle of supporting materials. | Claims, appeals, prior auth, referrals, treatment presentation. | Must preserve source and review status. |
| `SourceEvidence` | Trace to original source. | Audit, explainability, dispute resolution. | Links any derived model to raw PMS/API/document/AI/user source. |

## 18. SOPs, Quality, Training, And Compliance Execution

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `SopDocument` | Standard operating procedure. | Guides staff and AI agents. | Versioned, role/location-specific, cited by workflows. |
| `SopVersion` | Specific version of SOP. | Audit and change control. | Workflows must know which SOP version was active. |
| `SopAcknowledgement` | Staff acknowledgement. | Training/compliance proof. | Tracks user, date, version. |
| `SopWorkflowBinding` | SOP attached to workflow. | Ensures processes cite approved guidance. | Example emergency calls, EOB posting, claim attachments. |
| `TrainingAssignment` | Assigned training. | Staff onboarding and compliance. | Links SOPs/videos/quizzes/tasks. |
| `TrainingCompletion` | Completed training record. | Audit and staff readiness. | May include score/signoff. |
| `ProcessDeviation` | Detected or reported deviation. | Quality management. | Missing x-ray before claim, unsigned note, wrong queue, policy bypass. |
| `QualityAudit` | Structured audit of workflow quality. | Owner/manager oversight. | Could audit calls, notes, claims, posting, emergency triage. |
| `IncidentReport` | Compliance, patient safety, operational incident. | Risk management. | Needs severity, investigation, corrective action. |
| `CorrectiveAction` | Action taken after incident/deviation. | Process improvement. | Owner, deadline, verification. |

## 19. PDF, Document Generation, And Delivery

| Model | What it represents | Workflow use | Relationships and notes |
| --- | --- | --- | --- |
| `DocumentTemplate` | Reusable template. | Treatment plans, consents, appeals, statements, referrals, post-op instructions. | Versioned and tenant/DSO-customizable. |
| `DocumentTemplateVersion` | Immutable template version. | Legal/audit. | Generated documents should record which version rendered them. |
| `GeneratedDocument` | Final generated document. | Patient chart, payer packet, referral, owner report. | Stores rendered PDF/document and source data reference. |
| `PdfRenderJob` | Async PDF generation job. | Reliable rendering and retry. | Tracks status, error, output. |
| `DocumentSignature` | Signature on generated/imported doc. | Consent, treatment acceptance, membership/payment agreement. | Needs signer identity and verification metadata. |
| `DocumentDelivery` | Delivery of document. | Email/SMS/portal/fax/mail/referral/payer submission. | Tracks delivery, bounce, viewed, acknowledged. |
| `DocumentArchive` | Immutable archive record. | Legal retention. | Hash, retention policy, access audit. |

## Sources

- Open Dental API specification and resources: https://www.opendental.com/site/apispecification.html
- Open Dental appointments behavior: https://www.opendental.com/site/apiappointments.html
- Open Dental API permissions/resources list: https://www.opendental.com/site/apipermissions.html
- ADA CDT and dental claim form: https://www.ada.org/publications/cdt and https://www.ada.org/publications/cdt/ada-dental-claim-form
- ADA patient record documentation guidance: https://www.ada.org/resources/practice/practice-management/documentation-patient-records
- ADA EOB/ERA guidance: https://www.ada.org/resources/practice/dental-insurance/explanation-of-benefits-statement
- Surescripts e-prescribing workflows: https://surescripts.com/what-we-do/e-prescribing
- Archy PMS and AI platform: https://www.archy.com/
- Dentrix Ascend all-in-one workflow benchmark: https://www.dentrixascend.com/
- Curve Dental PMS/imaging/eRx/payments benchmark: https://www.curvedental.com/feature-overview
- DICOM/CBCT concept reference: https://pubmed.ncbi.nlm.nih.gov/19732681/
- Delta Dental documentation requirement examples: https://www.deltadentalct.com/-/media/DDCT/pdf/DDNJCT_Required-Documentation-Chart-2025.ashx
