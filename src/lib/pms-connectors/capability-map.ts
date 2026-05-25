import "server-only";

import { query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import type { PmsCapabilityKey } from "@/lib/pms-connectors/types";

export const defaultPmsConnectorInstanceId = "conn_inst_pms_denver";

export const phaseOneCapabilities: Array<{
  key: PmsCapabilityKey;
  resourceType: string;
  operation: "READ" | "WRITE";
  requiresApproval: boolean;
  requiredEvidence: string[];
}> = [
  { key: "patients.read", resourceType: "patient", operation: "READ", requiresApproval: false, requiredEvidence: [] },
  { key: "appointments.read", resourceType: "appointment", operation: "READ", requiresApproval: false, requiredEvidence: [] },
  { key: "clinical_notes.write", resourceType: "clinical_note", operation: "WRITE", requiresApproval: true, requiredEvidence: ["providerApprovalId", "sourceRecordId"] },
  { key: "treatment_plans.write", resourceType: "treatment_plan", operation: "WRITE", requiresApproval: true, requiredEvidence: ["providerApprovalId", "cdtValidation"] },
  { key: "perio.write", resourceType: "perio_exam", operation: "WRITE", requiresApproval: true, requiredEvidence: ["providerApprovalId", "perioSignoffId"] },
  { key: "documents.write", resourceType: "document", operation: "WRITE", requiresApproval: true, requiredEvidence: ["documentArtifactId", "checksum"] },
  { key: "claims.write", resourceType: "claim", operation: "WRITE", requiresApproval: true, requiredEvidence: ["rcmPacketId", "evidenceIds"] },
];

export async function ensurePmsConnectorCapabilities(tenantId = defaultTenantId, connectorInstanceId = defaultPmsConnectorInstanceId) {
  for (const capability of phaseOneCapabilities) {
    await query(
      `insert into "PmsConnectorCapability"
        ("id", "tenantId", "connectorInstanceId", "capabilityKey", "resourceType", "operation", "status", "requiresApproval", "requiredEvidence", "lastSmokeTestStatus", "lastSmokeTestSummary")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 'NOT_RUN', 'Smoke test not run.')
       on conflict ("tenantId", "connectorInstanceId", "capabilityKey") do update set
        "resourceType" = excluded."resourceType",
        "operation" = excluded."operation",
        "requiresApproval" = excluded."requiresApproval",
        "requiredEvidence" = excluded."requiredEvidence",
        "updatedAt" = current_timestamp`,
      [
        `pms_cap_${connectorInstanceId}_${capability.key.replaceAll(".", "_")}`,
        tenantId,
        connectorInstanceId,
        capability.key,
        capability.resourceType,
        capability.operation,
        capability.operation === "READ" ? "UNKNOWN" : "APPROVAL_REQUIRED",
        capability.requiresApproval,
        JSON.stringify(capability.requiredEvidence),
      ],
    );
  }
}

export async function getPmsConnectorReadiness(tenantId = defaultTenantId, connectorInstanceId = defaultPmsConnectorInstanceId) {
  await ensurePmsConnectorCapabilities(tenantId, connectorInstanceId);
  const [installation, capabilities, recentJobs] = await Promise.all([
    query(
      `select i.*, d."name" as "definitionName", d."slug" as "definitionSlug", d."category"
       from "ConnectorInstallation" i
       join "ConnectorDefinition" d on d."id" = i."definitionId"
       where i."tenantId" = $1 and i."id" = $2
       limit 1`,
      [tenantId, connectorInstanceId],
    ),
    query(
      `select *
       from "PmsConnectorCapability"
       where "tenantId" = $1 and "connectorInstanceId" = $2
       order by "operation", "capabilityKey"`,
      [tenantId, connectorInstanceId],
    ),
    query(
      `select *
       from "PmsWritebackJob"
       where "tenantId" = $1 and "connectorInstanceId" = $2
       order by "createdAt" desc
       limit 20`,
      [tenantId, connectorInstanceId],
    ),
  ]);

  const install = installation.rows[0] ?? null;
  const blockers = [
    !install ? "OpenDental connector installation is missing." : null,
    install && install.credentialStatus !== "VALIDATED" ? "Credential vault is not validated." : null,
    install && install.approvalStatus !== "APPROVED" ? "Tenant approval policy is not approved." : null,
    install && install.healthStatus !== "PASS" ? "Read smoke test has not passed." : null,
    capabilities.rows.some((row) => String(row.status) === "FAILED") ? "At least one PMS capability smoke test failed." : null,
  ].filter(Boolean);

  return {
    installation: install,
    capabilities: capabilities.rows,
    recentJobs: recentJobs.rows,
    readinessStatus: blockers.length ? "BLOCKED" : "LIVE_READY",
    blockers,
  };
}
