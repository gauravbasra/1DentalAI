import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const files = {
  schema: "prisma/schema.prisma",
  migration: "prisma/migrations/202605230900_payer_network_matrix/migration.sql",
  service: "src/lib/payer-network-repository.ts",
  doc: "docs/PAYER_MATRIX_SCHEMA_SERVICE_SLICE.md",
};

function read(label) {
  const fullPath = path.join(root, files[label]);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${files[label]} is missing.`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const schema = read("schema");
const migration = read("migration");
const service = read("service");
const doc = read("doc");
const corpus = `${schema}\n${migration}\n${service}\n${doc}`;

function requireTokens(label, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${label} missing required token: ${token}`);
  }
}

function requireRegex(label, source, pattern, message) {
  if (!pattern.test(source)) failures.push(`${label}: ${message}`);
}

function modelBody(source, model) {
  return source.match(new RegExp(`model\\s+${model}\\s*{[\\s\\S]*?\\n}`))?.[0] ?? "";
}

function tableBody(source, table) {
  return source.match(new RegExp(`create table if not exists "${table}" \\([\\s\\S]*?\\n\\);`, "i"))?.[0] ?? "";
}

const requiredModels = [
  "PayerRegistryEntry",
  "PayerAlias",
  "PayerTransactionCapability",
  "PayerNetworkModel",
  "PayerRoutePolicy",
  "PayerMatrixSnapshot",
  "PayerPortalCredentialReference",
  "PayerRpaRunLog",
  "PayerGeneratedArtifactReference",
];

const requiredTransactions = [
  "ELIGIBILITY_270_271",
  "COB_271",
  "CLAIM_837D",
  "CLAIM_ACK_277CA",
  "CLAIM_STATUS_276_277",
  "ERA_835",
  "ATTACHMENT_275",
  "PRIOR_AUTH",
];

requireTokens("schema", schema, requiredModels);
requireTokens("migration", migration, requiredModels.map((model) => `create table if not exists "${model}"`));
requireTokens("service", service, [
  "PAYER_TRANSACTION_FAMILIES",
  "searchPayerMatrix",
  "getPayerRouteReadiness",
  "importPayerMatrixSnapshot",
  "assertPayerProductionGate",
  "registerPortalCredentialReference",
  "createPayerRpaRunLog",
  "recordPayerGeneratedArtifact",
  "getPayerMatrixCoverage",
  "PayerNetworkType.UNKNOWN is blocked",
  "PayerRouteType.BLOCKED is blocked",
  "Manual-only route cannot satisfy electronic acknowledgement",
]);
requireTokens("transaction coverage", corpus, requiredTransactions);
requireTokens("RPA credential/run-log/artifact coverage", corpus, [
  "credentialVaultId",
  "credentialStatus",
  "PAYER_PORTAL_RPA",
  "noPhiInLogs",
  "errorMessageRedacted",
  "evidenceUri",
  "ELIGIBILITY_PDF",
  "PRIOR_AUTH_PDF",
  "EOB_PDF",
  "ERA_POSTING_PDF",
  "CLAIM_ATTACHMENT_PACKET",
  "PAYER_SCREENSHOT_REFERENCE",
]);
requireTokens("route/audit gate coverage", corpus, [
  "requiresElectronicAcknowledgement",
  "allowPortalRpa",
  "allowManualAttestation",
  "requiresValidatedCredential",
  "connectorHealthRequired",
  "manualFallbackAllowed",
  "requiresProviderEnrollment",
  "requiresLocationEnrollment",
  "externalActionBlockedReason",
  "clearinghouseRouteDecision",
  "routeDecisionMetadata",
  "stediTransactionKey",
  "clearinghousePayerId",
  "credentialingStatus",
  "PAYER_PRODUCTION_GATE_EVALUATED",
  "electronic acknowledgement",
  "payer portal screenshot/reference",
  "generated PDF artifact",
]);

const payerFieldExpectations = {
  PayerTransactionCapability: [
    "stediTransactionKey",
    "clearinghousePayerId",
    "payerEnrollmentMode",
    "portalFallbackReason",
    "requiresPayerPortalFallback",
  ],
  PayerNetworkModel: [
    "clearinghouseRouteKey",
    "clearinghousePayerId",
    "portalRpaProfile",
    "credentialingStatus",
    "credentialingOwnerRole",
    "credentialingDueAt",
  ],
  PayerRoutePolicy: [
    "routeDecisionMetadata",
    "requiresValidatedCredential",
    "connectorHealthRequired",
    "clearinghouseRouteDecision",
  ],
};

for (const [model, fields] of Object.entries(payerFieldExpectations)) {
  const schemaBody = modelBody(schema, model);
  const migrationBody = tableBody(migration, model);
  if (!schemaBody) failures.push(`schema missing parseable model body for ${model}.`);
  if (!migrationBody) failures.push(`migration missing parseable create table body for ${model}.`);
  for (const field of fields) {
    if (!new RegExp(`\\b${field}\\b`).test(schemaBody)) failures.push(`schema ${model} missing concrete field ${field}.`);
    if (!migrationBody.includes(`"${field}"`)) failures.push(`migration ${model} missing concrete column ${field}.`);
  }
}

for (const family of requiredTransactions) {
  requireRegex(
    "service transaction mapping",
    service,
    new RegExp(`${family}:[\\s\\S]{0,400}x12Transaction:[\\s\\S]{0,220}stediTransactionKey:[\\s\\S]{0,220}proofTypes:`, "m"),
    `${family} must have concrete x12Transaction, stediTransactionKey, and proofTypes mapping, not just a token.`,
  );
}

requireRegex(
  "service import validation",
  service,
  /function requireConcreteMatrixRow[\s\S]*capabilityFamilies\.length < 3[\s\S]*routePolicies[\s\S]*preferredRouteType[\s\S]*portalUrl/,
  "importPayerMatrixSnapshot must reject sparse/token-only matrix rows before writing.",
);
requireRegex(
  "service capability SQL",
  service,
  /insert into "PayerTransactionCapability"[\s\S]*"stediTransactionKey"[\s\S]*"clearinghousePayerId"[\s\S]*"payerEnrollmentMode"[\s\S]*"portalFallbackReason"/,
  "capability import must persist Stedi transaction, clearinghouse payer ID, enrollment mode, and portal fallback reason.",
);
requireRegex(
  "service network SQL",
  service,
  /insert into "PayerNetworkModel"[\s\S]*"clearinghouseRouteKey"[\s\S]*"portalRpaProfile"[\s\S]*"credentialingStatus"[\s\S]*"credentialingDueAt"/,
  "network import must persist route key, portal RPA profile, and credentialing status metadata.",
);
requireRegex(
  "service policy SQL",
  service,
  /insert into "PayerRoutePolicy"[\s\S]*"routeDecisionMetadata"[\s\S]*"requiresValidatedCredential"[\s\S]*"connectorHealthRequired"[\s\S]*"clearinghouseRouteDecision"/,
  "route policy import must persist route decision metadata and connector/credential requirements.",
);
requireRegex(
  "service readiness",
  service,
  /function evaluatePayerReadiness[\s\S]*Clearinghouse route decision requires clearinghouse payer ID metadata[\s\S]*Credentialing status[\s\S]*Portal\/RPA credential reference is not validated/,
  "readiness gate must evaluate clearinghouse metadata, credentialing status, and portal/RPA credentials.",
);

const forbiddenCredentialPatterns = [
  /portalPassword/i,
  /password\s+text/i,
  /secretValue/i,
  /encryptedValue/i,
  /plain.?text/i,
];

const payerSchemaOnly = requiredModels
  .map((model) => schema.match(new RegExp(`model\\s+${model}\\s*{[\\s\\S]*?\\n}`))?.[0] ?? "")
  .join("\n");

for (const pattern of forbiddenCredentialPatterns) {
  if (payerSchemaOnly.match(pattern) || migration.match(pattern)) {
    failures.push(`Payer matrix schema/migration must not store plaintext or encrypted portal secrets directly: ${pattern}`);
  }
}

if (failures.length) {
  console.error("Payer matrix slice validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Payer matrix slice validation passed.");
