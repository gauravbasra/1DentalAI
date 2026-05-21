import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workbenchData = fs.readFileSync(path.join(root, "src/lib/workbench-data.ts"), "utf8");
const foundationData = fs.readFileSync(path.join(root, "src/lib/foundation-data.ts"), "utf8");
const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(path.join(root, "prisma/migrations/202605200001_phase2_workbenches/migration.sql"), "utf8");

const requiredSlugs = [
  "pms-schedule",
  "patient-chart",
  "perio-charting",
  "rcm-queue",
  "phone-inbox",
  "treatment-plans",
  "imaging",
  "labs-referrals",
  "rooms-chairs",
  "growth-reputation",
  "marketing-studio",
  "local-ai-seo",
  "connector-setup",
];

const requiredModels = [
  "Tenant",
  "Location",
  "TenantRole",
  "WorkbenchArea",
  "WorkbenchAreaRole",
  "WorkbenchQueueItem",
  "WorkbenchAction",
  "ConnectorReadinessItem",
  "WorkbenchAuditEvent",
];

const failures = [];
const promotedProductionRoutes = new Map([
  ["pms-schedule", "/app/pms/schedule?role="],
  ["patient-chart", "/app/pms/patients?role="],
  ["perio-charting", "/app/pms/patients?role="],
  ["treatment-plans", "/app/pms/treatment-plans?role="],
]);

for (const slug of requiredSlugs) {
  if (!workbenchData.includes(`slug: "${slug}"`)) {
    failures.push(`Missing workbench slug in workbench-data.ts: ${slug}`);
  }
  const promotedRoute = promotedProductionRoutes.get(slug);
  if (!foundationData.includes(`/app/work/${slug}?role=`) && (!promotedRoute || !foundationData.includes(promotedRoute))) {
    failures.push(`Dashboard does not route to workbench slug: ${slug}`);
  }
}

for (const model of requiredModels) {
  if (!schema.includes(`model ${model}`)) {
    failures.push(`Missing Prisma model: ${model}`);
  }
  if (!migration.includes(`"${model}"`)) {
    failures.push(`Migration does not create/reference table: ${model}`);
  }
}

for (const token of [
  "LOCAL_STATE_CHANGE",
  "APPROVAL_REQUEST",
  "EXTERNAL_EXECUTION_BLOCKED",
  "ConnectorReadinessItem",
  "clinicalData",
  "financialData",
  "marketingData",
]) {
  if (!workbenchData.includes(token) && !schema.includes(token)) {
    failures.push(`Missing required workbench/data contract token: ${token}`);
  }
}

if (failures.length) {
  console.error("Phase 2 workbench validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 2 workbench validation passed: ${requiredSlugs.length} workbenches, ${requiredModels.length} Prisma models.`);
