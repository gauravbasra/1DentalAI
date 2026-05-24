import { newId, withTransaction } from "@/lib/db";
import { buildEligibilityPdfArtifactPayload } from "@/lib/pms-eligibility-artifacts";
import { recordPayerGeneratedArtifact } from "@/lib/payer-network-repository";
import { defaultTenantId } from "@/lib/pms-repository";

type PortalLayoutField = {
  fieldKey: string;
  label: string;
  selector: string;
  valueType: "TEXT" | "MONEY" | "DATE" | "BOOLEAN" | "PERCENT" | "JSON";
  pmsTarget:
    | "PmsPatientInsurance.eligibilityStatus"
    | "PmsPatientInsurance.verificationNote"
    | "PmsBenefitSummary.deductibleCents"
    | "PmsBenefitSummary.deductibleMetCents"
    | "PmsBenefitSummary.annualMaxCents"
    | "PmsBenefitSummary.annualUsedCents"
    | "PmsBenefitSummary.frequencies"
    | "PmsBenefitSummary.limitations";
  requiredForWriteback?: boolean;
  redactionPolicy?: "MASK_IN_SCREENSHOT" | "ALLOW" | "OMIT_FROM_LOG";
  confidenceThreshold?: number;
};

type ScrapedField = {
  fieldKey: string;
  value: unknown;
  text?: string;
  selector: string;
  confidence: number;
  screenshotRegion?: { x: number; y: number; width: number; height: number };
  evidenceFingerprint?: string;
};

type BrowserEvidenceManifest = {
  sourceTraceId: string;
  portalHost?: string;
  screenshotChecksum: string;
  fieldEvidenceHash: string;
  scrapedFieldCount: number;
  extractedFieldKeys: string[];
  missingFieldKeys: string[];
  lowConfidenceFieldKeys: string[];
  selectorMap: Array<{ fieldKey: string; selector: string; confidence: number; evidenceFingerprint: string }>;
  layoutDriftEvidence: Array<{ fieldKey: string; selector: string; reason: "MISSING_SELECTOR" | "LOW_CONFIDENCE"; confidence: number }>;
  extractionAttempts?: Array<{ fieldKey: string; selector: string; method: string; success: boolean; textLength: number; confidence: number }>;
  sessionState?: { loaded: boolean; saved: boolean; storageStatePath?: string; checkpointStatus: "SESSION_READY" | "MANUAL_CHECKPOINT_REQUIRED" };
  noPhiInLogs: true;
};

type NormalizedEligibility = {
  eligibilityStatus: "ACTIVE" | "INACTIVE" | "NEEDS_REVIEW";
  benefitYear?: number;
  deductibleCents?: number;
  deductibleMetCents?: number;
  annualMaxCents?: number;
  annualUsedCents?: number;
  frequencies?: unknown;
  limitations?: unknown;
  payerNotes?: string[];
};

export async function prepareEligibilityEvidenceArtifacts(input: {
  patientInsuranceId: string;
  payerRegistryEntryId: string;
  rpaRunLogId: string;
  payerName: string;
  planName: string;
  subscriberIdLastFour: string;
  screenshotStorageUri: string;
  screenshotChecksum: string;
  normalized: NormalizedEligibility;
  browserEvidenceManifest?: BrowserEvidenceManifest;
  portalHost?: string;
  actorRole?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  if (!input.screenshotStorageUri || !input.screenshotChecksum) {
    throw new Error("Eligibility evidence artifacts require a screenshot URI and checksum.");
  }
  if (input.browserEvidenceManifest && input.browserEvidenceManifest.screenshotChecksum !== input.screenshotChecksum) {
    throw new Error("Browser evidence manifest checksum does not match prepared screenshot artifact.");
  }

  const screenshotArtifact = await recordPayerGeneratedArtifact({
    tenantId,
    payerRegistryEntryId: input.payerRegistryEntryId,
    rpaRunLogId: input.rpaRunLogId,
    sourceObjectType: "PmsPatientInsurance",
    sourceObjectId: input.patientInsuranceId,
    artifactType: "PAYER_SCREENSHOT_REFERENCE",
    title: `Eligibility portal screenshot ${input.payerName}`,
    storageUri: input.screenshotStorageUri,
    checksum: input.screenshotChecksum,
    metadata: {
      portalHost: input.portalHost ?? null,
      sourceTraceId: input.browserEvidenceManifest?.sourceTraceId ?? null,
      fieldEvidenceHash: input.browserEvidenceManifest?.fieldEvidenceHash ?? null,
      scrapedFieldCount: input.browserEvidenceManifest?.scrapedFieldCount ?? null,
      layoutDriftEvidence: input.browserEvidenceManifest?.layoutDriftEvidence ?? [],
      extractionAttemptCount: input.browserEvidenceManifest?.extractionAttempts?.length ?? null,
      sessionCheckpointStatus: input.browserEvidenceManifest?.sessionState?.checkpointStatus ?? null,
      generatedBy: input.actorRole ?? "payer_rpa_bot",
      noPhiInLogs: true,
      redactedPhiScreenshotRequired: true,
    },
  });

  const pdfPayload = buildEligibilityPdfArtifactPayload({
    tenantId,
    patientInsuranceId: input.patientInsuranceId,
    payerName: input.payerName,
    planName: input.planName,
    subscriberIdLastFour: input.subscriberIdLastFour,
    eligibilityStatus: input.normalized.eligibilityStatus,
    benefitYear: input.normalized.benefitYear ?? new Date().getFullYear(),
    deductibleCents: input.normalized.deductibleCents ?? 0,
    deductibleMetCents: input.normalized.deductibleMetCents ?? 0,
    annualMaxCents: input.normalized.annualMaxCents ?? 0,
    annualUsedCents: input.normalized.annualUsedCents ?? 0,
    frequencies: input.normalized.frequencies,
    limitations: input.normalized.limitations,
    payerNotes: input.normalized.payerNotes,
    screenshotArtifactId: screenshotArtifact.id,
    rpaRunLogId: input.rpaRunLogId,
    sourceTraceId: input.browserEvidenceManifest?.sourceTraceId,
    fieldEvidenceHash: input.browserEvidenceManifest?.fieldEvidenceHash,
    layoutDriftEvidence: input.browserEvidenceManifest?.layoutDriftEvidence,
  });

  const pdfArtifact = await recordPayerGeneratedArtifact({
    tenantId,
    payerRegistryEntryId: input.payerRegistryEntryId,
    rpaRunLogId: input.rpaRunLogId,
    sourceObjectType: "PmsPatientInsurance",
    sourceObjectId: input.patientInsuranceId,
    artifactType: pdfPayload.artifactType,
    title: pdfPayload.title,
    storageUri: `artifact://eligibility-pdf/${pdfPayload.checksum}.html`,
    checksum: pdfPayload.checksum,
    metadata: {
      ...pdfPayload.metadata,
      contentType: pdfPayload.contentType,
      generatedBy: input.actorRole ?? "payer_rpa_bot",
      browserEvidenceManifest: input.browserEvidenceManifest ? sanitizeBrowserEvidenceManifest(input.browserEvidenceManifest) : null,
      renderReady: true,
    },
  });

  return {
    screenshotArtifactId: screenshotArtifact.id,
    pdfArtifactId: pdfArtifact.id,
    pdfChecksum: pdfPayload.checksum,
    pdfStorageUri: `artifact://eligibility-pdf/${pdfPayload.checksum}.html`,
  };
}

export async function registerEligibilityPortalLayout(input: {
  payerRegistryEntryId: string;
  portalHost: string;
  layoutKey: string;
  layoutVersion: string;
  loginPath?: string;
  eligibilityPath?: string;
  screenshotPolicy: {
    required: true;
    redactPhi: true;
    baselineArtifactId?: string;
    driftDetection: "REJECT_ON_MISSING_SELECTOR" | "WARN_ONLY";
  };
  navigationSteps: unknown[];
  fields: PortalLayoutField[];
  actorRole?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  if (!input.fields.some((field) => field.pmsTarget === "PmsPatientInsurance.eligibilityStatus")) {
    throw new Error("Eligibility portal layout must map a status field.");
  }
  if (!input.screenshotPolicy.required || !input.screenshotPolicy.redactPhi) {
    throw new Error("Eligibility portal layout must require redacted screenshot evidence.");
  }

  return withTransaction(async (client) => {
    const layoutId = newId("payer_layout");
    const layout = (await client.query<{ id: string }>(
      `insert into "PayerPortalLayout"
         ("id", "tenantId", "payerRegistryEntryId", "portalHost", "layoutKey", "layoutVersion", "loginPath", "eligibilityPath", "screenshotPolicy", "navigationSteps", "lastVerifiedAt", "createdByRole")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, current_timestamp, $11)
       on conflict ("tenantId", "payerRegistryEntryId", "layoutKey", "layoutVersion") do update set
         "portalHost" = excluded."portalHost",
         "loginPath" = excluded."loginPath",
         "eligibilityPath" = excluded."eligibilityPath",
         "screenshotPolicy" = excluded."screenshotPolicy",
         "navigationSteps" = excluded."navigationSteps",
         "lastVerifiedAt" = current_timestamp,
         "status" = 'ACTIVE',
         "updatedAt" = current_timestamp
       returning "id"`,
      [
        layoutId,
        tenantId,
        input.payerRegistryEntryId,
        input.portalHost,
        input.layoutKey,
        input.layoutVersion,
        input.loginPath ?? null,
        input.eligibilityPath ?? null,
        JSON.stringify(input.screenshotPolicy),
        JSON.stringify(input.navigationSteps),
        input.actorRole ?? "integration_worker",
      ],
    )).rows[0];
    if (!layout) throw new Error("Portal layout registration failed.");

    await client.query(`delete from "PayerPortalLayoutField" where "tenantId" = $1 and "layoutId" = $2`, [tenantId, layout.id]);
    for (const field of input.fields) {
      await client.query(
        `insert into "PayerPortalLayoutField"
           ("id", "tenantId", "layoutId", "fieldKey", "label", "selector", "valueType", "pmsTarget", "requiredForWriteback", "redactionPolicy", "confidenceThreshold")
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newId("payer_layout_field"),
          tenantId,
          layout.id,
          field.fieldKey,
          field.label,
          field.selector,
          field.valueType,
          field.pmsTarget,
          field.requiredForWriteback ?? true,
          field.redactionPolicy ?? "MASK_IN_SCREENSHOT",
          field.confidenceThreshold ?? 85,
        ],
      );
    }

    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'PAYER_PORTAL_LAYOUT_REGISTERED', 'PayerPortalLayout', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "integration_worker", layout.id, JSON.stringify({ payerRegistryEntryId: input.payerRegistryEntryId, fieldCount: input.fields.length })],
    );

    return { id: layout.id };
  });
}

export async function recordEligibilityScreenScrape(input: {
  patientInsuranceId: string;
  payerRegistryEntryId: string;
  rpaRunLogId: string;
  portalLayoutId: string;
  screenshotArtifactId: string;
  pdfArtifactId: string;
  sourceTraceId?: string;
  normalized: NormalizedEligibility;
  scrapedFields: ScrapedField[];
  browserEvidenceManifest?: BrowserEvidenceManifest;
  actorRole?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  if (!input.screenshotArtifactId || !input.pdfArtifactId) {
    throw new Error("Eligibility writeback requires both screenshot and PDF artifact references.");
  }

  return withTransaction(async (client) => {
    const coverage = (await client.query<{ id: string; tenantId: string | null }>(
      `select "id", "tenantId" from "PmsPatientInsurance" where "id" = $1 and "tenantId" = $2`,
      [input.patientInsuranceId, tenantId],
    )).rows[0];
    if (!coverage) throw new Error("Patient insurance coverage was not found in this tenant.");

    const rpaRun = (await client.query<{ id: string }>(
      `select "id" from "PayerRpaRunLog"
       where "tenantId" = $1 and "id" = $2 and "payerRegistryEntryId" = $3 and "transactionFamily" = 'ELIGIBILITY_270_271'
         and "sourceObjectType" = 'PmsPatientInsurance' and "sourceObjectId" = $4 and "noPhiInLogs" = true
       limit 1`,
      [tenantId, input.rpaRunLogId, input.payerRegistryEntryId, input.patientInsuranceId],
    )).rows[0];
    if (!rpaRun) throw new Error("Eligibility RPA run log is missing, cross-tenant, or not bound to this coverage.");

    const artifacts = (await client.query<{ id: string; artifactType: string; checksum: string | null; storageUri: string }>(
      `select "id", "artifactType", "checksum", "storageUri"
       from "PayerGeneratedArtifactReference"
       where "tenantId" = $1 and "id" = any($2::text[]) and "sourceObjectType" = 'PmsPatientInsurance' and "sourceObjectId" = $3`,
      [tenantId, [input.screenshotArtifactId, input.pdfArtifactId], input.patientInsuranceId],
    )).rows;
    const screenshotArtifact = artifacts.find((artifact) => artifact.id === input.screenshotArtifactId && artifact.artifactType === "PAYER_SCREENSHOT_REFERENCE");
    const pdfArtifact = artifacts.find((artifact) => artifact.id === input.pdfArtifactId && artifact.artifactType === "ELIGIBILITY_PDF");
    if (!screenshotArtifact?.checksum || !pdfArtifact?.checksum) {
      throw new Error("Eligibility evidence requires tenant-scoped screenshot and PDF artifacts with checksums.");
    }
    if (input.browserEvidenceManifest) {
      assertBrowserEvidenceManifestLinked({
        manifest: input.browserEvidenceManifest,
        screenshotChecksum: screenshotArtifact.checksum,
        sourceTraceId: input.sourceTraceId,
        scrapedFields: input.scrapedFields,
      });
    }

    const layout = (await client.query<{ id: string }>(
      `select "id" from "PayerPortalLayout"
       where "tenantId" = $1 and "id" = $2 and "payerRegistryEntryId" = $3 and "status" = 'ACTIVE'
       limit 1`,
      [tenantId, input.portalLayoutId, input.payerRegistryEntryId],
    )).rows[0];
    if (!layout) throw new Error("Active portal layout is required for this payer before evidence can be accepted.");

    const layoutFields = (await client.query<{
      fieldKey: string;
      selector: string;
      pmsTarget: string;
      requiredForWriteback: boolean;
      confidenceThreshold: number;
    }>(
      `select "fieldKey", "selector", "pmsTarget", "requiredForWriteback", "confidenceThreshold"
       from "PayerPortalLayoutField"
       where "tenantId" = $1 and "layoutId" = $2`,
      [tenantId, input.portalLayoutId],
    )).rows;
    if (!layoutFields.length) throw new Error("Portal layout fields are required before scrape evidence can be accepted.");

    const scrapedByKey = new Map(input.scrapedFields.map((field) => [field.fieldKey, field]));
    const blockers = layoutFields.flatMap((field) => {
      if (!field.requiredForWriteback) return [];
      const scraped = scrapedByKey.get(field.fieldKey);
      if (!scraped) return [`Missing required selector ${field.fieldKey}.`];
      if (scraped.selector !== field.selector) return [`Selector drift for ${field.fieldKey}.`];
      if (scraped.confidence < field.confidenceThreshold) return [`Low confidence for ${field.fieldKey}.`];
      return [];
    });
    if (blockers.length) {
      await client.query(
        `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
         values ($1, $2, $3, 'ELIGIBILITY_RPA_SCREEN_SCRAPE_REJECTED', 'PayerRpaRunLog', $4, 'BLOCKED', $5::jsonb)`,
        [newId("audit"), tenantId, input.actorRole ?? "payer_rpa_bot", input.rpaRunLogId, JSON.stringify({ blockers, noPhiInLogs: true })],
      );
      throw new Error(`Eligibility scrape rejected: ${blockers.join(" ")}`);
    }

    const evidenceId = newId("elig_evidence");
    await client.query(
      `insert into "PmsEligibilityEvidence"
         ("id", "tenantId", "patientInsuranceId", "payerRegistryEntryId", "rpaRunLogId", "portalLayoutId", "sourceTraceId",
          "eligibilityStatus", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents",
          "frequencies", "limitations", "normalizedFields", "rawFieldEvidence", "screenshotArtifactId", "pdfArtifactId")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18, $19)`,
      [
        evidenceId,
        tenantId,
        input.patientInsuranceId,
        input.payerRegistryEntryId,
        input.rpaRunLogId,
        input.portalLayoutId,
        input.sourceTraceId ?? input.browserEvidenceManifest?.sourceTraceId ?? null,
        input.normalized.eligibilityStatus,
        input.normalized.benefitYear ?? new Date().getFullYear(),
        input.normalized.deductibleCents ?? 0,
        input.normalized.deductibleMetCents ?? 0,
        input.normalized.annualMaxCents ?? 0,
        input.normalized.annualUsedCents ?? 0,
        JSON.stringify(input.normalized.frequencies ?? null),
        JSON.stringify(input.normalized.limitations ?? null),
        JSON.stringify(input.normalized),
        JSON.stringify(buildPhiSafeRawFieldEvidence(input.scrapedFields, input.browserEvidenceManifest)),
        input.screenshotArtifactId,
        input.pdfArtifactId,
      ],
    );

    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'ELIGIBILITY_RPA_EVIDENCE_CAPTURED', 'PmsEligibilityEvidence', $4, 'ALLOWED', $5::jsonb)`,
      [
        newId("audit"),
        tenantId,
        input.actorRole ?? "payer_rpa_bot",
        evidenceId,
        JSON.stringify({
          screenshotArtifactId: input.screenshotArtifactId,
          pdfArtifactId: input.pdfArtifactId,
          sourceTraceId: input.sourceTraceId ?? input.browserEvidenceManifest?.sourceTraceId ?? null,
          fieldEvidenceHash: input.browserEvidenceManifest?.fieldEvidenceHash ?? null,
          layoutDriftEvidence: input.browserEvidenceManifest?.layoutDriftEvidence ?? [],
          extractionAttemptCount: input.browserEvidenceManifest?.extractionAttempts?.length ?? null,
          sessionCheckpointStatus: input.browserEvidenceManifest?.sessionState?.checkpointStatus ?? null,
          fieldCount: input.scrapedFields.length,
          noPhiInLogs: true,
        }),
      ],
    );

    return { id: evidenceId };
  });
}

function assertBrowserEvidenceManifestLinked(input: {
  manifest: BrowserEvidenceManifest;
  screenshotChecksum: string;
  sourceTraceId?: string;
  scrapedFields: ScrapedField[];
}) {
  if (input.manifest.noPhiInLogs !== true) throw new Error("Browser evidence manifest must assert noPhiInLogs.");
  if (input.manifest.screenshotChecksum !== input.screenshotChecksum) {
    throw new Error("Browser evidence manifest checksum does not match screenshot artifact.");
  }
  if (input.sourceTraceId && input.manifest.sourceTraceId !== input.sourceTraceId) {
    throw new Error("Browser evidence manifest trace does not match scrape source trace.");
  }
  const scrapedFieldKeys = new Set(input.scrapedFields.map((field) => field.fieldKey));
  const manifestFieldKeys = new Set(input.manifest.selectorMap.map((field) => field.fieldKey));
  for (const fieldKey of scrapedFieldKeys) {
    if (!manifestFieldKeys.has(fieldKey)) throw new Error(`Browser evidence manifest missing selector evidence for ${fieldKey}.`);
  }
}

function buildPhiSafeRawFieldEvidence(scrapedFields: ScrapedField[], manifest?: BrowserEvidenceManifest) {
  const manifestByField = new Map(manifest?.selectorMap.map((field) => [field.fieldKey, field]) ?? []);
  return scrapedFields.map(({ fieldKey, selector, confidence, screenshotRegion, evidenceFingerprint }) => ({
    fieldKey,
    selector,
    confidence,
    screenshotRegion,
    evidenceFingerprint: evidenceFingerprint ?? manifestByField.get(fieldKey)?.evidenceFingerprint ?? null,
  }));
}

function sanitizeBrowserEvidenceManifest(manifest: BrowserEvidenceManifest) {
  return {
    sourceTraceId: manifest.sourceTraceId,
    portalHost: manifest.portalHost ?? null,
    screenshotChecksum: manifest.screenshotChecksum,
    fieldEvidenceHash: manifest.fieldEvidenceHash,
    scrapedFieldCount: manifest.scrapedFieldCount,
    extractedFieldKeys: manifest.extractedFieldKeys,
    missingFieldKeys: manifest.missingFieldKeys,
    lowConfidenceFieldKeys: manifest.lowConfidenceFieldKeys,
    selectorMap: manifest.selectorMap,
    layoutDriftEvidence: manifest.layoutDriftEvidence,
    extractionAttempts: manifest.extractionAttempts ?? [],
    sessionState: manifest.sessionState ? { ...manifest.sessionState, storageStatePath: manifest.sessionState.storageStatePath ? "[redacted-session-state-path]" : undefined } : null,
    noPhiInLogs: true,
  };
}

export async function applyEligibilityEvidenceToPms(input: {
  evidenceId: string;
  actorRole?: string;
  tenantId?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const evidence = (await client.query<{
      id: string;
      patientInsuranceId: string;
      eligibilityStatus: string;
      benefitYear: number;
      deductibleCents: number;
      deductibleMetCents: number;
      annualMaxCents: number;
      annualUsedCents: number;
      frequencies: unknown;
      limitations: unknown;
      screenshotArtifactId: string;
      pdfArtifactId: string;
    }>(
      `select "id", "patientInsuranceId", "eligibilityStatus", "benefitYear", "deductibleCents", "deductibleMetCents",
        "annualMaxCents", "annualUsedCents", "frequencies", "limitations", "screenshotArtifactId", "pdfArtifactId"
       from "PmsEligibilityEvidence"
       where "tenantId" = $1 and "id" = $2 and "writebackStatus" = 'PENDING_REVIEW'
       limit 1
       for update`,
      [tenantId, input.evidenceId],
    )).rows[0];
    if (!evidence) throw new Error("Eligibility evidence is missing, already applied, or outside this tenant.");
    if (!evidence.screenshotArtifactId || !evidence.pdfArtifactId) throw new Error("Eligibility evidence cannot be applied without screenshot and PDF proof.");
    const coverage = (await client.query<{ id: string }>(
      `select "id" from "PmsPatientInsurance"
       where "tenantId" = $1 and "id" = $2
       limit 1
       for update`,
      [tenantId, evidence.patientInsuranceId],
    )).rows[0];
    if (!coverage) throw new Error("Eligibility evidence cannot be applied because the coverage is missing or outside this tenant.");
    const artifactCount = Number((await client.query<{ count: string }>(
      `select count(*)::text as count
       from "PayerGeneratedArtifactReference"
       where "tenantId" = $1
         and "sourceObjectType" = 'PmsPatientInsurance'
         and "sourceObjectId" = $2
         and (
           ("id" = $3 and "artifactType" = 'PAYER_SCREENSHOT_REFERENCE' and coalesce("checksum", '') <> '')
           or ("id" = $4 and "artifactType" = 'ELIGIBILITY_PDF' and coalesce("checksum", '') <> '')
         )`,
      [tenantId, evidence.patientInsuranceId, evidence.screenshotArtifactId, evidence.pdfArtifactId],
    )).rows[0]?.count ?? 0);
    if (artifactCount !== 2) throw new Error("Eligibility writeback requires tenant-scoped screenshot and PDF artifacts with checksums at apply time.");
    const writebackPayload = buildEligibilityPmsWritebackPayload(evidence);

    const insuranceUpdate = await client.query(
      `update "PmsPatientInsurance"
       set "eligibilityStatus" = $3, "lastVerifiedAt" = current_timestamp,
         "verificationNote" = $4, "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [
        tenantId,
        writebackPayload.insuranceSection.patientInsuranceId,
        writebackPayload.insuranceSection.eligibilityStatus,
        writebackPayload.insuranceSection.verificationNote,
      ],
    );
    if (insuranceUpdate.rowCount !== 1) throw new Error("Eligibility writeback aborted because coverage update did not affect exactly one row.");

    const benefitUpsert = await client.query(
      `insert into "PmsBenefitSummary"
         ("id", "tenantId", "patientInsuranceId", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents", "frequencies", "limitations", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, current_timestamp)
       on conflict ("tenantId", "patientInsuranceId", "benefitYear") do update set
         "deductibleCents" = excluded."deductibleCents",
         "deductibleMetCents" = excluded."deductibleMetCents",
         "annualMaxCents" = excluded."annualMaxCents",
         "annualUsedCents" = excluded."annualUsedCents",
         "frequencies" = excluded."frequencies",
         "limitations" = excluded."limitations",
         "updatedAt" = current_timestamp`,
      [
        newId("ben"),
        tenantId,
        writebackPayload.benefitSummarySection.patientInsuranceId,
        writebackPayload.benefitSummarySection.benefitYear,
        writebackPayload.benefitSummarySection.deductibleCents,
        writebackPayload.benefitSummarySection.deductibleMetCents,
        writebackPayload.benefitSummarySection.annualMaxCents,
        writebackPayload.benefitSummarySection.annualUsedCents,
        JSON.stringify(writebackPayload.benefitSummarySection.frequencies ?? null),
        JSON.stringify(writebackPayload.benefitSummarySection.limitations ?? null),
      ],
    );
    if (benefitUpsert.rowCount !== 1) throw new Error("Eligibility writeback aborted because benefit summary upsert did not affect exactly one row.");

    const evidenceUpdate = await client.query(
      `update "PmsEligibilityEvidence"
       set "writebackStatus" = 'APPLIED', "reviewedByRole" = $3, "reviewedAt" = current_timestamp, "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [tenantId, evidence.id, input.actorRole ?? "insurance_coordinator"],
    );
    if (evidenceUpdate.rowCount !== 1) throw new Error("Eligibility writeback aborted because evidence status update did not affect exactly one row.");
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'ELIGIBILITY_RPA_WRITEBACK_APPLIED', 'PmsEligibilityEvidence', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "insurance_coordinator", evidence.id, JSON.stringify({ ...writebackPayload.auditSection, noPhiInLogs: true })],
    );

    return { id: evidence.id, patientInsuranceId: evidence.patientInsuranceId, eligibilityStatus: evidence.eligibilityStatus };
  });
}

function buildEligibilityPmsWritebackPayload(evidence: {
  id: string;
  patientInsuranceId: string;
  eligibilityStatus: string;
  benefitYear: number;
  deductibleCents: number;
  deductibleMetCents: number;
  annualMaxCents: number;
  annualUsedCents: number;
  frequencies: unknown;
  limitations: unknown;
  screenshotArtifactId: string;
  pdfArtifactId: string;
}) {
  return {
    insuranceSection: {
      patientInsuranceId: evidence.patientInsuranceId,
      eligibilityStatus: evidence.eligibilityStatus,
      verificationNote: `Payer portal RPA evidence ${evidence.id}; PDF ${evidence.pdfArtifactId}`,
      sourceEvidenceId: evidence.id,
    },
    benefitSummarySection: {
      patientInsuranceId: evidence.patientInsuranceId,
      benefitYear: evidence.benefitYear,
      deductibleCents: evidence.deductibleCents,
      deductibleMetCents: evidence.deductibleMetCents,
      annualMaxCents: evidence.annualMaxCents,
      annualUsedCents: evidence.annualUsedCents,
      frequencies: evidence.frequencies,
      limitations: evidence.limitations,
    },
    auditSection: {
      patientInsuranceId: evidence.patientInsuranceId,
      screenshotArtifactId: evidence.screenshotArtifactId,
      pdfArtifactId: evidence.pdfArtifactId,
      writebackSections: ["PmsPatientInsurance", "PmsBenefitSummary"],
      sourceEvidenceId: evidence.id,
    },
  };
}
