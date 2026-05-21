import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function getConnectorControlCenter(tenantId = defaultTenantId) {
  const [definitions, installations, capabilities, routes, healthChecks, costs, metrics] = await Promise.all([
    query(
      `select d.*,
        coalesce(capabilities."capabilityCount", 0)::int as "capabilityCount",
        coalesce(capabilities."blockedCapabilityCount", 0)::int as "blockedCapabilityCount",
        coalesce(installs."installationCount", 0)::int as "installationCount"
       from "ConnectorDefinition" d
       left join (
        select "definitionId", count(*) as "capabilityCount",
          count(*) filter (where "status" not in ('READY','APPROVED_STAGED')) as "blockedCapabilityCount"
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
       order by case i."status" when 'ACTIVE' then 3 when 'READY_FOR_SMOKE_TEST' then 2 else 0 end, d."category", d."name"`,
      [tenantId],
    ),
    query(
      `select c.*, d."name" as "definitionName", d."category"
       from "ConnectorCapability" c
       join "ConnectorDefinition" d on d."id" = c."definitionId"
       where c."tenantId" = $1
       order by c."workflowArea", c."capabilityKey"`,
      [tenantId],
    ),
    query(
      `select r.*, d."name" as "definitionName"
       from "ConnectorRouteDecision" r
       left join "ConnectorDefinition" d on d."id" = r."definitionId"
       where r."tenantId" = $1
       order by r."createdAt" desc
       limit 30`,
      [tenantId],
    ),
    query(
      `select h.*, d."name" as "definitionName"
       from "ConnectorHealthCheck" h
       join "ConnectorDefinition" d on d."id" = h."definitionId"
       where h."tenantId" = $1
       order by h."checkedAt" desc
       limit 30`,
      [tenantId],
    ),
    query(
      `select c.*, d."name" as "definitionName"
       from "ConnectorCostEvent" c
       left join "ConnectorDefinition" d on d."id" = c."definitionId"
       where c."tenantId" = $1
       order by c."createdAt" desc
       limit 30`,
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
  ]);

  return {
    definitions: definitions.rows,
    installations: installations.rows,
    capabilities: capabilities.rows,
    routes: routes.rows,
    healthChecks: healthChecks.rows,
    costs: costs.rows,
    metrics: metrics.rows[0],
  };
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
  const result = await query<{ tenantId: string }>(
    `update "ConnectorInstallation"
     set "status" = case
        when $2 = 'ACTIVE' and ($3 <> 'VALIDATED' or $4 <> 'VERIFIED' or $5 <> 'APPROVED' or $6 <> 'PASS') then 'BLOCKED_READINESS'
        else $2
       end,
       "credentialStatus" = $3,
       "webhookStatus" = $4,
       "approvalStatus" = $5,
       "healthStatus" = $6,
       "nextAction" = $7,
       "lastHealthyAt" = case when $6 = 'PASS' then current_timestamp else "lastHealthyAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [input.id, input.status, input.credentialStatus, input.webhookStatus, input.approvalStatus, input.healthStatus, input.nextAction.trim()],
  );
  if (result.rows[0]) {
    await addAudit(result.rows[0].tenantId, input.actorRole ?? "support_admin", "CONNECTOR_INSTALLATION_UPDATED", "ConnectorInstallation", input.id, "ALLOWED", input);
  }
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
  const readiness = await query<{ missingFields: string[]; status: string; fallbackPolicy: unknown }>(
    `select c."missingFields", c."status", c."fallbackPolicy"
     from "ConnectorCapability" c
     where c."tenantId" = $1 and c."capabilityKey" = $2
     order by case c."status" when 'READY' then 0 when 'APPROVED_STAGED' then 1 else 2 end
     limit 1`,
    [tenantId, input.requestedCapability],
  );
  const capability = readiness.rows[0];
  const missing = capability?.missingFields ?? ["capability map"];
  const routeStatus = capability?.status === "READY" && missing.length === 0 ? "READY_FOR_CONNECTOR" : "BLOCKED_CONNECTOR_REQUIRED";
  const blockedReason = routeStatus === "READY_FOR_CONNECTOR" ? null : `Connector route blocked: ${missing.join(", ")}. Manual fallback is required.`;
  await query(
    `insert into "ConnectorRouteDecision"
       ("id", "tenantId", "definitionId", "installationId", "workflowArea", "sourceObjectType", "sourceObjectId", "requestedCapability", "routeStatus", "selectedRoute", "fallbackRoute", "estimatedCostCents", "blockedReason", "decisionContext", "actorRole")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, case when $9 = 'READY_FOR_CONNECTOR' then $3 else null end, 'MANUAL_QUEUE', $10, $11, $12::jsonb, $13)`,
    [
      id,
      tenantId,
      input.definitionId || null,
      input.installationId || null,
      input.workflowArea,
      input.sourceObjectType,
      input.sourceObjectId || null,
      input.requestedCapability,
      routeStatus,
      input.estimatedCostCents ?? 0,
      blockedReason,
      JSON.stringify({ fallbackPolicy: capability?.fallbackPolicy ?? null, source: "manual route simulation", noExternalExecution: true }),
      input.actorRole ?? "support_admin",
    ],
  );
  await addAudit(tenantId, input.actorRole ?? "support_admin", "CONNECTOR_ROUTE_DECISION_CREATED", "ConnectorRouteDecision", id, routeStatus === "READY_FOR_CONNECTOR" ? "ALLOWED" : "BLOCKED", { requestedCapability: input.requestedCapability, routeStatus, blockedReason });
}
