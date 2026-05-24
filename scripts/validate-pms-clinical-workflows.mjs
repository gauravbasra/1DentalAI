import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

const schema = read("prisma/schema.prisma");
const service = read("src/lib/pms-clinical-workflows.ts");
const route = read("src/app/api/pms/clinical-workflows/route.ts");
const migration = read("prisma/migrations/202605232130_pms_clinical_process_workflows/migration.sql");

for (const model of ["PmsClinicalProcessTemplate", "PmsClinicalProcessStep", "PmsClinicalRecommendation"]) {
  if (!schema.includes(`model ${model}`)) failures.push(`prisma/schema.prisma: missing ${model} model.`);
  if (!migration.includes(`"${model}"`)) failures.push(`clinical workflow migration: missing ${model} table.`);
}

const schemaTokens = [
  "triggerCodes    String[]",
  "procedureCodeIds String[]",
  "noteRequirements Json",
  "artifactRequirements Json",
  "treatmentPlanRequired Boolean",
  "mappedProcedureCodes String[]",
  "assignmentPlan  Json",
  "requiredNotes   Json",
  "@@unique([tenantId, templateKey])",
  "@@index([treatmentPlanId])",
];
for (const token of schemaTokens) {
  if (!schema.includes(token)) failures.push(`prisma/schema.prisma: missing clinical workflow schema token ${token}.`);
}

const requiredServiceTokens = [
  "ClinicalNoteRequirement",
  "ClinicalWorkflowAssignmentPlanItem",
  "DOCTOR_NOTE",
  "RDH_NOTE",
  "STAFF_NOTE",
  "templateKey",
  "minimumSectionCount",
  "blocksCheckoutUntilComplete",
  "requiresSignerAttestation",
  "completionGate",
  "requiredNoteTemplateKeys",
  "coreClinicalProcessTemplates",
  "D0150",
  "D4341",
  "D4910",
  "orthodontic_records_and_case_start",
  "pediatric_preventive_and_restorative",
  "oral_surgery_extraction_referral",
  "emergency_limited_exam_stabilization",
  "diagnostic_imaging_review_handoff",
  "specialty_referral_coordination",
  "treatment_plan_handoff_completion",
  "D8080",
  "D1351",
  "D7240",
  "D0140",
  "D9110",
  "D0367",
  "D9310",
  "D6010",
  "validateClinicalProcessTemplate",
  "mappedProcedureCodes",
  "treatmentPlanId",
  "PmsAuditEvent",
  "CLINICAL_RECOMMENDATION_CREATED",
  "CLINICAL_WORKFLOW_TASK_CREATED",
  "PROVIDER_REVIEW_REQUIRED",
  "neverAutoDiagnose",
  "withTransaction",
];
for (const token of requiredServiceTokens) {
  if (!service.includes(token)) failures.push(`src/lib/pms-clinical-workflows.ts: missing required clinical workflow token ${token}.`);
}

const roleTokens = ["ownerRoleKey: \"doctor\"", "ownerRoleKey: \"rdh\"", "ownerRoleKey: \"clinical_assistant\"", "ownerRoleKey: \"front_desk\"", "ownerRoleKey: \"treatment_coordinator\"", "ownerRoleKey: \"billing_rcm\""];
for (const token of roleTokens) {
  if (!service.includes(token)) failures.push(`src/lib/pms-clinical-workflows.ts: missing assignment role coverage ${token}.`);
}

if (!/triggerCodes:\s*\[[^\]]*"D\d{4}"/s.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: process templates must include CDT trigger code mapping.");
if (!/cdtCodes:\s*\[[^\]]*"D\d{4}"/s.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: workflow steps must include CDT code mapping.");
if (!/noteRequirements:\s*\[[\s\S]*DOCTOR_NOTE[\s\S]*\]/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: doctor note requirement is missing.");
if (!/noteRequirements:\s*\[[\s\S]*(RDH_NOTE|STAFF_NOTE)[\s\S]*\]/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: RDH/staff note requirement is missing.");
if (!/noteRequirements:\s*\[[\s\S]*templateKey:[\s\S]*enforcement:[\s\S]*minimumSectionCount[\s\S]*\]/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: note template enforcement metadata is missing.");
if (!/completionPolicy:\s*\{[^}]*requiresProviderSignature:\s*true[\s\S]*requiresSignerAttestation:\s*true/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: doctor signature gates must enforce signer attestation.");
if (!/buildAssignmentPlanItem[\s\S]*completionGate[\s\S]*requiredNoteTemplateKeys/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: assignment plan must expose completion gates and required note templates.");
if (!/artifactRequirements:\s*\[[\s\S]*(FORM|IMAGING|LAB|DOCUMENT|REFERRAL|INSURANCE_REVIEW)[\s\S]*\]/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: required artifacts/forms/imaging/labs model is missing.");
if (!/allowedSources:\s*\[[\s\S]*"referral"[\s\S]*\]/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: AI recommendation handoff must include referral source coverage.");
if (!/allowedSources:\s*\[[\s\S]*"treatment_plan"[\s\S]*\]/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: AI recommendation handoff must include treatment_plan source coverage.");
if (!/ownerRoleKey:\s*"billing_rcm"[\s\S]*assignmentType:\s*"RCM_REVIEW"/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: treatment plan handoff must include billing RCM review assignment.");
if (!/ownerRoleKey:\s*"front_desk"[\s\S]*staff_referral_coordination/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: referral workflow must include front desk referral coordination note coverage.");
if (!/insert into "PmsTask"[\s\S]*CLINICAL_WORKFLOW_REVIEW/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: recommendations must create clinical workflow assignments/tasks.");
if (!/insert into "PmsAuditEvent"[\s\S]*CLINICAL_RECOMMENDATION_CREATED/.test(service)) failures.push("src/lib/pms-clinical-workflows.ts: recommendations must be audited.");

if (!route.includes("requirePmsApiSession")) failures.push("src/app/api/pms/clinical-workflows/route.ts: route must be authenticated.");
if (!route.includes("auth.session.tenantId")) failures.push("src/app/api/pms/clinical-workflows/route.ts: route must use authenticated tenant scope.");
if (/body\??\.tenantId/.test(route)) failures.push("src/app/api/pms/clinical-workflows/route.ts: tenantId must not come from request body.");
if (/actorRole:\s*body/.test(route)) failures.push("src/app/api/pms/clinical-workflows/route.ts: actorRole must not come from request body.");
if (!route.includes("treatment_plan") || !route.includes("referral")) failures.push("src/app/api/pms/clinical-workflows/route.ts: route must normalize expanded clinical source modules.");

const templateKeys = [
  "comprehensive_exam_treatment_plan",
  "perio_srp_maintenance",
  "orthodontic_records_and_case_start",
  "pediatric_preventive_and_restorative",
  "oral_surgery_extraction_referral",
  "emergency_limited_exam_stabilization",
  "diagnostic_imaging_review_handoff",
  "specialty_referral_coordination",
  "treatment_plan_handoff_completion",
];
for (const templateKey of templateKeys) {
  if (!service.includes(`templateKey: "${templateKey}"`)) failures.push(`src/lib/pms-clinical-workflows.ts: missing operational template ${templateKey}.`);
}

if (failures.length) {
  console.error("PMS clinical workflow validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PMS clinical workflow validation passed.");
