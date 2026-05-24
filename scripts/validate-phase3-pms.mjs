import fs from "node:fs";
import { execFileSync } from "node:child_process";

const requiredFiles = [
  "src/app/app/pms/page.tsx",
  "src/app/app/pms/schedule/page.tsx",
  "src/app/app/pms/appointments/[appointmentId]/page.tsx",
  "src/app/app/pms/online-scheduling/page.tsx",
  "src/app/book/[slug]/page.tsx",
  "src/app/app/pms/patients/page.tsx",
  "src/app/app/pms/patients/[patientId]/page.tsx",
  "src/app/app/pms/forms/page.tsx",
  "src/app/app/pms/chart/[patientId]/page.tsx",
  "src/app/app/pms/perio/[patientId]/page.tsx",
  "src/app/app/pms/imaging/page.tsx",
  "src/app/app/pms/treatment-plans/page.tsx",
  "src/app/app/pms/ledger/page.tsx",
  "src/app/app/pms/insurance/page.tsx",
  "src/app/app/pms/inventory/page.tsx",
  "src/app/app/pms/labs/page.tsx",
  "src/app/app/pms/documents/page.tsx",
  "src/app/app/pms/reports/page.tsx",
  "src/app/app/pms/tasks/page.tsx",
  "src/app/app/engagement/page.tsx",
  "src/app/app/rcm/page.tsx",
  "src/app/app/phone/page.tsx",
  "src/app/app/reputation/page.tsx",
  "src/app/app/marketing/page.tsx",
  "src/app/app/huddle/page.tsx",
  "src/app/app/patient-finder/page.tsx",
  "docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md",
  "src/app/api/pms/patients/route.ts",
  "src/app/api/pms/schedule/route.ts",
  "src/app/api/pms/chart/[patientId]/route.ts",
  "src/app/api/pms/perio/[patientId]/route.ts",
  "src/app/api/pms/clinical-workflows/route.ts",
  "src/app/api/pms/inventory/route.ts",
  "src/app/api/pms/perio/[patientId]/complete/route.ts",
  "src/app/api/pms/scribe/generate/route.ts",
  "src/app/api/pms/scribe/save/route.ts",
  "src/app/api/pms/scribe/transcribe/route.ts",
  "src/lib/pms-repository.ts",
  "src/lib/pms-inventory-repository.ts",
  "src/lib/pms-clinical-workflows.ts",
  "scripts/validate-pms-clinical-workflows.mjs",
  "scripts/validate-pms-scribe-go-live.mjs",
  "scripts/validate-pms-scribe-perio-e2e.mjs",
  "prisma/migrations/202605210001_pms_core/migration.sql",
  "prisma/migrations/202605232130_pms_clinical_process_workflows/migration.sql",
  "prisma/migrations/202605240815_pms_inventory_marketplace/migration.sql",
];

const requiredSchemaModels = [
  "PmsPatient",
  "PmsProvider",
  "PmsOperatory",
  "PmsAppointment",
  "PmsCheckoutSession",
  "PmsAppointmentCategory",
  "PmsBlockout",
  "PmsAppointmentRequest",
  "PmsOnlineSchedulingLink",
  "PmsOnlineBooking",
  "PmsSchedulingInviteCampaign",
  "PmsSchedulingInviteRecipient",
  "PmsRecall",
  "PmsProcedureCode",
  "PmsPatientCommunicationPreference",
  "PmsPatientConsent",
  "PmsMedicalHistoryEntry",
  "PmsPatientPharmacy",
  "PmsFormTemplate",
  "PmsFormField",
  "PmsFormFieldMapping",
  "PmsFormAssignment",
  "PmsFormResponse",
  "PmsFormResponseAnswer",
  "PmsProfileChangeRequest",
  "PmsClinicalNote",
  "PmsPerioExam",
  "PmsTreatmentPlan",
  "PmsBenefitFact",
  "PmsBenefitRule",
  "PmsTreatmentCoverageAnalysis",
  "PmsPayerCasePacket",
  "PmsClinicalProcessTemplate",
  "PmsClinicalProcessStep",
  "PmsClinicalRecommendation",
  "PmsInsurancePlan",
  "PmsClaim",
  "PmsClaimLine",
  "PmsLedgerEntry",
  "PmsLedgerAdjustment",
  "PmsDocument",
  "PmsImagingStudy",
  "PmsPrescription",
  "PmsReferral",
  "PmsLabCase",
  "PmsInventoryVendor",
  "PmsInventoryCatalogItem",
  "PmsInventoryLot",
  "PmsInventoryMovement",
  "PmsInventoryAsset",
  "PmsInventoryRfp",
  "PmsInventoryVendorBid",
  "PmsTask",
  "PatientEngagementEvent",
  "ReputationRecoveryCase",
  "RcmWorkItem",
  "PhoneConversation",
  "PhoneOutboundMessage",
  "PhoneRoutingRule",
  "PhoneCallTask",
  "PhoneCallAnalytics",
  "PhoneNumber",
  "PhoneExtension",
  "PhoneDevice",
  "PhoneProviderConnection",
  "PhoneActiveCall",
  "PhoneCallControlAction",
  "PhoneVoicemail",
  "ReputationReviewWorkflow",
  "PatientSurvey",
  "ReputationListingProfile",
  "ReputationReviewResponse",
  "ReputationCampaignRule",
  "ReputationReferralRequest",
  "MarketingCampaign",
  "MarketingLandingPage",
  "AiStudioAsset",
  "PatientFinderSavedFilter",
  "PatientFinderFollowUp",
  "MorningHuddleSnapshot",
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));
if (missingFiles.length) {
  console.error(`Missing PMS files:\n${missingFiles.join("\n")}`);
  process.exit(1);
}

execFileSync(process.execPath, ["scripts/validate-pms-production-gate.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-pms-clinical-workflows.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-pms-eligibility-rpa.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-pms-eligibility-artifacts.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-payer-portal-browser-runner.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-payer-portal-demo-e2e.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-rcm-payer-artifacts.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validate-pms-scribe-go-live.mjs"], { stdio: "inherit" });

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const missingModels = requiredSchemaModels.filter((model) => !schema.includes(`model ${model}`));
if (missingModels.length) {
  console.error(`Missing PMS Prisma models:\n${missingModels.join("\n")}`);
  process.exit(1);
}

const pmsPage = fs.readFileSync("src/app/app/pms/page.tsx", "utf8");
if (pmsPage.includes("workbenchAreas") || pmsPage.includes("getWorkbenchesForRole")) {
  console.error("PMS page must not be driven by the generic workbench renderer/data contract.");
  process.exit(1);
}

for (const token of ["getPracticeIntelligence", "last30RevenueCents", "last90RevenueCents", "bookedProductionHorizon", "hygieneRecall", "noShowCancelImpact", "roomProviderProduction", "Rooms/provider production chart"]) {
  const haystack = `${pmsPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS practice intelligence token missing: ${token}`);
    process.exit(1);
  }
}

const schedulePage = fs.readFileSync("src/app/app/pms/schedule/page.tsx", "utf8");
const appointmentPage = fs.readFileSync("src/app/app/pms/appointments/[appointmentId]/page.tsx", "utf8");
const onlineSchedulingPage = fs.readFileSync("src/app/app/pms/online-scheduling/page.tsx", "utf8");
const publicBookingPage = fs.readFileSync("src/app/book/[slug]/page.tsx", "utf8");
const publicBookingClient = fs.readFileSync("src/app/book/[slug]/booking-client.tsx", "utf8");
for (const token of ["Operatory day sheet", "Pinboard", "Recall", "Lab case", "AppointmentCategory"]) {
  if (!schedulePage.includes(token) && !schema.includes(token)) {
    console.error(`Schedule PMS depth token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["PmsCheckoutSession", "getAppointmentControl", "completeAppointmentCheckout", "APPOINTMENT_CHECKOUT_COMPLETED", "Appointment control", "Complete checkout", "internal claim draft", "Override hard blockers"]) {
  const haystack = `${schema}\n${appointmentPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS appointment checkout token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["PmsOnlineSchedulingLink", "PmsOnlineBooking", "PmsSchedulingInviteCampaign", "getOnlineSchedulingWorkbench", "getOnlineSchedulingAvailability", "submitOnlineBooking", "Booking links, availability, and PMS writeback", "Reserve appointment"]) {
  const haystack = `${schema}\n${onlineSchedulingPage}\n${publicBookingPage}\n${publicBookingClient}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS online scheduling token missing: ${token}`);
    process.exit(1);
  }
}

const patientsPage = fs.readFileSync("src/app/app/pms/patients/page.tsx", "utf8");
const patientRecordPage = fs.readFileSync("src/app/app/pms/patients/[patientId]/page.tsx", "utf8");
const formsPage = fs.readFileSync("src/app/app/pms/forms/page.tsx", "utf8");
const chartPage = fs.readFileSync("src/app/app/pms/chart/[patientId]/page.tsx", "utf8");
const treatmentPlanPage = fs.readFileSync("src/app/app/pms/treatment-plans/page.tsx", "utf8");
const insurancePage = fs.readFileSync("src/app/app/pms/insurance/page.tsx", "utf8");
const ledgerPage = fs.readFileSync("src/app/app/pms/ledger/page.tsx", "utf8");
const imagingPage = fs.readFileSync("src/app/app/pms/imaging/page.tsx", "utf8");
const labsPage = fs.readFileSync("src/app/app/pms/labs/page.tsx", "utf8");
const inventoryPage = fs.readFileSync("src/app/app/pms/inventory/page.tsx", "utf8");
const documentsPage = fs.readFileSync("src/app/app/pms/documents/page.tsx", "utf8");
const reportsPage = fs.readFileSync("src/app/app/pms/reports/page.tsx", "utf8");
for (const token of ["Family account", "guarantorPatientId", "Odontogram", "addToothCondition", "addProcedureLog", "Treatment plan builder", "addTreatmentPlanItem", "updateTreatmentPlanStatus", "Treatment plan was not found in this tenant", "Treatment plan acceptance requires at least one procedure item", "itemUpdate.rowCount !== itemCount", "tenantId: session.tenantId"]) {
  const haystack = `${schema}\n${patientsPage}\n${patientRecordPage}\n${chartPage}\n${treatmentPlanPage}\n${insurancePage}\n${ledgerPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS family/chart production token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["PmsInventoryVendor", "PmsInventoryCatalogItem", "PmsInventoryLot", "PmsInventoryMovement", "PmsInventoryAsset", "PmsInventoryRfp", "PmsInventoryVendorBid", "getInventoryWorkbench", "receiveInventoryStock", "consumeInventoryStock", "createInventoryRfp", "resolveInventoryReportingWindow", "Reporting filters", "Apply calendar range", "periodUsageCents", "reportBuckets", "Practice inventory and vendor marketplace"]) {
  const haystack = `${schema}\n${inventoryPage}\n${fs.readFileSync("src/lib/pms-inventory-repository.ts", "utf8")}\n${fs.readFileSync("src/app/api/pms/inventory/route.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS inventory marketplace token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["resolveReportingWindow", "Reporting filters", "Apply calendar range", "Practice reporting window", "Huddle reporting window", "period?: string", "startDate?: string", "endDate?: string"]) {
  const haystack = `${fs.readFileSync("src/lib/reporting-window.ts", "utf8")}\n${reportsPage}\n${fs.readFileSync("src/app/app/huddle/page.tsx", "utf8")}\n${fs.readFileSync("src/lib/patient-intelligence-repository.ts", "utf8")}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS reporting filter token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["updatePatientAdministrativeProfile", "addCommunicationPreference", "addPatientConsent", "addMedicalHistoryEntry", "addPatientPharmacy", "Administrative profile", "Communication and consent", "Medical history", "Preferred pharmacy"]) {
  const haystack = `${schema}\n${patientRecordPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS patient profile depth token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["PmsFormTemplate", "PmsFormAssignment", "PmsProfileChangeRequest", "assignFormToPatient", "recordFormResponse", "reviewProfileChangeRequest", "Intake forms and profile review", "Record response for review", "Accept update"]) {
  const haystack = `${schema}\n${formsPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS forms foundation token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["createInsurancePlan", "attachInsuranceToPatient", "createClaimFromProcedures", "postLedgerCharge", "postPatientPayment", "Create claim", "Post patient payment"]) {
  const haystack = `${schema}\n${insurancePage}\n${ledgerPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS financial workflow token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["createImagingStudy", "createLabCase", "createDocument", "createPrescription", "createReferral", "getPmsReports", "Imaging orders", "Lab case tracking", "Prescription register", "Practice performance dashboard"]) {
  const haystack = `${schema}\n${imagingPage}\n${labsPage}\n${documentsPage}\n${reportsPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS completion workflow token missing: ${token}`);
    process.exit(1);
  }
}

const engagementPage = fs.readFileSync("src/app/app/engagement/page.tsx", "utf8");
const featureMatrix = fs.readFileSync("docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md", "utf8");
for (const token of [
  "PatientEngagementEvent",
  "ReputationRecoveryCase",
  "stageEngagementEvent",
  "updateEngagementEventStatus",
  "PMS operating graph",
  "Post-visit review",
  "Service recovery before review requests",
  "Appointment lifecycle",
  "consent",
  "quiet hours",
  "BOOKING_REQUEST_RESPONSE",
  "INTAKE_PACKET_REMINDER",
  "MEDICAL_ALERT_REVIEW",
  "PRE_MED_ALERT_REVIEW",
  "BLOCKED_CONSENT",
  "BLOCKED_QUIET_HOURS",
  "BLOCKED_PRE_MED_REVIEW",
  "FORMS_REMINDER",
  "RECALL_REACTIVATION",
  "NO_SHOW_RECOVERY",
  "CANCELLATION_FILL",
  "WAITLIST_FILL",
  "POST_OP_INSTRUCTIONS",
  "Cross-module PMS tasks",
  "No-send process gates",
  "classifyEngagementWork",
]) {
  const haystack = `${schema}\n${engagementPage}\n${featureMatrix}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS-connected engagement token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["Phone", "RCM", "Reputation", "Marketing", "Engagement", "PMS", "UI depth", "Backend", "Integrations/connectors", "Process logic", "Database migrations", "Audit", "Tests", "No fake sends"]) {
  if (!featureMatrix.includes(token)) {
    console.error(`Phase 0 feature matrix token missing: ${token}`);
    process.exit(1);
  }
}

const rcmPage = fs.readFileSync("src/app/app/rcm/page.tsx", "utf8");
const phonePage = fs.readFileSync("src/app/app/phone/page.tsx", "utf8");
const reputationPage = fs.readFileSync("src/app/app/reputation/page.tsx", "utf8");
const marketingPage = fs.readFileSync("src/app/app/marketing/page.tsx", "utf8");
const osRepository = fs.readFileSync("src/lib/operating-system-repository.ts", "utf8");
for (const token of ["RcmWorkItem", "RcmPriorAuthorization", "RcmDenialCase", "RcmEraPosting", "RcmPayerFollowUp", "RcmRevenueIntegrityFinding", "getRcmOperatingCenter", "Benefits, prior auth, claims, denials, ERA, billing, and payments", "ELIGIBILITY_AND_BENEFITS", "REVENUE_INTEGRITY", "CREDENTIALING"]) {
  if (!`${schema}\n${rcmPage}\n${osRepository}`.includes(token)) {
    console.error(`RCM operating-system token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["PhoneConversation", "PhoneOutboundMessage", "PhoneRoutingRule", "PhoneCallTask", "PhoneCallAnalytics", "PhoneNumber", "PhoneExtension", "PhoneDevice", "PhoneProviderConnection", "PhoneActiveCall", "PhoneCallControlAction", "PhoneVoicemail", "getPhoneOperatingCenter", "Patient engagement", "Desk phones, softphones, and extensions", "Active calls and call controls", "HOLD", "WARM_TRANSFER", "CALL_PARK", "OUTBOUND_DIAL", "Voicemail and missed-call recovery"]) {
  if (!`${schema}\n${phonePage}\n${osRepository}`.includes(token)) {
    console.error(`Phone operating-system token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["ReputationReviewWorkflow", "PatientSurvey", "ReputationListingProfile", "ReputationReviewResponse", "ReputationCampaignRule", "ReputationReferralRequest", "getReputationOperatingCenter", "Patient experience command center", "Listing accuracy and review sources", "Listings issue queue", "Campaign rules and suppression logic", "Referral and testimonial queue", "BLOCKED_SERVICE_RECOVERY", "BLOCKED_PRIVATE_SURVEY", "private survey must be completed with positive score before public review request", "PmsAppointment completed visit + PatientSurvey private feedback eligibility", "HIPAA guardrails"]) {
  if (!`${schema}\n${reputationPage}\n${osRepository}`.includes(token)) {
    console.error(`Reputation operating-system token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["MarketingCampaign", "MarketingLandingPage", "AiStudioAsset", "MarketingLocalSeoTask", "getMarketingOperatingCenter", "Marketing, AI Studio, Local SEO, and AI SEO", "landing-page copy", "PMS/RCM/reputation audience validation", "marketingAudienceBlueprint", "updateLocalSeoTaskStatus", "PMS online scheduling plus CRM lead queue", "localSeoAction"]) {
  if (!`${schema}\n${marketingPage}\n${osRepository}`.includes(token)) {
    console.error(`Marketing operating-system token missing: ${token}`);
    process.exit(1);
  }
}

const huddlePage = fs.readFileSync("src/app/app/huddle/page.tsx", "utf8");
const patientFinderPage = fs.readFileSync("src/app/app/patient-finder/page.tsx", "utf8");
const patientIntelligenceRepository = fs.readFileSync("src/lib/patient-intelligence-repository.ts", "utf8");
for (const token of ["MorningHuddleSnapshot", "getMorningHuddle", "Morning huddle", "Perfect Time Slot opening map", "Yesterday, today, and tomorrow operating plan", "Provider goals and clinical hours", "Service-line production", "Huddle work queue", "Suggested patients", "getProviderGoalPacing", "getServiceLineProduction", "getHuddleWorkQueue", "getSuggestedPatients", "getHuddleAnalytics", "Room/provider production"]) {
  if (!`${schema}\n${huddlePage}\n${patientIntelligenceRepository}`.includes(token)) {
    console.error(`Morning huddle token missing: ${token}`);
    process.exit(1);
  }
}

for (const token of ["PatientFinderSavedFilter", "PatientFinderFollowUp", "getPatientFinderCenter", "Opportunity recipes", "Follow-up work queue", "Create follow-up", "getRecipeSourceContext", "unscheduled_treatment", "high_intent_phone"]) {
  if (!`${schema}\n${patientFinderPage}\n${patientIntelligenceRepository}`.includes(token)) {
    console.error(`Patient Finder token missing: ${token}`);
    process.exit(1);
  }
}

console.log("Phase 3 PMS validation passed: bespoke routes, APIs, schema, and database migration exist.");
