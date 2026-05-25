import "server-only";

import { newId, query, withTransaction } from "@/lib/db";
import { assertPmsWritebackAllowed } from "@/lib/pms-connectors/writeback-policy";
import type { PmsWritebackRequest } from "@/lib/pms-connectors/types";

export async function createPmsWritebackJob(input: PmsWritebackRequest) {
  const evidence = input.evidence ?? [];
  const policy = await assertPmsWritebackAllowed({
    tenantId: input.tenantId,
    connectorInstanceId: input.connectorInstanceId,
    capabilityKey: input.capabilityKey,
    evidence,
  });
  const status = policy.allowed ? (policy.requiresApproval ? "PENDING_APPROVAL" : "APPROVED") : "BLOCKED";
  const id = newId("pmswjob");

  const result = await query(
    `insert into "PmsWritebackJob"
      ("id", "tenantId", "connectorInstanceId", "capabilityKey", "localType", "localId", "externalType", "status", "idempotencyKey", "requestedByRole", "payload", "evidence", "blockedReason")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13)
     on conflict ("tenantId", "idempotencyKey") do update set
       "payload" = excluded."payload",
       "evidence" = excluded."evidence",
       "blockedReason" = excluded."blockedReason",
       "updatedAt" = current_timestamp
     returning *`,
    [
      id,
      input.tenantId,
      input.connectorInstanceId,
      input.capabilityKey,
      input.localType,
      input.localId,
      input.externalType,
      status,
      input.idempotencyKey,
      input.requestedByRole,
      JSON.stringify(input.payload),
      JSON.stringify(evidence),
      policy.blockedReason,
    ],
  );

  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, 'PMS_WRITEBACK_JOB_CREATED', 'PmsWritebackJob', $4, $5, $6::jsonb)`,
    [
      newId("audit"),
      input.tenantId,
      input.requestedByRole,
      result.rows[0]?.id ?? id,
      status === "BLOCKED" ? "BLOCKED" : "ALLOWED",
      JSON.stringify({ capabilityKey: input.capabilityKey, localType: input.localType, externalType: input.externalType, status, blockedReason: policy.blockedReason }),
    ],
  );

  return result.rows[0];
}

export async function approvePmsWritebackJob(input: { tenantId: string; jobId: string; approvedByRole: string }) {
  const result = await query(
    `update "PmsWritebackJob"
     set "status" = case when "status" = 'PENDING_APPROVAL' then 'APPROVED' else "status" end,
       "approvedByRole" = case when "status" = 'PENDING_APPROVAL' then $3 else "approvedByRole" end,
       "approvedAt" = case when "status" = 'PENDING_APPROVAL' then current_timestamp else "approvedAt" end,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2
     returning *`,
    [input.tenantId, input.jobId, input.approvedByRole],
  );
  if (!result.rows[0]) throw new Error("Writeback job not found.");
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, 'PMS_WRITEBACK_JOB_APPROVED', 'PmsWritebackJob', $4, 'ALLOWED', $5::jsonb)`,
    [newId("audit"), input.tenantId, input.approvedByRole, input.jobId, JSON.stringify({ status: result.rows[0].status })],
  );
  return result.rows[0];
}

export async function executePmsWritebackJob(input: { tenantId: string; jobId: string; actorRole: string }) {
  return withTransaction(async (client) => {
    const jobResult = await client.query(
      `select *
       from "PmsWritebackJob"
       where "tenantId" = $1 and "id" = $2
       for update`,
      [input.tenantId, input.jobId],
    );
    const job = jobResult.rows[0];
    if (!job) throw new Error("Writeback job not found.");
    if (job.status !== "APPROVED") {
      const attemptId = newId("pmswtry");
      await client.query(
        `insert into "PmsWritebackAttempt" ("id", "tenantId", "writebackJobId", "status", "requestPayload", "errorMessage", "finishedAt")
         values ($1, $2, $3, 'BLOCKED', $4::jsonb, $5, current_timestamp)`,
        [attemptId, input.tenantId, input.jobId, JSON.stringify({ status: job.status }), "Writeback job must be approved before execution."],
      );
      return { ...job, executionStatus: "BLOCKED", blockedReason: "Writeback job must be approved before execution." };
    }

    const attemptId = newId("pmswtry");
    await client.query(
      `insert into "PmsWritebackAttempt" ("id", "tenantId", "writebackJobId", "status", "requestPayload")
       values ($1, $2, $3, 'RUNNING', $4::jsonb)`,
      [attemptId, input.tenantId, input.jobId, JSON.stringify({ capabilityKey: job.capabilityKey, payloadHashOnly: true })],
    );

    const response = {
      mode: "STAGED_CONNECTOR_EXECUTION",
      message: "External PMS mutation is staged. Real OpenDental execution requires validated credential, approved field map, and connector-specific executor.",
      noFakeExternalSuccess: true,
    };

    await client.query(
      `update "PmsWritebackAttempt"
       set "status" = 'BLOCKED', "responsePayload" = $2::jsonb, "errorMessage" = $3, "finishedAt" = current_timestamp
       where "id" = $1`,
      [attemptId, JSON.stringify(response), response.message],
    );
    const updated = await client.query(
      `update "PmsWritebackJob"
       set "status" = 'BLOCKED', "blockedReason" = $3, "externalResponse" = $4::jsonb, "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2
       returning *`,
      [input.tenantId, input.jobId, response.message, JSON.stringify(response)],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'PMS_WRITEBACK_EXECUTION_BLOCKED', 'PmsWritebackJob', $4, 'BLOCKED', $5::jsonb)`,
      [newId("audit"), input.tenantId, input.actorRole, input.jobId, JSON.stringify({ capabilityKey: job.capabilityKey, noFakeExternalSuccess: true })],
    );
    return { ...updated.rows[0], executionStatus: "BLOCKED" };
  });
}
