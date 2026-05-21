import fs from "node:fs";

const requiredFiles = [
  "docs/PHASE_0_REBUILD_COMPETITOR_WORKFLOW_MATRIX.md",
  "docs/PHASE_0_FEATURE_COMPLETENESS_MATRIX.md",
  "src/app/app/phone/page.tsx",
  "src/app/app/rcm/page.tsx",
  "src/app/app/reputation/page.tsx",
  "src/app/app/marketing/page.tsx",
  "src/app/app/engagement/page.tsx",
  "src/lib/operating-system-repository.ts",
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
    "blockedReason",
    "READY_FOR_CONNECTOR",
    "BLOCKED_CONNECTOR_REQUIRED",
    "PMS screen pop",
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
