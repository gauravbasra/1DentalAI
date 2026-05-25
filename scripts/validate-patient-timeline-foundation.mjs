import { readFileSync } from "node:fs";

const checks = [
  {
    file: "src/lib/patient-timeline-repository.ts",
    tokens: [
      "export async function getPatientTimeline",
      '"PmsAppointment"',
      '"PhoneConversation"',
      '"PmsClinicalNote"',
      '"PmsPerioExam"',
      '"PmsTreatmentPlan"',
      '"PmsClaim"',
      '"PmsLedgerEntry"',
      '"PmsDocument"',
      '"PmsTask"',
      '"PmsWritebackJob"',
      "evidenceCount",
      "normalizeTimelineFilters",
    ],
  },
  {
    file: "src/app/api/pms/patients/[patientId]/timeline/route.ts",
    tokens: ["requirePmsApiSession", "getPatientTimeline", "source", "status", "from", "to"],
  },
  {
    file: "src/app/app/pms/patients/[patientId]/timeline/page.tsx",
    tokens: ["Patient activity", "Timeline filters", "writebackRisks", "patientTimelineSources", "Open"],
  },
  {
    file: "src/app/app/pms/patients/[patientId]/page.tsx",
    tokens: ["Open timeline", "/timeline?role="],
  },
];

const failures = [];
for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const token of check.tokens) {
    if (!text.includes(token)) {
      failures.push(`${check.file} is missing ${token}`);
    }
  }
}

if (failures.length) {
  console.error("Patient timeline validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Patient timeline validation passed.");
