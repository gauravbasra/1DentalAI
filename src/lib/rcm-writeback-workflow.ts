import "server-only";

import { query } from "@/lib/db";
import { defaultPmsConnectorInstanceId } from "@/lib/pms-connectors/capability-map";
import { createPmsWritebackJob } from "@/lib/pms-connectors/writeback-jobs";
import { buildRcmPacket, type RcmPacketType, type RcmPacketResult } from "@/lib/rcm-packet-builder";
import type { RcmEvidenceSourceType } from "@/lib/rcm-evidence-repository";
import { postEraToLedger } from "@/lib/operating-system-repository";

type Session = {
  tenantId: string;
  roleKey: string;
  userId?: string | null;
};

type WritebackPacketInput = {
  session: Session;
  packetType: RcmPacketType;
  sourceRecordId: string;
  connectorInstanceId?: string;
};

type PacketWritebackResult = {
  packet: RcmPacketResult;
  writeback?: {
    jobId: string;
    jobStatus: string;
    blockedReason: string | null;
  };
};

export async function buildAndAssertRcmPacket(input: WritebackPacketInput) {
  const packet = await buildRcmPacket({
    tenantId: input.session.tenantId,
    actorRole: input.session.roleKey,
    packetType: input.packetType,
    sourceRecordId: input.sourceRecordId,
  });
  if (packet.status !== "READY_FOR_REVIEW") {
    throw Object.assign(
      new Error(packet.blockedReason ?? "RCM packet is not ready. Review evidence and readiness blockers before writeback."),
      { status: packet.status === "BLOCKED" ? 409 : 400 },
    );
  }
  return packet;
}

export async function createClaimsWritebackFromRcmSource(input: WritebackPacketInput): Promise<PacketWritebackResult> {
  const packet = await buildAndAssertRcmPacket(input);
  const sourceContext = packet.sourceType === "prior_auth" ? "prior authorization" : packet.sourceType === "denial_case" ? "denial" : "ERA";
  const connectorInstanceId = input.connectorInstanceId?.trim() || defaultPmsConnectorInstanceId;
  const externalPatientId = await getExternalPatientId({
    tenantId: input.session.tenantId,
    connectorInstanceId,
    patientId: packet.source.patientId,
  });

  const claimId = typeof packet.source.claimId === "string" && packet.source.claimId.trim() ? packet.source.claimId : null;
  const localType = claimId ? "PmsClaim" : packet.sourceType === "prior_auth" ? "RcmPriorAuthorization" : packet.sourceType === "denial_case" ? "RcmDenialCase" : "RcmEraPosting";
  const localId = claimId || packet.sourceRecordId;

  const job = await createPmsWritebackJob({
    tenantId: input.session.tenantId,
    connectorInstanceId,
    capabilityKey: "claims.write",
    localType,
    localId,
    externalType: "claim",
    requestedByRole: input.session.roleKey,
    evidence: [
      {
        type: "rcmPacketId",
        id: packet.packetId,
        key: "rcmPacketId",
        evidenceType: "rcmPacketId",
        packetId: packet.packetId,
      },
      {
        type: "evidenceIds",
        id: JSON.stringify(packet.evidenceIds),
        key: "evidenceIds",
        evidenceType: "evidenceIds",
        evidenceIds: packet.evidenceIds,
      },
    ],
    idempotencyKey: `rcm:${packet.packetType.toLowerCase()}:${packet.sourceType}:${packet.sourceRecordId}`,
    payload: {
      sourceContext,
      packetType: packet.packetType,
      sourceType: packet.sourceType,
      sourceRecordId: packet.sourceRecordId,
      packetId: packet.packetId,
      evidenceIds: packet.evidenceIds,
      claimId: claimId,
      actorRole: input.session.roleKey,
      actorUserId: input.session.userId ?? null,
      externalPatientId,
    },
  });

  return {
    packet,
    writeback: {
      jobId: job.id,
      jobStatus: job.status,
      blockedReason: job.blockedReason ?? null,
    },
  };
}

export async function postEraToPms(input: WritebackPacketInput) {
  const packet = await buildAndAssertRcmPacket(input);
  if (packet.sourceType !== "era_posting") {
    throw Object.assign(new Error("Only ERA packets can be posted with this endpoint."), { status: 400 });
  }

  const posting = await postEraToLedger(input.sourceRecordId, input.session.roleKey, input.session.tenantId);
  if (posting && typeof posting === "object" && "error" in posting && posting.error) {
    throw Object.assign(new Error(String(posting.error)), { status: 409 });
  }

  const sourceContext = "era posting";
  const connectorInstanceId = input.connectorInstanceId?.trim() || defaultPmsConnectorInstanceId;
  const externalPatientId = await getExternalPatientId({
    tenantId: input.session.tenantId,
    connectorInstanceId,
    patientId: packet.source.patientId,
  });

  const claimsWriteback = await createPmsWritebackJob({
    tenantId: input.session.tenantId,
    connectorInstanceId,
    capabilityKey: "claims.write",
    localType: "PmsClaim",
    localId: packet.source.claimId || packet.sourceRecordId,
    externalType: "claim",
    requestedByRole: input.session.roleKey,
    evidence: [
      { type: "rcmPacketId", id: packet.packetId, key: "rcmPacketId", evidenceType: "rcmPacketId" },
      { type: "evidenceIds", id: JSON.stringify(packet.evidenceIds), key: "evidenceIds", evidenceType: "evidenceIds", evidenceIds: packet.evidenceIds },
      { type: "eraTrace", id: "manual-post", evidenceType: "postingArtifact" },
    ],
    idempotencyKey: `rcm-era-post:${packet.sourceRecordId}`,
    payload: {
      sourceContext,
      packetType: packet.packetType,
      sourceRecordId: packet.sourceRecordId,
      packetId: packet.packetId,
      claimId: packet.source.claimId || null,
      postedLedgerResult: posting,
      actorRole: input.session.roleKey,
      externalPatientId,
    },
  });

  return { packet, posting, jobId: claimsWriteback.id, jobStatus: claimsWriteback.status, blockedReason: claimsWriteback.blockedReason ?? null };
}

export async function buildRcmPacketForApi(input: { tenantId: string; actorRole: string; packetType: RcmPacketType; sourceRecordId: string }) {
  return buildRcmPacket(input);
}

async function getExternalPatientId(input: { tenantId: string; connectorInstanceId: string; patientId: string }) {
  const result = (await query<{ externalId: string }>(
    `select "externalId"
       from "PmsExternalRecordLink"
      where "tenantId" = $1 and "localType" = 'PmsPatient' and "localId" = $2 and "connectorInstanceId" = $3
      limit 1`,
    [input.tenantId, input.patientId, input.connectorInstanceId],
  )).rows[0];
  if (!result) {
    throw Object.assign(
      new Error("Patient has no PMS external mapping. Map the patient before RCM writeback."),
      { status: 409 },
    );
  }
  return result.externalId;
}

export type { RcmEvidenceSourceType, PacketWritebackResult };
