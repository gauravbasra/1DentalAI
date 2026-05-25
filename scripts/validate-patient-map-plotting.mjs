import { readFileSync } from "node:fs";

const client = readFileSync("src/app/app/pms/patient-map/patient-map-client.tsx", "utf8");
const repository = readFileSync("src/lib/pms-patient-map-repository.ts", "utf8");

const requiredClientTokens = [
  "Circle: new",
  "circlesRef",
  "circleRadius",
  "fillOpacity: 0.28",
  "strokeWeight: 3",
  "mapped household clusters",
  "No patient households match the current filters",
];

const requiredRepositoryTokens = [
  "fallbackGeocodeAddress",
  "ZIP_CENTROID_FALLBACK",
  "CITY_CENTROID_FALLBACK",
  "queryPatientMapPoints",
  "queryPatientMapBreakdown",
  "highValueOnly",
  "membershipOnly",
];

const missing = [];
for (const token of requiredClientTokens) {
  if (!client.includes(token)) missing.push(`patient-map-client missing ${token}`);
}
for (const token of requiredRepositoryTokens) {
  if (!repository.includes(token)) missing.push(`patient-map repository missing ${token}`);
}

if (missing.length) {
  console.error("Patient map plotting validation failed:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Patient map plotting validation passed.");
