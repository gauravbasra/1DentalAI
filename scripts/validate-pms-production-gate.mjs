import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "src/app/api/pms");
const repositoryPath = path.join(root, "src/lib/pms-repository.ts");
const pmsAppRoot = path.join(root, "src/app/app/pms");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith("route.ts") ? [full] : [];
  });
}

const routeFiles = walk(apiRoot).sort();
const failures = [];
const repositorySource = fs.readFileSync(repositoryPath, "utf8");
const prismaSchema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const qaRubricPath = path.join(root, "docs/PMS_QA_RUBRIC_AND_BACKEND_SLICE_PLAN.md");
const patientScopedRepositoryMethods = new Map();
const allowedSessionGuards = ["requirePmsApiSession", "requireScribeSession"];
const serverActionPages = [
  "appointments/[appointmentId]/page.tsx",
  "chart/[patientId]/page.tsx",
  "documents/page.tsx",
  "forms/page.tsx",
  "imaging/page.tsx",
  "insurance/page.tsx",
  "labs/page.tsx",
  "online-scheduling/page.tsx",
  "page.tsx",
  "patients/[patientId]/page.tsx",
  "perio/[patientId]/page.tsx",
  "reports/page.tsx",
  "schedule/page.tsx",
  "scribe/page.tsx",
  "treatment-plans/page.tsx",
  "ledger/page.tsx",
];
const rawPhiAuditMetadataTokens = [
  "firstName:",
  "lastName:",
  "preferredName:",
  "dateOfBirth:",
  "dob:",
  "email:",
  "phone:",
  "addressLine1:",
  "addressLine2:",
  "postalCode:",
  "subscriberId:",
  "memberId:",
  "ssn:",
  "transcript:",
  "noteBody:",
  "rawPayload:",
  "startUrl:",
  "joinUrl:",
  "password:",
  "recordingUrl:",
  "audioUrl:",
];

for (const match of repositorySource.matchAll(/export async function ([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*(?::[^{]+)?{/g)) {
  const [, name, params] = match;
  if (/\bpatientId\b/.test(params)) {
    patientScopedRepositoryMethods.set(name, { hasTenantSignature: /\btenantId\b/.test(params) });
  }
}

function pmsRepositoryImports(source) {
  const imported = new Map();
  for (const match of source.matchAll(/import\s*{([^}]*)}\s*from\s*["']@\/lib\/pms-repository["']/g)) {
    for (const specifier of match[1].split(",")) {
      const parts = specifier.trim().split(/\s+as\s+/);
      const importedName = parts[0]?.trim();
      const localName = (parts[1] ?? parts[0])?.trim();
      if (importedName && localName) imported.set(importedName, localName);
    }
  }
  return imported;
}

function callArguments(source, name) {
  const calls = [];
  const callStart = new RegExp(`\\b${name}\\s*\\(`, "g");
  for (const match of source.matchAll(callStart)) {
    let depth = 1;
    let cursor = match.index + match[0].length;
    const start = cursor;
    while (cursor < source.length && depth > 0) {
      const char = source[cursor];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      cursor += 1;
    }
    if (depth === 0) calls.push(source.slice(start, cursor - 1));
  }
  return calls;
}

function functionBody(source, name) {
  const signature = new RegExp(`export\\s+async\\s+function\\s+${name}\\b\\s*\\(`, "m");
  const match = source.match(signature);
  if (!match || match.index === undefined) return null;

  let paramDepth = 1;
  let cursor = match.index + match[0].length;
  while (cursor < source.length && paramDepth > 0) {
    const char = source[cursor];
    if (char === "(") paramDepth += 1;
    if (char === ")") paramDepth -= 1;
    cursor += 1;
  }
  if (paramDepth !== 0) return null;
  while (cursor < source.length && source[cursor] !== "{") cursor += 1;
  if (source[cursor] !== "{") return null;

  let depth = 1;
  cursor += 1;
  const start = cursor;
  while (cursor < source.length && depth > 0) {
    const char = source[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  return depth === 0 ? source.slice(start, cursor - 1) : null;
}

function sourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

function statementAfter(source, index) {
  const end = source.indexOf("\n  );", index);
  return end === -1 ? source.slice(index, index + 700) : source.slice(index, end + 5);
}

function auditMetadataSnippets(source) {
  const snippets = [];
  for (const name of ["addAudit", "auditScribe"]) {
    for (const args of callArguments(source, name)) {
      snippets.push(args);
    }
  }
  let index = source.indexOf('insert into "PmsAuditEvent"');
  while (index !== -1) {
    snippets.push(statementAfter(source, index));
    index = source.indexOf('insert into "PmsAuditEvent"', index + 1);
  }
  return snippets;
}

function lineNumber(source, snippet) {
  const index = source.indexOf(snippet);
  return index === -1 ? 1 : source.slice(0, index).split("\n").length;
}

for (const file of routeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);

  if (!allowedSessionGuards.some((guard) => source.includes(guard))) {
    failures.push(`${relative}: PMS API routes must require an authenticated PMS API session.`);
  }

  const exportedHandlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)].map((match) => match[1]);
  const authCalls = allowedSessionGuards.reduce((count, guard) => count + [...source.matchAll(new RegExp(`${guard}\\(\\)`, "g"))].length, 0);
  if (exportedHandlers.length > authCalls) {
    failures.push(`${relative}: every exported handler must call an allowed PMS session guard before PMS data access.`);
  }

  if (
    /\bbody\??\.actorRole\b/.test(source) ||
    /\bconst\s*{[^}]*\bactorRole\b[^}]*}\s*=\s*body\b/.test(source) ||
    /\bactorRole\s*:\s*body\??\.actorRole\b/.test(source)
  ) {
    failures.push(`${relative}: mutation actorRole must come from the authenticated session, not request body.`);
  }

  if (
    /\bbody\??\.tenantId\b/.test(source) ||
    /\bconst\s*{[^}]*\btenantId\b[^}]*}\s*=\s*body\b/.test(source) ||
    /\btenantId\s*:\s*body\??\.tenantId\b/.test(source) ||
    /list[A-Za-z0-9_]+\(\s*undefined/.test(source)
  ) {
    failures.push(`${relative}: tenant scope must come from the authenticated session, not body/default tenant shortcuts.`);
  }

  for (const [importedName, localName] of pmsRepositoryImports(source)) {
    const patientScopedMethod = patientScopedRepositoryMethods.get(importedName);
    if (!patientScopedMethod) continue;

    if (!patientScopedMethod.hasTenantSignature && new RegExp(`\\b${localName}\\s*\\(`).test(source)) {
      failures.push(`${relative}: ${importedName} is patient-scoped but src/lib/pms-repository.ts does not require tenantId; PMS API handlers must use tenant-scoped repository signatures.`);
    }

    for (const args of callArguments(source, localName)) {
      if (!/\bauth\.session\.tenantId\b/.test(args)) {
        failures.push(`${relative}: ${importedName} is patient-scoped and must be called with auth.session.tenantId from PMS API handlers.`);
      }
    }
  }
}

for (const relativePage of serverActionPages) {
  const full = path.join(pmsAppRoot, relativePage);
  const source = fs.readFileSync(full, "utf8");
  const relative = path.relative(root, full);
  if (!source.includes("requireAuth")) failures.push(`${relative}: PMS server actions and page reads must use requireAuth().`);
  if (source.includes('"use server"') && !/const\s+session\s*=\s*await\s+requireAuth\(\)/.test(source)) {
    failures.push(`${relative}: every PMS write server action must derive session before repository writes.`);
  }
  if (!source.includes("session.tenantId")) failures.push(`${relative}: missing authenticated session.tenantId handoff.`);
  if (source.includes('"use server"') && !source.includes("session.roleKey")) failures.push(`${relative}: missing authenticated session.roleKey handoff for writes.`);
}

for (const file of [...sourceFiles(path.join(root, "src/lib")), ...sourceFiles(path.join(root, "src/app/api/pms"))]) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const snippet of auditMetadataSnippets(source)) {
    const forbidden = rawPhiAuditMetadataTokens.filter((token) => snippet.includes(token));
    if (forbidden.length) {
      failures.push(`${relative}:${lineNumber(source, snippet)}: PmsAuditEvent metadata must stay PHI-safe; found raw metadata token(s) ${forbidden.join(", ")}.`);
    }
  }
}

const checkoutBody = functionBody(repositorySource, "completeAppointmentCheckout");
if (!checkoutBody) {
  failures.push("src/lib/pms-repository.ts: completeAppointmentCheckout must exist for checkout production validation.");
} else {
  const hasTransactionBoundary = /\b(transaction|withTransaction|\$transaction|BEGIN|COMMIT|ROLLBACK)\b/i.test(checkoutBody);
  const hasLock = /\b(pg_advisory_xact_lock|pg_try_advisory_xact_lock|for\s+update|lock\s+table|SELECT\s+.+FOR\s+UPDATE)\b/i.test(checkoutBody);
  const hasIdempotencyGuard = /\b(idempotency|idempotent|on\s+conflict|already\s+completed|PmsCheckoutSession[\s\S]{0,240}(findFirst|select|where)|unique)\b/i.test(checkoutBody);

  if (!hasTransactionBoundary || !hasLock || !hasIdempotencyGuard) {
    const missing = [
      !hasTransactionBoundary && "transaction boundary",
      !hasLock && "appointment-scoped row/advisory lock",
      !hasIdempotencyGuard && "idempotency or duplicate-checkout guard",
    ].filter(Boolean);
    failures.push(`src/lib/pms-repository.ts: completeAppointmentCheckout must protect checkout writes with a ${missing.join(", ")}.`);
  }
}

const procedureLogModel = prismaSchema.match(/model\s+PmsProcedureLog\s*{([\s\S]*?)\n}/)?.[1] ?? "";
for (const field of ["tenantId", "appointmentId", "appointmentProcedureId", "checkoutSessionId"]) {
  if (!new RegExp(`\\b${field}\\b`).test(procedureLogModel)) {
    failures.push(`prisma/schema.prisma: PmsProcedureLog must include ${field} for checkout procedure traceability.`);
  }
}
if (!/appointmentProcedureId[\s\S]{0,80}@@index|@@index\(\[appointmentProcedureId\]\)/.test(procedureLogModel)) {
  failures.push("prisma/schema.prisma: PmsProcedureLog must index appointmentProcedureId for checkout traceability.");
}
if (!/checkoutSessionId[\s\S]{0,80}@@index|@@index\(\[checkoutSessionId\]\)/.test(procedureLogModel)) {
  failures.push("prisma/schema.prisma: PmsProcedureLog must index checkoutSessionId for checkout traceability.");
}

const clinicalNoteModel = prismaSchema.match(/model\s+PmsClinicalNote\s*{([\s\S]*?)\n}/)?.[1] ?? "";
for (const field of ["tenantId", "appointmentId", "noteTemplateKey", "signedByRole", "signatureHash", "lockedAt", "addendumOfNoteId", "addendumReason", "sourceModule", "sourceRecordId"]) {
  if (!new RegExp(`\\b${field}\\b`).test(clinicalNoteModel)) {
    failures.push(`prisma/schema.prisma: PmsClinicalNote must include ${field} for signed encounter-note lifecycle.`);
  }
}
for (const indexToken of ["@@index([tenantId, status, createdAt])", "@@index([appointmentId, status])", "@@index([addendumOfNoteId])"]) {
  if (!clinicalNoteModel.includes(indexToken)) {
    failures.push(`prisma/schema.prisma: PmsClinicalNote must include ${indexToken} for signed-note retrieval and addendum traceability.`);
  }
}
for (const token of ["export async function signClinicalNote", "export async function addClinicalNoteAddendum", "signatureHash", "lockedAt", "CLINICAL_NOTE_SIGNED", "CLINICAL_NOTE_ADDENDUM_SIGNED"]) {
  if (!repositorySource.includes(token)) {
    failures.push(`src/lib/pms-repository.ts: missing signed clinical note lifecycle token ${token}.`);
  }
}
for (const token of ["clinicalSignRoles", "CLINICAL_NOTE_SIGN_BLOCKED_ROLE", "checkoutOverrideRoles", "APPOINTMENT_CHECKOUT_OVERRIDE_BLOCKED_ROLE", "APPOINTMENT_CHECKOUT_OVERRIDE_BLOCKED_REASON", "A checkout override reason is required"]) {
  if (!repositorySource.includes(token)) {
    failures.push(`src/lib/pms-repository.ts: missing role-limited signoff/checkout override control ${token}.`);
  }
}
for (const token of [
  "TREATMENT_PLAN_ACCEPTANCE_BLOCKED_READINESS",
  "Treatment plan requires an assigned provider before acceptance.",
  "Treatment plan contains non-tenant or invalid CDT procedure codes.",
  "Active insurance eligibility is required before treatment plan acceptance.",
  "Signed treatment, financial, or procedure consent is required before treatment plan acceptance.",
  "CLAIM_CREATED_FROM_PROCEDURES_BLOCKED_READINESS",
  "Every selected procedure must belong to this tenant/patient, be COMPLETED, and be unclaimed.",
  "Procedure ${procedure.code} has no signed clinical note.",
  "Procedure ${procedure.code} requires reviewed attachment evidence before claim creation.",
  "Claim billed amount must be greater than zero.",
]) {
  if (!repositorySource.includes(token)) {
    failures.push(`src/lib/pms-repository.ts: missing treatment-plan-to-claim readiness gate token ${token}.`);
  }
}
const claimReadyBody = functionBody(repositorySource, "listClaimReadyProcedures") ?? "";
for (const pattern of [
  /pl\."status"\s*=\s*'COMPLETED'/,
  /pc\."code"\s*~\s*'\^D\[0-9\]\{4\}\$'/,
  /pr\."id"\s+is\s+not\s+null/,
  /pi\."id"\s+is\s+not\s+null/,
  /PmsClinicalNote[\s\S]*status"\s*=\s*'SIGNED'/,
  /PmsPatientConsent[\s\S]*GENERAL_TREATMENT[\s\S]*FINANCIAL_POLICY[\s\S]*PROCEDURE_CONSENT/,
  /PmsDocument[\s\S]*CLAIM_ATTACHMENT/,
]) {
  if (!pattern.test(claimReadyBody)) {
    failures.push(`src/lib/pms-repository.ts: listClaimReadyProcedures must enforce backend claim readiness pattern ${pattern}.`);
  }
}
const createClaimBody = functionBody(repositorySource, "createClaimFromProcedures") ?? "";
for (const pattern of [
  /eligibilityStatus[\s\S]*ACTIVE/,
  /getClaimReadyProceduresOrThrow/,
  /evaluateBenefitCapacityForClaim/,
  /CLAIM_CREATED_FROM_PROCEDURES_BLOCKED_BENEFIT_CAPACITY/,
  /procedures\.length === input\.procedureIds\.length/,
  /billedCents <= 0/,
]) {
  if (!pattern.test(createClaimBody + repositorySource.match(/async function getClaimReadyProceduresOrThrow[\s\S]*?\n}/)?.[0])) {
    failures.push(`src/lib/pms-repository.ts: createClaimFromProcedures must enforce claim readiness pattern ${pattern}.`);
  }
}
for (const token of ["getBenefitUtilizationLedger", "payerReportedAnnualUsedCents", "postedPaidCents", "pendingBilledCents", "estimatedRemainingCents", "BENEFITS_EXHAUSTED", "PENDING_CLAIMS_REDUCE_REMAINING", "Annual maximum appears exhausted", "Pending claims consume the estimated remaining annual benefit"]) {
  if (!repositorySource.includes(token)) {
    failures.push(`src/lib/pms-repository.ts: missing benefit consumption ledger token ${token}.`);
  }
}
for (const token of ["getFormAssignmentDetail(assignmentId: string, tenantId = defaultTenantId)", "recordFormResponse(input: {", "tenantId?: string;", "reviewProfileChangeRequest(input: {", "applyProfileChange(change.patientId, change.targetModel, change.targetField, change.proposedValue, tenantId)", "updateDocumentStatus(documentId: string, status: string, actorRole = \"front_desk\", tenantId = defaultTenantId)", "updateLabCaseStatus(labCaseId: string, status: string, actorRole = \"dental_assistant\", tenantId = defaultTenantId)"]) {
  if (!repositorySource.includes(token)) {
    failures.push(`src/lib/pms-repository.ts: missing tenant-filtered PMS mutation/read helper token ${token}.`);
  }
}
for (const token of ["No signed encounter note", "clinicalNotes", "signedEncounterNotes"]) {
  if (!repositorySource.includes(token)) {
    failures.push(`src/lib/pms-repository.ts: checkout readiness must block appointments without signed encounter documentation (${token}).`);
  }
}

const auditModel = prismaSchema.match(/model\s+PmsAuditEvent\s*{([\s\S]*?)\n}/)?.[1] ?? "";
for (const token of ["tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata", "createdAt", "@@index([tenantId, createdAt])"]) {
  if (!auditModel.includes(token)) {
    failures.push(`prisma/schema.prisma: PmsAuditEvent must include ${token} for tenant-scoped operational audit review.`);
  }
}
for (const forbidden of ["ipAddress", "userAgent", "patientName", "patientEmail", "patientPhone"]) {
  if (auditModel.includes(forbidden)) {
    failures.push(`prisma/schema.prisma: PmsAuditEvent must not store raw ${forbidden}; use hashes, IDs, artifact IDs, or operational status metadata.`);
  }
}

const authBoundary = fs.readFileSync(path.join(root, "src/lib/pms-api-auth.ts"), "utf8");
for (const token of ["currentSession", "401", "403", "pmsApiRoles", "roleKey"]) {
  if (!authBoundary.includes(token)) {
    failures.push(`src/lib/pms-api-auth.ts: missing production gate token ${token}.`);
  }
}

const phase3 = fs.readFileSync(path.join(root, "scripts/validate-phase3-pms.mjs"), "utf8");
if (!phase3.includes("validate-pms-production-gate")) {
  failures.push("scripts/validate-phase3-pms.mjs must run the production gate so token-only PMS validation cannot pass alone.");
}

if (!fs.existsSync(qaRubricPath)) {
  failures.push("docs/PMS_QA_RUBRIC_AND_BACKEND_SLICE_PLAN.md must exist for PMS QA acceptance controls.");
} else {
  const qaRubric = fs.readFileSync(qaRubricPath, "utf8");
  for (const token of ["PHI-safe audit metadata", "No raw PHI", "artifact IDs, checksums, hashes, counts, status, blockers, and route decisions", "session-derived actor", "tenant-scoped audit"]) {
    if (!qaRubric.includes(token)) {
      failures.push(`docs/PMS_QA_RUBRIC_AND_BACKEND_SLICE_PLAN.md: missing operational control acceptance token: ${token}.`);
    }
  }
}

if (failures.length) {
  console.error("PMS production gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PMS production gate passed for ${routeFiles.length} PMS API route files.`);
