import "server-only";

import { query } from "@/lib/db";
import type { PmsCapabilityKey } from "@/lib/pms-connectors/types";

export async function assertPmsWritebackAllowed(input: {
  tenantId: string;
  connectorInstanceId: string;
  capabilityKey: PmsCapabilityKey;
  evidence: Array<Record<string, unknown>>;
}) {
  const result = await query<{
    status: string;
    operation: string;
    requiresApproval: boolean;
    requiredEvidence: unknown;
  }>(
    `select "status", "operation", "requiresApproval", "requiredEvidence"
     from "PmsConnectorCapability"
     where "tenantId" = $1 and "connectorInstanceId" = $2 and "capabilityKey" = $3
     limit 1`,
    [input.tenantId, input.connectorInstanceId, input.capabilityKey],
  );
  const capability = result.rows[0];
  if (!capability) return { allowed: false, requiresApproval: true, blockedReason: "PMS connector capability is not mapped." };
  if (capability.operation !== "WRITE") return { allowed: false, requiresApproval: false, blockedReason: "Capability is read-only." };
  if (!["READY", "APPROVAL_REQUIRED", "APPROVED_STAGED"].includes(capability.status)) {
    return { allowed: false, requiresApproval: capability.requiresApproval, blockedReason: `Capability status is ${capability.status}.` };
  }

  const required = Array.isArray(capability.requiredEvidence) ? capability.requiredEvidence.map(String) : [];
  const provided = new Set(input.evidence.flatMap((item) => [item.type, item.key, item.id, item.evidenceType].filter(Boolean).map(String)));
  const missing = required.filter((item) => !provided.has(item));
  if (missing.length) {
    return {
      allowed: false,
      requiresApproval: capability.requiresApproval,
      blockedReason: `Required writeback evidence is missing: ${missing.join(", ")}.`,
    };
  }

  return { allowed: true, requiresApproval: capability.requiresApproval, blockedReason: null };
}
