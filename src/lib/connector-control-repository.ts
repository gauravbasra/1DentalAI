import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

type ConnectorRow = Record<string, unknown>;

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function getConnectorControlCenter(tenantId = defaultTenantId) {
  const [definitions, installations, capabilities, routes, healthChecks, costs, credentialVault, metrics, costSummary, fallbackSummary] = await Promise.all([
    query(
      `select d.*,
        coalesce(capabilities."capabilityCount", 0)::int as "capabilityCount",
        coalesce(capabilities."blockedCapabilityCount", 0)::int as "blockedCapabilityCount",
        coalesce(installs."installationCount", 0)::int as "installationCount"
       from "ConnectorDefinition" d
       left join (
        select "definitionId", count(*) as "capabilityCount",
          count(*) filter (where "status" not in ('READY','APPROVED_STAGED')) as "blockedCapabilityCount",
          count(*) filter (where cardinality("missingFields") > 0) as "missingFieldCapabilityCount"
        from "ConnectorCapability"
        where "tenantId" = $1
        group by "definitionId"
       ) capabilities on capabilities."definitionId" = d."id"
       left join (
        select "definitionId", count(*) as "installationCount"
        from "ConnectorInstallation"
        where "tenantId" = $1
        group by "definitionId"
       ) installs on installs."definitionId" = d."id"
       where d."tenantId" = $1
       order by d."category", d."name"`,
      [tenantId],
    ),
    query(
      `select i.*, d."name" as "definitionName", d."category", l."name" as "locationName"
       from "ConnectorInstallation" i
       join "ConnectorDefinition" d on d."id" = i."definitionId"
       left join "Location" l on l."id" = i."locationId"
       where i."tenantId" = $1
       order by d."category", d."name", coalesce(l."name", 'Enterprise')`,
      [tenantId],
    ),
    query(
      `select c.*, d."name" as "definitionName", d."category"
       from "ConnectorCapability" c
       join "ConnectorDefinition" d on d."id" = c."definitionId"
       where c."tenantId" = $1
       order by d."category", c."workflowArea", c."capabilityKey"`,
      [tenantId],
    ),
    query(
      `select r.*, d."name" as "definitionName", d."category", i."fallbackMode"
       from "ConnectorRouteDecision" r
       left join "ConnectorDefinition" d on d."id" = r."definitionId"
       left join "ConnectorInstallation" i on i."id" = r."installationId"
       where r."tenantId" = $1
       order by r."createdAt" desc
       limit 30`,
      [tenantId],
    ),
    query(
      `select h.*, d."name" as "definitionName", d."category"
       from "ConnectorHealthCheck" h
       join "ConnectorDefinition" d on d."id" = h."definitionId"
       where h."tenantId" = $1
       order by h."checkedAt" desc
       limit 30`,
      [tenantId],
    ),
    query(
      `select c.*, d."name" as "definitionName", d."category"
       from "ConnectorCostEvent" c
       left join "ConnectorDefinition" d on d."id" = c."definitionId"
       where c."tenantId" = $1
       order by c."createdAt" desc
       limit 30`,
      [tenantId],
    ),
    query(
      `select v."id", v."tenantId", v."definitionId", v."installationId", v."providerKey", v."credentialLabel",
        v."credentialType", v."status", v."fingerprint", v."lastFour", v."createdByRole", v."rotatedAt", v."createdAt",
        d."name" as "definitionName", d."category", i."fallbackMode"
       from "ConnectorCredentialVault" v
       left join "ConnectorDefinition" d on d."id" = v."definitionId"
       left join "ConnectorInstallation" i on i."id" = v."installationId"
       where v."tenantId" = $1
       order by v."providerKey", v."credentialLabel"`,
      [tenantId],
    ),
    query<{ definitions: string; installations: string; blockedRoutes: string; monthlyEstimatedCents: string; healthBlocked: string }>(
      `select
        (select count(*) from "ConnectorDefinition" where "tenantId" = $1)::text as definitions,
        (select count(*) from "ConnectorInstallation" where "tenantId" = $1)::text as installations,
        (select count(*) from "ConnectorRouteDecision" where "tenantId" = $1 and "routeStatus" like 'BLOCKED%')::text as "blockedRoutes",
        (select coalesce(sum("costCents"), 0) from "ConnectorCostEvent" where "tenantId" = $1 and "status" = 'ESTIMATED')::text as "monthlyEstimatedCents",
        (select count(*) from "ConnectorHealthCheck" where "tenantId" = $1 and "status" not in ('PASS','READY'))::text as "healthBlocked"`,
      [tenantId],
    ),
    query(
      `select "workflowArea", "capabilityKey",
        count(*)::int as "eventCount",
        coalesce(sum("costCents"), 0)::int as "estimatedCents",
        max("createdAt")::text as "lastEstimatedAt"
       from "ConnectorCostEvent"
       where "tenantId" = $1
       group by "workflowArea", "capabilityKey"
       order by coalesce(sum("costCents"), 0) desc, "workflowArea", "capabilityKey"`,
      [tenantId],
    ),
    query(
      `select "workflowArea", "fallbackRoute",
        count(*)::int as "routeCount",
        count(*) filter (where "routeStatus" like 'BLOCKED%')::int as "blockedCount",
        max("createdAt")::text as "lastDecisionAt"
       from "ConnectorRouteDecision"
       where "tenantId" = $1
       group by "workflowArea", "fallbackRoute"
       order by count(*) filter (where "routeStatus" like 'BLOCKED%') desc, "workflowArea"`,
      [tenantId],
    ),
  ]);
  const domainReadiness = buildDomainReadiness({
    definitions: definitions.rows,
    installations: installations.rows,
    capabilities: capabilities.rows,
    healthChecks: healthChecks.rows,
    costs: costs.rows,
    routes: routes.rows,
  });

  return {
    definitions: definitions.rows,
    installations: installations.rows,
    capabilities: capabilities.rows,
    routes: routes.rows,
    healthChecks: healthChecks.rows,
    costs: costs.rows,
    credentialVault: credentialVault.rows,
    metrics: metrics.rows[0],
    costSummary: costSummary.rows,
    fallbackSummary: fallbackSummary.rows,
    domainReadiness,
  };
}

function buildDomainReadiness(input: {
  definitions: ConnectorRow[];
  installations: ConnectorRow[];
  capabilities: ConnectorRow[];
  healthChecks: ConnectorRow[];
  costs: ConnectorRow[];
  routes: ConnectorRow[];
}) {
  const categories = Array.from(new Set(input.definitions.map((row) => String(row.category)))).sort();
  return categories.map((category) => {
    const definitions = input.definitions.filter((row) => row.category === category);
    const definitionIds = new Set(definitions.map((row) => row.id));
    const installations = input.installations.filter((row) => definitionIds.has(row.definitionId));
    const capabilities = input.capabilities.filter((row) => definitionIds.has(row.definitionId));
    const checks = input.healthChecks.filter((row) => definitionIds.has(row.definitionId));
    const routes = input.routes.filter((row) => definitionIds.has(row.definitionId));
    const costs = input.costs.filter((row) => definitionIds.has(row.definitionId));
    const blockers = [
      installations.some((row) => row.credentialStatus !== "VALIDATED") ? "Credential vault not validated" : null,
      installations.some((row) => row.webhookStatus !== "VERIFIED") ? "Webhook callback or signing secret not verified" : null,
      installations.some((row) => row.approvalStatus !== "APPROVED") ? "Tenant approval policy not approved" : null,
      installations.some((row) => row.healthStatus !== "PASS") ? "Smoke test or health check not passing" : null,
      capabilities.some((row) => Array.isArray(row.missingFields) && row.missingFields.length > 0) ? "Capability map has missing fields" : null,
      capabilities.some((row) => !["READY", "APPROVED_STAGED"].includes(String(row.status))) ? "Capability status is not connector-ready" : null,
    ].filter(Boolean);
    const estimatedCents = costs.reduce((sum, row) => sum + Number(row.costCents ?? 0), 0);
    return {
      category,
      definitions: definitions.length,
      installations: installations.length,
      capabilities: capabilities.length,
      blockedCapabilities: capabilities.filter((row) => !["READY", "APPROVED_STAGED"].includes(String(row.status)) || (Array.isArray(row.missingFields) && row.missingFields.length > 0)).length,
      blockedRoutes: routes.filter((row) => String(row.routeStatus).startsWith("BLOCKED")).length,
      healthBlocked: checks.filter((row) => !["PASS", "READY"].includes(String(row.status))).length,
      estimatedCents,
      readinessStatus: blockers.length ? "SETUP_REQUIRED" : "READY_FOR_CONNECTOR",
      blockers,
    };
  });
}

export async function updateConnectorInstallation(input: {
  id: string;
  status: string;
  credentialStatus: string;
  webhookStatus: string;
  approvalStatus: string;
  healthStatus: string;
  nextAction: string;
  actorRole?: string;
}) {
  const requestedStatus = input.status;
  const statusDecision = resolveInstallationStatus(input);
  const result = await query<{ tenantId: string }>(
    `update "ConnectorInstallation"
     set "status" = $2,
       "credentialStatus" = $3,
       "webhookStatus" = $4,
       "approvalStatus" = $5,
       "healthStatus" = $6,
       "nextAction" = $7,
       "lastHealthyAt" = case when $6 = 'PASS' then current_timestamp else "lastHealthyAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [input.id, statusDecision.status, input.credentialStatus, input.webhookStatus, input.approvalStatus, input.healthStatus, input.nextAction.trim()],
  );
  if (result.rows[0]) {
    await addAudit(result.rows[0].tenantId, input.actorRole ?? "support_admin", "CONNECTOR_INSTALLATION_UPDATED", "ConnectorInstallation", input.id, statusDecision.status === requestedStatus ? "ALLOWED" : "BLOCKED", {
      ...input,
      requestedStatus,
      effectiveStatus: statusDecision.status,
      readinessBlockers: statusDecision.blockers,
    });
  }
}

export async function storeConnectorCredential(input: {
  tenantId?: string;
  installationId: string;
  providerKey: string;
  credentialLabel: string;
  credentialType: string;
  secretValue: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const secretValue = input.secretValue.trim();
  if (!secretValue) throw new Error("Credential value is required.");
  const installation = await query<{ id: string; definitionId: string; tenantId: string }>(
    `select "id", "definitionId", "tenantId"
     from "ConnectorInstallation"
     where "tenantId" = $1 and "id" = $2
     limit 1`,
    [tenantId, input.installationId],
  );
  const row = installation.rows[0];
  if (!row) throw new Error("Connector installation not found.");
  const encrypted = encryptConnectorSecret(secretValue);
  const fingerprint = createHash("sha256").update(`${tenantId}:${input.installationId}:${input.providerKey}:${input.credentialLabel}:${secretValue}`).digest("hex");
  const id = newId("cvault");
  await query(
    `insert into "ConnectorCredentialVault"
       ("id", "tenantId", "definitionId", "installationId", "providerKey", "credentialLabel", "credentialType", "status", "encryptedValue", "encryptionIv", "encryptionTag", "fingerprint", "lastFour", "createdByRole")
     values ($1, $2, $3, $4, $5, $6, $7, 'STORED_PENDING_VALIDATION', $8, $9, $10, $11, $12, $13)
     on conflict ("tenantId", "installationId", "providerKey", "credentialLabel") do update set
       "credentialType" = excluded."credentialType",
       "status" = 'STORED_PENDING_VALIDATION',
       "encryptedValue" = excluded."encryptedValue",
       "encryptionIv" = excluded."encryptionIv",
       "encryptionTag" = excluded."encryptionTag",
       "fingerprint" = excluded."fingerprint",
       "lastFour" = excluded."lastFour",
       "createdByRole" = excluded."createdByRole",
       "rotatedAt" = current_timestamp,
       "updatedAt" = current_timestamp`,
    [
      id,
      tenantId,
      row.definitionId,
      input.installationId,
      normalizeProviderKey(input.providerKey),
      input.credentialLabel.trim(),
      input.credentialType.trim() || "SECRET",
      encrypted.value,
      encrypted.iv,
      encrypted.tag,
      fingerprint,
      secretValue.slice(-4),
      input.actorRole ?? "support_admin",
    ],
  );
  await query(
    `update "ConnectorInstallation"
     set "credentialStatus" = case when "credentialStatus" = 'VALIDATED' then 'VALIDATED' else 'PENDING' end,
       "status" = case when "status" = 'ACTIVE' then 'READY_FOR_SMOKE_TEST' else "status" end,
       "nextAction" = $3,
       "updatedAt" = current_timestamp
     where "id" = $1`,
    [input.installationId, tenantId, `${normalizeProviderKey(input.providerKey)} credential stored in vault. Run credential, webhook, and read-only smoke tests before marking validated.`],
  );
  await addAudit(tenantId, input.actorRole ?? "support_admin", "CONNECTOR_CREDENTIAL_STORED", "ConnectorInstallation", input.installationId, "ALLOWED", {
    providerKey: normalizeProviderKey(input.providerKey),
    credentialLabel: input.credentialLabel.trim(),
    credentialType: input.credentialType.trim() || "SECRET",
    fingerprint: fingerprint.slice(0, 16),
    noSecretLogged: true,
    noExternalValidationClaimed: true,
  });
}

function normalizeProviderKey(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function encryptionKey() {
  const configured = process.env.CONNECTOR_SECRET_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!configured || configured.length < 24) {
    throw new Error("CONNECTOR_SECRET_KEY must be configured before storing connector credentials.");
  }
  return createHash("sha256").update(configured).digest();
}

function encryptConnectorSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    value: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function resolveInstallationStatus(input: { status: string; credentialStatus: string; webhookStatus: string; approvalStatus: string; healthStatus: string }) {
  const blockers = [
    input.credentialStatus === "VALIDATED" ? null : "credentials are not validated",
    input.webhookStatus === "VERIFIED" ? null : "webhooks are not verified",
    input.approvalStatus === "APPROVED" ? null : "tenant approval is not approved",
    input.healthStatus === "PASS" ? null : "health check has not passed",
  ].filter(Boolean);
  if (input.status === "ACTIVE" && blockers.length) return { status: "BLOCKED_READINESS", blockers };
  if (input.status === "READY_FOR_SMOKE_TEST") {
    const smokeBlockers = blockers.filter((blocker) => blocker !== "health check has not passed");
    if (smokeBlockers.length) return { status: "SETUP_REQUIRED", blockers: smokeBlockers };
  }
  return { status: input.status || "SETUP_REQUIRED", blockers };
}

export async function recordConnectorHealthCheck(input: {
  tenantId?: string;
  definitionId: string;
  installationId?: string;
  checkType: string;
  status: string;
  resultSummary: string;
  latencyMs?: number;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("chealth");
  const allowedStatus = ["NOT_RUN", "PASS", "FAIL", "READY", "BLOCKED_CONNECTOR_REQUIRED"].includes(input.status) ? input.status : "FAIL";
  const result = await query<{ definitionId: string }>(
    `insert into "ConnectorHealthCheck"
       ("id", "tenantId", "definitionId", "installationId", "checkType", "status", "resultSummary", "latencyMs")
     values ($1, $2, $3, $4, $5, $6, $7, $8::int)
     returning "definitionId"`,
    [
      id,
      tenantId,
      input.definitionId,
      input.installationId || null,
      input.checkType.trim(),
      allowedStatus,
      input.resultSummary.trim(),
      input.latencyMs ?? null,
    ],
  );
  if (input.installationId) {
    await query(
      `update "ConnectorInstallation"
       set "healthStatus" = case when $2 = 'PASS' then 'PASS' when $2 in ('FAIL','BLOCKED_CONNECTOR_REQUIRED') then 'FAIL' else "healthStatus" end,
         "status" = case when $2 in ('FAIL','BLOCKED_CONNECTOR_REQUIRED') then 'BLOCKED_READINESS' else "status" end,
         "lastHealthyAt" = case when $2 = 'PASS' then current_timestamp else "lastHealthyAt" end,
         "updatedAt" = current_timestamp
       where "id" = $1`,
      [input.installationId, allowedStatus],
    );
  }
  await addAudit(tenantId, input.actorRole ?? "support_admin", "CONNECTOR_HEALTH_CHECK_RECORDED", "ConnectorHealthCheck", id, allowedStatus === "PASS" ? "ALLOWED" : "BLOCKED", {
    definitionId: result.rows[0]?.definitionId ?? input.definitionId,
    installationId: input.installationId ?? null,
    checkType: input.checkType,
    status: allowedStatus,
    noExternalSuccessClaimed: true,
  });
  return { id, status: allowedStatus };
}

export async function createConnectorRouteDecision(input: {
  tenantId?: string;
  definitionId?: string;
  installationId?: string;
  workflowArea: string;
  sourceObjectType: string;
  sourceObjectId?: string;
  requestedCapability: string;
  estimatedCostCents?: number;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("route");
  const readiness = await query<{
    id: string;
    definitionId: string;
    installationId: string | null;
    missingFields: string[];
    status: string;
    fallbackPolicy: unknown;
    approvalPolicy: unknown;
    definitionName: string;
    category: string;
    installStatus: string | null;
    credentialStatus: string | null;
    webhookStatus: string | null;
    approvalStatus: string | null;
    healthStatus: string | null;
    fallbackMode: string | null;
    costPolicy: unknown;
  }>(
    `select c."id", c."definitionId", c."installationId", c."missingFields", c."status", c."fallbackPolicy", c."approvalPolicy",
       d."name" as "definitionName", d."category",
       i."status" as "installStatus", i."credentialStatus", i."webhookStatus", i."approvalStatus", i."healthStatus", i."fallbackMode", i."costPolicy"
     from "ConnectorCapability" c
     join "ConnectorDefinition" d on d."id" = c."definitionId"
     left join "ConnectorInstallation" i on i."id" = coalesce($3::text, c."installationId")
     where c."tenantId" = $1
       and c."capabilityKey" = $2
       and ($4::text is null or c."definitionId" = $4)
     order by case c."status" when 'READY' then 0 when 'APPROVED_STAGED' then 1 else 2 end
     limit 1`,
    [tenantId, input.requestedCapability, input.installationId || null, input.definitionId || null],
  );
  const capability = readiness.rows[0];
  const decision = evaluateRouteReadiness(capability, input.estimatedCostCents ?? 0);
  await query(
    `insert into "ConnectorRouteDecision"
       ("id", "tenantId", "definitionId", "installationId", "workflowArea", "sourceObjectType", "sourceObjectId", "requestedCapability", "routeStatus", "selectedRoute", "fallbackRoute", "estimatedCostCents", "blockedReason", "decisionContext", "actorRole")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, case when $9 = 'READY_FOR_CONNECTOR' then $3 else null end, $10, $11, $12, $13::jsonb, $14)`,
    [
      id,
      tenantId,
      capability?.definitionId ?? input.definitionId ?? null,
      input.installationId || capability?.installationId || null,
      input.workflowArea,
      input.sourceObjectType,
      input.sourceObjectId || null,
      input.requestedCapability,
      decision.routeStatus,
      decision.fallbackRoute,
      input.estimatedCostCents ?? 0,
      decision.blockedReason,
      JSON.stringify({
        capabilityStatus: capability?.status ?? "MISSING",
        installStatus: capability?.installStatus ?? null,
        readinessGates: decision.readinessGates,
        fallbackPolicy: capability?.fallbackPolicy ?? null,
        approvalPolicy: capability?.approvalPolicy ?? null,
        source: "connector route decision",
        noExternalExecution: true,
      }),
      input.actorRole ?? "support_admin",
    ],
  );
  if ((input.estimatedCostCents ?? 0) > 0) {
    await query(
      `insert into "ConnectorCostEvent"
         ("id", "tenantId", "definitionId", "installationId", "workflowArea", "capabilityKey", "sourceObjectType", "sourceObjectId", "costCents", "pricingUnit", "status", "metadata")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ROUTE_DECISION', 'ESTIMATED', $10::jsonb)`,
      [
        newId("ccost"),
        tenantId,
        capability?.definitionId ?? input.definitionId ?? null,
        input.installationId || capability?.installationId || null,
        input.workflowArea,
        input.requestedCapability,
        input.sourceObjectType,
        input.sourceObjectId || null,
        input.estimatedCostCents ?? 0,
        JSON.stringify({ routeDecisionId: id, routeStatus: decision.routeStatus, noExternalExecution: true }),
      ],
    );
  }
  await addAudit(tenantId, input.actorRole ?? "support_admin", "CONNECTOR_ROUTE_DECISION_CREATED", "ConnectorRouteDecision", id, decision.routeStatus === "READY_FOR_CONNECTOR" ? "ALLOWED" : "BLOCKED", {
    requestedCapability: input.requestedCapability,
    routeStatus: decision.routeStatus,
    blockedReason: decision.blockedReason,
    readinessGates: decision.readinessGates,
  });
}

function evaluateRouteReadiness(capability: ConnectorRow | undefined, estimatedCostCents: number) {
  if (!capability) {
    return {
      routeStatus: "BLOCKED_CONNECTOR_REQUIRED",
      blockedReason: "Connector route blocked: capability map is missing. Manual fallback is required.",
      fallbackRoute: "MANUAL_QUEUE",
      readinessGates: ["capability map missing"],
    };
  }
  const missing = Array.isArray(capability.missingFields) ? capability.missingFields.map(String) : [];
  const costPolicy = (capability.costPolicy && typeof capability.costPolicy === "object" ? capability.costPolicy : {}) as Record<string, unknown>;
  const fallbackPolicy = (capability.fallbackPolicy && typeof capability.fallbackPolicy === "object" ? capability.fallbackPolicy : {}) as Record<string, unknown>;
  const maxPerTransactionCents = Number(costPolicy.maxPerTransactionCents ?? 0);
  const gates = [
    capability.status === "READY" ? null : `capability status is ${String(capability.status)}`,
    missing.length ? `missing fields: ${missing.join(", ")}` : null,
    capability.installStatus && ["ACTIVE", "READY_FOR_SMOKE_TEST"].includes(String(capability.installStatus)) ? null : `installation status is ${String(capability.installStatus ?? "missing")}`,
    capability.credentialStatus === "VALIDATED" ? null : "credentials are not validated",
    capability.webhookStatus === "VERIFIED" ? null : "webhooks are not verified",
    capability.approvalStatus === "APPROVED" ? null : "tenant approval is not approved",
    capability.healthStatus === "PASS" ? null : "health check has not passed",
    maxPerTransactionCents && estimatedCostCents > maxPerTransactionCents ? `estimated cost exceeds policy max of ${maxPerTransactionCents} cents` : null,
  ].filter(Boolean);
  return {
    routeStatus: gates.length ? "BLOCKED_CONNECTOR_REQUIRED" : "READY_FOR_CONNECTOR",
    blockedReason: gates.length ? `Connector route blocked: ${gates.join("; ")}. Manual fallback is required.` : null,
    fallbackRoute: String(fallbackPolicy.fallback ?? capability.fallbackMode ?? "MANUAL_QUEUE").toUpperCase().replaceAll(" ", "_"),
    readinessGates: gates,
  };
}
