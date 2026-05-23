import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "src/app/api/pms");
const repositoryPath = path.join(root, "src/lib/pms-repository.ts");

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
const patientScopedRepositoryMethods = new Map();
const allowedSessionGuards = ["requirePmsApiSession", "requireScribeSession"];

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

if (failures.length) {
  console.error("PMS production gate failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PMS production gate passed for ${routeFiles.length} PMS API route files.`);
