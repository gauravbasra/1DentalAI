import { createHash } from "node:crypto";

type PriorAuthPacketInput = {
  tenantId: string;
  priorAuthorizationId: string;
  patientLabel: string;
  payerName: string;
  requestedCents: number;
  treatmentPlanName?: string | null;
  requiredEvidence?: unknown;
  treatmentPlanEvidence?: unknown;
  clinicalNarrative?: string;
  generatedAt?: string;
};

type EobPostingInput = {
  tenantId: string;
  eraPostingId: string;
  claimId: string;
  patientLabel: string;
  payerName: string;
  allowedCents: number;
  paidCents: number;
  patientDueCents: number;
  adjustmentCents: number;
  eraTraceNumber?: string | null;
  adjudicationLines?: EobAdjudicationLineInput[];
  adjustmentSummary?: unknown;
  generatedAt?: string;
};

type EobAdjudicationLineInput = {
  claimLineId: string;
  procedureCode: string;
  serviceDate?: string | null;
  tooth?: string | null;
  surface?: string | null;
  billedCents: number;
  allowedCents: number;
  paidCents: number;
  deductibleCents: number;
  copayCents: number;
  coinsuranceCents: number;
  writeoffCents: number;
  denialCents?: number;
  otherAdjustmentCents?: number;
  patientResponsibilityCents?: number;
  carcCodes?: string[];
  rarcCodes?: string[];
  status?: string;
};

type NormalizedEobLine = Required<Omit<EobAdjudicationLineInput, "serviceDate" | "tooth" | "surface" | "status">> & {
  serviceDate: string | null;
  tooth: string | null;
  surface: string | null;
  status: string;
  patientResponsibilityVarianceCents: number;
  lineBalanceVarianceCents: number;
};

export function buildPriorAuthPacketHtml(input: PriorAuthPacketInput) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Prior Authorization Packet</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      .meta { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
      th { background: #f3f4f6; width: 32%; }
      pre { white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Prior Authorization Evidence Packet</h1>
    <div class="meta">Generated ${escapeHtml(generatedAt)} · Tenant ${escapeHtml(input.tenantId)} · Prior auth ${escapeHtml(input.priorAuthorizationId)}</div>
    <table>
      <tbody>
        <tr><th>Patient</th><td>${escapeHtml(input.patientLabel)}</td></tr>
        <tr><th>Payer</th><td>${escapeHtml(input.payerName)}</td></tr>
        <tr><th>Treatment plan</th><td>${escapeHtml(input.treatmentPlanName ?? "Not linked")}</td></tr>
        <tr><th>Requested amount</th><td>${escapeHtml(money(input.requestedCents))}</td></tr>
      </tbody>
    </table>
    <h2>Clinical Narrative</h2>
    <pre>${escapeHtml(input.clinicalNarrative ?? "Provider narrative required before external payer submission.")}</pre>
    <h2>Required Evidence</h2>
    <pre>${escapeHtml(JSON.stringify(input.requiredEvidence ?? [], null, 2))}</pre>
    <h2>Treatment Plan Evidence</h2>
    <pre>${escapeHtml(JSON.stringify(input.treatmentPlanEvidence ?? [], null, 2))}</pre>
  </body>
</html>`;
}

export function buildPriorAuthPdfArtifactPayload(input: PriorAuthPacketInput) {
  const html = buildPriorAuthPacketHtml(input);
  const checksum = checksumHtml(html);
  return {
    artifactType: "PRIOR_AUTH_PDF" as const,
    title: `Prior authorization packet ${input.payerName}`,
    contentType: "text/html; pdf-render-ready",
    html,
    checksum,
    metadata: {
      priorAuthorizationId: input.priorAuthorizationId,
      noPhiInLogs: true,
      humanApprovalRequired: true,
      externalSubmissionBlockedWithoutAck: true,
    },
  };
}

export function buildEobPostingHtml(input: EobPostingInput) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const adjudication = normalizeEobAdjudication(input);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>EOB Posting Proof</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      .meta { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
      th { background: #f3f4f6; width: 32%; }
      .lines th { width: auto; font-size: 11px; }
      .lines td { font-size: 11px; vertical-align: top; }
      pre { white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>EOB / ERA Posting Proof</h1>
    <div class="meta">Generated ${escapeHtml(generatedAt)} · Tenant ${escapeHtml(input.tenantId)} · ERA posting ${escapeHtml(input.eraPostingId)}</div>
    <table>
      <tbody>
        <tr><th>Patient</th><td>${escapeHtml(input.patientLabel)}</td></tr>
        <tr><th>Payer</th><td>${escapeHtml(input.payerName)}</td></tr>
        <tr><th>Claim</th><td>${escapeHtml(input.claimId)}</td></tr>
        <tr><th>ERA trace</th><td>${escapeHtml(input.eraTraceNumber ?? "Manual EOB")}</td></tr>
        <tr><th>Allowed</th><td>${escapeHtml(money(input.allowedCents))}</td></tr>
        <tr><th>Paid</th><td>${escapeHtml(money(input.paidCents))}</td></tr>
        <tr><th>Patient due</th><td>${escapeHtml(money(input.patientDueCents))}</td></tr>
        <tr><th>Adjustment</th><td>${escapeHtml(money(input.adjustmentCents))}</td></tr>
        <tr><th>Posting variance</th><td>${escapeHtml(money(adjudication.postingVarianceCents))}</td></tr>
      </tbody>
    </table>
    <h2>Line-Level 835 / EOB Adjudication</h2>
    <table class="lines">
      <thead>
        <tr>
          <th>Claim line</th>
          <th>CDT</th>
          <th>Service</th>
          <th>Billed</th>
          <th>Allowed</th>
          <th>Paid</th>
          <th>Deductible</th>
          <th>Copay</th>
          <th>Coinsurance</th>
          <th>Write-off</th>
          <th>Denial</th>
          <th>Other adj.</th>
          <th>Patient resp.</th>
          <th>CARC</th>
          <th>RARC</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${adjudication.lines.map(renderEobLine).join("\n")}
      </tbody>
    </table>
    <h2>Balancing Rules</h2>
    <pre>${escapeHtml(JSON.stringify(adjudication.metadata, null, 2))}</pre>
    <h2>Adjustment Summary</h2>
    <pre>${escapeHtml(JSON.stringify(input.adjustmentSummary ?? {}, null, 2))}</pre>
  </body>
</html>`;
}

export function buildEobPdfArtifactPayload(input: EobPostingInput) {
  const html = buildEobPostingHtml(input);
  const checksum = checksumHtml(html);
  const adjudication = normalizeEobAdjudication(input);
  return {
    artifactType: "EOB_PDF" as const,
    title: `EOB posting proof ${input.payerName}`,
    contentType: "text/html; pdf-render-ready",
    html,
    checksum,
    metadata: {
      eraPostingId: input.eraPostingId,
      claimId: input.claimId,
      adjudicationModel: "LINE_LEVEL_835_EOB",
      lineCount: adjudication.lines.length,
      lineClaimLineIds: adjudication.lines.map((line) => line.claimLineId),
      totals: adjudication.totals,
      postingVarianceCents: adjudication.postingVarianceCents,
      balancedForPosting: adjudication.balancedForPosting,
      requiresLineLevelAdjudication: true,
      summaryOnlyRejected: true,
      pdfReadyLineAdjudication: true,
      noPhiInLogs: true,
      ledgerPostingRequiresReview: true,
      denialCodes: {
        carc: uniqueFlat(adjudication.lines.map((line) => line.carcCodes)),
        rarc: uniqueFlat(adjudication.lines.map((line) => line.rarcCodes)),
      },
    },
  };
}

function normalizeEobAdjudication(input: EobPostingInput) {
  if (!input.adjudicationLines?.length) {
    throw new Error("EOB proof requires line-level 835/EOB adjudication; summary-only EOBs are not accepted.");
  }

  const lines = input.adjudicationLines.map((line) => normalizeEobLine(line));
  const totals = lines.reduce(
    (sum, line) => ({
      billedCents: sum.billedCents + line.billedCents,
      allowedCents: sum.allowedCents + line.allowedCents,
      paidCents: sum.paidCents + line.paidCents,
      deductibleCents: sum.deductibleCents + line.deductibleCents,
      copayCents: sum.copayCents + line.copayCents,
      coinsuranceCents: sum.coinsuranceCents + line.coinsuranceCents,
      writeoffCents: sum.writeoffCents + line.writeoffCents,
      denialCents: sum.denialCents + line.denialCents,
      otherAdjustmentCents: sum.otherAdjustmentCents + line.otherAdjustmentCents,
      patientResponsibilityCents: sum.patientResponsibilityCents + line.patientResponsibilityCents,
      lineBalanceVarianceCents: sum.lineBalanceVarianceCents + Math.abs(line.lineBalanceVarianceCents),
      patientResponsibilityVarianceCents: sum.patientResponsibilityVarianceCents + Math.abs(line.patientResponsibilityVarianceCents),
    }),
    {
      billedCents: 0,
      allowedCents: 0,
      paidCents: 0,
      deductibleCents: 0,
      copayCents: 0,
      coinsuranceCents: 0,
      writeoffCents: 0,
      denialCents: 0,
      otherAdjustmentCents: 0,
      patientResponsibilityCents: 0,
      lineBalanceVarianceCents: 0,
      patientResponsibilityVarianceCents: 0,
    },
  );
  const adjustmentCents = totals.writeoffCents + totals.denialCents + totals.otherAdjustmentCents;
  const postingVarianceCents = input.allowedCents - input.paidCents - input.patientDueCents - input.adjustmentCents;
  const metadata = {
    inputTotalsMatchLines:
      input.allowedCents === totals.allowedCents &&
      input.paidCents === totals.paidCents &&
      input.patientDueCents === totals.patientResponsibilityCents &&
      input.adjustmentCents === adjustmentCents,
    lineBalancesToAllowed: totals.lineBalanceVarianceCents === 0,
    patientResponsibilityBalances: totals.patientResponsibilityVarianceCents === 0,
    postingVarianceCents,
    adjustmentCents,
  };

  return {
    lines,
    totals: { ...totals, adjustmentCents },
    metadata,
    postingVarianceCents,
    balancedForPosting: metadata.inputTotalsMatchLines && metadata.lineBalancesToAllowed && metadata.patientResponsibilityBalances && postingVarianceCents === 0,
  };
}

function normalizeEobLine(line: EobAdjudicationLineInput): NormalizedEobLine {
  const patientResponsibilityCents = line.patientResponsibilityCents ?? line.deductibleCents + line.copayCents + line.coinsuranceCents;
  return {
    claimLineId: line.claimLineId,
    procedureCode: line.procedureCode,
    serviceDate: line.serviceDate ?? null,
    tooth: line.tooth ?? null,
    surface: line.surface ?? null,
    billedCents: line.billedCents,
    allowedCents: line.allowedCents,
    paidCents: line.paidCents,
    deductibleCents: line.deductibleCents,
    copayCents: line.copayCents,
    coinsuranceCents: line.coinsuranceCents,
    writeoffCents: line.writeoffCents,
    denialCents: line.denialCents ?? 0,
    otherAdjustmentCents: line.otherAdjustmentCents ?? 0,
    patientResponsibilityCents,
    carcCodes: line.carcCodes ?? [],
    rarcCodes: line.rarcCodes ?? [],
    status: line.status ?? (line.denialCents ? "DENIED_OR_ADJUSTED" : "ADJUDICATED"),
    patientResponsibilityVarianceCents: patientResponsibilityCents - line.deductibleCents - line.copayCents - line.coinsuranceCents,
    lineBalanceVarianceCents: line.allowedCents - line.paidCents - patientResponsibilityCents - line.writeoffCents - (line.denialCents ?? 0) - (line.otherAdjustmentCents ?? 0),
  };
}

function renderEobLine(line: NormalizedEobLine) {
  return `<tr>
          <td>${escapeHtml(line.claimLineId)}</td>
          <td>${escapeHtml(line.procedureCode)}</td>
          <td>${escapeHtml([line.serviceDate, line.tooth ? `Tooth ${line.tooth}` : "", line.surface ? `Surface ${line.surface}` : ""].filter(Boolean).join(" · ") || "Not supplied")}</td>
          <td>${escapeHtml(money(line.billedCents))}</td>
          <td>${escapeHtml(money(line.allowedCents))}</td>
          <td>${escapeHtml(money(line.paidCents))}</td>
          <td>${escapeHtml(money(line.deductibleCents))}</td>
          <td>${escapeHtml(money(line.copayCents))}</td>
          <td>${escapeHtml(money(line.coinsuranceCents))}</td>
          <td>${escapeHtml(money(line.writeoffCents))}</td>
          <td>${escapeHtml(money(line.denialCents))}</td>
          <td>${escapeHtml(money(line.otherAdjustmentCents))}</td>
          <td>${escapeHtml(money(line.patientResponsibilityCents))}</td>
          <td>${escapeHtml(line.carcCodes.join(", ") || "None")}</td>
          <td>${escapeHtml(line.rarcCodes.join(", ") || "None")}</td>
          <td>${escapeHtml(line.status)}</td>
        </tr>`;
}

function uniqueFlat(values: string[][]) {
  return [...new Set(values.flat().filter(Boolean))].sort();
}

function checksumHtml(html: string) {
  return createHash("sha256").update(html).digest("hex");
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
