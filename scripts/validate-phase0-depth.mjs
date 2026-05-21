import fs from "node:fs";

const requiredFiles = [
  "docs/PHASE_0_REBUILD_COMPETITOR_WORKFLOW_MATRIX.md",
  "docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md",
  "src/app/app/phone/page.tsx",
  "src/app/app/rcm/page.tsx",
  "src/app/app/reputation/page.tsx",
  "src/app/app/marketing/page.tsx",
  "src/app/app/engagement/page.tsx",
  "src/app/app/connectors/page.tsx",
  "src/lib/operating-system-repository.ts",
  "src/lib/connector-control-repository.ts",
  "src/lib/webchat/repository.ts",
  "src/app/api/webchat/widget.js/route.ts",
  "src/app/api/webchat/messages/route.ts",
  "src/app/api/webchat/crawl/route.ts",
  "prisma/schema.prisma",
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
    "recall",
    "no-show",
    "forms",
  ],
  connectors: [
    "getConnectorControlCenter",
    "updateConnectorInstallation",
    "createConnectorRouteDecision",
    "ConnectorDefinition",
    "ConnectorInstallation",
    "ConnectorCapability",
    "ConnectorRouteDecision",
    "ConnectorHealthCheck",
    "ConnectorCostEvent",
    "capability map",
    "cost telemetry",
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
const schema = read("prisma/schema.prisma");
const haystack = [
  schema,
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
].join("\n");

for (const model of requiredSchemaModels) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing Prisma model: ${model}`);
}

for (const [moduleName, tokens] of Object.entries(moduleTokens)) {
  for (const token of tokens) {
    if (!haystack.includes(token)) failures.push(`Missing ${moduleName} depth token: ${token}`);
  }
}

for (const forbidden of ["Posted response</", "Sent SMS</", "Submitted claim</", "Payment completed</", "Call completed</"]) {
  if (haystack.includes(forbidden)) failures.push(`Forbidden fake success copy found: ${forbidden}`);
}

if (failures.length) {
  console.error("Phase 0 production-depth validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phase 0 production-depth validation passed.");
