import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "src/lib/pms-eligibility-artifacts.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const failures = [];

for (const token of [
  "buildEligibilitySummaryHtml",
  "buildEligibilityPdfArtifactPayload",
  "ELIGIBILITY_PDF",
  "subscriberMasked",
  "noPhiInLogs",
  "screenshotArtifactId",
  "sourceTraceId",
  "fieldEvidenceHash",
  "layoutDriftEvidence",
  "checksum",
  "normalizeLastFour",
  "escapeHtml",
]) {
  if (!source.includes(token)) failures.push(`src/lib/pms-eligibility-artifacts.ts missing ${token}.`);
}

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const require = createRequire(import.meta.url);
const sandbox = {
  exports: {},
  require,
  console,
  Buffer,
  process,
};
vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

const { buildEligibilitySummaryHtml, buildEligibilityPdfArtifactPayload } = sandbox.exports;

const input = {
  tenantId: "tenant_eligibility_artifact",
  patientInsuranceId: "ins_123",
  payerName: "Demo <Dental> Payer",
  planName: "PPO & Family",
  subscriberIdLastFour: "SUB-123456789",
  eligibilityStatus: "ACTIVE",
  benefitYear: 2026,
  deductibleCents: 5000,
  deductibleMetCents: 1500,
  annualMaxCents: 150000,
  annualUsedCents: 22500,
  frequencies: { prophy: "2 per year" },
  limitations: { waitingPeriod: "<script>alert(1)</script>" },
  payerNotes: ["Needs ortho rider review", "HTML <must> escape"],
  screenshotArtifactId: "artifact_screen_001",
  rpaRunLogId: "rpa_run_001",
  sourceTraceId: "trace_abc123",
  fieldEvidenceHash: "field_hash_001",
  layoutDriftEvidence: [{ fieldKey: "annual_max", reason: "LOW_CONFIDENCE", confidence: 82 }],
  generatedAt: "2026-05-23T12:00:00.000Z",
};

const html = buildEligibilitySummaryHtml(input);
const payload = buildEligibilityPdfArtifactPayload(input);

if (!html.includes("***6789")) failures.push("Eligibility summary does not mask subscriber ID to last four.");
if (html.includes("SUB-123456789")) failures.push("Eligibility summary leaked the raw subscriber ID.");
if (!html.includes("Demo &lt;Dental&gt; Payer")) failures.push("Eligibility summary did not HTML-escape payer names.");
if (html.includes("<script>alert(1)</script>")) failures.push("Eligibility summary did not HTML-escape limitation text.");
if (!html.includes("$1,500.00")) failures.push("Eligibility summary did not render benefit money values.");
if (!html.includes("trace_abc123") || !html.includes("field_hash_001")) failures.push("Eligibility summary did not include PHI-safe portal evidence linkage.");
if (!html.includes("LOW_CONFIDENCE")) failures.push("Eligibility summary did not include layout drift evidence.");

if (payload.artifactType !== "ELIGIBILITY_PDF") failures.push("Eligibility artifact payload has the wrong artifact type.");
if (payload.contentType !== "text/html; pdf-render-ready") failures.push("Eligibility artifact payload is not marked PDF-render-ready HTML.");
if (payload.metadata?.noPhiInLogs !== true) failures.push("Eligibility artifact metadata must assert noPhiInLogs.");
if (payload.metadata?.subscriberMasked !== true) failures.push("Eligibility artifact metadata must assert subscriberMasked.");
if (payload.metadata?.screenshotArtifactId !== input.screenshotArtifactId) failures.push("Eligibility artifact metadata must carry screenshot evidence linkage.");
if (payload.metadata?.sourceTraceId !== input.sourceTraceId) failures.push("Eligibility artifact metadata must carry sourceTraceId linkage.");
if (payload.metadata?.fieldEvidenceHash !== input.fieldEvidenceHash) failures.push("Eligibility artifact metadata must carry field evidence hash linkage.");

const expectedChecksum = createHash("sha256").update(payload.html).digest("hex");
if (payload.checksum !== expectedChecksum) failures.push("Eligibility artifact checksum is not deterministic SHA-256 of rendered HTML.");

if (failures.length) {
  console.error("PMS eligibility artifact validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PMS eligibility artifact validation passed.");
