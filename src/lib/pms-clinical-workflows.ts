import { newId, query, withTransaction } from "@/lib/db";

export const clinicalWorkflowDefaultTenantId = "tenant_1dentalai_production";

export type ClinicalRoleKey = "doctor" | "rdh" | "clinical_assistant" | "front_desk" | "treatment_coordinator" | "billing_rcm";

export type ClinicalNoteRequirement = {
  roleKey: ClinicalRoleKey;
  noteType: "DOCTOR_NOTE" | "RDH_NOTE" | "STAFF_NOTE" | "SOAP" | "PERIO" | "TREATMENT_PLAN_PRESENTATION";
  templateKey:
    | "doctor_comprehensive_exam"
    | "doctor_perio_diagnosis"
    | "doctor_ortho_case_start"
    | "doctor_pediatric_exam"
    | "doctor_oral_surgery_consult"
    | "doctor_emergency_limited_exam"
    | "doctor_imaging_interpretation"
    | "doctor_referral_rationale"
    | "doctor_treatment_plan_handoff"
    | "rdh_perio_therapy"
    | "rdh_hygiene_handoff"
    | "staff_intake_readiness"
    | "staff_treatment_presentation"
    | "staff_ortho_financial"
    | "staff_pediatric_intake"
    | "staff_surgery_preop"
    | "staff_emergency_triage"
    | "staff_imaging_readiness"
    | "staff_referral_coordination"
    | "staff_checkout_scheduling";
  required: boolean;
  signerRoleKey?: ClinicalRoleKey;
  minimumSections: string[];
  enforcement: {
    blocksCheckoutUntilComplete: boolean;
    minimumSectionCount: number;
    requiresSignerAttestation?: boolean;
  };
};

export type ClinicalArtifactRequirement = {
  artifactType: "FORM" | "IMAGING" | "LAB" | "DOCUMENT" | "REFERRAL" | "INSURANCE_REVIEW";
  requirementKey: string;
  title: string;
  required: boolean;
  ownerRoleKey: ClinicalRoleKey;
};

export type ClinicalProcessStepDefinition = {
  stepKey: string;
  sequence: number;
  title: string;
  ownerRoleKey: ClinicalRoleKey;
  assignmentType: "TASK" | "CLINICAL_REVIEW" | "TREATMENT_PLAN_REVIEW" | "RCM_REVIEW";
  cdtCodes: string[];
  noteRequirements: ClinicalNoteRequirement[];
  artifactRequirements: ClinicalArtifactRequirement[];
  treatmentPlanRequired: boolean;
  completionPolicy: {
    requiresAuditEvent: boolean;
    requiresProviderSignature?: boolean;
    blocksCheckoutUntilComplete?: boolean;
  };
};

export type ClinicalProcessTemplateDefinition = {
  templateKey: string;
  name: string;
  specialty: "GENERAL" | "PERIO" | "ORTHO" | "PEDIATRIC" | "ORAL_SURGERY" | "IMPLANT" | "EMERGENCY" | "IMAGING" | "REFERRAL";
  appointmentType: string;
  triggerCodes: string[];
  requiredArtifacts: ClinicalArtifactRequirement[];
  requiredForms: string[];
  requiredImaging: string[];
  requiredLabs: string[];
  aiPolicy: {
    recommendationMode: "PROVIDER_REVIEW_REQUIRED";
    allowedSources: string[];
    neverAutoDiagnose: boolean;
  };
  auditPolicy: {
    eventTypes: string[];
    phiSafeMetadata: boolean;
    immutableAfterSignature: boolean;
  };
  steps: ClinicalProcessStepDefinition[];
};

export type ClinicalWorkflowAssignmentPlanItem = {
  ownerRoleKey: ClinicalRoleKey;
  title: string;
  stepKey: string;
  assignmentType: ClinicalProcessStepDefinition["assignmentType"];
  cdtCodes: string[];
  completionGate: {
    treatmentPlanRequired: boolean;
    requiresProviderSignature: boolean;
    blocksCheckoutUntilComplete: boolean;
    requiredNoteTemplateKeys: string[];
    requiredArtifactKeys: string[];
  };
};

export const coreClinicalProcessTemplates: ClinicalProcessTemplateDefinition[] = [
  {
    templateKey: "comprehensive_exam_treatment_plan",
    name: "Comprehensive exam to treatment plan",
    specialty: "GENERAL",
    appointmentType: "Comprehensive exam",
    triggerCodes: ["D0150", "D0210", "D0330", "D1110"],
    requiredForms: ["medical_history", "hipaa_acknowledgement", "financial_policy"],
    requiredImaging: ["FMX_OR_PANORAMIC"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "FORM", requirementKey: "medical_history", title: "Reviewed medical history", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "IMAGING", requirementKey: "diagnostic_images", title: "Diagnostic images reviewed", required: true, ownerRoleKey: "doctor" },
      { artifactType: "DOCUMENT", requirementKey: "signed_treatment_estimate", title: "Signed treatment estimate", required: true, ownerRoleKey: "treatment_coordinator" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["scribe", "chart", "imaging", "perio", "medical_history"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "assistant_intake",
        sequence: 10,
        title: "Assistant intake and records readiness",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D0150", "D0210", "D0330"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_intake_readiness", required: true, minimumSections: ["chief_complaint", "medical_changes", "vitals_or_premed", "images_taken"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "FORM", requirementKey: "medical_history", title: "Medical history reviewed", required: true, ownerRoleKey: "clinical_assistant" },
          { artifactType: "IMAGING", requirementKey: "fmx_or_pano", title: "FMX or panoramic image ready", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "doctor_diagnosis",
        sequence: 20,
        title: "Doctor diagnosis and treatment recommendation",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D0150", "D2392", "D2740", "D2950"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_comprehensive_exam", required: true, signerRoleKey: "doctor", minimumSections: ["diagnosis", "tooth_findings", "risk", "alternatives", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "clinical_support", title: "Clinical support for planned CDT codes", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "treatment_presentation",
        sequence: 30,
        title: "Treatment presentation and consent package",
        ownerRoleKey: "treatment_coordinator",
        assignmentType: "TREATMENT_PLAN_REVIEW",
        cdtCodes: ["D2392", "D2740", "D2950"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "treatment_coordinator", noteType: "STAFF_NOTE", templateKey: "staff_treatment_presentation", required: true, minimumSections: ["options_discussed", "patient_questions", "estimate_review", "follow_up_plan"], enforcement: { blocksCheckoutUntilComplete: false, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "signed_treatment_estimate", title: "Signed treatment estimate", required: true, ownerRoleKey: "treatment_coordinator" },
          { artifactType: "INSURANCE_REVIEW", requirementKey: "benefit_review", title: "Benefit review attached", required: true, ownerRoleKey: "billing_rcm" },
        ],
        completionPolicy: { requiresAuditEvent: true },
      },
    ],
  },
  {
    templateKey: "perio_srp_maintenance",
    name: "Perio diagnosis, SRP, and maintenance",
    specialty: "PERIO",
    appointmentType: "Perio therapy",
    triggerCodes: ["D0180", "D4341", "D4342", "D4910"],
    requiredForms: ["medical_history", "perio_consent"],
    requiredImaging: ["BITEWINGS_OR_FMX"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "IMAGING", requirementKey: "bone_loss_images", title: "Images supporting bone loss diagnosis", required: true, ownerRoleKey: "doctor" },
      { artifactType: "DOCUMENT", requirementKey: "perio_chart", title: "Full perio chart", required: true, ownerRoleKey: "rdh" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["perio", "imaging", "medical_history", "scribe"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "rdh_perio_chart",
        sequence: 10,
        title: "RDH periodontal charting and hygiene findings",
        ownerRoleKey: "rdh",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D0180", "D4341", "D4342", "D4910"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "rdh", noteType: "RDH_NOTE", templateKey: "rdh_perio_therapy", required: true, minimumSections: ["probing_summary", "bleeding", "calculus", "home_care", "maintenance_interval"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5 } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "perio_chart", title: "Six-point perio chart", required: true, ownerRoleKey: "rdh" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "doctor_perio_diagnosis",
        sequence: 20,
        title: "Doctor periodontal diagnosis and plan approval",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D0180", "D4341", "D4342"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_perio_diagnosis", required: true, signerRoleKey: "doctor", minimumSections: ["perio_diagnosis", "stage_grade", "cdt_rationale", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "bone_loss_images", title: "Bone-loss image evidence", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
    ],
  },
  {
    templateKey: "orthodontic_records_and_case_start",
    name: "Orthodontic records, diagnosis, and case start",
    specialty: "ORTHO",
    appointmentType: "Orthodontic records",
    triggerCodes: ["D0340", "D0350", "D0470", "D8080", "D8090"],
    requiredForms: ["medical_history", "orthodontic_consent", "financial_policy"],
    requiredImaging: ["PANORAMIC", "CEPHALOMETRIC"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "IMAGING", requirementKey: "ortho_records", title: "Panoramic and cephalometric images", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "DOCUMENT", requirementKey: "orthodontic_contract", title: "Signed orthodontic treatment contract", required: true, ownerRoleKey: "treatment_coordinator" },
      { artifactType: "INSURANCE_REVIEW", requirementKey: "ortho_benefit_review", title: "Orthodontic lifetime maximum and age limits reviewed", required: true, ownerRoleKey: "billing_rcm" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["imaging", "scribe", "medical_history", "forms", "insurance"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "ortho_records_capture",
        sequence: 10,
        title: "Assistant records capture and appliance readiness",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D0340", "D0350", "D0470"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_intake_readiness", required: true, minimumSections: ["records_taken", "photos", "models_or_scan", "medical_changes"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "ortho_records", title: "Ortho records captured", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "orthodontist_diagnosis",
        sequence: 20,
        title: "Orthodontist diagnosis and treatment modality approval",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D8080", "D8090"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_ortho_case_start", required: true, signerRoleKey: "doctor", minimumSections: ["malocclusion", "skeletal_dental_findings", "treatment_modality", "risks_alternatives", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "ortho_case_plan", title: "Orthodontic diagnosis and case plan", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "ortho_financial_and_followup",
        sequence: 30,
        title: "Ortho financial presentation and follow-up cadence",
        ownerRoleKey: "treatment_coordinator",
        assignmentType: "TREATMENT_PLAN_REVIEW",
        cdtCodes: ["D8080", "D8090"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "treatment_coordinator", noteType: "STAFF_NOTE", templateKey: "staff_ortho_financial", required: true, minimumSections: ["contract_review", "insurance_lifetime_max", "payment_plan", "next_visit"], enforcement: { blocksCheckoutUntilComplete: false, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "orthodontic_contract", title: "Signed orthodontic contract", required: true, ownerRoleKey: "treatment_coordinator" },
        ],
        completionPolicy: { requiresAuditEvent: true },
      },
    ],
  },
  {
    templateKey: "pediatric_preventive_and_restorative",
    name: "Pediatric prevention, behavior, and restorative planning",
    specialty: "PEDIATRIC",
    appointmentType: "Pediatric recall",
    triggerCodes: ["D0120", "D1120", "D1206", "D1351", "D2391"],
    requiredForms: ["medical_history", "guardian_consent", "pediatric_behavior_guidance"],
    requiredImaging: ["PEDIATRIC_BITEWINGS"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "FORM", requirementKey: "guardian_consent", title: "Guardian consent verified", required: true, ownerRoleKey: "front_desk" },
      { artifactType: "DOCUMENT", requirementKey: "behavior_note", title: "Behavior guidance note", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "INSURANCE_REVIEW", requirementKey: "sealant_frequency_review", title: "Sealant and fluoride frequency reviewed", required: true, ownerRoleKey: "billing_rcm" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["scribe", "chart", "imaging", "forms", "medical_history"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "pediatric_assistant_intake",
        sequence: 10,
        title: "Assistant pediatric intake and guardian readiness",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D0120", "D1120", "D1206"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_pediatric_intake", required: true, minimumSections: ["guardian_present", "behavior_rating", "medical_changes", "fluoride_or_sealant_history"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "FORM", requirementKey: "guardian_consent", title: "Guardian consent confirmed", required: true, ownerRoleKey: "front_desk" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "pediatric_doctor_exam",
        sequence: 20,
        title: "Pediatric doctor exam and restorative recommendations",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D0120", "D1351", "D2391"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_pediatric_exam", required: true, signerRoleKey: "doctor", minimumSections: ["caries_risk", "tooth_findings", "behavior_guidance", "guardian_discussion", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "pediatric_bitewings", title: "Pediatric bitewings reviewed", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
    ],
  },
  {
    templateKey: "oral_surgery_extraction_referral",
    name: "Oral surgery extraction, sedation, and referral workflow",
    specialty: "ORAL_SURGERY",
    appointmentType: "Oral surgery consult",
    triggerCodes: ["D7140", "D7210", "D7220", "D7240", "D9222"],
    requiredForms: ["medical_history", "surgical_consent", "sedation_screening"],
    requiredImaging: ["PANORAMIC_OR_CBCT"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "IMAGING", requirementKey: "surgical_image_review", title: "Surgical imaging reviewed", required: true, ownerRoleKey: "doctor" },
      { artifactType: "DOCUMENT", requirementKey: "surgical_consent", title: "Signed surgical consent", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "REFERRAL", requirementKey: "specialist_referral", title: "Referral packet when outside scope", required: false, ownerRoleKey: "front_desk" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["imaging", "medical_history", "scribe", "referral", "forms"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "surgery_preop_readiness",
        sequence: 10,
        title: "Assistant pre-op readiness and medication review",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D7140", "D7210", "D9222"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_surgery_preop", required: true, minimumSections: ["medical_alerts", "medications", "escort_sedation_review", "consent_status"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "FORM", requirementKey: "sedation_screening", title: "Sedation screening reviewed", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "surgeon_risk_and_plan",
        sequence: 20,
        title: "Surgeon risk review, extraction plan, and referral decision",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D7140", "D7210", "D7220", "D7240"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_oral_surgery_consult", required: true, signerRoleKey: "doctor", minimumSections: ["diagnosis", "radiographic_findings", "surgical_risks", "referral_decision", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "surgical_image_review", title: "Surgical image evidence", required: true, ownerRoleKey: "doctor" },
          { artifactType: "REFERRAL", requirementKey: "specialist_referral", title: "Specialist referral packet if required", required: false, ownerRoleKey: "front_desk" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
    ],
  },
  {
    templateKey: "emergency_limited_exam_stabilization",
    name: "Emergency limited exam, imaging, stabilization, and follow-up",
    specialty: "EMERGENCY",
    appointmentType: "Emergency limited exam",
    triggerCodes: ["D0140", "D0220", "D0230", "D9110", "D7210"],
    requiredForms: ["medical_history_update", "emergency_consent", "hipaa_acknowledgement"],
    requiredImaging: ["PERIAPICAL_OR_PANORAMIC"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "FORM", requirementKey: "emergency_medical_update", title: "Emergency medical update reviewed", required: true, ownerRoleKey: "front_desk" },
      { artifactType: "IMAGING", requirementKey: "emergency_radiographs", title: "Emergency radiographs attached", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "DOCUMENT", requirementKey: "stabilization_plan", title: "Stabilization and follow-up plan", required: true, ownerRoleKey: "doctor" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["scribe", "chart", "imaging", "medical_history", "treatment_plan"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "emergency_triage",
        sequence: 10,
        title: "Front desk emergency triage and consent readiness",
        ownerRoleKey: "front_desk",
        assignmentType: "TASK",
        cdtCodes: ["D0140", "D9110"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "front_desk", noteType: "STAFF_NOTE", templateKey: "staff_emergency_triage", required: true, minimumSections: ["chief_complaint", "pain_swelling_screen", "medical_alerts", "consent_status"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "FORM", requirementKey: "emergency_medical_update", title: "Emergency medical update completed", required: true, ownerRoleKey: "front_desk" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "emergency_image_capture",
        sequence: 20,
        title: "Assistant emergency radiographs and operatory readiness",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D0220", "D0230"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_imaging_readiness", required: true, minimumSections: ["images_taken", "image_quality", "tooth_area", "provider_notified"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "emergency_radiographs", title: "Diagnostic emergency radiographs ready", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "emergency_doctor_exam",
        sequence: 30,
        title: "Doctor limited exam, diagnosis, and stabilization decision",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D0140", "D9110", "D7210"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_emergency_limited_exam", required: true, signerRoleKey: "doctor", minimumSections: ["chief_complaint", "diagnosis", "radiographic_findings", "stabilization_rendered", "follow_up_plan", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 6, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "stabilization_plan", title: "Stabilization and definitive care plan", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "emergency_followup_handoff",
        sequence: 40,
        title: "Treatment coordinator follow-up estimate and scheduling handoff",
        ownerRoleKey: "treatment_coordinator",
        assignmentType: "TREATMENT_PLAN_REVIEW",
        cdtCodes: ["D7210", "D2740", "D2950"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "treatment_coordinator", noteType: "STAFF_NOTE", templateKey: "staff_treatment_presentation", required: true, minimumSections: ["options_discussed", "estimate_review", "urgency_window", "next_visit"], enforcement: { blocksCheckoutUntilComplete: false, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "emergency_estimate", title: "Emergency follow-up estimate", required: true, ownerRoleKey: "treatment_coordinator" },
        ],
        completionPolicy: { requiresAuditEvent: true },
      },
    ],
  },
  {
    templateKey: "diagnostic_imaging_review_handoff",
    name: "Diagnostic imaging review and clinical handoff",
    specialty: "IMAGING",
    appointmentType: "Imaging review",
    triggerCodes: ["D0210", "D0274", "D0330", "D0367"],
    requiredForms: ["medical_history"],
    requiredImaging: ["FMX_OR_PANORAMIC_OR_CBCT"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "IMAGING", requirementKey: "diagnostic_image_set", title: "Diagnostic image set captured", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "DOCUMENT", requirementKey: "doctor_image_interpretation", title: "Doctor imaging interpretation note", required: true, ownerRoleKey: "doctor" },
      { artifactType: "REFERRAL", requirementKey: "radiology_or_specialist_handoff", title: "Radiology or specialist handoff when indicated", required: false, ownerRoleKey: "front_desk" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["imaging", "chart", "scribe", "referral"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "imaging_readiness",
        sequence: 10,
        title: "Assistant imaging capture, quality check, and labeling",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D0210", "D0274", "D0330", "D0367"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_imaging_readiness", required: true, minimumSections: ["images_taken", "image_quality", "anatomy_captured", "retake_reason_if_any"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "diagnostic_image_set", title: "Images captured and labeled", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "doctor_imaging_interpretation",
        sequence: 20,
        title: "Doctor imaging interpretation and CDT evidence mapping",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D0210", "D0274", "D0330", "D0367", "D2392", "D2740"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_imaging_interpretation", required: true, signerRoleKey: "doctor", minimumSections: ["image_type", "radiographic_findings", "cdt_rationale", "follow_up_or_referral", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "doctor_image_interpretation", title: "Signed imaging interpretation", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "imaging_handoff",
        sequence: 30,
        title: "Front desk referral or records handoff from imaging findings",
        ownerRoleKey: "front_desk",
        assignmentType: "TASK",
        cdtCodes: ["D0367", "D9310"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "front_desk", noteType: "STAFF_NOTE", templateKey: "staff_referral_coordination", required: true, minimumSections: ["handoff_destination", "records_sent", "patient_contacted", "follow_up_owner"], enforcement: { blocksCheckoutUntilComplete: false, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "REFERRAL", requirementKey: "radiology_or_specialist_handoff", title: "Referral or records packet sent when indicated", required: false, ownerRoleKey: "front_desk" },
        ],
        completionPolicy: { requiresAuditEvent: true },
      },
    ],
  },
  {
    templateKey: "specialty_referral_coordination",
    name: "Specialty referral clinical packet and coordination",
    specialty: "REFERRAL",
    appointmentType: "Specialty referral",
    triggerCodes: ["D9310", "D0367", "D7210", "D6010"],
    requiredForms: ["medical_history", "referral_consent"],
    requiredImaging: ["RELEVANT_RADIOGRAPHS_OR_CBCT"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "DOCUMENT", requirementKey: "referral_rationale", title: "Provider referral rationale", required: true, ownerRoleKey: "doctor" },
      { artifactType: "IMAGING", requirementKey: "referral_images", title: "Referral images attached", required: true, ownerRoleKey: "clinical_assistant" },
      { artifactType: "REFERRAL", requirementKey: "specialist_referral_packet", title: "Specialist referral packet sent", required: true, ownerRoleKey: "front_desk" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["chart", "imaging", "scribe", "referral", "medical_history"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "referral_records_readiness",
        sequence: 10,
        title: "Assistant referral records and image packet readiness",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D0367", "D0330"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_imaging_readiness", required: true, minimumSections: ["records_collected", "images_attached", "medical_alerts", "provider_review_status"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "IMAGING", requirementKey: "referral_images", title: "Referral imaging packet ready", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "doctor_referral_rationale",
        sequence: 20,
        title: "Doctor referral rationale, urgency, and procedure mapping",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D9310", "D7210", "D6010"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_referral_rationale", required: true, signerRoleKey: "doctor", minimumSections: ["diagnosis", "reason_for_referral", "urgency", "records_to_send", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "referral_rationale", title: "Signed referral rationale", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "front_desk_referral_coordination",
        sequence: 30,
        title: "Front desk referral packet delivery and patient scheduling loop",
        ownerRoleKey: "front_desk",
        assignmentType: "TASK",
        cdtCodes: ["D9310"],
        treatmentPlanRequired: false,
        noteRequirements: [
          { roleKey: "front_desk", noteType: "STAFF_NOTE", templateKey: "staff_referral_coordination", required: true, minimumSections: ["specialist_contact", "packet_sent", "patient_instructions", "tracking_due_date"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "REFERRAL", requirementKey: "specialist_referral_packet", title: "Referral packet sent and tracked", required: true, ownerRoleKey: "front_desk" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
    ],
  },
  {
    templateKey: "treatment_plan_handoff_completion",
    name: "Treatment plan clinical support, benefits, and scheduling handoff",
    specialty: "GENERAL",
    appointmentType: "Treatment plan handoff",
    triggerCodes: ["D2391", "D2392", "D2740", "D2950", "D4341", "D6010"],
    requiredForms: ["financial_policy", "treatment_consent"],
    requiredImaging: ["DIAGNOSTIC_SUPPORT_WHEN_INDICATED"],
    requiredLabs: [],
    requiredArtifacts: [
      { artifactType: "DOCUMENT", requirementKey: "clinical_support", title: "Clinical support for planned CDT codes", required: true, ownerRoleKey: "doctor" },
      { artifactType: "DOCUMENT", requirementKey: "signed_treatment_estimate", title: "Signed treatment estimate", required: true, ownerRoleKey: "treatment_coordinator" },
      { artifactType: "INSURANCE_REVIEW", requirementKey: "benefit_or_preauth_review", title: "Benefits or preauthorization reviewed", required: true, ownerRoleKey: "billing_rcm" },
    ],
    aiPolicy: {
      recommendationMode: "PROVIDER_REVIEW_REQUIRED",
      allowedSources: ["chart", "scribe", "imaging", "perio", "insurance", "treatment_plan"],
      neverAutoDiagnose: true,
    },
    auditPolicy: {
      eventTypes: ["CLINICAL_PROCESS_TEMPLATE_UPSERTED", "CLINICAL_RECOMMENDATION_CREATED", "CLINICAL_WORKFLOW_TASK_CREATED"],
      phiSafeMetadata: true,
      immutableAfterSignature: true,
    },
    steps: [
      {
        stepKey: "clinical_support_packet",
        sequence: 10,
        title: "Assistant clinical support packet and records readiness",
        ownerRoleKey: "clinical_assistant",
        assignmentType: "TASK",
        cdtCodes: ["D2391", "D2392", "D2740", "D2950", "D4341", "D6010"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "clinical_assistant", noteType: "STAFF_NOTE", templateKey: "staff_intake_readiness", required: true, minimumSections: ["records_ready", "images_ready", "perio_or_chart_support", "provider_review_status"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "clinical_support_packet", title: "Clinical support packet assembled", required: true, ownerRoleKey: "clinical_assistant" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "doctor_treatment_plan_handoff",
        sequence: 20,
        title: "Doctor treatment-plan rationale and CDT approval",
        ownerRoleKey: "doctor",
        assignmentType: "CLINICAL_REVIEW",
        cdtCodes: ["D2391", "D2392", "D2740", "D2950", "D4341", "D6010"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "doctor", noteType: "DOCTOR_NOTE", templateKey: "doctor_treatment_plan_handoff", required: true, signerRoleKey: "doctor", minimumSections: ["diagnosis", "cdt_rationale", "alternatives", "medical_or_perio_considerations", "provider_attestation"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 5, requiresSignerAttestation: true } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "clinical_support", title: "Provider-approved clinical support", required: true, ownerRoleKey: "doctor" },
        ],
        completionPolicy: { requiresAuditEvent: true, requiresProviderSignature: true, blocksCheckoutUntilComplete: true },
      },
      {
        stepKey: "rcm_benefit_or_preauth_review",
        sequence: 30,
        title: "Billing RCM benefit, downgrade, and preauthorization review",
        ownerRoleKey: "billing_rcm",
        assignmentType: "RCM_REVIEW",
        cdtCodes: ["D2740", "D2950", "D4341", "D6010"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "billing_rcm", noteType: "STAFF_NOTE", templateKey: "staff_treatment_presentation", required: true, minimumSections: ["benefit_summary", "downgrade_or_frequency_limits", "preauth_status", "patient_estimate_flag"], enforcement: { blocksCheckoutUntilComplete: false, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "INSURANCE_REVIEW", requirementKey: "benefit_or_preauth_review", title: "Benefit or preauthorization review attached", required: true, ownerRoleKey: "billing_rcm" },
        ],
        completionPolicy: { requiresAuditEvent: true },
      },
      {
        stepKey: "treatment_plan_presentation_and_scheduling",
        sequence: 40,
        title: "Treatment coordinator presentation, consent, and scheduling handoff",
        ownerRoleKey: "treatment_coordinator",
        assignmentType: "TREATMENT_PLAN_REVIEW",
        cdtCodes: ["D2391", "D2392", "D2740", "D2950", "D4341", "D6010"],
        treatmentPlanRequired: true,
        noteRequirements: [
          { roleKey: "treatment_coordinator", noteType: "TREATMENT_PLAN_PRESENTATION", templateKey: "staff_treatment_presentation", required: true, minimumSections: ["options_discussed", "estimate_review", "consent_status", "scheduled_next_visit"], enforcement: { blocksCheckoutUntilComplete: true, minimumSectionCount: 4 } },
        ],
        artifactRequirements: [
          { artifactType: "DOCUMENT", requirementKey: "signed_treatment_estimate", title: "Signed treatment estimate and scheduled next visit", required: true, ownerRoleKey: "treatment_coordinator" },
        ],
        completionPolicy: { requiresAuditEvent: true, blocksCheckoutUntilComplete: true },
      },
    ],
  },
];

export function validateClinicalProcessTemplate(template: ClinicalProcessTemplateDefinition) {
  const failures: string[] = [];
  if (!template.triggerCodes.length) failures.push(`${template.templateKey}: CDT triggerCodes are required.`);
  if (!template.steps.length) failures.push(`${template.templateKey}: at least one workflow step is required.`);
  if (!template.requiredArtifacts.length) failures.push(`${template.templateKey}: required artifacts are required.`);
  if (!template.auditPolicy.eventTypes.includes("CLINICAL_RECOMMENDATION_CREATED")) failures.push(`${template.templateKey}: recommendation audit event is required.`);
  if (!template.aiPolicy.neverAutoDiagnose || template.aiPolicy.recommendationMode !== "PROVIDER_REVIEW_REQUIRED") {
    failures.push(`${template.templateKey}: AI recommendations must require provider review and must not auto-diagnose.`);
  }

  const roleCoverage = new Set(template.steps.map((step) => step.ownerRoleKey));
  if (!roleCoverage.has("doctor")) failures.push(`${template.templateKey}: doctor assignment is required.`);
  if (![...roleCoverage].some((role) => role === "rdh" || role === "clinical_assistant")) {
    failures.push(`${template.templateKey}: RDH or clinical assistant assignment is required.`);
  }

  const noteTypes = new Set(template.steps.flatMap((step) => step.noteRequirements.map((note) => note.noteType)));
  if (!noteTypes.has("DOCTOR_NOTE")) failures.push(`${template.templateKey}: doctor note requirement is required.`);
  if (!noteTypes.has("RDH_NOTE") && !noteTypes.has("STAFF_NOTE")) failures.push(`${template.templateKey}: RDH or staff note requirement is required.`);

  for (const step of template.steps) {
    if (!step.cdtCodes.length) failures.push(`${template.templateKey}/${step.stepKey}: every step must map to CDT codes.`);
    if (!step.noteRequirements.some((note) => note.required)) failures.push(`${template.templateKey}/${step.stepKey}: required note policy is missing.`);
    if (!step.completionPolicy.requiresAuditEvent) failures.push(`${template.templateKey}/${step.stepKey}: audit event completion policy is required.`);
    if (step.treatmentPlanRequired && !step.cdtCodes.length) failures.push(`${template.templateKey}/${step.stepKey}: treatment-plan steps require CDT linkage.`);
    if (step.completionPolicy.requiresProviderSignature && !step.noteRequirements.some((note) => note.signerRoleKey === "doctor" && note.enforcement.requiresSignerAttestation)) {
      failures.push(`${template.templateKey}/${step.stepKey}: provider-signature gate requires a doctor note signer attestation.`);
    }
    if (step.completionPolicy.blocksCheckoutUntilComplete && !step.noteRequirements.some((note) => note.enforcement.blocksCheckoutUntilComplete)) {
      failures.push(`${template.templateKey}/${step.stepKey}: checkout-blocking steps require at least one checkout-blocking note template.`);
    }
    for (const note of step.noteRequirements) {
      if (!note.templateKey) failures.push(`${template.templateKey}/${step.stepKey}: note templateKey is required.`);
      if (note.minimumSections.length < note.enforcement.minimumSectionCount) {
        failures.push(`${template.templateKey}/${step.stepKey}/${note.templateKey}: minimum section count is stricter than the note template.`);
      }
      if (note.signerRoleKey && note.signerRoleKey !== note.roleKey) {
        failures.push(`${template.templateKey}/${step.stepKey}/${note.templateKey}: signerRoleKey must match the note owner role.`);
      }
      if (note.enforcement.requiresSignerAttestation && !note.minimumSections.includes("provider_attestation")) {
        failures.push(`${template.templateKey}/${step.stepKey}/${note.templateKey}: signer attestation requires a provider_attestation section.`);
      }
    }
  }

  return failures;
}

export function validateCoreClinicalProcessTemplates() {
  return coreClinicalProcessTemplates.flatMap(validateClinicalProcessTemplate);
}

export async function upsertCoreClinicalProcessTemplates(tenantId = clinicalWorkflowDefaultTenantId, actorRole: ClinicalRoleKey = "doctor") {
  return withTransaction(async (client) => {
    const written: string[] = [];

    for (const template of coreClinicalProcessTemplates) {
      const failures = validateClinicalProcessTemplate(template);
      if (failures.length) throw new Error(failures.join(" "));

      const templateId = newId("cptpl");
      const templateResult = await client.query<{ id: string }>(
        `insert into "PmsClinicalProcessTemplate"
           ("id", "tenantId", "templateKey", "name", "specialty", "appointmentType", "triggerCodes", "requiredArtifacts", "requiredForms", "requiredImaging", "requiredLabs", "aiPolicy", "auditPolicy", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, current_timestamp)
         on conflict ("tenantId", "templateKey") do update set
           "name" = excluded."name",
           "specialty" = excluded."specialty",
           "appointmentType" = excluded."appointmentType",
           "triggerCodes" = excluded."triggerCodes",
           "requiredArtifacts" = excluded."requiredArtifacts",
           "requiredForms" = excluded."requiredForms",
           "requiredImaging" = excluded."requiredImaging",
           "requiredLabs" = excluded."requiredLabs",
           "aiPolicy" = excluded."aiPolicy",
           "auditPolicy" = excluded."auditPolicy",
           "updatedAt" = current_timestamp
         returning "id"`,
        [
          templateId,
          tenantId,
          template.templateKey,
          template.name,
          template.specialty,
          template.appointmentType,
          template.triggerCodes,
          JSON.stringify(template.requiredArtifacts),
          JSON.stringify(template.requiredForms),
          JSON.stringify(template.requiredImaging),
          JSON.stringify(template.requiredLabs),
          JSON.stringify(template.aiPolicy),
          JSON.stringify(template.auditPolicy),
        ],
      );
      const persistedTemplateId = templateResult.rows[0].id;

      for (const step of template.steps) {
        await client.query(
          `insert into "PmsClinicalProcessStep"
             ("id", "tenantId", "templateId", "stepKey", "sequence", "title", "ownerRoleKey", "assignmentType", "procedureCodeIds", "noteRequirements", "artifactRequirements", "treatmentPlanRequired", "completionPolicy", "updatedAt")
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10::jsonb, $11::jsonb, $12, $13::jsonb, current_timestamp)
           on conflict ("templateId", "stepKey") do update set
             "sequence" = excluded."sequence",
             "title" = excluded."title",
             "ownerRoleKey" = excluded."ownerRoleKey",
             "assignmentType" = excluded."assignmentType",
             "procedureCodeIds" = excluded."procedureCodeIds",
             "noteRequirements" = excluded."noteRequirements",
             "artifactRequirements" = excluded."artifactRequirements",
             "treatmentPlanRequired" = excluded."treatmentPlanRequired",
             "completionPolicy" = excluded."completionPolicy",
             "updatedAt" = current_timestamp`,
          [
            newId("cpstep"),
            tenantId,
            persistedTemplateId,
            step.stepKey,
            step.sequence,
            step.title,
            step.ownerRoleKey,
            step.assignmentType,
            step.cdtCodes,
            JSON.stringify(step.noteRequirements),
            JSON.stringify(step.artifactRequirements),
            step.treatmentPlanRequired,
            JSON.stringify(step.completionPolicy),
          ],
        );
      }

      await client.query(
        `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
         values ($1, $2, $3, 'CLINICAL_PROCESS_TEMPLATE_UPSERTED', 'PmsClinicalProcessTemplate', $4, 'ALLOWED', $5::jsonb)`,
        [newId("audit"), tenantId, actorRole, persistedTemplateId, JSON.stringify({ templateKey: template.templateKey, stepCount: template.steps.length })],
      );
      written.push(persistedTemplateId);
    }

    return { templateIds: written };
  });
}

export async function listClinicalProcessTemplates(tenantId = clinicalWorkflowDefaultTenantId) {
  const templates = await query(
    `select t.*,
       coalesce(steps.rows, '[]'::jsonb) as "steps"
     from "PmsClinicalProcessTemplate" t
     left join lateral (
       select jsonb_agg(to_jsonb(s) order by s."sequence") as rows
       from "PmsClinicalProcessStep" s
       where s."templateId" = t."id"
     ) steps on true
     where t."tenantId" = $1 and t."status" = 'ACTIVE'
     order by t."specialty", t."name"`,
    [tenantId],
  );
  return templates.rows;
}

export async function createClinicalWorkflowRecommendation(input: {
  tenantId?: string;
  patientId: string;
  treatmentPlanId?: string;
  templateKey?: string;
  sourceModule: "scribe" | "chart" | "perio" | "imaging" | "referral" | "insurance" | "treatment_plan" | "manual_clinical_review";
  sourceRecordId?: string;
  recommendationType: string;
  summary: string;
  rationale: string;
  mappedProcedureCodes: string[];
  confidenceScore?: number;
  actorRole?: ClinicalRoleKey;
}) {
  const tenantId = input.tenantId ?? clinicalWorkflowDefaultTenantId;
  const failures: string[] = [];
  if (!input.mappedProcedureCodes.length) failures.push("Clinical recommendations must include CDT/procedure code mapping.");
  if (input.summary.trim().length < 5) failures.push("Clinical recommendation summary is required.");
  if (input.rationale.trim().length < 5) failures.push("Clinical recommendation rationale is required.");
  if (failures.length) throw new Error(failures.join(" "));

  return withTransaction(async (client) => {
    const patient = await client.query<{ id: string }>(`select "id" from "PmsPatient" where "id" = $1 and "tenantId" = $2`, [input.patientId, tenantId]);
    if (!patient.rows[0]) throw new Error("Patient not found for tenant.");

    const template = input.templateKey
      ? await client.query<{ id: string }>(`select "id" from "PmsClinicalProcessTemplate" where "tenantId" = $1 and "templateKey" = $2 and "status" = 'ACTIVE'`, [tenantId, input.templateKey])
      : await client.query<{ id: string }>(
          `select "id" from "PmsClinicalProcessTemplate"
           where "tenantId" = $1 and "status" = 'ACTIVE' and "triggerCodes" && $2::text[]
           order by cardinality("triggerCodes") desc limit 1`,
          [tenantId, input.mappedProcedureCodes],
        );
    const templateId = template.rows[0]?.id ?? null;

    const steps = templateId
      ? await client.query<{
          ownerRoleKey: ClinicalRoleKey;
          title: string;
          stepKey: string;
          assignmentType: ClinicalProcessStepDefinition["assignmentType"];
          procedureCodeIds: string[];
          noteRequirements: ClinicalNoteRequirement[];
          artifactRequirements: ClinicalArtifactRequirement[];
          treatmentPlanRequired: boolean;
          completionPolicy: ClinicalProcessStepDefinition["completionPolicy"];
        }>(
          `select "ownerRoleKey", "title", "stepKey", "assignmentType", "procedureCodeIds", "noteRequirements", "artifactRequirements", "treatmentPlanRequired", "completionPolicy"
           from "PmsClinicalProcessStep"
           where "templateId" = $1
           order by "sequence"`,
          [templateId],
        )
      : { rows: [] };

    const assignmentPlan = steps.rows.map((step) => buildAssignmentPlanItem(step));
    const requiredNotes = steps.rows.flatMap((step) => step.noteRequirements);
    const requiredArtifacts = steps.rows.flatMap((step) => step.artifactRequirements);
    const recommendationId = newId("clinrec");

    const result = await client.query(
      `insert into "PmsClinicalRecommendation"
         ("id", "tenantId", "patientId", "treatmentPlanId", "templateId", "sourceModule", "sourceRecordId", "recommendationType", "summary", "rationale", "mappedProcedureCodes", "assignmentPlan", "requiredNotes", "requiredArtifacts", "confidenceScore", "status", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12::jsonb, $13::jsonb, $14::jsonb, $15, 'NEEDS_PROVIDER_REVIEW', current_timestamp)
       returning *`,
      [
        recommendationId,
        tenantId,
        input.patientId,
        input.treatmentPlanId ?? null,
        templateId,
        input.sourceModule,
        input.sourceRecordId ?? null,
        input.recommendationType,
        input.summary.trim(),
        input.rationale.trim(),
        input.mappedProcedureCodes,
        JSON.stringify(assignmentPlan),
        JSON.stringify(requiredNotes),
        JSON.stringify(requiredArtifacts),
        Math.max(0, Math.min(100, input.confidenceScore ?? 0)),
      ],
    );

    for (const assignment of assignmentPlan) {
      await client.query(
        `insert into "PmsTask" ("id", "tenantId", "patientId", "ownerRoleKey", "title", "taskType", "priority", "updatedAt")
         values ($1, $2, $3, $4, $5, 'CLINICAL_WORKFLOW_REVIEW', 'HIGH', current_timestamp)`,
        [newId("task"), tenantId, input.patientId, assignment.ownerRoleKey, assignment.title],
      );
      await client.query(
        `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
         values ($1, $2, $3, 'CLINICAL_WORKFLOW_TASK_CREATED', 'PmsClinicalRecommendation', $4, 'ALLOWED', $5::jsonb)`,
        [newId("audit"), tenantId, assignment.ownerRoleKey, recommendationId, JSON.stringify({ sourceModule: input.sourceModule })],
      );
    }

    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'CLINICAL_RECOMMENDATION_CREATED', 'PmsClinicalRecommendation', $4, 'ALLOWED', $5::jsonb)`,
      [
        newId("audit"),
        tenantId,
        input.actorRole ?? "doctor",
        recommendationId,
        JSON.stringify({ sourceModule: input.sourceModule, mappedProcedureCodes: input.mappedProcedureCodes, templateMatched: Boolean(templateId) }),
      ],
    );

    return result.rows[0];
  });
}

function buildAssignmentPlanItem(step: {
  ownerRoleKey: ClinicalRoleKey;
  title: string;
  stepKey?: string;
  assignmentType?: ClinicalProcessStepDefinition["assignmentType"];
  procedureCodeIds?: string[];
  cdtCodes?: string[];
  noteRequirements: ClinicalNoteRequirement[];
  artifactRequirements: ClinicalArtifactRequirement[];
  treatmentPlanRequired?: boolean;
  completionPolicy?: ClinicalProcessStepDefinition["completionPolicy"];
}): ClinicalWorkflowAssignmentPlanItem {
  const requiredNotes = step.noteRequirements.filter((note) => note.required);
  const requiredArtifacts = step.artifactRequirements.filter((artifact) => artifact.required);
  return {
    ownerRoleKey: step.ownerRoleKey,
    title: step.title,
    stepKey: step.stepKey ?? "",
    assignmentType: step.assignmentType ?? "TASK",
    cdtCodes: step.procedureCodeIds ?? step.cdtCodes ?? [],
    completionGate: {
      treatmentPlanRequired: Boolean(step.treatmentPlanRequired),
      requiresProviderSignature: Boolean(step.completionPolicy?.requiresProviderSignature),
      blocksCheckoutUntilComplete: Boolean(step.completionPolicy?.blocksCheckoutUntilComplete || requiredNotes.some((note) => note.enforcement.blocksCheckoutUntilComplete)),
      requiredNoteTemplateKeys: requiredNotes.map((note) => note.templateKey),
      requiredArtifactKeys: requiredArtifacts.map((artifact) => artifact.requirementKey),
    },
  };
}
