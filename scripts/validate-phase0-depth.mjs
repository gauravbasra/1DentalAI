import fs from "node:fs";

const requiredFiles = [
  "docs/PHASE_0_REBUILD_COMPETITOR_WORKFLOW_MATRIX.md",
  "docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md",
  "src/app/app/phone/page.tsx",
  "src/app/app/pms/page.tsx",
  "src/app/app/pms/appointments/[appointmentId]/page.tsx",
  "src/app/app/rcm/page.tsx",
  "src/app/app/reputation/page.tsx",
  "src/app/app/marketing/page.tsx",
  "src/app/app/engagement/page.tsx",
  "src/app/app/connectors/page.tsx",
  "src/app/app/huddle/page.tsx",
  "src/app/app/patient-finder/page.tsx",
  "src/lib/operating-system-repository.ts",
  "src/lib/connector-control-repository.ts",
  "src/lib/webchat/repository.ts",
  "src/app/api/health/route.ts",
  "src/app/api/database/health/route.ts",
  "src/app/api/leads/route.ts",
  "src/app/api/pms/appointments/[appointmentId]/checkout/route.ts",
  "src/app/api/pms/appointments/[appointmentId]/status/route.ts",
  "src/app/api/pms/chart/[patientId]/route.ts",
  "src/app/api/pms/chart/[patientId]/notes/route.ts",
  "src/app/api/pms/documents/route.ts",
  "src/app/api/pms/insurance/route.ts",
  "src/app/api/pms/ledger/route.ts",
  "src/app/api/pms/patients/route.ts",
  "src/app/api/pms/patients/[patientId]/route.ts",
  "src/app/api/pms/perio/[patientId]/route.ts",
  "src/app/api/pms/perio/[patientId]/measurements/route.ts",
  "src/app/api/pms/schedule/route.ts",
  "src/app/api/pms/schedule/holds/route.ts",
  "src/app/api/pms/tasks/route.ts",
  "src/app/api/pms/treatment-plans/route.ts",
  "src/app/api/webchat/widget.js/route.ts",
  "src/app/api/webchat/sessions/route.ts",
  "src/app/api/webchat/messages/route.ts",
  "src/app/api/webchat/settings/route.ts",
  "src/app/api/webchat/transcript/route.ts",
  "src/app/api/webchat/crawl/route.ts",
  "src/app/api/workbenches/route.ts",
  "src/app/api/workbenches/[slug]/route.ts",
  "src/app/api/workbenches/[slug]/actions/route.ts",
  "prisma/schema.prisma",
];

const requiredProductRoutes = [
  ["/app/phone", "src/app/app/phone/page.tsx"],
  ["/app/engagement", "src/app/app/engagement/page.tsx"],
  ["/app/rcm", "src/app/app/rcm/page.tsx"],
  ["/app/reputation", "src/app/app/reputation/page.tsx"],
  ["/app/marketing", "src/app/app/marketing/page.tsx"],
  ["/app/connectors", "src/app/app/connectors/page.tsx"],
  ["/app/pms", "src/app/app/pms/page.tsx"],
  ["/app/pms/appointments/[appointmentId]", "src/app/app/pms/appointments/[appointmentId]/page.tsx"],
  ["/app/pms/schedule", "src/app/app/pms/schedule/page.tsx"],
  ["/app/pms/online-scheduling", "src/app/app/pms/online-scheduling/page.tsx"],
  ["/app/pms/patients", "src/app/app/pms/patients/page.tsx"],
  ["/app/pms/forms", "src/app/app/pms/forms/page.tsx"],
  ["/app/pms/chart/[patientId]", "src/app/app/pms/chart/[patientId]/page.tsx"],
  ["/app/pms/perio/[patientId]", "src/app/app/pms/perio/[patientId]/page.tsx"],
  ["/app/huddle", "src/app/app/huddle/page.tsx"],
  ["/app/patient-finder", "src/app/app/patient-finder/page.tsx"],
];

const requiredApiEndpoints = [
  ["GET /api/health", "src/app/api/health/route.ts"],
  ["GET /api/database/health", "src/app/api/database/health/route.ts"],
  ["POST /api/leads", "src/app/api/leads/route.ts"],
  ["POST /api/pms/appointments/[appointmentId]/checkout", "src/app/api/pms/appointments/[appointmentId]/checkout/route.ts"],
  ["PATCH /api/pms/appointments/[appointmentId]/status", "src/app/api/pms/appointments/[appointmentId]/status/route.ts"],
  ["GET/PATCH /api/pms/chart/[patientId]", "src/app/api/pms/chart/[patientId]/route.ts"],
  ["POST /api/pms/chart/[patientId]/notes", "src/app/api/pms/chart/[patientId]/notes/route.ts"],
  ["GET/POST /api/pms/documents", "src/app/api/pms/documents/route.ts"],
  ["GET/POST /api/pms/insurance", "src/app/api/pms/insurance/route.ts"],
  ["GET/POST /api/pms/ledger", "src/app/api/pms/ledger/route.ts"],
  ["GET/POST /api/pms/patients", "src/app/api/pms/patients/route.ts"],
  ["GET/PATCH /api/pms/patients/[patientId]", "src/app/api/pms/patients/[patientId]/route.ts"],
  ["GET /api/pms/perio/[patientId]", "src/app/api/pms/perio/[patientId]/route.ts"],
  ["POST /api/pms/perio/[patientId]/measurements", "src/app/api/pms/perio/[patientId]/measurements/route.ts"],
  ["GET/POST /api/pms/schedule", "src/app/api/pms/schedule/route.ts"],
  ["POST /api/pms/schedule/holds", "src/app/api/pms/schedule/holds/route.ts"],
  ["GET/POST /api/pms/tasks", "src/app/api/pms/tasks/route.ts"],
  ["GET/POST /api/pms/treatment-plans", "src/app/api/pms/treatment-plans/route.ts"],
  ["GET /api/webchat/widget.js", "src/app/api/webchat/widget.js/route.ts"],
  ["POST /api/webchat/sessions", "src/app/api/webchat/sessions/route.ts"],
  ["POST /api/webchat/messages", "src/app/api/webchat/messages/route.ts"],
  ["GET/PATCH /api/webchat/settings", "src/app/api/webchat/settings/route.ts"],
  ["GET /api/webchat/transcript", "src/app/api/webchat/transcript/route.ts"],
  ["POST /api/webchat/crawl", "src/app/api/webchat/crawl/route.ts"],
  ["GET /api/workbenches", "src/app/api/workbenches/route.ts"],
  ["GET /api/workbenches/[slug]", "src/app/api/workbenches/[slug]/route.ts"],
  ["POST /api/workbenches/[slug]/actions", "src/app/api/workbenches/[slug]/actions/route.ts"],
];

const requiredSchemaModels = [
  "PmsPatient",
  "PmsAppointment",
  "PmsProvider",
  "PmsOperatory",
  "PmsClaim",
  "PmsLedgerEntry",
  "PmsTask",
  "PatientEngagementEvent",
  "PhoneProviderConnection",
  "PhoneNumber",
  "PhoneExtension",
  "PhoneDevice",
  "PhoneActiveCall",
  "PhoneCallControlAction",
  "PhoneVoicemail",
  "PatientEngagementChannelSetting",
  "PatientEngagementKnowledgeSource",
  "PatientWebChatConversation",
  "PatientWebChatMessage",
  "PatientWebChatEvent",
  "PatientEngagementKnowledgePage",
  "PatientEngagementKnowledgeChunk",
  "PatientEngagementLeadForm",
  "PatientEngagementFormPacket",
  "PatientEngagementSchedulingRule",
  "ReputationReviewWorkflow",
  "ReputationReviewResponse",
  "ReputationListingProfile",
  "ReputationReferralRequest",
  "RcmWorkItem",
  "RcmPriorAuthorization",
  "RcmDenialCase",
  "RcmEraPosting",
  "RcmRevenueIntegrityFinding",
  "MarketingCampaign",
  "MarketingLandingPage",
  "AiStudioAsset",
  "PmsAuditEvent",
  "ConnectorDefinition",
  "ConnectorInstallation",
  "ConnectorCredentialVault",
  "ConnectorCapability",
  "ConnectorRouteDecision",
  "ConnectorHealthCheck",
  "ConnectorCostEvent",
];

const requiredMigrationBackedTables = [
  ...requiredSchemaModels,
  "PmsCheckoutSession",
  "MarketingLocalSeoTask",
  "PatientEngagementChannelSetting",
  "PatientEngagementKnowledgeSource",
  "PatientWebChatConversation",
  "PatientWebChatMessage",
  "PatientWebChatEvent",
  "PatientEngagementKnowledgePage",
  "PatientEngagementKnowledgeChunk",
  "PatientEngagementLeadForm",
  "PatientEngagementFormPacket",
  "PatientEngagementSchedulingRule",
  "ConnectorDefinition",
  "ConnectorInstallation",
  "ConnectorCapability",
  "ConnectorRouteDecision",
  "ConnectorHealthCheck",
  "ConnectorCostEvent",
];

const moduleTokens = {
  phone: [
    "getPhoneOperatingCenter",
    "createPhoneCallControlAction",
    "updatePhoneProviderStatus",
    "PhoneProviderConnection",
    "PhoneActiveCall",
    "PhoneCallControlAction",
    "PhoneVoicemail",
    "PatientWebChatConversation",
    "PatientWebChatMessage",
    "PatientWebChatEvent",
    "PatientEngagementKnowledgePage",
    "PatientEngagementKnowledgeChunk",
    "createWebchatSession",
    "postWebchatMessage",
    "crawlKnowledgePage",
    "Transcript and action stream",
    "widget.js",
    "SCHEDULING_HANDOFF",
    "EMERGENCY_TRIAGE",
    "PatientEngagementChannelSetting",
    "PatientEngagementKnowledgeSource",
    "PatientEngagementSchedulingRule",
    "WEB_CHAT",
    "AI_VOICE",
    "PMS_CONNECTOR_REQUIRED",
    "blockedReason",
    "connectorStatus",
    "readiness",
    "linkType",
    "READY_FOR_CONNECTOR",
    "BLOCKED_CONNECTOR_REQUIRED",
    "PMS screen pop",
    "Phone setup readiness",
    "updatePhoneNumberStatus",
    "updatePhoneExtensionStatus",
    "PHONE_HANDOFF_TASK_STAGED",
    "PAYMENT_LINK",
    "FORM_PACKET_LINK",
    "CHART_NOTE_REVIEW",
    "openTreatmentPlans",
    "communicationPreferences",
  ],
  rcm: [
    "getRcmOperatingCenter",
    "createPriorAuthorization",
    "createDenialCase",
    "postEraToLedger",
    "RcmRevenueIntegrityFinding",
    "connectorStatus",
    "submissionReadiness",
    "appealPacketStatus",
    "postingReadiness",
    "proofRequired",
    "Eligibility",
    "Prior authorization",
    "ERA",
    "Denial",
    "Revenue integrity",
    "coverageSnapshot",
    "claimLifecycle",
    "claimLineDetails",
    "Prior auth evidence checklist",
    "appealPackageChecklist",
    "Denial appeal package",
    "postingChecklist",
    "ERA/EOB posting checklist",
    "leakageWorkflow",
    "Revenue integrity leakage workflow",
    "MANUAL_PROOF_REQUIRED",
  ],
  reputation: [
    "getReputationOperatingCenter",
    "createReviewWorkflow",
    "updateReviewResponseApproval",
    "ReputationListingProfile",
    "ReputationReferralRequest",
    "BLOCKED_SERVICE_RECOVERY",
    "HIPAA",
    "service recovery",
  ],
  marketing: [
    "MarketingCampaign",
    "MarketingLandingPage",
    "AiStudioAsset",
    "sourceAudience",
    "connectorReadiness",
    "MarketingLocalSeoTask",
    "landing page",
    "Local SEO",
    "approval",
    "attribution",
  ],
  engagement: [
    "PatientEngagementEvent",
    "stageEngagementEvent",
    "updateEngagementEventStatus",
    "consent",
    "quiet",
    "BOOKING_REQUEST_RESPONSE",
    "INTAKE_PACKET_REMINDER",
    "MEDICAL_ALERT_REVIEW",
    "PRE_MED_ALERT_REVIEW",
    "BLOCKED_CONSENT",
    "BLOCKED_QUIET_HOURS",
    "BLOCKED_PRE_MED_REVIEW",
    "recall",
    "no-show",
    "forms",
    "waitlist",
    "post-op",
  ],
  connectors: [
    "getConnectorControlCenter",
    "updateConnectorInstallation",
    "recordConnectorHealthCheck",
    "createConnectorRouteDecision",
    "ConnectorDefinition",
    "ConnectorInstallation",
    "ConnectorCredentialVault",
    "ConnectorCapability",
    "ConnectorRouteDecision",
    "ConnectorHealthCheck",
    "ConnectorCostEvent",
    "Credential vault intake",
    "storeConnectorCredential",
    "TWILIO",
    "NEXHEALTH",
    "STEDI",
    "encrypted at rest",
    "capability map",
    "cost telemetry",
    "manual fallback",
    "PAYMENTS",
    "EMAIL",
    "AI_LLM",
    "payments.link.create",
    "email.transactional.send",
    "ai.llm.chat_completion",
    "BLOCKED_CONNECTOR_REQUIRED",
    "READY_FOR_CONNECTOR",
    "MANUAL_QUEUE",
  ],
};

const failures = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`Missing required file: ${file}`);
}

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
function listFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      listFiles(file, predicate, out);
    } else if (predicate(file)) {
      out.push(file);
    }
  }
  return out;
}

const schema = read("prisma/schema.prisma");
const migrations = listFiles("prisma/migrations", (file) => file.endsWith("migration.sql")).map((file) => read(file)).join("\n");
const sourceHaystack = listFiles("src", (file) => /\.(ts|tsx|js)$/.test(file)).map((file) => read(file)).join("\n");
const haystack = [
  schema,
  migrations,
  read("src/lib/operating-system-repository.ts"),
  read("src/app/app/phone/page.tsx"),
  read("src/app/app/rcm/page.tsx"),
  read("src/app/app/reputation/page.tsx"),
  read("src/app/app/marketing/page.tsx"),
  read("src/app/app/engagement/page.tsx"),
  read("src/app/app/connectors/page.tsx"),
  read("src/lib/connector-control-repository.ts"),
  read("src/lib/webchat/repository.ts"),
  read("src/app/api/webchat/widget.js/route.ts"),
  read("src/app/api/webchat/messages/route.ts"),
  read("src/app/api/webchat/crawl/route.ts"),
  read("docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md"),
  read("docs/PHASE_0_REBUILD_COMPETITOR_WORKFLOW_MATRIX.md"),
].join("\n");
const featureMatrix = read("docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md");
const competitorMatrix = read("docs/PHASE_0_REBUILD_COMPETITOR_WORKFLOW_MATRIX.md");

for (const model of requiredSchemaModels) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing Prisma model: ${model}`);
}

for (const [route, file] of requiredProductRoutes) {
  if (!fs.existsSync(file)) failures.push(`Missing product route ${route}: ${file}`);
}

for (const [endpoint, file] of requiredApiEndpoints) {
  if (!fs.existsSync(file)) failures.push(`Missing API endpoint ${endpoint}: ${file}`);
}

for (const table of requiredMigrationBackedTables) {
  if (!schema.includes(`model ${table}`)) failures.push(`Missing required DB model: ${table}`);
  if (!migrations.includes(`"${table}"`)) failures.push(`Missing migration-backed table reference: ${table}`);
}

for (const [moduleName, tokens] of Object.entries(moduleTokens)) {
  for (const token of tokens) {
    if (!haystack.includes(token)) failures.push(`Missing ${moduleName} depth token: ${token}`);
  }
}

const matrixHeader = "| Module | UI depth | Backend | Integrations/connectors | Process logic | Database migrations | Audit | Tests | Live status |";
if (!featureMatrix.includes(matrixHeader)) {
  failures.push("Feature completeness matrix must include the launch-readiness Live status column.");
}
for (const moduleName of ["Patient Engagement", "RCM", "Reputation", "Marketing", "Engagement", "PMS", "Connector control plane"]) {
  const row = featureMatrix.split("\n").find((line) => line.startsWith(`| ${moduleName} |`));
  if (!row) {
    failures.push(`Feature completeness matrix missing module row: ${moduleName}`);
    continue;
  }
  const cells = row.split("|").map((cell) => cell.trim()).filter(Boolean);
  if (cells.length !== 9) failures.push(`Feature completeness matrix row must have 9 cells including Live status: ${moduleName}`);
  if (!/(live|blocked|staged|connector|manual-proof|approval)/i.test(cells.at(-1) ?? "")) failures.push(`Feature completeness matrix Live status is not explicit for: ${moduleName}`);
}

for (const token of ["Launch-Readiness QA Harness", "route/API/table validation", "no-fake-success rule", "live-status", "Passing validation does not mean external vendors are live"]) {
  if (!`${featureMatrix}\n${competitorMatrix}`.includes(token)) failures.push(`Launch-readiness QA harness token missing: ${token}`);
}

for (const forbidden of [
  "Posted response</",
  "Sent SMS",
  "SMS sent",
  "Email sent",
  "Submitted claim",
  "Claim submitted",
  "Payment completed",
  "Call completed",
  "Eligibility verified",
  "ERA posted",
  "Review posted",
  "Listing synced",
  "Campaign sent",
  "AI voice completed",
  "PMS writeback complete",
  "Successfully sent",
  "Successfully submitted",
  "Successfully posted",
]) {
  if (sourceHaystack.includes(forbidden)) failures.push(`Forbidden fake success copy found in src: ${forbidden}`);
}

if (failures.length) {
  console.error("Phase 0 production-depth validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phase 0 production-depth validation passed.");
