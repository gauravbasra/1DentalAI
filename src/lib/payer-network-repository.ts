import { createHash } from "node:crypto";
import { newId, query, withTransaction } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

export const PAYER_TRANSACTION_FAMILIES = [
  "ELIGIBILITY_270_271",
  "COB_271",
  "CLAIM_837D",
  "CLAIM_ACK_277CA",
  "CLAIM_STATUS_276_277",
  "ERA_835",
  "ATTACHMENT_275",
  "PRIOR_AUTH",
] as const;

export type PayerTransactionFamily = (typeof PAYER_TRANSACTION_FAMILIES)[number];

export const STEDI_STYLE_TRANSACTION_REQUIREMENTS: Record<PayerTransactionFamily, {
  x12Transaction: string;
  stediTransactionKey: string;
  routePurpose: string;
  proofTypes: string[];
  realtimePreferred: boolean;
}> = {
  ELIGIBILITY_270_271: {
    x12Transaction: "270/271",
    stediTransactionKey: "healthcare.eligibility",
    routePurpose: "Eligibility and benefits inquiry/response",
    proofTypes: ["271 response", "eligibility PDF", "payer portal screenshot/reference"],
    realtimePreferred: true,
  },
  COB_271: {
    x12Transaction: "271 COB",
    stediTransactionKey: "healthcare.cob.eligibility",
    routePurpose: "Coordination-of-benefits discovery from eligibility response",
    proofTypes: ["271 COB segment", "payer portal screenshot/reference"],
    realtimePreferred: true,
  },
  CLAIM_837D: {
    x12Transaction: "837D",
    stediTransactionKey: "healthcare.claim.dental",
    routePurpose: "Dental claim submission",
    proofTypes: ["clearinghouse trace", "277CA acknowledgement", "submitted claim packet"],
    realtimePreferred: false,
  },
  CLAIM_ACK_277CA: {
    x12Transaction: "277CA",
    stediTransactionKey: "healthcare.claim.acknowledgement",
    routePurpose: "Claim acceptance/rejection acknowledgement",
    proofTypes: ["277CA acknowledgement", "clearinghouse acknowledgement id"],
    realtimePreferred: false,
  },
  CLAIM_STATUS_276_277: {
    x12Transaction: "276/277",
    stediTransactionKey: "healthcare.claim_status",
    routePurpose: "Real-time claim status inquiry/response",
    proofTypes: ["277 claim status response", "payer portal screenshot/reference"],
    realtimePreferred: true,
  },
  ERA_835: {
    x12Transaction: "835",
    stediTransactionKey: "healthcare.payment.era",
    routePurpose: "Electronic remittance advice and payment posting",
    proofTypes: ["835 ERA", "EOB PDF", "ERA posting PDF"],
    realtimePreferred: false,
  },
  ATTACHMENT_275: {
    x12Transaction: "275",
    stediTransactionKey: "healthcare.claim_attachment",
    routePurpose: "Claim attachment and documentation packet",
    proofTypes: ["275 attachment acknowledgement", "claim attachment packet"],
    realtimePreferred: false,
  },
  PRIOR_AUTH: {
    x12Transaction: "278",
    stediTransactionKey: "healthcare.prior_authorization",
    routePurpose: "Prior authorization request/status packet",
    proofTypes: ["278 response", "prior auth PDF", "payer portal screenshot/reference"],
    realtimePreferred: false,
  },
};

type MatrixRow = {
  payerName: string;
  primaryPayerId: string;
  payerType?: string;
  coverageType?: string;
  operatingStates?: string[];
  aliases?: string[];
  capabilities: Partial<Record<PayerTransactionFamily, {
    supported: boolean;
    x12Transaction?: string;
    stediTransactionKey?: string;
    clearinghouse?: string;
    clearinghousePayerId?: string;
    payerEnrollmentMode?: string;
    requiresEnrollment?: boolean;
    requiresProviderEnrollment?: boolean;
    requiresLocationEnrollment?: boolean;
    requiresPayerPortalFallback?: boolean;
    portalFallbackReason?: string;
    supportsRealtime?: boolean;
    status?: string;
    limitations?: unknown;
  }>>;
  network?: {
    networkType?: string;
    routeType?: string;
    clearinghouse?: string;
    clearinghouseRouteKey?: string;
    clearinghousePayerId?: string;
    directEndpoint?: string;
    portalUrl?: string;
    portalInstructions?: unknown;
    portalRpaProfile?: unknown;
    manualFallbackAllowed?: boolean;
    enrollmentStatus?: string;
    credentialingStatus?: string;
    credentialingOwnerRole?: string;
    credentialingDueAt?: string;
    providerNpi?: string;
    locationCode?: string;
  };
  routePolicies?: Partial<Record<PayerTransactionFamily, {
    preferredRouteType: string;
    fallbackRouteType?: string;
    approvalPolicy?: string;
    proofRequired?: unknown;
    routeDecisionMetadata?: unknown;
    externalActionBlockedReason?: string;
    requiresElectronicAcknowledgement?: boolean;
    allowPortalRpa?: boolean;
    allowManualAttestation?: boolean;
    requiresValidatedCredential?: boolean;
    connectorHealthRequired?: boolean;
    clearinghouseRouteDecision?: string;
  }>>;
};

type ReadinessRow = {
  payerId: string;
  payerName: string;
  active: boolean;
  sourceSnapshotId: string | null;
  sourceUpdatedAt: string | null;
  snapshotImportedAt: string | null;
  snapshotImportStatus: string | null;
  transactionFamily: string | null;
  supported: boolean | null;
  capabilityStatus: string | null;
  requiresEnrollment: boolean | null;
  requiresProviderEnrollment: boolean | null;
  requiresLocationEnrollment: boolean | null;
  requiresPayerPortalFallback: boolean | null;
  networkType: string | null;
  routeType: string | null;
  enrollmentStatus: string | null;
  manualFallbackAllowed: boolean | null;
  clearinghouseRouteKey: string | null;
  clearinghousePayerId: string | null;
  portalRpaProfile: unknown;
  preferredRouteType: string | null;
  fallbackRouteType: string | null;
  approvalPolicy: string | null;
  proofRequired: unknown;
  routeDecisionMetadata: unknown;
  requiresElectronicAcknowledgement: boolean | null;
  allowPortalRpa: boolean | null;
  allowManualAttestation: boolean | null;
  requiresValidatedCredential: boolean | null;
  connectorHealthRequired: boolean | null;
  clearinghouseRouteDecision: string | null;
  credentialingStatus: string | null;
  credentialingOwnerRole: string | null;
  credentialStatus: string | null;
  credentialReferenceId: string | null;
};

export function normalizePayerName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function requireConcreteMatrixRow(row: MatrixRow) {
  if (!row.payerName.trim() || !row.primaryPayerId.trim()) {
    throw new Error("Payer matrix rows require payerName and primaryPayerId.");
  }
  const capabilityFamilies = Object.keys(row.capabilities);
  if (capabilityFamilies.length < 3) {
    throw new Error(`Payer matrix row for ${row.payerName} is too sparse; include concrete eligibility, claims, ERA/status/auth/attachment capability mapping.`);
  }
  if (!row.network?.routeType || !row.routePolicies || !Object.keys(row.routePolicies).length) {
    throw new Error(`Payer matrix row for ${row.payerName} must include network and route policy metadata.`);
  }
  for (const family of capabilityFamilies as PayerTransactionFamily[]) {
    if (!PAYER_TRANSACTION_FAMILIES.includes(family)) {
      throw new Error(`Unsupported payer transaction family: ${family}`);
    }
    const capability = row.capabilities[family];
    const policy = row.routePolicies?.[family];
    if (!capability || !policy) {
      throw new Error(`Payer matrix row for ${row.payerName} must include capability and route policy for ${family}.`);
    }
    if (capability.supported && !policy.preferredRouteType) {
      throw new Error(`Supported ${family} for ${row.payerName} requires a preferred route type.`);
    }
    if ((policy.allowPortalRpa || capability.requiresPayerPortalFallback) && !row.network.portalUrl) {
      throw new Error(`Portal/RPA fallback for ${row.payerName} requires a portalUrl.`);
    }
  }
}

export async function searchPayerMatrix(input: { query: string; tenantId?: string; limit?: number }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const normalized = normalizePayerName(input.query);
  if (!normalized) return [];
  const result = await query(
    `select p.*,
      coalesce(alias_rows."aliases", '[]'::jsonb) as "aliases",
      case
        when p."normalizedName" = $2 then 100
        when p."normalizedName" like $2 || '%' then 92
        when exists (
          select 1 from "PayerAlias" pa
          where pa."payerRegistryEntryId" = p."id" and pa."tenantId" = p."tenantId" and pa."normalizedAlias" like $2 || '%'
        ) then 86
        else 70
      end as "matchScore"
     from "PayerRegistryEntry" p
     left join lateral (
       select jsonb_agg(jsonb_build_object('alias', pa."alias", 'aliasType', pa."aliasType", 'confidence', pa."confidence") order by pa."confidence" desc) as "aliases"
       from "PayerAlias" pa
       where pa."tenantId" = p."tenantId" and pa."payerRegistryEntryId" = p."id"
     ) alias_rows on true
     where p."tenantId" = $1
       and p."active" = true
       and (
        p."normalizedName" like '%' || $2 || '%'
        or p."primaryPayerId" ilike '%' || $3 || '%'
        or exists (
          select 1 from "PayerAlias" pa
          where pa."payerRegistryEntryId" = p."id" and pa."tenantId" = p."tenantId" and pa."normalizedAlias" like '%' || $2 || '%'
        )
       )
     order by "matchScore" desc, p."payerName"
     limit $4`,
    [tenantId, normalized, input.query.trim(), input.limit ?? 20],
  );
  return result.rows;
}

export async function getPayerRouteReadiness(input: {
  payerRegistryEntryId: string;
  transactionFamily: PayerTransactionFamily;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const result = await query<ReadinessRow>(
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
     left join "PayerTransactionCapability" c
       on c."tenantId" = p."tenantId" and c."payerRegistryEntryId" = p."id" and c."transactionFamily" = $3
     left join "PayerNetworkModel" n
       on n."tenantId" = p."tenantId" and n."payerRegistryEntryId" = p."id"
       and (n."effectiveTo" is null or n."effectiveTo" >= current_timestamp)
     left join "PayerRoutePolicy" rp
       on rp."tenantId" = p."tenantId" and rp."payerRegistryEntryId" = p."id" and rp."transactionFamily" = $3
     left join "PayerPortalCredentialReference" cr
       on cr."tenantId" = p."tenantId" and cr."payerRegistryEntryId" = p."id"
     left join "PayerMatrixSnapshot" s
       on s."tenantId" = p."tenantId" and s."id" = p."sourceSnapshotId"
     where p."tenantId" = $1 and p."id" = $2
     order by n."lastVerifiedAt" desc nulls last, cr."lastValidatedAt" desc nulls last
     limit 1`,
    [tenantId, input.payerRegistryEntryId, input.transactionFamily],
  );
  const row = result.rows[0];
  if (!row) {
    return { ready: false, blockers: ["Active PayerRegistryEntry was not found."], routeDecision: null, row: null };
  }
  return evaluatePayerReadiness(row);
}

export async function assertPayerProductionGate(input: {
  payerRegistryEntryId: string;
  transactionFamily: PayerTransactionFamily;
  sourceObjectType: string;
  sourceObjectId?: string;
  actorRole?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const readiness = await getPayerRouteReadiness({ tenantId, payerRegistryEntryId: input.payerRegistryEntryId, transactionFamily: input.transactionFamily });
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, 'PAYER_PRODUCTION_GATE_EVALUATED', $4, $5, $6, $7::jsonb)`,
    [
      newId("audit"),
      tenantId,
      input.actorRole ?? "integration_worker",
      input.sourceObjectType,
      input.sourceObjectId ?? input.payerRegistryEntryId,
      readiness.ready ? "ALLOWED" : "BLOCKED",
      JSON.stringify({
        payerRegistryEntryId: input.payerRegistryEntryId,
        transactionFamily: input.transactionFamily,
        blockers: readiness.blockers,
        routeDecision: readiness.routeDecision,
      }),
    ],
  );
  if (!readiness.ready) {
    throw new Error(`Payer production gate blocked ${input.transactionFamily}: ${readiness.blockers.join(" ")}`);
  }
  return readiness;
}

export async function resolveInsurancePlanPayer(input: {
  payerName: string;
  payerId?: string | null;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const directPayerId = input.payerId?.trim();
  if (directPayerId) {
    const direct = await query(
      `select p.*
       from "PayerRegistryEntry" p
       where p."tenantId" = $1 and p."active" = true and p."primaryPayerId" = $2
       limit 1`,
      [tenantId, directPayerId],
    );
    if (direct.rows[0]) return { matchType: "PAYER_ID", confidence: 100, payer: direct.rows[0] };
  }

  const matches = await searchPayerMatrix({ tenantId, query: input.payerName, limit: 5 });
  const best = matches[0] as { matchScore?: number } | undefined;
  return {
    matchType: best ? "NAME_OR_ALIAS" : "UNMATCHED",
    confidence: best?.matchScore ?? 0,
    payer: best ?? null,
    candidates: matches,
  };
}

export async function importPayerMatrixSnapshot(input: {
  tenantId?: string;
  source: string;
  sourceUrl?: string;
  version: string;
  importedByRole?: string;
  rows: MatrixRow[];
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  for (const row of input.rows) requireConcreteMatrixRow(row);
  const checksum = createHash("sha256").update(JSON.stringify(input.rows)).digest("hex");
  return withTransaction(async (client) => {
    const snapshotId = newId("payer_snap");
    await client.query(
      `insert into "PayerMatrixSnapshot" ("id", "tenantId", "source", "sourceUrl", "version", "rowCount", "checksum", "importedByRole")
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict ("tenantId", "source", "version") do update set
         "rowCount" = excluded."rowCount",
         "checksum" = excluded."checksum",
         "importStatus" = 'IMPORTED',
         "importedAt" = current_timestamp
       returning "id"`,
      [snapshotId, tenantId, input.source, input.sourceUrl ?? null, input.version, input.rows.length, checksum, input.importedByRole ?? "integration_worker"],
    );

    for (const row of input.rows) {
      const payerId = newId("payer");
      const payerResult = await client.query<{ id: string }>(
        `insert into "PayerRegistryEntry"
           ("id", "tenantId", "payerName", "normalizedName", "primaryPayerId", "payerType", "coverageType", "operatingStates", "source", "sourceUrl", "sourceSnapshotId", "sourceUpdatedAt", "lastVerifiedAt", "metadata")
         values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11, current_timestamp, current_timestamp, $12::jsonb)
         on conflict ("tenantId", "primaryPayerId") do update set
           "payerName" = excluded."payerName",
           "normalizedName" = excluded."normalizedName",
           "payerType" = excluded."payerType",
           "coverageType" = excluded."coverageType",
           "operatingStates" = excluded."operatingStates",
           "source" = excluded."source",
           "sourceUrl" = excluded."sourceUrl",
           "sourceSnapshotId" = excluded."sourceSnapshotId",
           "sourceUpdatedAt" = current_timestamp,
           "lastVerifiedAt" = current_timestamp,
           "metadata" = excluded."metadata",
           "updatedAt" = current_timestamp
         returning "id"`,
        [
          payerId,
          tenantId,
          row.payerName.trim(),
          normalizePayerName(row.payerName),
          row.primaryPayerId.trim(),
          row.payerType ?? "UNKNOWN",
          row.coverageType ?? "DENTAL",
          row.operatingStates ?? [],
          input.source,
          input.sourceUrl ?? null,
          snapshotId,
          JSON.stringify({ importedVersion: input.version }),
        ],
      );
      const activePayerId = payerResult.rows[0]?.id;
      if (!activePayerId) throw new Error(`Payer import failed for ${row.payerName}.`);

      for (const alias of row.aliases ?? []) {
        await client.query(
          `insert into "PayerAlias" ("id", "tenantId", "payerRegistryEntryId", "alias", "normalizedAlias", "source")
           values ($1, $2, $3, $4, $5, $6)
           on conflict ("tenantId", "payerRegistryEntryId", "normalizedAlias") do update set
             "alias" = excluded."alias",
             "source" = excluded."source",
             "updatedAt" = current_timestamp`,
          [newId("payer_alias"), tenantId, activePayerId, alias.trim(), normalizePayerName(alias), input.source],
        );
      }

      for (const family of PAYER_TRANSACTION_FAMILIES) {
        const capability = row.capabilities[family];
        if (!capability) continue;
        const stediRequirement = STEDI_STYLE_TRANSACTION_REQUIREMENTS[family];
        await client.query(
          `insert into "PayerTransactionCapability"
             ("id", "tenantId", "payerRegistryEntryId", "transactionFamily", "x12Transaction", "stediTransactionKey",
              "supported", "clearinghouse", "clearinghousePayerId", "payerEnrollmentMode", "requiresEnrollment",
              "requiresProviderEnrollment", "requiresLocationEnrollment", "requiresPayerPortalFallback", "portalFallbackReason",
              "supportsRealtime", "status", "limitations", "lastVerifiedAt")
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, current_timestamp)
           on conflict ("tenantId", "payerRegistryEntryId", "transactionFamily", "serviceLine") do update set
             "x12Transaction" = excluded."x12Transaction",
             "stediTransactionKey" = excluded."stediTransactionKey",
             "supported" = excluded."supported",
             "clearinghouse" = excluded."clearinghouse",
             "clearinghousePayerId" = excluded."clearinghousePayerId",
             "payerEnrollmentMode" = excluded."payerEnrollmentMode",
             "requiresEnrollment" = excluded."requiresEnrollment",
             "requiresProviderEnrollment" = excluded."requiresProviderEnrollment",
             "requiresLocationEnrollment" = excluded."requiresLocationEnrollment",
             "requiresPayerPortalFallback" = excluded."requiresPayerPortalFallback",
             "portalFallbackReason" = excluded."portalFallbackReason",
             "supportsRealtime" = excluded."supportsRealtime",
             "status" = excluded."status",
             "limitations" = excluded."limitations",
             "lastVerifiedAt" = current_timestamp,
             "updatedAt" = current_timestamp`,
          [
            newId("payer_cap"),
            tenantId,
            activePayerId,
            family,
            capability.x12Transaction ?? stediRequirement.x12Transaction,
            capability.stediTransactionKey ?? stediRequirement.stediTransactionKey,
            capability.supported,
            capability.clearinghouse ?? null,
            capability.clearinghousePayerId ?? row.network?.clearinghousePayerId ?? row.primaryPayerId.trim(),
            capability.payerEnrollmentMode ?? (capability.requiresEnrollment ? "PAYER_REQUIRED" : "NOT_REQUIRED"),
            capability.requiresEnrollment ?? false,
            capability.requiresProviderEnrollment ?? false,
            capability.requiresLocationEnrollment ?? false,
            capability.requiresPayerPortalFallback ?? false,
            capability.portalFallbackReason ?? null,
            capability.supportsRealtime ?? stediRequirement.realtimePreferred,
            capability.status ?? (capability.supported ? "SUPPORTED" : "UNSUPPORTED"),
            JSON.stringify({
              routePurpose: stediRequirement.routePurpose,
              proofTypes: stediRequirement.proofTypes,
              limitations: capability.limitations ?? null,
            }),
          ],
        );
      }

      if (row.network) {
        await client.query(
          `insert into "PayerNetworkModel"
             ("id", "tenantId", "payerRegistryEntryId", "networkType", "routeType", "clearinghouse", "clearinghouseRouteKey",
              "clearinghousePayerId", "directEndpoint", "portalUrl", "portalInstructions", "portalRpaProfile",
              "manualFallbackAllowed", "enrollmentStatus", "credentialingStatus", "credentialingOwnerRole",
              "credentialingDueAt", "providerNpi", "locationCode", "lastVerifiedAt")
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17::timestamp, $18, $19, current_timestamp)`,
          [
            newId("payer_net"),
            tenantId,
            activePayerId,
            row.network.networkType ?? "UNKNOWN",
            row.network.routeType ?? "BLOCKED",
            row.network.clearinghouse ?? null,
            row.network.clearinghouseRouteKey ?? null,
            row.network.clearinghousePayerId ?? row.primaryPayerId.trim(),
            row.network.directEndpoint ?? null,
            row.network.portalUrl ?? null,
            JSON.stringify(row.network.portalInstructions ?? null),
            JSON.stringify(row.network.portalRpaProfile ?? null),
            row.network.manualFallbackAllowed ?? false,
            row.network.enrollmentStatus ?? "NOT_STARTED",
            row.network.credentialingStatus ?? "UNKNOWN",
            row.network.credentialingOwnerRole ?? null,
            row.network.credentialingDueAt ?? null,
            row.network.providerNpi ?? null,
            row.network.locationCode ?? null,
          ],
        );
      }

      for (const family of PAYER_TRANSACTION_FAMILIES) {
        const policy = row.routePolicies?.[family];
        if (!policy) continue;
        await client.query(
          `insert into "PayerRoutePolicy"
             ("id", "tenantId", "payerRegistryEntryId", "transactionFamily", "preferredRouteType", "fallbackRouteType",
              "approvalPolicy", "proofRequired", "routeDecisionMetadata", "externalActionBlockedReason",
              "requiresElectronicAcknowledgement", "allowPortalRpa", "allowManualAttestation", "requiresValidatedCredential",
              "connectorHealthRequired", "clearinghouseRouteDecision")
           values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15, $16)
           on conflict ("tenantId", "payerRegistryEntryId", "transactionFamily") do update set
             "preferredRouteType" = excluded."preferredRouteType",
             "fallbackRouteType" = excluded."fallbackRouteType",
             "approvalPolicy" = excluded."approvalPolicy",
             "proofRequired" = excluded."proofRequired",
             "routeDecisionMetadata" = excluded."routeDecisionMetadata",
             "externalActionBlockedReason" = excluded."externalActionBlockedReason",
             "requiresElectronicAcknowledgement" = excluded."requiresElectronicAcknowledgement",
             "allowPortalRpa" = excluded."allowPortalRpa",
             "allowManualAttestation" = excluded."allowManualAttestation",
             "requiresValidatedCredential" = excluded."requiresValidatedCredential",
             "connectorHealthRequired" = excluded."connectorHealthRequired",
             "clearinghouseRouteDecision" = excluded."clearinghouseRouteDecision",
             "updatedAt" = current_timestamp`,
          [
            newId("payer_policy"),
            tenantId,
            activePayerId,
            family,
            policy.preferredRouteType,
            policy.fallbackRouteType ?? "MANUAL_ONLY",
            policy.approvalPolicy ?? "CONNECTOR_ACK_REQUIRED",
            JSON.stringify(policy.proofRequired ?? STEDI_STYLE_TRANSACTION_REQUIREMENTS[family].proofTypes),
            JSON.stringify(policy.routeDecisionMetadata ?? {
              clearinghouse: row.network?.clearinghouse ?? row.capabilities[family]?.clearinghouse ?? null,
              clearinghouseRouteKey: row.network?.clearinghouseRouteKey ?? null,
              clearinghousePayerId: row.capabilities[family]?.clearinghousePayerId ?? row.network?.clearinghousePayerId ?? row.primaryPayerId.trim(),
              stediTransactionKey: row.capabilities[family]?.stediTransactionKey ?? STEDI_STYLE_TRANSACTION_REQUIREMENTS[family].stediTransactionKey,
              routePurpose: STEDI_STYLE_TRANSACTION_REQUIREMENTS[family].routePurpose,
            }),
            policy.externalActionBlockedReason ?? null,
            policy.requiresElectronicAcknowledgement ?? true,
            policy.allowPortalRpa ?? false,
            policy.allowManualAttestation ?? false,
            policy.requiresValidatedCredential ?? Boolean(policy.allowPortalRpa),
            policy.connectorHealthRequired ?? ["CLEARINGHOUSE", "DIRECT_PAYER"].includes(policy.preferredRouteType),
            policy.clearinghouseRouteDecision ?? (policy.preferredRouteType === "CLEARINGHOUSE" ? "PREFERRED" : "NOT_APPLICABLE"),
          ],
        );
      }
    }

    return { snapshotId, rowCount: input.rows.length, checksum };
  });
}

export async function registerPortalCredentialReference(input: {
  payerRegistryEntryId: string;
  portalHost: string;
  credentialVaultId?: string;
  credentialStatus?: string;
  ownerRoleKey?: string;
  notes?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("payer_cred_ref");
  await query(
    `insert into "PayerPortalCredentialReference"
       ("id", "tenantId", "payerRegistryEntryId", "portalHost", "credentialVaultId", "credentialStatus", "ownerRoleKey", "notes")
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning "id"`,
    [id, tenantId, input.payerRegistryEntryId, input.portalHost, input.credentialVaultId ?? null, input.credentialStatus ?? "MISSING", input.ownerRoleKey ?? "billing_rcm", input.notes ?? null],
  );
  return { id };
}

export async function createPayerRpaRunLog(input: {
  payerRegistryEntryId: string;
  credentialReferenceId?: string;
  transactionFamily: PayerTransactionFamily;
  sourceObjectType: string;
  sourceObjectId?: string;
  botName: string;
  portalHost?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const gate = await getPayerRouteReadiness({ tenantId, payerRegistryEntryId: input.payerRegistryEntryId, transactionFamily: input.transactionFamily });
  if (!gate.row?.allowPortalRpa) {
    throw new Error(`RPA is not allowed for ${input.transactionFamily}; configure PayerRoutePolicy.allowPortalRpa and credential reference first.`);
  }
  const id = newId("payer_rpa");
  await query(
    `insert into "PayerRpaRunLog"
       ("id", "tenantId", "payerRegistryEntryId", "credentialReferenceId", "transactionFamily", "sourceObjectType", "sourceObjectId", "runStatus", "botName", "portalHost", "startedAt", "noPhiInLogs", "errorMessageRedacted")
     values ($1, $2, $3, $4, $5, $6, $7, 'STARTED', $8, $9, current_timestamp, true, null)`,
    [id, tenantId, input.payerRegistryEntryId, input.credentialReferenceId ?? gate.row.credentialReferenceId ?? null, input.transactionFamily, input.sourceObjectType, input.sourceObjectId ?? null, input.botName, input.portalHost ?? null],
  );
  return { id };
}

export async function updatePayerRpaRunLogStatus(input: {
  id: string;
  runStatus: "COMPLETED" | "FAILED" | "BLOCKED" | "NEEDS_MANUAL_REVIEW";
  resultSummary?: string;
  evidenceUri?: string;
  errorCode?: string;
  errorMessageRedacted?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const completed = ["COMPLETED", "FAILED", "BLOCKED", "NEEDS_MANUAL_REVIEW"].includes(input.runStatus);
  await query(
    `update "PayerRpaRunLog"
     set "runStatus" = $3,
       "completedAt" = case when $4::boolean then current_timestamp else "completedAt" end,
       "durationMs" = case when $4::boolean and "startedAt" is not null then extract(epoch from (current_timestamp - "startedAt"))::int * 1000 else "durationMs" end,
       "resultSummary" = $5,
       "evidenceUri" = $6,
       "errorCode" = $7,
       "errorMessageRedacted" = $8,
       "noPhiInLogs" = true
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.id, input.runStatus, completed, input.resultSummary ?? null, input.evidenceUri ?? null, input.errorCode ?? null, input.errorMessageRedacted ?? null],
  );
  return { id: input.id, runStatus: input.runStatus };
}

export async function recordPayerGeneratedArtifact(input: {
  payerRegistryEntryId?: string;
  rpaRunLogId?: string;
  sourceObjectType: string;
  sourceObjectId?: string;
  artifactType: "ELIGIBILITY_PDF" | "PRIOR_AUTH_PDF" | "EOB_PDF" | "ERA_POSTING_PDF" | "CLAIM_ATTACHMENT_PACKET" | "PAYER_SCREENSHOT_REFERENCE";
  title: string;
  storageUri: string;
  checksum?: string;
  metadata?: unknown;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("payer_artifact");
  await query(
    `insert into "PayerGeneratedArtifactReference"
       ("id", "tenantId", "payerRegistryEntryId", "rpaRunLogId", "sourceObjectType", "sourceObjectId", "artifactType", "title", "storageUri", "checksum", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [id, tenantId, input.payerRegistryEntryId ?? null, input.rpaRunLogId ?? null, input.sourceObjectType, input.sourceObjectId ?? null, input.artifactType, input.title.trim(), input.storageUri, input.checksum ?? null, JSON.stringify(input.metadata ?? null)],
  );
  return { id };
}

export async function getPayerMatrixCoverage(tenantId = defaultTenantId) {
  const result = await query(
    `select c."transactionFamily",
       count(*)::int as "payerCount",
       count(*) filter (where c."supported" = true)::int as "supportedCount",
       count(*) filter (where c."requiresPayerPortalFallback" = true)::int as "portalFallbackCount",
       count(*) filter (where c."requiresEnrollment" = true or c."requiresProviderEnrollment" = true or c."requiresLocationEnrollment" = true)::int as "enrollmentRequiredCount",
       count(*) filter (where c."payerEnrollmentMode" <> 'NOT_REQUIRED')::int as "payerEnrollmentModeCount",
       count(*) filter (where c."clearinghousePayerId" is not null)::int as "clearinghouseMappedCount",
       count(*) filter (where rp."clearinghouseRouteDecision" in ('PREFERRED', 'APPROVED', 'AVAILABLE'))::int as "approvedClearinghouseRouteCount",
       count(*) filter (where rp."requiresValidatedCredential" = true)::int as "validatedCredentialRequiredCount",
       count(*) filter (where n."credentialingStatus" in ('PENDING', 'BLOCKED', 'EXPIRED', 'DENIED'))::int as "credentialingFollowUpCount"
     from "PayerTransactionCapability" c
     left join "PayerRoutePolicy" rp
       on rp."tenantId" = c."tenantId" and rp."payerRegistryEntryId" = c."payerRegistryEntryId" and rp."transactionFamily" = c."transactionFamily"
     left join "PayerNetworkModel" n
       on n."tenantId" = c."tenantId" and n."payerRegistryEntryId" = c."payerRegistryEntryId"
       and (n."effectiveTo" is null or n."effectiveTo" >= current_timestamp)
     where c."tenantId" = $1
     group by c."transactionFamily"
     order by c."transactionFamily"`,
    [tenantId],
  );
  return result.rows;
}

function evaluatePayerReadiness(row: ReadinessRow) {
  const portalRoute = row.preferredRouteType === "PAYER_PORTAL" || row.fallbackRouteType === "PAYER_PORTAL";
  const routeMetadata = (row.routeDecisionMetadata && typeof row.routeDecisionMetadata === "object" ? row.routeDecisionMetadata : {}) as Record<string, unknown>;
  const clearinghouseRoute = row.preferredRouteType === "CLEARINGHOUSE" || row.routeType === "CLEARINGHOUSE";
  const snapshotImportedAt = row.snapshotImportedAt ? new Date(row.snapshotImportedAt) : null;
  const snapshotAgeDays = snapshotImportedAt ? Math.floor((Date.now() - snapshotImportedAt.getTime()) / 86_400_000) : null;
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
  ].filter(Boolean) as string[];

  return {
    ready: blockers.length === 0,
    blockers,
    routeDecision: {
      networkType: row.networkType,
      routeType: row.routeType,
      preferredRouteType: row.preferredRouteType,
      fallbackRouteType: row.fallbackRouteType,
      approvalPolicy: row.approvalPolicy,
      proofRequired: row.proofRequired,
      routeDecisionMetadata: row.routeDecisionMetadata,
      clearinghouseRouteDecision: row.clearinghouseRouteDecision,
      clearinghouseRouteKey: row.clearinghouseRouteKey,
      clearinghousePayerId: row.clearinghousePayerId,
      allowPortalRpa: row.allowPortalRpa,
      requiresValidatedCredential: row.requiresValidatedCredential,
      connectorHealthRequired: row.connectorHealthRequired,
      credentialingStatus: row.credentialingStatus,
      credentialStatus: row.credentialStatus,
      sourceSnapshotId: row.sourceSnapshotId,
      snapshotImportedAt: row.snapshotImportedAt,
      snapshotAgeDays,
    },
    row,
  };
}
