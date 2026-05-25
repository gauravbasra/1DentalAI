import "server-only";

import { newId, query } from "@/lib/db";
import { getConnectorSecret } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";
import { defaultPmsConnectorInstanceId, ensurePmsConnectorCapabilities } from "@/lib/pms-connectors/capability-map";
import { OpenDentalClient } from "@/lib/pms-connectors/open-dental-client";

export async function runOpenDentalReadSmokeTest(input: {
  tenantId?: string;
  connectorInstanceId?: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const connectorInstanceId = input.connectorInstanceId ?? defaultPmsConnectorInstanceId;
  await ensurePmsConnectorCapabilities(tenantId, connectorInstanceId);

  const baseUrl = await getConnectorSecret({ tenantId, installationId: connectorInstanceId, providerKey: "OPEN_DENTAL", credentialLabel: "base_url" });
  const apiKey = await getConnectorSecret({ tenantId, installationId: connectorInstanceId, providerKey: "OPEN_DENTAL", credentialLabel: "api_key" });
  const developerKey = await getConnectorSecret({ tenantId, installationId: connectorInstanceId, providerKey: "OPEN_DENTAL", credentialLabel: "developer_key" });

  if (!baseUrl?.value || !apiKey?.value) {
    const summary = "OpenDental smoke test blocked: base_url and api_key must be stored in the credential vault.";
    await recordSmokeResult({ tenantId, connectorInstanceId, status: "BLOCKED", summary, actorRole: input.actorRole ?? "support_admin" });
    return { ok: false, status: "BLOCKED", summary };
  }

  try {
    const client = new OpenDentalClient({ baseUrl: baseUrl.value, apiKey: apiKey.value, developerKey: developerKey?.value });
    const [patients, appointments] = await Promise.all([client.getPatients(3), client.getAppointments(3)]);
    const summary = "OpenDental read smoke test passed for patients and appointments.";
    await recordSmokeResult({ tenantId, connectorInstanceId, status: "PASS", summary, actorRole: input.actorRole ?? "support_admin" });
    return { ok: true, status: "PASS", summary, sample: { patients, appointments } };
  } catch (error) {
    const summary = error instanceof Error ? error.message : "OpenDental read smoke test failed.";
    await recordSmokeResult({ tenantId, connectorInstanceId, status: "FAILED", summary, actorRole: input.actorRole ?? "support_admin" });
    return { ok: false, status: "FAILED", summary };
  }
}

async function recordSmokeResult(input: { tenantId: string; connectorInstanceId: string; status: "PASS" | "FAILED" | "BLOCKED"; summary: string; actorRole: string }) {
  const capabilityStatus = input.status === "PASS" ? "READY" : input.status;
  await query(
    `update "PmsConnectorCapability"
     set "status" = case when "operation" = 'READ' then $3 else "status" end,
       "lastSmokeTestAt" = current_timestamp,
       "lastSmokeTestStatus" = $2,
       "lastSmokeTestSummary" = $4,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "connectorInstanceId" = $5`,
    [input.tenantId, input.status, capabilityStatus, input.summary, input.connectorInstanceId],
  );
  await query(
    `insert into "ConnectorHealthCheck" ("id", "tenantId", "definitionId", "installationId", "checkType", "status", "resultSummary")
     select $1, i."tenantId", i."definitionId", i."id", 'OPEN_DENTAL_READ_SMOKE_TEST', $2, $3
     from "ConnectorInstallation" i
     where i."tenantId" = $4 and i."id" = $5`,
    [newId("connhealth"), input.status, input.summary, input.tenantId, input.connectorInstanceId],
  );
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, 'PMS_CONNECTOR_SMOKE_TEST', 'ConnectorInstallation', $4, $5, $6::jsonb)`,
    [newId("audit"), input.tenantId, input.actorRole, input.connectorInstanceId, input.status === "PASS" ? "ALLOWED" : "BLOCKED", JSON.stringify({ status: input.status, summary: input.summary })],
  );
}
