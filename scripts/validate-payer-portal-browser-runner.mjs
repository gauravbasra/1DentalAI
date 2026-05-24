import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "src/lib/payer-portal-browser-runner.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const failures = [];

for (const token of [
  "executeEligibilityPortalBrowserRunWithCredentials",
  "routeFixtures",
  "assertPortalUrlAllowed",
  "redactPayerPortalError",
  "updatePayerRpaRunLogStatus",
  "PAYER_PORTAL_BROWSER_RUN_FAILED",
  "PortalBrowserEvidenceManifest",
  "buildPortalBrowserEvidenceManifest",
  "fieldEvidenceHash",
  "layoutDriftEvidence",
  "evidenceFingerprint",
  "assertSession",
  "manualCheckpoint",
  "PAYER_PORTAL_MFA_REQUIRED",
  "PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED",
  "PAYER_PORTAL_NAVIGATION_BLOCKED",
  "classifyPayerPortalError",
  "extractDomFieldValue",
  "storageStatePath",
  "extractionAttempts",
  "sessionState",
]) {
  if (!source.includes(token)) failures.push(`src/lib/payer-portal-browser-runner.ts missing ${token}.`);
}

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const statusUpdates = [];
const require = createRequire(import.meta.url);
const sandbox = {
  exports: {},
  require(specifier) {
    if (specifier === "@/lib/connector-control-repository") {
      return {
        getConnectorSecret: async ({ credentialLabel }) => ({ value: credentialLabel.endsWith(":username") ? "demo-user" : "demo-pass", validated: true }),
      };
    }
    if (specifier === "@/lib/payer-network-repository") {
      return {
        updatePayerRpaRunLogStatus: async (input) => {
          statusUpdates.push(input);
          return input;
        },
      };
    }
    return require(specifier);
  },
  console,
  Buffer,
  process,
  setTimeout,
  clearTimeout,
};
vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

const {
  executeEligibilityPortalBrowserRunWithCredentials,
  assertPortalUrlAllowed,
  redactPayerPortalError,
  classifyPayerPortalError,
} = sandbox.exports;

try {
  assertPortalUrlAllowed("https://payer.example.test/eligibility", "payer.example.test");
} catch {
  failures.push("assertPortalUrlAllowed rejected a matching payer host.");
}
try {
  assertPortalUrlAllowed("https://evil.example.test/eligibility", "payer.example.test");
  failures.push("assertPortalUrlAllowed allowed navigation outside the configured payer host.");
} catch {
  // expected
}

const redacted = redactPayerPortalError(new Error("Failed for jane.patient@example.com subscriber 123456789"));
if (redacted.includes("jane.patient@example.com") || redacted.includes("123456789")) {
  failures.push("redactPayerPortalError did not redact email/numeric PHI-like values.");
}
const classifiedMfa = classifyPayerPortalError(new Error("PAYER_PORTAL_MFA_REQUIRED one-time code 123456"));
if (classifiedMfa.retryable !== false || classifiedMfa.runStatus !== "NEEDS_MANUAL_REVIEW") {
  failures.push("classifyPayerPortalError did not route manual checkpoints to NEEDS_MANUAL_REVIEW.");
}

if (!failures.length) {
  const screenshotPath = path.join(os.tmpdir(), `payer-browser-${Date.now()}.png`);
  const storageStatePath = path.join(os.tmpdir(), `payer-browser-state-${Date.now()}.json`);
  const result = await executeEligibilityPortalBrowserRunWithCredentials(
    {
      runId: "payer_rpa_test",
      tenantId: "tenant_test",
      portalHost: "payer.example.test",
      values: { subscriberId: "SUB123" },
      screenshotPath,
      storageStatePath,
      routeFixtures: [
        {
          urlPattern: "https://payer.example.test/eligibility",
          html: `
            <html><body>
              <input id="subscriber" />
              <button id="lookup">Lookup</button>
              <div data-field="status">Active</div>
              <div data-field="deductible">$50.00</div>
              <div data-field="annual-max">$1,500.00</div>
              <input data-field="group" value="PPO-GROUP-77" />
            </body></html>
          `,
        },
      ],
      steps: [
        { action: "goto", url: "https://payer.example.test/eligibility" },
        { action: "fill", selector: "#subscriber", valueRef: "subscriberId" },
        { action: "click", selector: "#lookup" },
        { action: "assertSession", selector: "#lookup" },
        { action: "waitForSelector", selector: "[data-field='status']" },
      ],
      fields: [
        { fieldKey: "eligibility_status", selector: "[data-field='status']", valueType: "TEXT" },
        { fieldKey: "deductible", selector: "[data-field='deductible']", valueType: "MONEY" },
        { fieldKey: "annual_max", selector: "[data-field='annual-max']", valueType: "MONEY" },
        { fieldKey: "group_number", selector: "[data-field='group']", valueType: "TEXT", attribute: "value" },
      ],
    },
    { portalUsername: "demo-user", portalPassword: "demo-pass" },
  );

  if (result.scrapedFields.length !== 4) failures.push("Browser runner did not scrape all expected fake payer fields.");
  if (result.scrapedFields.find((field) => field.fieldKey === "deductible")?.value !== 5000) failures.push("Browser runner did not coerce money fields into cents.");
  if (result.scrapedFields.find((field) => field.fieldKey === "group_number")?.value !== "PPO-GROUP-77") failures.push("Browser runner did not extract DOM input value fields.");
  if (!result.screenshot.checksum || !fs.existsSync(screenshotPath)) failures.push("Browser runner did not create a screenshot with checksum.");
  if (!result.sourceTraceId || result.evidenceManifest?.sourceTraceId !== result.sourceTraceId) failures.push("Browser runner did not return a stable source trace id.");
  if (result.evidenceManifest?.screenshotChecksum !== result.screenshot.checksum) failures.push("Browser evidence manifest is not linked to the screenshot checksum.");
  if (!result.evidenceManifest?.fieldEvidenceHash) failures.push("Browser evidence manifest is missing fieldEvidenceHash.");
  if (!result.evidenceManifest?.extractionAttempts?.some((row) => row.fieldKey === "group_number" && row.method === "value" && row.success)) failures.push("Browser evidence manifest did not record DOM extraction attempts.");
  if (result.evidenceManifest?.sessionState?.saved !== true || !fs.existsSync(storageStatePath)) failures.push("Browser runner did not persist session state evidence.");
  if (result.evidenceManifest?.noPhiInLogs !== true) failures.push("Browser evidence manifest must assert noPhiInLogs.");
  if (JSON.stringify(result.evidenceManifest).includes("SUB123")) failures.push("Browser evidence manifest leaked raw subscriber input.");
  if (!result.scrapedFields.every((field) => field.evidenceFingerprint)) failures.push("Scraped fields are missing PHI-safe evidence fingerprints.");
  if (!statusUpdates.some((row) => row.runStatus === "COMPLETED" && row.noPhiInLogs !== false)) failures.push("Browser runner did not mark RPA run completed.");
  fs.rmSync(screenshotPath, { force: true });
  fs.rmSync(storageStatePath, { force: true });

  const checkpointScreenshotPath = path.join(os.tmpdir(), `payer-browser-mfa-${Date.now()}.png`);
  try {
    await executeEligibilityPortalBrowserRunWithCredentials(
      {
        runId: "payer_rpa_mfa_test",
        tenantId: "tenant_test",
        portalHost: "payer.example.test",
        values: {},
        screenshotPath: checkpointScreenshotPath,
        routeFixtures: [{ urlPattern: "https://payer.example.test/eligibility", html: `<html><body><div id="mfa">One-time code</div></body></html>` }],
        steps: [
          { action: "goto", url: "https://payer.example.test/eligibility" },
          { action: "manualCheckpoint", selector: "#mfa", checkpointKey: "MFA_REQUIRED" },
        ],
        fields: [],
      },
      { portalUsername: "demo-user", portalPassword: "demo-pass" },
    );
    failures.push("Browser runner did not stop for an MFA/manual checkpoint.");
  } catch {
    if (!statusUpdates.some((row) => row.id === "payer_rpa_mfa_test" && row.runStatus === "NEEDS_MANUAL_REVIEW" && row.errorCode === "PAYER_PORTAL_MFA_REQUIRED")) {
      failures.push("Browser runner did not classify MFA/manual checkpoint as NEEDS_MANUAL_REVIEW.");
    }
  }
  fs.rmSync(checkpointScreenshotPath, { force: true });
}

if (failures.length) {
  console.error("Payer portal browser runner validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Payer portal browser runner validation passed.");
