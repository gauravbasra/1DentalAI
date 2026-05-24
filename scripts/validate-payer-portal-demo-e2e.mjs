import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Client } from "pg";
import ts from "typescript";

const tenantId = process.env.PMS_E2E_TENANT_ID || "tenant_1dentalai_production";
const databaseUrl = process.env.DATABASE_URL;
const failures = [];

if (!databaseUrl) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: "DATABASE_URL is not configured." }, null, 2));
  process.exit(0);
}

const dbName = new URL(databaseUrl).pathname.replace(/^\//, "");
const fixtureDbAllowed = process.env.PAYER_PORTAL_DEMO_DB_TEST === "1" || /(^|_)(qa|test)(_|$)/i.test(dbName);
if (!fixtureDbAllowed) {
  console.log(JSON.stringify({
    ok: true,
    skipped: true,
    reason: "Payer portal demo writes non-PHI rows and only runs on QA/test databases or when PAYER_PORTAL_DEMO_DB_TEST=1.",
    databaseName: dbName,
  }, null, 2));
  process.exit(0);
}

const root = process.cwd();
const client = new Client({ connectionString: databaseUrl });
await client.connect();

function id(prefix, value) {
  return `${prefix}_${createHash("sha1").update(`${tenantId}:${value}`).digest("hex").slice(0, 18)}`;
}

function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}

function moneyValue(fields, key) {
  return Number(fields.find((field) => field.fieldKey === key)?.value ?? 0);
}

function textValue(fields, key) {
  return String(fields.find((field) => field.fieldKey === key)?.value ?? "");
}

async function loadRunner() {
  const sourcePath = path.join(root, "src/lib/payer-portal-browser-runner.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const require = createRequire(import.meta.url);
  const sandbox = {
    exports: {},
    require(specifier) {
      if (specifier === "@/lib/connector-control-repository") {
        return {
          getConnectorSecret: async ({ credentialLabel }) => ({ value: credentialLabel.endsWith(":username") ? "demo-user" : "demo-pass", validated: true }),
        };
      }
      if (specifier === "@/lib/payer-network-repository") {
        return {
          updatePayerRpaRunLogStatus: async (input) => {
            await client.query(
              `update "PayerRpaRunLog"
               set "runStatus" = $3,
                 "completedAt" = case when $3 in ('COMPLETED','FAILED','BLOCKED','NEEDS_MANUAL_REVIEW') then current_timestamp else "completedAt" end,
                 "resultSummary" = $4,
                 "evidenceUri" = $5,
                 "errorCode" = $6,
                 "errorMessageRedacted" = $7,
                 "noPhiInLogs" = true
               where "tenantId" = $1 and "id" = $2`,
              [input.tenantId ?? tenantId, input.id, input.runStatus, input.resultSummary ?? null, input.evidenceUri ?? null, input.errorCode ?? null, input.errorMessageRedacted ?? null],
            );
            return input;
          },
        };
      }
      return require(specifier);
    },
    console,
    Buffer,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(compiled, sandbox, { filename: sourcePath });
  return sandbox.exports;
}

async function seedDemoRecords() {
  const payerId = id("payer", "phase2-demo");
  const planId = id("plan", "phase2-demo");
  const patientId = id("pat", "phase2-demo");
  const patientInsuranceId = id("pins", "phase2-demo");
  const layoutId = id("layout", "phase2-demo");
  const credentialReferenceId = id("payer_cred_ref", "phase2-demo");
  const runId = id("payer_rpa", `phase2-demo-${Date.now()}`);

  await client.query("begin");
  try {
    await client.query(
      `insert into "PayerRegistryEntry"
         ("id", "tenantId", "payerName", "normalizedName", "primaryPayerId", "payerType", "coverageType", "source", "lastVerifiedAt", "metadata")
       values ($1, $2, 'Phase 2 Demo Dental Payer', 'phase 2 demo dental payer', 'P2DEMO', 'COMMERCIAL', 'DENTAL', 'QA_PORTAL_DEMO', current_timestamp, $3::jsonb)
       on conflict ("tenantId", "primaryPayerId") do update set
         "payerName" = excluded."payerName",
         "normalizedName" = excluded."normalizedName",
         "source" = excluded."source",
         "lastVerifiedAt" = current_timestamp,
         "metadata" = excluded."metadata",
         "active" = true,
         "updatedAt" = current_timestamp`,
      [payerId, tenantId, JSON.stringify({ noPhi: true, phase: "phase2-demo" })],
    );
    await client.query(
      `insert into "PayerNetworkModel"
         ("id", "tenantId", "payerRegistryEntryId", "networkType", "routeType", "portalUrl", "portalRpaProfile", "manualFallbackAllowed", "enrollmentStatus", "credentialingStatus", "lastVerifiedAt")
       values ($1, $2, $3, 'PAYER_PORTAL', 'PAYER_PORTAL', 'https://payer-demo.1dentalai.test/eligibility', $4::jsonb, false, 'ENROLLED', 'ACTIVE', current_timestamp)
       on conflict ("id") do update set
         "networkType" = excluded."networkType",
         "routeType" = excluded."routeType",
         "portalUrl" = excluded."portalUrl",
         "portalRpaProfile" = excluded."portalRpaProfile",
         "enrollmentStatus" = excluded."enrollmentStatus",
         "credentialingStatus" = excluded."credentialingStatus",
         "lastVerifiedAt" = current_timestamp,
         "updatedAt" = current_timestamp`,
      [id("payer_net", "phase2-demo"), tenantId, payerId, JSON.stringify({ layoutKey: "phase2_demo_v1", demoOnly: true })],
    );
    await client.query(
      `insert into "PayerPortalCredentialReference"
         ("id", "tenantId", "payerRegistryEntryId", "portalHost", "credentialVaultId", "credentialStatus", "ownerRoleKey", "lastValidatedAt", "notes")
       values ($1, $2, $3, 'payer-demo.1dentalai.test', 'vault_phase2_demo', 'VALIDATED', 'billing_rcm', current_timestamp, 'Non-PHI Phase 2 demo credential reference.')
       on conflict do nothing`,
      [credentialReferenceId, tenantId, payerId],
    );
    await client.query(
      `insert into "PmsInsurancePlan" ("id", "tenantId", "payerName", "payerId", "planName", "planType", "networkStatus")
       values ($1, $2, 'Phase 2 Demo Dental Payer', 'P2DEMO', 'Demo PPO', 'PPO', 'IN_NETWORK')
       on conflict do nothing`,
      [planId, tenantId],
    );
    await client.query(
      `insert into "PmsPatient" ("id", "tenantId", "chartNumber", "firstName", "lastName", "dateOfBirth", "status")
       values ($1, $2, 'QA-P2-DEMO', 'QA', 'PortalDemo', '1980-01-01', 'ACTIVE')
       on conflict ("tenantId", "chartNumber") do update set "status" = 'ACTIVE', "updatedAt" = current_timestamp`,
      [patientId, tenantId],
    );
    await client.query(
      `insert into "PmsPatientInsurance"
         ("id", "tenantId", "patientId", "planId", "subscriberId", "relationship", "priority", "eligibilityStatus", "verificationNote")
       values ($1, $2, $3, $4, 'DEMO-SUB-0001', 'SELF', 1, 'NOT_CHECKED', 'Phase 2 demo before RPA.')
       on conflict do nothing`,
      [patientInsuranceId, tenantId, patientId, planId],
    );
    await client.query(
      `insert into "PayerPortalLayout"
         ("id", "tenantId", "payerRegistryEntryId", "portalHost", "layoutKey", "layoutVersion", "loginPath", "eligibilityPath", "screenshotPolicy", "navigationSteps", "lastVerifiedAt", "createdByRole")
       values ($1, $2, $3, 'payer-demo.1dentalai.test', 'phase2_demo_v1', '2026-05-24', '/login', '/eligibility', $4::jsonb, $5::jsonb, current_timestamp, 'qa_demo')
       on conflict ("tenantId", "payerRegistryEntryId", "layoutKey", "layoutVersion") do update set
         "portalHost" = excluded."portalHost",
         "loginPath" = excluded."loginPath",
         "eligibilityPath" = excluded."eligibilityPath",
         "screenshotPolicy" = excluded."screenshotPolicy",
         "navigationSteps" = excluded."navigationSteps",
         "status" = 'ACTIVE',
         "lastVerifiedAt" = current_timestamp,
         "updatedAt" = current_timestamp`,
      [layoutId, tenantId, payerId, JSON.stringify({ required: true, redactPhi: true, driftDetection: "REJECT_ON_MISSING_SELECTOR" }), JSON.stringify([{ action: "login" }, { action: "lookupEligibility" }])],
    );
    await client.query(`delete from "PayerPortalLayoutField" where "tenantId" = $1 and "layoutId" = $2`, [tenantId, layoutId]);
    for (const field of [
      ["eligibility_status", "Eligibility status", "[data-field='status']", "TEXT", "PmsPatientInsurance.eligibilityStatus"],
      ["deductible", "Deductible", "[data-field='deductible']", "MONEY", "PmsBenefitSummary.deductibleCents"],
      ["deductible_met", "Deductible met", "[data-field='deductible-met']", "MONEY", "PmsBenefitSummary.deductibleMetCents"],
      ["annual_max", "Annual maximum", "[data-field='annual-max']", "MONEY", "PmsBenefitSummary.annualMaxCents"],
      ["annual_used", "Annual used", "[data-field='annual-used']", "MONEY", "PmsBenefitSummary.annualUsedCents"],
      ["frequency", "Frequency", "[data-field='frequency']", "TEXT", "PmsBenefitSummary.frequencies"],
    ]) {
      await client.query(
        `insert into "PayerPortalLayoutField"
           ("id", "tenantId", "layoutId", "fieldKey", "label", "selector", "valueType", "pmsTarget", "requiredForWriteback", "redactionPolicy", "confidenceThreshold")
         values ($1, $2, $3, $4, $5, $6, $7, $8, true, 'MASK_IN_SCREENSHOT', 85)`,
        [id("layout_field", field[0]), tenantId, layoutId, ...field],
      );
    }
    await client.query(
      `insert into "PayerRpaRunLog"
         ("id", "tenantId", "payerRegistryEntryId", "credentialReferenceId", "transactionFamily", "sourceObjectType", "sourceObjectId", "runStatus", "botName", "portalHost", "startedAt", "noPhiInLogs")
       values ($1, $2, $3, $4, 'ELIGIBILITY_270_271', 'PmsPatientInsurance', $5, 'STARTED', 'phase2-demo-payer-portal-bot', 'payer-demo.1dentalai.test', current_timestamp, true)`,
      [runId, tenantId, payerId, credentialReferenceId, patientInsuranceId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  return { payerId, patientInsuranceId, layoutId, runId };
}

try {
  const { executeEligibilityPortalBrowserRunWithCredentials } = await loadRunner();
  const ids = await seedDemoRecords();
  const screenshotPath = path.join(os.tmpdir(), `phase2-payer-demo-${Date.now()}.png`);
  const storageStatePath = path.join(os.tmpdir(), `phase2-payer-demo-state-${Date.now()}.json`);
  const html = `
    <html><body>
      <section id="login">
        <input id="username" autocomplete="username" />
        <input id="password" type="password" autocomplete="current-password" />
        <button id="loginButton" onclick="document.querySelector('#login').hidden=true;document.querySelector('#eligibility').hidden=false;">Sign in</button>
      </section>
      <section id="eligibility" hidden>
        <input id="subscriber" />
        <button id="lookup" onclick="document.querySelector('#result').hidden=false;">Lookup</button>
        <section id="result" hidden>
          <div data-field="status">Active</div>
          <div data-field="deductible">$50.00</div>
          <div data-field="deductible-met">$25.00</div>
          <div data-field="annual-max">$1,500.00</div>
          <div data-field="annual-used">$300.00</div>
          <div data-field="frequency">2 cleanings per benefit year</div>
        </section>
      </section>
    </body></html>
  `;
  const browserResult = await executeEligibilityPortalBrowserRunWithCredentials(
    {
      runId: ids.runId,
      tenantId,
      portalHost: "payer-demo.1dentalai.test",
      values: { subscriberId: "DEMO-SUB-0001" },
      screenshotPath,
      storageStatePath,
      routeFixtures: [{ urlPattern: "https://payer-demo.1dentalai.test/eligibility", html }],
      steps: [
        { action: "goto", url: "https://payer-demo.1dentalai.test/eligibility" },
        { action: "fill", selector: "#username", valueRef: "portalUsername" },
        { action: "fill", selector: "#password", valueRef: "portalPassword" },
        { action: "click", selector: "#loginButton" },
        { action: "assertSession", selector: "#subscriber" },
        { action: "fill", selector: "#subscriber", valueRef: "subscriberId" },
        { action: "click", selector: "#lookup" },
        { action: "waitForSelector", selector: "[data-field='status']" },
      ],
      fields: [
        { fieldKey: "eligibility_status", selector: "[data-field='status']", valueType: "TEXT" },
        { fieldKey: "deductible", selector: "[data-field='deductible']", valueType: "MONEY" },
        { fieldKey: "deductible_met", selector: "[data-field='deductible-met']", valueType: "MONEY" },
        { fieldKey: "annual_max", selector: "[data-field='annual-max']", valueType: "MONEY" },
        { fieldKey: "annual_used", selector: "[data-field='annual-used']", valueType: "MONEY" },
        { fieldKey: "frequency", selector: "[data-field='frequency']", valueType: "TEXT" },
      ],
    },
    { portalUsername: "demo-user", portalPassword: "demo-pass" },
  );

  const normalized = {
    eligibilityStatus: textValue(browserResult.scrapedFields, "eligibility_status").toUpperCase() === "ACTIVE" ? "ACTIVE" : "NEEDS_REVIEW",
    benefitYear: new Date().getFullYear(),
    deductibleCents: moneyValue(browserResult.scrapedFields, "deductible"),
    deductibleMetCents: moneyValue(browserResult.scrapedFields, "deductible_met"),
    annualMaxCents: moneyValue(browserResult.scrapedFields, "annual_max"),
    annualUsedCents: moneyValue(browserResult.scrapedFields, "annual_used"),
    frequencies: { hygiene: textValue(browserResult.scrapedFields, "frequency") },
    payerNotes: ["Phase 2 non-PHI browser demo fixture."],
  };
  const screenshotArtifactId = id("payer_artifact", `${ids.runId}:screenshot`);
  const pdfArtifactId = id("payer_artifact", `${ids.runId}:pdf`);
  const pdfHtml = `<html><body><h1>Eligibility Demo</h1><p>Status ${normalized.eligibilityStatus}</p></body></html>`;
  const evidenceId = id("elig_evidence", ids.runId);

  await client.query("begin");
  try {
    await client.query(
      `insert into "PayerGeneratedArtifactReference"
         ("id", "tenantId", "payerRegistryEntryId", "rpaRunLogId", "sourceObjectType", "sourceObjectId", "artifactType", "title", "storageUri", "checksum", "metadata")
       values ($1, $2, $3, $4, 'PmsPatientInsurance', $5, 'PAYER_SCREENSHOT_REFERENCE', 'Phase 2 demo eligibility screenshot', $6, $7, $8::jsonb)`,
      [screenshotArtifactId, tenantId, ids.payerId, ids.runId, ids.patientInsuranceId, screenshotPath, browserResult.screenshot.checksum, JSON.stringify({ sourceTraceId: browserResult.sourceTraceId, noPhiInLogs: true })],
    );
    await client.query(
      `insert into "PayerGeneratedArtifactReference"
         ("id", "tenantId", "payerRegistryEntryId", "rpaRunLogId", "sourceObjectType", "sourceObjectId", "artifactType", "title", "storageUri", "checksum", "metadata")
       values ($1, $2, $3, $4, 'PmsPatientInsurance', $5, 'ELIGIBILITY_PDF', 'Phase 2 demo eligibility PDF', $6, $7, $8::jsonb)`,
      [pdfArtifactId, tenantId, ids.payerId, ids.runId, ids.patientInsuranceId, `artifact://eligibility-pdf/${checksum(pdfHtml)}.html`, checksum(pdfHtml), JSON.stringify({ sourceTraceId: browserResult.sourceTraceId, noPhiInLogs: true, renderReady: true })],
    );
    await client.query(
      `insert into "PmsEligibilityEvidence"
         ("id", "tenantId", "patientInsuranceId", "payerRegistryEntryId", "rpaRunLogId", "portalLayoutId", "sourceTraceId",
          "eligibilityStatus", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents",
          "frequencies", "limitations", "normalizedFields", "rawFieldEvidence", "screenshotArtifactId", "pdfArtifactId")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18, $19)`,
      [
        evidenceId,
        tenantId,
        ids.patientInsuranceId,
        ids.payerId,
        ids.runId,
        ids.layoutId,
        browserResult.sourceTraceId,
        normalized.eligibilityStatus,
        normalized.benefitYear,
        normalized.deductibleCents,
        normalized.deductibleMetCents,
        normalized.annualMaxCents,
        normalized.annualUsedCents,
        JSON.stringify(normalized.frequencies),
        JSON.stringify({}),
        JSON.stringify(normalized),
        JSON.stringify(browserResult.evidenceManifest.selectorMap),
        screenshotArtifactId,
        pdfArtifactId,
      ],
    );
    await client.query(
      `update "PmsPatientInsurance"
       set "eligibilityStatus" = $3, "lastVerifiedAt" = current_timestamp, "verificationNote" = $4, "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [tenantId, ids.patientInsuranceId, normalized.eligibilityStatus, `Phase 2 demo evidence ${evidenceId}; trace ${browserResult.sourceTraceId}`],
    );
    await client.query(
      `insert into "PmsBenefitSummary"
         ("id", "tenantId", "patientInsuranceId", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents", "frequencies", "limitations", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, '{}'::jsonb, current_timestamp)
       on conflict ("tenantId", "patientInsuranceId", "benefitYear") do update set
         "deductibleCents" = excluded."deductibleCents",
         "deductibleMetCents" = excluded."deductibleMetCents",
         "annualMaxCents" = excluded."annualMaxCents",
         "annualUsedCents" = excluded."annualUsedCents",
         "frequencies" = excluded."frequencies",
         "updatedAt" = current_timestamp`,
      [id("ben", ids.patientInsuranceId), tenantId, ids.patientInsuranceId, normalized.benefitYear, normalized.deductibleCents, normalized.deductibleMetCents, normalized.annualMaxCents, normalized.annualUsedCents, JSON.stringify(normalized.frequencies)],
    );
    await client.query(`update "PmsEligibilityEvidence" set "writebackStatus" = 'APPLIED', "reviewedByRole" = 'qa_demo', "reviewedAt" = current_timestamp where "tenantId" = $1 and "id" = $2`, [tenantId, evidenceId]);
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, 'qa_demo', 'ELIGIBILITY_RPA_WRITEBACK_APPLIED', 'PmsEligibilityEvidence', $3, 'ALLOWED', $4::jsonb)`,
      [id("audit", evidenceId), tenantId, evidenceId, JSON.stringify({ noPhiInLogs: true, sourceTraceId: browserResult.sourceTraceId, screenshotArtifactId, pdfArtifactId })],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const verification = (await client.query(
    `select pi."eligibilityStatus", bs."deductibleCents", bs."deductibleMetCents", bs."annualMaxCents", bs."annualUsedCents",
       e."writebackStatus", r."runStatus", r."noPhiInLogs"
     from "PmsPatientInsurance" pi
     join "PmsBenefitSummary" bs on bs."tenantId" = pi."tenantId" and bs."patientInsuranceId" = pi."id" and bs."benefitYear" = $3
     join "PmsEligibilityEvidence" e on e."tenantId" = pi."tenantId" and e."patientInsuranceId" = pi."id"
     join "PayerRpaRunLog" r on r."tenantId" = pi."tenantId" and r."id" = e."rpaRunLogId"
     where pi."tenantId" = $1 and pi."id" = $2
     order by e."createdAt" desc
     limit 1`,
    [tenantId, ids.patientInsuranceId, normalized.benefitYear],
  )).rows[0];
  if (verification?.eligibilityStatus !== "ACTIVE") failures.push("PMS patient insurance was not marked ACTIVE from portal evidence.");
  if (verification?.deductibleCents !== 5000 || verification?.deductibleMetCents !== 2500 || verification?.annualMaxCents !== 150000 || verification?.annualUsedCents !== 30000) {
    failures.push("Benefit summary did not receive normalized cents from portal extraction.");
  }
  if (verification?.writebackStatus !== "APPLIED") failures.push("Eligibility evidence was not reviewed/applied.");
  if (verification?.runStatus !== "COMPLETED" || verification?.noPhiInLogs !== true) failures.push("RPA run log was not completed with noPhiInLogs.");
  if (JSON.stringify(browserResult.evidenceManifest).includes("DEMO-SUB-0001") || JSON.stringify(browserResult.evidenceManifest).includes("demo-pass")) {
    failures.push("Browser evidence manifest leaked subscriber or credential data.");
  }

  fs.rmSync(screenshotPath, { force: true });
  fs.rmSync(storageStatePath, { force: true });
} finally {
  await client.end();
}

if (failures.length) {
  console.error("Payer portal demo e2e validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  tenantId,
  databaseName: dbName,
  demo: "browser-login-eligibility-extract-evidence-writeback",
  assertions: ["browser moved screens", "fields extracted", "screenshot checksum captured", "RPA run completed", "PMS insurance writeback", "benefit summary upsert", "no PHI/credential leakage in manifest"],
}, null, 2));
