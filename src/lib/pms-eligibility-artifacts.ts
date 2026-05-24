import { createHash } from "node:crypto";

export type EligibilitySummaryArtifactInput = {
  tenantId: string;
  patientInsuranceId: string;
  payerName: string;
  planName: string;
  subscriberIdLastFour: string;
  eligibilityStatus: string;
  benefitYear: number;
  deductibleCents: number;
  deductibleMetCents: number;
  annualMaxCents: number;
  annualUsedCents: number;
  frequencies?: unknown;
  limitations?: unknown;
  payerNotes?: string[];
  screenshotArtifactId: string;
  rpaRunLogId: string;
  sourceTraceId?: string;
  fieldEvidenceHash?: string;
  layoutDriftEvidence?: unknown[];
  generatedAt?: string;
};

export function buildEligibilitySummaryHtml(input: EligibilitySummaryArtifactInput) {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const subscriberLastFour = normalizeLastFour(input.subscriberIdLastFour);
  const rows = [
    ["Eligibility status", input.eligibilityStatus],
    ["Benefit year", String(input.benefitYear)],
    ["Deductible", money(input.deductibleCents)],
    ["Deductible met", money(input.deductibleMetCents)],
    ["Annual max", money(input.annualMaxCents)],
    ["Annual used", money(input.annualUsedCents)],
  ];
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Eligibility Summary</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      .meta { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
      table { border-collapse: collapse; width: 100%; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
      th { background: #f3f4f6; width: 34%; }
      pre { white-space: pre-wrap; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Dental Eligibility and Benefits Summary</h1>
    <div class="meta">
      Generated ${escapeHtml(generatedAt)} · Tenant ${escapeHtml(input.tenantId)} · Coverage ${escapeHtml(input.patientInsuranceId)} · RPA ${escapeHtml(input.rpaRunLogId)}
    </div>
    <table>
      <tbody>
        <tr><th>Payer</th><td>${escapeHtml(input.payerName)}</td></tr>
        <tr><th>Plan</th><td>${escapeHtml(input.planName)}</td></tr>
        <tr><th>Subscriber</th><td>***${escapeHtml(subscriberLastFour)}</td></tr>
        ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
        <tr><th>Screenshot evidence</th><td>${escapeHtml(input.screenshotArtifactId)}</td></tr>
        ${input.sourceTraceId ? `<tr><th>Portal trace</th><td>${escapeHtml(input.sourceTraceId)}</td></tr>` : ""}
        ${input.fieldEvidenceHash ? `<tr><th>Field evidence hash</th><td>${escapeHtml(input.fieldEvidenceHash)}</td></tr>` : ""}
      </tbody>
    </table>
    <h2>Frequencies</h2>
    <pre>${escapeHtml(JSON.stringify(input.frequencies ?? {}, null, 2))}</pre>
    <h2>Limitations</h2>
    <pre>${escapeHtml(JSON.stringify(input.limitations ?? {}, null, 2))}</pre>
    <h2>Payer notes</h2>
    <pre>${escapeHtml((input.payerNotes ?? []).join("\\n"))}</pre>
    <h2>Layout drift evidence</h2>
    <pre>${escapeHtml(JSON.stringify(input.layoutDriftEvidence ?? [], null, 2))}</pre>
  </body>
</html>`;
}

export function buildEligibilityPdfArtifactPayload(input: EligibilitySummaryArtifactInput) {
  const html = buildEligibilitySummaryHtml(input);
  const checksum = createHash("sha256").update(html).digest("hex");
  return {
    artifactType: "ELIGIBILITY_PDF" as const,
    title: `Eligibility summary ${input.payerName} ${input.benefitYear}`,
    contentType: "text/html; pdf-render-ready",
    html,
    checksum,
    metadata: {
      patientInsuranceId: input.patientInsuranceId,
      rpaRunLogId: input.rpaRunLogId,
      screenshotArtifactId: input.screenshotArtifactId,
      sourceTraceId: input.sourceTraceId ?? null,
      fieldEvidenceHash: input.fieldEvidenceHash ?? null,
      layoutDriftEvidence: input.layoutDriftEvidence ?? [],
      noPhiInLogs: true,
      subscriberMasked: true,
    },
  };
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function normalizeLastFour(value: string) {
  return value.replaceAll(/[^A-Za-z0-9]/g, "").slice(-4);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
