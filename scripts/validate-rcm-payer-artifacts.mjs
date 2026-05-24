import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const artifactPath = path.join(root, "src/lib/rcm-payer-artifacts.ts");
const repositoryPath = path.join(root, "src/lib/operating-system-repository.ts");
const rcmPagePath = path.join(root, "src/app/app/rcm/page.tsx");
const prismaSchemaPath = path.join(root, "prisma/schema.prisma");
const artifactSource = fs.readFileSync(artifactPath, "utf8");
const repositorySource = fs.readFileSync(repositoryPath, "utf8");
const rcmPageSource = fs.readFileSync(rcmPagePath, "utf8");
const prismaSchema = fs.readFileSync(prismaSchemaPath, "utf8");
const failures = [];

for (const token of [
  "buildPriorAuthPacketHtml",
  "buildPriorAuthPdfArtifactPayload",
  "buildEobPostingHtml",
  "buildEobPdfArtifactPayload",
  "PRIOR_AUTH_PDF",
  "EOB_PDF",
  "LINE_LEVEL_835_EOB",
  "requiresLineLevelAdjudication",
  "summaryOnlyRejected",
  "pdfReadyLineAdjudication",
  "carcCodes",
  "rarcCodes",
  "patientResponsibilityCents",
  "lineBalanceVarianceCents",
  "noPhiInLogs",
  "humanApprovalRequired",
  "ledgerPostingRequiresReview",
  "externalSubmissionBlockedWithoutAck",
  "escapeHtml",
]) {
  if (!artifactSource.includes(token)) failures.push(`src/lib/rcm-payer-artifacts.ts missing ${token}.`);
}

for (const token of [
  "stagePriorAuthorizationPacket",
  "attachEobProofToEra",
  "recordPayerGeneratedArtifact",
  "artifact://prior-auth-packet/",
  "artifact://eob-posting/",
  "RCM_PRIOR_AUTH_PACKET_STAGED",
  "RCM_EOB_PROOF_ATTACHED",
  "RCM_ERA_POST_BLOCKED_VARIANCE",
  "external payer submission still requires connector acknowledgement",
  "ledger posting still requires billing review",
  "EOB/ERA amounts must balance before posting to the PMS ledger",
  "varianceResolved",
  "packetArtifactId",
  "packetChecksum",
  "PACKET_READY_MANUAL_PROOF_REQUIRED",
  "payerPortalRunId",
  "payerAcknowledgementId",
  "getEraAdjudicationLines",
  "RcmEraAdjudicationLine",
  "for update",
  "withTransaction",
  "ERA posting requires imported line-level 835/EOB adjudication",
  "reconcileEraAdjudicationLines",
  "inputTotalsMatchLines",
  "lineBalancesToAllowed",
  "patientResponsibilityBalances",
  "Every imported ERA/EOB adjudication row must map to a claim line",
  "claimLineUpdate.rowCount !== adjudicationLines.length",
  "RCM_ERA_POST_BLOCKED_LINE_RECONCILIATION",
  "ERA posting is already posted and cannot be posted again",
  "where \"id\" = $1 and \"tenantId\" = $2",
  "where \"id\" = $1 and \"tenantId\" = $3",
  "where pa.\"id\" = $1 and pa.\"tenantId\" = $2",
  "lineLevelAdjudicationReady",
  "updateRcmWorkItemStatus(id: string, status: string, actorRole = \"billing_rcm\", tenantId = defaultTenantId)",
  "updatePriorAuthorizationStatus(id: string, status: string, actorRole = \"billing_rcm\", tenantId = defaultTenantId)",
  "updateDenialCaseStatus(id: string, status: string, actorRole = \"billing_rcm\", tenantId = defaultTenantId)",
  "updatePayerFollowUpStatus(id: string, status: string, outcome?: string, actorRole = \"billing_rcm\", tenantId = defaultTenantId)",
  "updateRevenueFindingStatus(id: string, status: string, actorRole = \"billing_rcm\", tenantId = defaultTenantId)",
]) {
  if (!repositorySource.includes(token)) failures.push(`src/lib/operating-system-repository.ts missing ${token}.`);
}

const priorAuthModel = prismaSchema.match(/model\s+RcmPriorAuthorization\s*{([\s\S]*?)\n}/)?.[1] ?? "";
for (const token of [
  "packetArtifactId",
  "packetChecksum",
  "submissionMode",
  "payerPortalRunId",
  "payerAcknowledgementId",
  "determinationAt",
  "approvalNumber",
  "@@index([tenantId, submissionMode, connectorStatus])",
  "@@index([packetArtifactId])",
  "@@index([payerPortalRunId])",
]) {
  if (!priorAuthModel.includes(token)) failures.push(`prisma/schema.prisma RcmPriorAuthorization missing ${token}.`);
}

const claimLineModel = prismaSchema.match(/model\s+PmsClaimLine\s*{([\s\S]*?)\n}/)?.[1] ?? "";
for (const token of ["deductibleCents", "copayCents", "coinsuranceCents", "writeoffCents", "denialCents", "otherAdjustmentCents", "carcCodes", "rarcCodes", "eraPostingId", "adjudicatedAt", "@@index([eraPostingId])"]) {
  if (!claimLineModel.includes(token)) failures.push(`prisma/schema.prisma PmsClaimLine missing line-level ERA/EOB adjudication token ${token}.`);
}

const eraAdjudicationLineModel = prismaSchema.match(/model\s+RcmEraAdjudicationLine\s*{([\s\S]*?)\n}/)?.[1] ?? "";
for (const token of ["eraPostingId", "claimLineId", "procedureCode", "allowedCents", "deductibleCents", "coinsuranceCents", "patientResponsibilityCents", "carcCodes", "rarcCodes", "@@unique([tenantId, eraPostingId, claimLineId])"]) {
  if (!eraAdjudicationLineModel.includes(token)) failures.push(`prisma/schema.prisma RcmEraAdjudicationLine missing imported adjudication token ${token}.`);
}

const paymentModel = prismaSchema.match(/model\s+PmsPayment\s*{([\s\S]*?)\n}/)?.[1] ?? "";
if (!paymentModel.includes("@@unique([tenantId, paymentType, reference])")) failures.push("prisma/schema.prisma PmsPayment missing DB-backed ERA payment idempotency key.");

for (const token of [
  "priorAuthPacketAction",
  "eobProofAction",
  "Generate prior-auth packet",
  "Generate EOB proof",
  "stagePriorAuthorizationPacket",
  "attachEobProofToEra",
  "eraCanPost",
  "Posting blocked until EOB variance is reconciled to $0.00.",
  "requireAuth",
  "session.tenantId",
  "session.roleKey",
  "updateRcmWorkItemStatus(String(formData.get(\"id\") ?? \"\"), String(formData.get(\"status\") ?? \"OPEN\"), session.roleKey, session.tenantId)",
  "postEraToLedger(String(formData.get(\"id\") ?? \"\"), session.roleKey, session.tenantId)",
  "tenantId: session.tenantId",
]) {
  if (!rcmPageSource.includes(token)) failures.push(`src/app/app/rcm/page.tsx missing ${token}.`);
}

const compiled = ts.transpileModule(artifactSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const require = createRequire(import.meta.url);
const sandbox = { exports: {}, require, console, Buffer, process };
vm.runInNewContext(compiled, sandbox, { filename: artifactPath });

const {
  buildPriorAuthPdfArtifactPayload,
  buildEobPdfArtifactPayload,
} = sandbox.exports;

const priorAuth = buildPriorAuthPdfArtifactPayload({
  tenantId: "tenant_rcm",
  priorAuthorizationId: "pa_123",
  patientLabel: "Patient <Escaped>",
  payerName: "Demo & Payer",
  requestedCents: 125000,
  treatmentPlanName: "Implant Plan",
  requiredEvidence: ["radiograph", "clinical narrative"],
  treatmentPlanEvidence: [{ code: "D6010", description: "<implant>" }],
  clinicalNarrative: "Need due to fracture <script>alert(1)</script>",
  generatedAt: "2026-05-23T12:00:00.000Z",
});

if (priorAuth.artifactType !== "PRIOR_AUTH_PDF") failures.push("Prior auth payload has the wrong artifact type.");
if (!priorAuth.html.includes("Patient &lt;Escaped&gt;")) failures.push("Prior auth packet did not HTML-escape patient label.");
if (priorAuth.html.includes("<script>alert(1)</script>")) failures.push("Prior auth packet leaked raw script content.");
if (priorAuth.metadata?.humanApprovalRequired !== true) failures.push("Prior auth packet must require human approval.");
if (priorAuth.metadata?.externalSubmissionBlockedWithoutAck !== true) failures.push("Prior auth packet must block external submission without acknowledgement.");
if (priorAuth.checksum !== createHash("sha256").update(priorAuth.html).digest("hex")) failures.push("Prior auth packet checksum is not deterministic.");

const eob = buildEobPdfArtifactPayload({
  tenantId: "tenant_rcm",
  eraPostingId: "era_123",
  claimId: "claim_123",
  patientLabel: "Ledger <Patient>",
  payerName: "Demo Payer",
  allowedCents: 100000,
  paidCents: 70000,
  patientDueCents: 20000,
  adjustmentCents: 10000,
  eraTraceNumber: "TRACE123",
  adjudicationLines: [
    {
      claimLineId: "cl_1",
      procedureCode: "D0120",
      serviceDate: "2026-05-20",
      billedCents: 60000,
      allowedCents: 60000,
      paidCents: 40000,
      deductibleCents: 10000,
      copayCents: 0,
      coinsuranceCents: 10000,
      writeoffCents: 0,
      carcCodes: ["PR-1", "PR-2"],
      rarcCodes: ["N130"],
      status: "PAID_WITH_PATIENT_RESPONSIBILITY",
    },
    {
      claimLineId: "cl_2",
      procedureCode: "D2391",
      tooth: "14",
      surface: "O",
      billedCents: 50000,
      allowedCents: 40000,
      paidCents: 30000,
      deductibleCents: 0,
      copayCents: 0,
      coinsuranceCents: 0,
      writeoffCents: 10000,
      patientResponsibilityCents: 0,
      carcCodes: ["CO-45"],
      rarcCodes: ["M15"],
      status: "CONTRACTUAL_WRITE_OFF",
    },
  ],
  adjustmentSummary: { reason: "contractual <adjustment>" },
  generatedAt: "2026-05-23T12:00:00.000Z",
});

if (eob.artifactType !== "EOB_PDF") failures.push("EOB payload has the wrong artifact type.");
if (!eob.html.includes("Ledger &lt;Patient&gt;")) failures.push("EOB proof did not HTML-escape patient label.");
if (!eob.html.includes("$700.00")) failures.push("EOB proof did not render paid amount.");
if (!eob.html.includes("Line-Level 835 / EOB Adjudication")) failures.push("EOB proof must render line-level adjudication.");
if (!eob.html.includes("D2391")) failures.push("EOB proof must render procedure-level claim lines.");
if (!eob.html.includes("CO-45")) failures.push("EOB proof must render CARC denial/adjustment codes.");
if (!eob.html.includes("M15")) failures.push("EOB proof must render RARC remark codes.");
if (eob.metadata?.ledgerPostingRequiresReview !== true) failures.push("EOB proof must require ledger posting review.");
if (eob.metadata?.adjudicationModel !== "LINE_LEVEL_835_EOB") failures.push("EOB proof must identify the line-level adjudication model.");
if (eob.metadata?.requiresLineLevelAdjudication !== true) failures.push("EOB proof must require line-level adjudication.");
if (eob.metadata?.summaryOnlyRejected !== true) failures.push("EOB proof metadata must record summary-only rejection.");
if (eob.metadata?.pdfReadyLineAdjudication !== true) failures.push("EOB proof metadata must mark line adjudication PDF-ready.");
if (eob.metadata?.lineCount !== 2) failures.push("EOB proof must record the adjudicated line count.");
if (eob.metadata?.totals?.patientResponsibilityCents !== 20000) failures.push("EOB proof must total line-level patient responsibility.");
if (eob.metadata?.totals?.deductibleCents !== 10000) failures.push("EOB proof must total deductible adjudication.");
if (eob.metadata?.totals?.coinsuranceCents !== 10000) failures.push("EOB proof must total coinsurance adjudication.");
if (eob.metadata?.totals?.writeoffCents !== 10000) failures.push("EOB proof must total contractual write-off adjudication.");
if (!eob.metadata?.denialCodes?.carc?.includes("CO-45")) failures.push("EOB proof metadata must collect CARC codes.");
if (!eob.metadata?.denialCodes?.rarc?.includes("M15")) failures.push("EOB proof metadata must collect RARC codes.");
if (eob.metadata?.postingVarianceCents !== 0) failures.push("Balanced EOB proof must record zero posting variance.");
if (eob.metadata?.balancedForPosting !== true) failures.push("Balanced EOB proof must be marked balanced for posting.");
if (eob.checksum !== createHash("sha256").update(eob.html).digest("hex")) failures.push("EOB proof checksum is not deterministic.");

const imbalancedEob = buildEobPdfArtifactPayload({
  tenantId: "tenant_rcm",
  eraPostingId: "era_456",
  claimId: "claim_456",
  patientLabel: "Variance Patient",
  payerName: "Demo Payer",
  allowedCents: 100000,
  paidCents: 70000,
  patientDueCents: 20000,
  adjustmentCents: 5000,
  adjudicationLines: [
    {
      claimLineId: "cl_3",
      procedureCode: "D1110",
      billedCents: 100000,
      allowedCents: 100000,
      paidCents: 70000,
      deductibleCents: 10000,
      copayCents: 0,
      coinsuranceCents: 10000,
      writeoffCents: 5000,
      patientResponsibilityCents: 20000,
      carcCodes: ["CO-45"],
      rarcCodes: [],
    },
  ],
  generatedAt: "2026-05-23T12:00:00.000Z",
});

if (imbalancedEob.metadata?.postingVarianceCents !== 5000) failures.push("Imbalanced EOB proof must record the posting variance.");
if (imbalancedEob.metadata?.balancedForPosting !== false) failures.push("Imbalanced EOB proof must not be marked balanced for posting.");
if (!imbalancedEob.html.includes("$50.00")) failures.push("Imbalanced EOB proof did not render the variance amount.");

const deniedEob = buildEobPdfArtifactPayload({
  tenantId: "tenant_rcm",
  eraPostingId: "era_denied",
  claimId: "claim_denied",
  patientLabel: "Denied Patient",
  payerName: "Demo Payer",
  allowedCents: 40000,
  paidCents: 0,
  patientDueCents: 0,
  adjustmentCents: 40000,
  adjudicationLines: [
    {
      claimLineId: "cl_denied",
      procedureCode: "D7210",
      billedCents: 90000,
      allowedCents: 40000,
      paidCents: 0,
      deductibleCents: 0,
      copayCents: 0,
      coinsuranceCents: 0,
      writeoffCents: 0,
      denialCents: 40000,
      carcCodes: ["CO-50"],
      rarcCodes: ["N115"],
      status: "DENIED_MEDICAL_NECESSITY",
    },
  ],
  generatedAt: "2026-05-23T12:00:00.000Z",
});

if (deniedEob.metadata?.totals?.denialCents !== 40000) failures.push("Denied EOB proof must total denied line amount.");
if (!deniedEob.metadata?.denialCodes?.carc?.includes("CO-50")) failures.push("Denied EOB proof must collect denial CARC.");
if (!deniedEob.html.includes("DENIED_MEDICAL_NECESSITY")) failures.push("Denied EOB proof must render denied line status.");

try {
  buildEobPdfArtifactPayload({
    tenantId: "tenant_rcm",
    eraPostingId: "era_summary_only",
    claimId: "claim_summary_only",
    patientLabel: "Summary Patient",
    payerName: "Demo Payer",
    allowedCents: 100000,
    paidCents: 70000,
    patientDueCents: 20000,
    adjustmentCents: 10000,
    adjustmentSummary: { reason: "summary only" },
    generatedAt: "2026-05-23T12:00:00.000Z",
  });
  failures.push("Summary-only EOB proof must be rejected.");
} catch (error) {
  if (!String(error?.message ?? error).includes("line-level 835/EOB adjudication")) failures.push("Summary-only EOB rejection did not explain the line-level requirement.");
}

if (failures.length) {
  console.error("RCM payer artifact validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCM payer artifact validation passed.");
