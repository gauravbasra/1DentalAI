import fs from "node:fs";

const requiredFiles = [
  "src/app/app/pms/page.tsx",
  "src/app/app/pms/schedule/page.tsx",
  "src/app/app/pms/patients/page.tsx",
  "src/app/app/pms/patients/[patientId]/page.tsx",
  "src/app/app/pms/chart/[patientId]/page.tsx",
  "src/app/app/pms/perio/[patientId]/page.tsx",
  "src/app/app/pms/treatment-plans/page.tsx",
  "src/app/app/pms/ledger/page.tsx",
  "src/app/app/pms/insurance/page.tsx",
  "src/app/app/pms/documents/page.tsx",
  "src/app/app/pms/tasks/page.tsx",
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
  "PmsClinicalNote",
  "PmsPerioExam",
  "PmsTreatmentPlan",
  "PmsInsurancePlan",
  "PmsClaim",
  "PmsLedgerEntry",
  "PmsDocument",
  "PmsLabCase",
  "PmsTask",
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

console.log("Phase 3 PMS validation passed: bespoke routes, APIs, schema, and database migration exist.");
