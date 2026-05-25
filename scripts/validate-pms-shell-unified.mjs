import { readFileSync } from "node:fs";

const pmsPage = readFileSync("src/app/app/pms/page.tsx", "utf8");
const shell = readFileSync("src/components/foundation-shell.tsx", "utf8");

const failures = [];
for (const token of ["FoundationShell active=\"/app/pms\"", "PageHeader", "RoleSwitcher", "Practice command center"]) {
  if (!pmsPage.includes(token)) failures.push(`PMS command page missing ${token}`);
}
for (const token of ["function PmsGlobalRail", "function MobilePmsDock", "MiniRailMetric"]) {
  if (pmsPage.includes(token)) failures.push(`PMS command page still contains redundant ${token}`);
}
for (const token of ["group/rail", "hover:w-[280px]", "pmsSubNav"]) {
  if (!shell.includes(token)) failures.push(`Foundation shell missing fixed hover rail token ${token}`);
}

if (failures.length) {
  console.error("PMS shell validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PMS shell validation passed.");
