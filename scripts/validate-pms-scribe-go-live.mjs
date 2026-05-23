import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [
  {
    file: "src/app/app/pms/scribe/page.tsx",
    mustContain: ["PmsScribeWorkspace", "listPatients", "listProcedureCodes"],
  },
  {
    file: "src/app/api/pms/scribe/generate/route.ts",
    mustContain: ["requireScribeSession", "generateProductionScribeDraft", "consent", "useAi"],
  },
  {
    file: "src/app/api/pms/scribe/save/route.ts",
    mustContain: ["saveApprovedScribePackage", "normalizeConsent", "generation", "treatmentSuggestions"],
  },
  {
    file: "src/app/api/pms/scribe/transcribe/route.ts",
    mustContain: ["gpt-4o-transcribe", "getOpenAiWebchatConfig", "SCRIBE_AUDIO_TRANSCRIBED", "patientAcknowledged"],
  },
  {
    file: "src/lib/pms-scribe-server.ts",
    mustContain: ["withTransaction", "AI_SCRIBE_RECORDING", "SCRIBE_PACKAGE_APPROVED_AND_SAVED", "getOpenAiWebchatConfig", "json_schema", "PmsAuditEvent"],
  },
  {
    file: "src/lib/pms-scribe.ts",
    mustContain: ["normalizeGeneratedDraft", "generation", "openai_structured", "rules_fallback"],
  },
  {
    file: "src/components/pms-scribe-workspace.tsx",
    mustContain: ["MediaRecorder", "/api/pms/scribe/transcribe", "patientAcknowledged", "providerAttestation", "Save approved output"],
  },
  {
    file: "src/components/pms-ui.tsx",
    mustContain: ["/app/pms/scribe", "Scribe"],
  },
];

const failures = [];

for (const check of checks) {
  const path = join(root, check.file);
  if (!existsSync(path)) {
    failures.push(`${check.file} is missing`);
    continue;
  }
  const text = readFileSync(path, "utf8");
  for (const needle of check.mustContain) {
    if (!text.includes(needle)) failures.push(`${check.file} does not include ${needle}`);
  }
}

if (failures.length) {
  console.error("PMS scribe go-live validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PMS scribe go-live validation passed.");
