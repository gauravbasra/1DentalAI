import fs from "node:fs";

const requiredFiles = [
  "src/app/app/pms/page.tsx",
  "src/app/app/pms/schedule/page.tsx",
  "src/app/app/pms/patients/page.tsx",
  "src/app/app/pms/patients/[patientId]/page.tsx",
  "src/app/app/pms/forms/page.tsx",
  "src/app/app/pms/chart/[patientId]/page.tsx",
  "src/app/app/pms/perio/[patientId]/page.tsx",
  "src/app/app/pms/imaging/page.tsx",
  "src/app/app/pms/treatment-plans/page.tsx",
  "src/app/app/pms/ledger/page.tsx",
  "src/app/app/pms/insurance/page.tsx",
  "src/app/app/pms/labs/page.tsx",
  "src/app/app/pms/documents/page.tsx",
  "src/app/app/pms/reports/page.tsx",
  "src/app/app/pms/tasks/page.tsx",
  "src/app/app/engagement/page.tsx",
  "src/app/api/pms/patients/route.ts",
  "src/app/api/pms/schedule/route.ts",
  "src/app/api/pms/chart/[patientId]/route.ts",
  "src/app/api/pms/perio/[patientId]/route.ts",
  "src/lib/pms-repository.ts",
  "prisma/migrations/202605210001_pms_core/migration.sql",
];

const requiredSchemaModels = [
  "PmsPatient",
  "PmsProvider",
  "PmsOperatory",
  "PmsAppointment",
  "PmsAppointmentCategory",
  "PmsBlockout",
  "PmsAppointmentRequest",
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
  "PmsTask",
  "PatientEngagementEvent",
  "ReputationRecoveryCase",
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));
if (missingFiles.length) {
  console.error(`Missing PMS files:\n${missingFiles.join("\n")}`);
  process.exit(1);
}

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

const schedulePage = fs.readFileSync("src/app/app/pms/schedule/page.tsx", "utf8");
for (const token of ["Operatory day sheet", "Pinboard", "Recall", "Lab case", "AppointmentCategory"]) {
  if (!schedulePage.includes(token) && !schema.includes(token)) {
    console.error(`Schedule PMS depth token missing: ${token}`);
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
const documentsPage = fs.readFileSync("src/app/app/pms/documents/page.tsx", "utf8");
const reportsPage = fs.readFileSync("src/app/app/pms/reports/page.tsx", "utf8");
for (const token of ["Family account", "guarantorPatientId", "Odontogram", "addToothCondition", "addProcedureLog", "Treatment plan builder", "addTreatmentPlanItem", "updateTreatmentPlanStatus"]) {
  const haystack = `${schema}\n${patientsPage}\n${patientRecordPage}\n${chartPage}\n${treatmentPlanPage}\n${insurancePage}\n${ledgerPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS family/chart production token missing: ${token}`);
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

for (const token of ["createImagingStudy", "createLabCase", "createDocument", "createPrescription", "createReferral", "getPmsReports", "Imaging orders", "Lab case tracking", "Prescription register", "Practice performance reports"]) {
  const haystack = `${schema}\n${imagingPage}\n${labsPage}\n${documentsPage}\n${reportsPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS completion workflow token missing: ${token}`);
    process.exit(1);
  }
}

const engagementPage = fs.readFileSync("src/app/app/engagement/page.tsx", "utf8");
for (const token of ["PatientEngagementEvent", "ReputationRecoveryCase", "stageEngagementEvent", "updateEngagementEventStatus", "PMS operating graph", "Post-visit review", "Service recovery before review requests"]) {
  const haystack = `${schema}\n${engagementPage}\n${fs.readFileSync("src/lib/pms-repository.ts", "utf8")}`;
  if (!haystack.includes(token)) {
    console.error(`PMS-connected engagement token missing: ${token}`);
    process.exit(1);
  }
}

console.log("Phase 3 PMS validation passed: bespoke routes, APIs, schema, and database migration exist.");
