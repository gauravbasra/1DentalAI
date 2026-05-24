import fs from "node:fs";
import { createHash } from "node:crypto";
import { Client } from "pg";

const tenantId = process.env.PMS_E2E_TENANT_ID || "tenant_1dentalai_production";
const fixture = JSON.parse(fs.readFileSync("prisma/fixtures/payer-matrix.sample.json", "utf8"));
const failures = [];

if (!process.env.DATABASE_URL) {
  console.log(JSON.stringify({ ok: true, skipped: true, reason: "DATABASE_URL is not configured." }, null, 2));
  process.exit(0);
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const databaseName = databaseUrl.pathname.replace(/^\//, "");
const fixtureDbAllowed = process.env.PAYER_MATRIX_FIXTURE_DB_TEST === "1" || /(^|_)(qa|test)(_|$)/i.test(databaseName);
if (!fixtureDbAllowed) {
  console.log(JSON.stringify({
    ok: true,
    skipped: true,
    reason: "Payer fixture DB test writes non-PHI rows and only runs on QA/test databases or when PAYER_MATRIX_FIXTURE_DB_TEST=1.",
    databaseName,
  }, null, 2));
  process.exit(0);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

function normalize(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function id(prefix, value) {
  return `${prefix}_${createHash("sha1").update(`${tenantId}:${value}`).digest("hex").slice(0, 18)}`;
}

async function seedFixture() {
  const checksum = createHash("sha256").update(JSON.stringify(fixture.rows)).digest("hex");
  const snapshotId = id("payer_snap", fixture.version);
  await client.query(
    `insert into "PayerMatrixSnapshot" ("id", "tenantId", "source", "sourceUrl", "version", "rowCount", "checksum", "importedByRole")
     values ($1, $2, $3, $4, $5, $6, $7, 'qa_fixture')
     on conflict ("tenantId", "source", "version") do update set
       "rowCount" = excluded."rowCount",
       "checksum" = excluded."checksum",
       "importStatus" = 'IMPORTED',
       "importedAt" = current_timestamp`,
    [snapshotId, tenantId, fixture.source, fixture.sourceUrl, fixture.version, fixture.rows.length, checksum],
  );

  for (const row of fixture.rows) {
    const payerId = id("payer", row.primaryPayerId);
    await client.query(
      `insert into "PayerRegistryEntry"
         ("id", "tenantId", "payerName", "normalizedName", "primaryPayerId", "payerType", "coverageType", "operatingStates", "source", "sourceUrl", "sourceSnapshotId", "sourceUpdatedAt", "lastVerifiedAt", "metadata")
       values ($1, $2, $3, $4, $5, $6, $7, array[]::text[], $8, $9, $10, current_timestamp, current_timestamp, $11::jsonb)
       on conflict ("tenantId", "primaryPayerId") do update set
         "payerName" = excluded."payerName",
         "normalizedName" = excluded."normalizedName",
         "payerType" = excluded."payerType",
         "coverageType" = excluded."coverageType",
         "source" = excluded."source",
         "sourceUrl" = excluded."sourceUrl",
         "sourceSnapshotId" = excluded."sourceSnapshotId",
         "sourceUpdatedAt" = current_timestamp,
         "lastVerifiedAt" = current_timestamp,
         "metadata" = excluded."metadata",
         "active" = true,
         "updatedAt" = current_timestamp`,
      [payerId, tenantId, row.payerName, normalize(row.payerName), row.primaryPayerId, row.payerType, row.coverageType, fixture.source, fixture.sourceUrl, snapshotId, JSON.stringify({ fixture: true })],
    );

    for (const alias of row.aliases || []) {
      await client.query(
        `insert into "PayerAlias" ("id", "tenantId", "payerRegistryEntryId", "alias", "normalizedAlias", "source")
         values ($1, $2, $3, $4, $5, $6)
         on conflict ("tenantId", "payerRegistryEntryId", "normalizedAlias") do update set
           "alias" = excluded."alias",
           "source" = excluded."source",
           "updatedAt" = current_timestamp`,
        [id("payer_alias", `${row.primaryPayerId}:${alias}`), tenantId, payerId, alias, normalize(alias), fixture.source],
      );
    }

    await client.query(`delete from "PayerNetworkModel" where "tenantId" = $1 and "payerRegistryEntryId" = $2`, [tenantId, payerId]);
    const network = row.network;
    await client.query(
      `insert into "PayerNetworkModel"
         ("id", "tenantId", "payerRegistryEntryId", "networkType", "routeType", "clearinghouse", "clearinghouseRouteKey", "clearinghousePayerId", "portalUrl", "portalRpaProfile", "manualFallbackAllowed", "enrollmentStatus", "credentialingStatus", "lastVerifiedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, current_timestamp)`,
      [id("payer_net", row.primaryPayerId), tenantId, payerId, network.networkType, network.routeType, network.clearinghouse ?? null, network.clearinghouseRouteKey ?? null, network.clearinghousePayerId ?? row.primaryPayerId, network.portalUrl ?? null, JSON.stringify(network.portalRpaProfile ?? null), network.manualFallbackAllowed ?? false, network.enrollmentStatus, network.credentialingStatus],
    );

    for (const [family, capability] of Object.entries(row.capabilities)) {
      await client.query(
        `insert into "PayerTransactionCapability"
           ("id", "tenantId", "payerRegistryEntryId", "transactionFamily", "x12Transaction", "stediTransactionKey", "supported", "clearinghouse", "clearinghousePayerId", "payerEnrollmentMode", "requiresEnrollment", "requiresProviderEnrollment", "requiresLocationEnrollment", "requiresPayerPortalFallback", "portalFallbackReason", "supportsRealtime", "status", "limitations", "lastVerifiedAt")
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, case when $10 then 'PAYER_REQUIRED' else 'NOT_REQUIRED' end, $10, $11, false, $12, $13, $14, $15, $16::jsonb, current_timestamp)
         on conflict ("tenantId", "payerRegistryEntryId", "transactionFamily", "serviceLine") do update set
           "supported" = excluded."supported",
           "clearinghouse" = excluded."clearinghouse",
           "clearinghousePayerId" = excluded."clearinghousePayerId",
           "requiresEnrollment" = excluded."requiresEnrollment",
           "requiresProviderEnrollment" = excluded."requiresProviderEnrollment",
           "requiresPayerPortalFallback" = excluded."requiresPayerPortalFallback",
           "portalFallbackReason" = excluded."portalFallbackReason",
           "supportsRealtime" = excluded."supportsRealtime",
           "status" = excluded."status",
           "limitations" = excluded."limitations",
           "lastVerifiedAt" = current_timestamp,
           "updatedAt" = current_timestamp`,
        [
          id("payer_cap", `${row.primaryPayerId}:${family}`),
          tenantId,
          payerId,
          family,
          family === "PRIOR_AUTH" ? "278" : family.replace(/^[A-Z_]+_/, "").replaceAll("_", "/"),
          `healthcare.${family.toLowerCase()}`,
          capability.supported,
          capability.clearinghouse ?? network.clearinghouse ?? null,
          capability.clearinghousePayerId ?? network.clearinghousePayerId ?? row.primaryPayerId,
          Boolean(capability.requiresEnrollment),
          Boolean(capability.requiresProviderEnrollment),
          Boolean(capability.requiresPayerPortalFallback),
          capability.portalFallbackReason ?? null,
          Boolean(capability.supportsRealtime),
          capability.status,
          JSON.stringify({ fixture: true }),
        ],
      );
    }

    for (const [family, policy] of Object.entries(row.routePolicies)) {
      await client.query(
        `insert into "PayerRoutePolicy"
           ("id", "tenantId", "payerRegistryEntryId", "transactionFamily", "preferredRouteType", "fallbackRouteType", "approvalPolicy", "proofRequired", "routeDecisionMetadata", "externalActionBlockedReason", "requiresElectronicAcknowledgement", "allowPortalRpa", "allowManualAttestation", "requiresValidatedCredential", "connectorHealthRequired", "clearinghouseRouteDecision")
         values ($1, $2, $3, $4, $5, 'MANUAL_ONLY', $6, $7::jsonb, $8::jsonb, $9, true, $10, false, $11, $12, $13)
         on conflict ("tenantId", "payerRegistryEntryId", "transactionFamily") do update set
           "preferredRouteType" = excluded."preferredRouteType",
           "approvalPolicy" = excluded."approvalPolicy",
           "proofRequired" = excluded."proofRequired",
           "routeDecisionMetadata" = excluded."routeDecisionMetadata",
           "externalActionBlockedReason" = excluded."externalActionBlockedReason",
           "allowPortalRpa" = excluded."allowPortalRpa",
           "requiresValidatedCredential" = excluded."requiresValidatedCredential",
           "connectorHealthRequired" = excluded."connectorHealthRequired",
           "clearinghouseRouteDecision" = excluded."clearinghouseRouteDecision",
           "updatedAt" = current_timestamp`,
        [
          id("payer_policy", `${row.primaryPayerId}:${family}`),
          tenantId,
          payerId,
          family,
          policy.preferredRouteType,
          policy.approvalPolicy ?? "CONNECTOR_ACK_REQUIRED",
          JSON.stringify(["payer response", "generated PDF artifact", "audit event"]),
          JSON.stringify({ stediTransactionKey: `healthcare.${family.toLowerCase()}`, clearinghousePayerId: network.clearinghousePayerId ?? row.primaryPayerId }),
          policy.externalActionBlockedReason ?? null,
          Boolean(policy.allowPortalRpa),
          Boolean(policy.requiresValidatedCredential),
          policy.connectorHealthRequired ?? policy.preferredRouteType === "CLEARINGHOUSE",
          policy.clearinghouseRouteDecision,
        ],
      );
    }
  }

  await client.query(
    `update "PayerMatrixSnapshot"
     set "importedAt" = current_timestamp - interval '45 days'
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, snapshotId],
  );
}

async function readinessByPayerId(primaryPayerId) {
  const result = await client.query(
    `select p."id" as "payerId", p."payerName", p."active",
       p."sourceSnapshotId", p."sourceUpdatedAt"::text as "sourceUpdatedAt",
       s."importedAt"::text as "snapshotImportedAt", s."importStatus" as "snapshotImportStatus",
       c."transactionFamily", c."supported", c."status" as "capabilityStatus",
       c."requiresEnrollment", c."requiresProviderEnrollment", c."requiresLocationEnrollment", c."requiresPayerPortalFallback",
       n."networkType", n."routeType", n."enrollmentStatus", n."manualFallbackAllowed",
       n."clearinghouseRouteKey", coalesce(n."clearinghousePayerId", c."clearinghousePayerId") as "clearinghousePayerId",
       n."portalRpaProfile", n."credentialingStatus", n."credentialingOwnerRole",
       rp."preferredRouteType", rp."fallbackRouteType", rp."approvalPolicy", rp."proofRequired", rp."routeDecisionMetadata",
       rp."requiresElectronicAcknowledgement", rp."allowPortalRpa", rp."allowManualAttestation",
       rp."requiresValidatedCredential", rp."connectorHealthRequired", rp."clearinghouseRouteDecision",
       cr."credentialStatus", cr."id" as "credentialReferenceId"
     from "PayerRegistryEntry" p
     left join "PayerTransactionCapability" c on c."tenantId" = p."tenantId" and c."payerRegistryEntryId" = p."id" and c."transactionFamily" = 'ELIGIBILITY_270_271'
     left join "PayerNetworkModel" n on n."tenantId" = p."tenantId" and n."payerRegistryEntryId" = p."id" and (n."effectiveTo" is null or n."effectiveTo" >= current_timestamp)
     left join "PayerRoutePolicy" rp on rp."tenantId" = p."tenantId" and rp."payerRegistryEntryId" = p."id" and rp."transactionFamily" = 'ELIGIBILITY_270_271'
     left join "PayerPortalCredentialReference" cr on cr."tenantId" = p."tenantId" and cr."payerRegistryEntryId" = p."id"
     left join "PayerMatrixSnapshot" s on s."tenantId" = p."tenantId" and s."id" = p."sourceSnapshotId"
     where p."tenantId" = $1 and p."primaryPayerId" = $2
     order by n."lastVerifiedAt" desc nulls last, cr."lastValidatedAt" desc nulls last
     limit 1`,
    [tenantId, primaryPayerId],
  );
  const row = result.rows[0];
  if (!row) return { ready: false, blockers: ["Active PayerRegistryEntry was not found."], row: null };
  const clearinghouseRoute = row.preferredRouteType === "CLEARINGHOUSE" || row.routeType === "CLEARINGHOUSE";
  const routeMetadata = row.routeDecisionMetadata && typeof row.routeDecisionMetadata === "object" ? row.routeDecisionMetadata : {};
  const portalRoute = row.preferredRouteType === "PAYER_PORTAL" || row.fallbackRouteType === "PAYER_PORTAL";
  const snapshotAgeDays = row.snapshotImportedAt ? Math.floor((Date.now() - new Date(row.snapshotImportedAt).getTime()) / 86400000) : null;
  const blockers = [
    row.active ? null : "PayerRegistryEntry is inactive.",
    row.sourceSnapshotId && row.snapshotImportStatus !== "IMPORTED" ? "Payer matrix snapshot is not imported and cannot be used for production routing." : null,
    row.sourceSnapshotId && snapshotAgeDays !== null && snapshotAgeDays > 30 ? "Payer matrix snapshot is stale; refresh payer network data before production routing." : null,
    row.supported ? null : "PayerTransactionCapability is missing or unsupported.",
    row.capabilityStatus && ["SUPPORTED", "READY", "ENROLLED", "PORTAL_FALLBACK"].includes(row.capabilityStatus) ? null : "Capability status is not production-ready.",
    row.networkType && row.networkType !== "UNKNOWN" ? null : "PayerNetworkType.UNKNOWN is blocked.",
    row.routeType && row.routeType !== "BLOCKED" ? null : "PayerRouteType.BLOCKED is blocked.",
    row.preferredRouteType ? null : "PayerRoutePolicy is missing.",
    clearinghouseRoute && !row.clearinghousePayerId ? "Clearinghouse route decision requires clearinghouse payer ID metadata." : null,
    clearinghouseRoute && row.clearinghouseRouteDecision && !["PREFERRED", "APPROVED", "AVAILABLE"].includes(row.clearinghouseRouteDecision) ? "Clearinghouse route decision is not approved for production." : null,
    row.connectorHealthRequired && clearinghouseRoute && !routeMetadata.stediTransactionKey ? "Connector health route metadata is missing Stedi transaction key." : null,
    row.credentialingStatus && ["BLOCKED", "EXPIRED", "DENIED"].includes(row.credentialingStatus) ? `Credentialing status ${row.credentialingStatus} blocks payer action.` : null,
    row.credentialingStatus === "PENDING" ? "Credentialing status is pending and requires credentialing workbench follow-up." : null,
    row.requiresEnrollment && row.enrollmentStatus !== "ENROLLED" ? "Payer enrollment is required and not complete." : null,
    row.requiresProviderEnrollment && row.enrollmentStatus !== "ENROLLED" ? "Provider enrollment is required and not complete." : null,
    row.requiresLocationEnrollment && row.enrollmentStatus !== "ENROLLED" ? "Location enrollment is required and not complete." : null,
    row.requiresPayerPortalFallback && !row.allowPortalRpa ? "Portal fallback requires approved RPA route policy." : null,
    (row.allowPortalRpa || row.requiresValidatedCredential || portalRoute) && row.credentialStatus !== "VALIDATED" ? "Portal/RPA credential reference is not validated." : null,
    portalRoute && !row.portalRpaProfile && !row.manualFallbackAllowed ? "Portal route requires portal/RPA profile or approved manual fallback." : null,
    row.requiresElectronicAcknowledgement && row.preferredRouteType === "MANUAL_ONLY" ? "Manual-only route cannot satisfy electronic acknowledgement." : null,
  ].filter(Boolean);
  return { ready: blockers.length === 0, blockers, row };
}

try {
  await seedFixture();
  await client.query(
    `update "PayerMatrixSnapshot" set "importedAt" = current_timestamp
     where "tenantId" = $1 and "version" = $2`,
    [tenantId, fixture.version],
  );

  const supported = await readinessByPayerId("FDP001");
  if (!supported.ready) failures.push(`supported clearinghouse route should be ready: ${supported.blockers.join(" ")}`);

  const blocked = await readinessByPayerId("FBD004");
  if (blocked.ready || !blocked.blockers.some((blocker) => blocker.includes("unsupported") || blocker.includes("UNKNOWN") || blocker.includes("BLOCKED"))) failures.push("blocked route did not fail closed.");

  const enrollment = await readinessByPayerId("FER003");
  if (enrollment.ready || !enrollment.blockers.some((blocker) => blocker.includes("pending") || blocker.includes("enrollment"))) failures.push("enrollment-required route did not fail closed.");

  const portal = await readinessByPayerId("FPD002");
  if (portal.ready || !portal.blockers.some((blocker) => blocker.includes("credential reference is not validated"))) failures.push("portal-only route did not require validated credentials.");

  const snapshot = await client.query(`select "id" from "PayerMatrixSnapshot" where "tenantId" = $1 and "version" = $2 limit 1`, [tenantId, fixture.version]);
  await client.query(`update "PayerMatrixSnapshot" set "importedAt" = current_timestamp - interval '45 days' where "id" = $1`, [snapshot.rows[0].id]);
  const stale = await readinessByPayerId("FSM005");
  if (stale.ready || !stale.blockers.some((blocker) => blocker.includes("snapshot is stale"))) failures.push("stale matrix route did not fail closed.");
} finally {
  await client.end();
}

if (failures.length) {
  console.error("Payer route readiness behavior validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, tenantId, fixtureVersion: fixture.version, cases: ["supported", "unsupported", "enrollment-required", "portal-credential-required", "stale-snapshot"] }, null, 2));
