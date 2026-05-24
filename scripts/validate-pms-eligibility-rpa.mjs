import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relative) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failures.push(`${relative} is missing.`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/202605232245_pms_eligibility_rpa_evidence/migration.sql");
const service = read("src/lib/pms-eligibility-rpa.ts");
const payerService = read("src/lib/payer-network-repository.ts");
const browserRunner = read("src/lib/payer-portal-browser-runner.ts");
const artifacts = read("src/lib/pms-eligibility-artifacts.ts");
const route = read("src/app/api/pms/insurance/eligibility-rpa/route.ts");
const pkg = read("package.json");

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label} missing required token: ${token}`);
  }
}

requireTokens("schema", schema, [
  "model PayerPortalLayout",
  "model PayerPortalLayoutField",
  "model PmsEligibilityEvidence",
  "screenshotPolicy",
  "navigationSteps",
  "selector",
  "pmsTarget",
  "requiredForWriteback",
  "confidenceThreshold",
  "screenshotArtifactId String",
  "pdfArtifactId        String",
  "tenantId      String",
  "tenantId           String",
  "@@index([tenantId, eligibilityStatus])",
  "@@index([tenantId, benefitYear])",
  "@@unique([tenantId, patientInsuranceId, benefitYear])",
]);

requireTokens("migration", migration, [
  "CREATE TABLE \"PayerPortalLayout\"",
  "CREATE TABLE \"PayerPortalLayoutField\"",
  "CREATE TABLE \"PmsEligibilityEvidence\"",
  "ALTER TABLE \"PmsPatientInsurance\"",
  "ALTER COLUMN \"tenantId\" SET NOT NULL",
  "ALTER TABLE \"PmsBenefitSummary\"",
  "screenshotArtifactId",
  "pdfArtifactId",
]);

requireTokens("service", service, [
  "prepareEligibilityEvidenceArtifacts",
  "registerEligibilityPortalLayout",
  "recordEligibilityScreenScrape",
  "applyEligibilityEvidenceToPms",
  "buildEligibilityPdfArtifactPayload",
  "recordPayerGeneratedArtifact",
  "browserEvidenceManifest",
  "fieldEvidenceHash",
  "layoutDriftEvidence",
  "buildPhiSafeRawFieldEvidence",
  "buildEligibilityPmsWritebackPayload",
  "insuranceSection",
  "benefitSummarySection",
  "writebackSections",
  "extractionAttemptCount",
  "sessionCheckpointStatus",
  "Browser evidence manifest checksum does not match screenshot artifact",
  "PmsPatientInsurance.eligibilityStatus",
  "PmsBenefitSummary.deductibleCents",
  "PmsBenefitSummary.annualMaxCents",
  "Eligibility writeback requires both screenshot and PDF artifact references",
  "Eligibility writeback requires tenant-scoped screenshot and PDF artifacts with checksums at apply time",
  "for update",
  "insuranceUpdate.rowCount !== 1",
  "on conflict (\"tenantId\", \"patientInsuranceId\", \"benefitYear\") do update",
  "benefitUpsert.rowCount !== 1",
  "evidenceUpdate.rowCount !== 1",
  "coverage is missing or outside this tenant",
  "Portal layout fields are required before scrape evidence can be accepted",
  "Selector drift",
  "Low confidence",
  "ELIGIBILITY_RPA_SCREEN_SCRAPE_REJECTED",
  "ELIGIBILITY_RPA_EVIDENCE_CAPTURED",
  "ELIGIBILITY_RPA_WRITEBACK_APPLIED",
  "noPhiInLogs",
  "withTransaction",
  "where \"tenantId\" = $1",
  "PayerRpaRunLog",
  "PayerGeneratedArtifactReference",
  "PAYER_SCREENSHOT_REFERENCE",
  "ELIGIBILITY_PDF",
  "artifact://eligibility-pdf/",
  "redactedPhiScreenshotRequired",
  "artifactType",
  "checksum",
]);

requireTokens("payer artifact service", payerService, [
  "PAYER_SCREENSHOT_REFERENCE",
  "ELIGIBILITY_PDF",
  "createPayerRpaRunLog",
  "recordPayerGeneratedArtifact",
  "noPhiInLogs",
  "errorMessageRedacted",
]);

requireTokens("browser runner", browserRunner, [
  "executeEligibilityPortalBrowserRun",
  "executeEligibilityPortalBrowserRunWithCredentials",
  "getConnectorSecret",
  "updatePayerRpaRunLogStatus",
  "chromium.launch",
  "page.goto",
  "locator",
  "screenshot",
  "Portal navigation blocked outside configured host",
  "Validated payer portal credential vault secrets are required",
  "PAYER_PORTAL_BROWSER_RUN_FAILED",
  "PAYER_PORTAL_MFA_REQUIRED",
  "PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED",
  "PAYER_PORTAL_NAVIGATION_BLOCKED",
  "classifyPayerPortalError",
  "assertSession",
  "manualCheckpoint",
  "extractDomFieldValue",
  "storageStatePath",
  "extractionAttempts",
  "sessionState",
  "assertPortalUrlAllowed",
  "redactPayerPortalError",
  "PortalBrowserEvidenceManifest",
  "sourceTraceId",
  "layoutDriftEvidence",
  "fieldEvidenceHash",
  "PAYER_SCREENSHOT_REFERENCE",
  "sha256",
]);

requireTokens("eligibility artifacts", artifacts, [
  "buildEligibilitySummaryHtml",
  "buildEligibilityPdfArtifactPayload",
  "ELIGIBILITY_PDF",
  "subscriberMasked",
  "sourceTraceId",
  "fieldEvidenceHash",
  "layoutDriftEvidence",
  "noPhiInLogs",
  "screenshotArtifactId",
  "checksum",
  "normalizeLastFour",
  "escapeHtml",
]);
requireTokens("eligibility RPA API route", route, [
  "requirePmsApiSession",
  "auth.session.tenantId",
  "auth.session.roleKey",
  "registerEligibilityPortalLayout",
  "prepareEligibilityEvidenceArtifacts",
  "recordEligibilityScreenScrape",
  "applyEligibilityEvidenceToPms",
  "prepareArtifacts",
]);
if (/body\??\.tenantId/.test(route) || /tenantId:\s*body/.test(route)) {
  failures.push("eligibility RPA API route must not accept tenantId from request body.");
}
if (/actorRole:\s*body/.test(route)) {
  failures.push("eligibility RPA API route must not accept actorRole from request body.");
}
requireTokens("package", pkg, ["\"playwright\""]);

const forbidden = [/portalPassword/i, /password\s+text/i, /secretValue/i, /plain.?text/i];
const rpaSchemaOnly = ["PayerPortalLayout", "PayerPortalLayoutField", "PmsEligibilityEvidence"]
  .map((model) => schema.match(new RegExp(`model\\s+${model}\\s*{[\\s\\S]*?\\n}`))?.[0] ?? "")
  .join("\n");
for (const pattern of forbidden) {
  if (rpaSchemaOnly.match(pattern) || migration.match(pattern)) {
    failures.push(`Eligibility RPA schema/migration must not store portal secrets directly: ${pattern}`);
  }
}

if (failures.length) {
  console.error("PMS eligibility RPA validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PMS eligibility RPA validation passed.");
