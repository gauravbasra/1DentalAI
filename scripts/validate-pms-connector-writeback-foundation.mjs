import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "prisma/migrations/202605250130_pms_connector_writeback_foundation/migration.sql",
  "src/lib/pms-connectors/types.ts",
  "src/lib/pms-connectors/capability-map.ts",
  "src/lib/pms-connectors/open-dental-client.ts",
  "src/lib/pms-connectors/writeback-policy.ts",
  "src/lib/pms-connectors/writeback-jobs.ts",
  "src/lib/pms-connectors/smoke-tests.ts",
  "src/app/api/connectors/pms/open-dental/smoke-test/route.ts",
  "src/app/api/connectors/pms/writeback-jobs/route.ts",
  "src/app/api/connectors/pms/writeback-jobs/[jobId]/approve/route.ts",
  "src/app/api/connectors/pms/writeback-jobs/[jobId]/execute/route.ts",
  "src/app/app/connectors/pms/page.tsx",
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`${file}: missing`);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const migration = read("prisma/migrations/202605250130_pms_connector_writeback_foundation/migration.sql");
for (const table of ["PmsConnectorCapability", "PmsExternalRecordLink", "PmsWritebackJob", "PmsWritebackAttempt"]) {
  if (!migration.includes(`"${table}"`)) failures.push(`migration: ${table} is not created`);
  if (!read("prisma/schema.prisma").includes(`model ${table}`)) failures.push(`schema.prisma: ${table} model is missing`);
  if (!read("src/app/api/database/health/route.ts").includes(`"${table}"`)) failures.push(`database health: ${table} is not required`);
}

const writeback = read("src/lib/pms-connectors/writeback-jobs.ts");
for (const token of [
  "PMS_WRITEBACK_JOB_CREATED",
  "PMS_WRITEBACK_JOB_APPROVED",
  "PMS_WRITEBACK_EXECUTION_BLOCKED",
  "noFakeExternalSuccess",
  "PmsWritebackAttempt",
]) {
  if (!writeback.includes(token)) failures.push(`writeback-jobs.ts: missing ${token}`);
}

const policy = read("src/lib/pms-connectors/writeback-policy.ts");
for (const token of ["Required writeback evidence is missing", "Capability is read-only", "PMS connector capability is not mapped"]) {
  if (!policy.includes(token)) failures.push(`writeback-policy.ts: missing ${token}`);
}

const smoke = read("src/lib/pms-connectors/smoke-tests.ts");
for (const token of ["base_url", "api_key", "OPEN_DENTAL_READ_SMOKE_TEST", "ConnectorHealthCheck", "PMS_CONNECTOR_SMOKE_TEST"]) {
  if (!smoke.includes(token)) failures.push(`smoke-tests.ts: missing ${token}`);
}

const page = read("src/app/app/connectors/pms/page.tsx");
for (const token of ["OpenDental source, writeback, and audit gate", "Run OpenDental read smoke test", "Recent writeback jobs"]) {
  if (!page.includes(token)) failures.push(`PMS connector page: missing ${token}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("PMS connector writeback foundation validation passed.");
