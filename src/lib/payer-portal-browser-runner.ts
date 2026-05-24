import { createHash } from "node:crypto";
import { chromium, type Locator, type Page } from "playwright";
import { getConnectorSecret } from "@/lib/connector-control-repository";
import { updatePayerRpaRunLogStatus } from "@/lib/payer-network-repository";

export type PortalBrowserStep =
  | { action: "goto"; url: string }
  | { action: "click"; selector: string }
  | { action: "fill"; selector: string; valueRef: string }
  | { action: "waitForSelector"; selector: string }
  | { action: "assertSession"; selector: string }
  | { action: "manualCheckpoint"; selector: string; checkpointKey: "MFA_REQUIRED" | "CAPTCHA_REQUIRED" | "TERMS_ATTESTATION_REQUIRED" }
  | { action: "screenshot"; artifactKey: "PAYER_SCREENSHOT_REFERENCE" };

export type PortalBrowserField = {
  fieldKey: string;
  selector: string;
  valueType: string;
  confidenceThreshold?: number;
  attribute?: "textContent" | "inputValue" | "value" | "aria-label";
};

export type PortalBrowserErrorCode =
  | "PAYER_PORTAL_BROWSER_RUN_FAILED"
  | "PAYER_PORTAL_NAVIGATION_BLOCKED"
  | "PAYER_PORTAL_MFA_REQUIRED"
  | "PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED"
  | "PAYER_PORTAL_LAYOUT_DRIFT"
  | "PAYER_PORTAL_TIMEOUT"
  | "PAYER_PORTAL_AUTH_FAILED";

export type PortalBrowserEvidenceManifest = {
  sourceTraceId: string;
  portalHost: string;
  screenshotChecksum: string;
  fieldEvidenceHash: string;
  scrapedFieldCount: number;
  extractedFieldKeys: string[];
  missingFieldKeys: string[];
  lowConfidenceFieldKeys: string[];
  selectorMap: Array<{ fieldKey: string; selector: string; confidence: number; evidenceFingerprint: string }>;
  layoutDriftEvidence: Array<{ fieldKey: string; selector: string; reason: "MISSING_SELECTOR" | "LOW_CONFIDENCE"; confidence: number }>;
  extractionAttempts: Array<{ fieldKey: string; selector: string; method: string; success: boolean; textLength: number; confidence: number }>;
  sessionState: { loaded: boolean; saved: boolean; storageStatePath?: string; checkpointStatus: "SESSION_READY" | "MANUAL_CHECKPOINT_REQUIRED" };
  noPhiInLogs: true;
};

export type PortalBrowserRunInput = {
  runId: string;
  tenantId: string;
  portalHost: string;
  credentialVaultId?: string;
  steps: PortalBrowserStep[];
  fields: PortalBrowserField[];
  values: Record<string, string>;
  screenshotPath: string;
  storageStatePath?: string;
  mfaSelectors?: string[];
  maxAttempts?: number;
  routeFixtures?: Array<{ urlPattern: string; html: string }>;
};

export async function executeEligibilityPortalBrowserRun(input: PortalBrowserRunInput) {
  return executeEligibilityPortalBrowserRunWithCredentials(input, await resolvePortalCredentialValues(input));
}

export async function executeEligibilityPortalBrowserRunWithCredentials(input: PortalBrowserRunInput, credentials: { portalUsername: string; portalPassword: string }) {
  const values = { ...input.values, ...credentials };
  const browser = await chromium.launch({ headless: true });
  try {
    const storageState = input.storageStatePath && await fileExists(input.storageStatePath) ? input.storageStatePath : undefined;
    const context = await browser.newContext(storageState ? { storageState } : undefined);
    const page = await context.newPage();
    for (const fixture of input.routeFixtures ?? []) {
      await page.route(fixture.urlPattern, async (route) => {
        await route.fulfill({ status: 200, contentType: "text/html", body: fixture.html });
      });
    }
    const sessionState = { loaded: Boolean(storageState), saved: false, storageStatePath: input.storageStatePath, checkpointStatus: "SESSION_READY" as const };
    await runWithRetry(async () => {
      await runPortalSteps(page, { ...input, values });
      await assertNoManualCheckpoint(page, input.mfaSelectors ?? [], "MFA_REQUIRED");
    }, input.maxAttempts ?? 1);
    const scrapedFields = [];
    const extractionAttempts = [];
    for (const field of input.fields) {
      const locator = page.locator(field.selector).first();
      const extracted = await extractDomFieldValue(locator, field);
      const text = extracted.text;
      const confidence = text ? 95 : 0;
      const screenshotRegion = await readLocatorRegion(locator);
      extractionAttempts.push({
        fieldKey: field.fieldKey,
        selector: field.selector,
        method: extracted.method,
        success: Boolean(text),
        textLength: text.length,
        confidence,
      });
      scrapedFields.push({
        fieldKey: field.fieldKey,
        selector: field.selector,
        value: coerceFieldValue(text, field.valueType),
        text,
        confidence,
        screenshotRegion,
        evidenceFingerprint: createFieldEvidenceFingerprint(field.fieldKey, field.selector, text, confidence),
      });
    }
    await page.screenshot({ path: input.screenshotPath, fullPage: true });
    if (input.storageStatePath) {
      await context.storageState({ path: input.storageStatePath });
      sessionState.saved = true;
    }
    const screenshotChecksum = await sha256File(input.screenshotPath);
    const evidenceManifest = buildPortalBrowserEvidenceManifest({
      runId: input.runId,
      portalHost: input.portalHost,
      screenshotChecksum,
      fields: input.fields,
      scrapedFields,
      extractionAttempts,
      sessionState,
    });
    const result = {
      runId: input.runId,
      scrapedFields,
      sourceTraceId: evidenceManifest.sourceTraceId,
      evidenceManifest,
      screenshot: {
        path: input.screenshotPath,
        checksum: screenshotChecksum,
        artifactType: "PAYER_SCREENSHOT_REFERENCE" as const,
      },
    };
    await updatePayerRpaRunLogStatus({
      tenantId: input.tenantId,
      id: input.runId,
      runStatus: "COMPLETED",
      resultSummary: `Eligibility portal scrape completed with ${scrapedFields.length} fields and ${evidenceManifest.layoutDriftEvidence.length} drift signals.`,
      evidenceUri: input.screenshotPath,
    });
    return result;
  } catch (error) {
    const classified = classifyPayerPortalError(error);
    await updatePayerRpaRunLogStatus({
      tenantId: input.tenantId,
      id: input.runId,
      runStatus: classified.runStatus,
      errorCode: classified.errorCode,
      errorMessageRedacted: redactPayerPortalError(error),
    });
    throw error;
  } finally {
    await browser.close();
  }
}

async function resolvePortalCredentialValues(input: PortalBrowserRunInput) {
  const username = await getConnectorSecret({
    tenantId: input.tenantId,
    providerKey: "PAYER_PORTAL",
    credentialLabel: `${input.credentialVaultId ?? input.portalHost}:username`,
    requireValidated: true,
  });
  const password = await getConnectorSecret({
    tenantId: input.tenantId,
    providerKey: "PAYER_PORTAL",
    credentialLabel: `${input.credentialVaultId ?? input.portalHost}:password`,
    requireValidated: true,
  });
  if (!username?.value || !password?.value) throw new Error("Validated payer portal credential vault secrets are required.");
  return {
    portalUsername: username.value,
    portalPassword: password.value,
  };
}

async function runPortalSteps(page: Page, input: PortalBrowserRunInput) {
  for (const step of input.steps) {
    if (step.action === "goto") {
      assertPortalUrlAllowed(step.url, input.portalHost);
      await page.goto(step.url, { waitUntil: "domcontentloaded" });
    }
    if (step.action === "click") await page.locator(step.selector).click();
    if (step.action === "fill") await page.locator(step.selector).fill(input.values[step.valueRef] ?? "");
    if (step.action === "waitForSelector") await page.locator(step.selector).waitFor({ timeout: 15000 });
    if (step.action === "assertSession") await page.locator(step.selector).waitFor({ timeout: 15000 });
    if (step.action === "manualCheckpoint") await assertNoManualCheckpoint(page, [step.selector], step.checkpointKey);
  }
}

function coerceFieldValue(text: string, valueType: string) {
  if (valueType === "MONEY") return Math.round(Number(text.replace(/[^0-9.-]/g, "") || "0") * 100);
  if (valueType === "BOOLEAN") return /yes|true|active|eligible/i.test(text);
  return text;
}

async function extractDomFieldValue(locator: Locator, field: PortalBrowserField) {
  const methods = field.attribute ? [field.attribute] : ["textContent", "inputValue", "value", "aria-label"];
  for (const method of methods) {
    const text = await readLocatorText(locator, method, 5000);
    if (text) return { text, method };
  }
  return { text: "", method: methods[0] ?? "textContent" };
}

async function readLocatorText(locator: Locator, method: string, timeout: number) {
  try {
    if (method === "inputValue") return (await locator.inputValue({ timeout })).trim();
    if (method === "value") return (await locator.getAttribute("value", { timeout }))?.trim() ?? "";
    if (method === "aria-label") return (await locator.getAttribute("aria-label", { timeout }))?.trim() ?? "";
    return (await locator.textContent({ timeout }))?.trim() ?? "";
  } catch {
    return "";
  }
}

async function readLocatorRegion(locator: Locator) {
  try {
    const box = await locator.boundingBox({ timeout: 1000 });
    if (!box) return undefined;
    return {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    };
  } catch {
    return undefined;
  }
}

async function assertNoManualCheckpoint(page: Page, selectors: string[], checkpointKey: "MFA_REQUIRED" | "CAPTCHA_REQUIRED" | "TERMS_ATTESTATION_REQUIRED") {
  for (const selector of selectors) {
    if (await page.locator(selector).first().isVisible({ timeout: 750 }).catch(() => false)) {
      const code = checkpointKey === "MFA_REQUIRED" ? "PAYER_PORTAL_MFA_REQUIRED" : "PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED";
      throw new PayerPortalRunError(code, `${checkpointKey} manual checkpoint detected at ${selector}.`);
    }
  }
}

async function runWithRetry(work: () => Promise<void>, maxAttempts: number) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    try {
      await work();
      return;
    } catch (error) {
      lastError = error;
      if (!classifyPayerPortalError(error).retryable || attempt === maxAttempts) break;
    }
  }
  throw lastError;
}

function buildPortalBrowserEvidenceManifest(input: {
  runId: string;
  portalHost: string;
  screenshotChecksum: string;
  fields: PortalBrowserField[];
  scrapedFields: Array<{ fieldKey: string; selector: string; confidence: number; evidenceFingerprint: string }>;
  extractionAttempts: Array<{ fieldKey: string; selector: string; method: string; success: boolean; textLength: number; confidence: number }>;
  sessionState: { loaded: boolean; saved: boolean; storageStatePath?: string; checkpointStatus: "SESSION_READY" | "MANUAL_CHECKPOINT_REQUIRED" };
}): PortalBrowserEvidenceManifest {
  const missingFieldKeys = input.scrapedFields.filter((field) => field.confidence === 0).map((field) => field.fieldKey);
  const lowConfidenceFieldKeys = input.scrapedFields
    .filter((field) => {
      const threshold = input.fields.find((candidate) => candidate.fieldKey === field.fieldKey)?.confidenceThreshold ?? 85;
      return field.confidence > 0 && field.confidence < threshold;
    })
    .map((field) => field.fieldKey);
  const layoutDriftEvidence = [
    ...missingFieldKeys.map((fieldKey) => ({
      fieldKey,
      selector: input.scrapedFields.find((field) => field.fieldKey === fieldKey)?.selector ?? "",
      reason: "MISSING_SELECTOR" as const,
      confidence: 0,
    })),
    ...lowConfidenceFieldKeys.map((fieldKey) => {
      const field = input.scrapedFields.find((candidate) => candidate.fieldKey === fieldKey);
      return {
        fieldKey,
        selector: field?.selector ?? "",
        reason: "LOW_CONFIDENCE" as const,
        confidence: field?.confidence ?? 0,
      };
    }),
  ];
  const selectorMap = input.scrapedFields.map(({ fieldKey, selector, confidence, evidenceFingerprint }) => ({ fieldKey, selector, confidence, evidenceFingerprint }));
  const fieldEvidenceHash = createHash("sha256").update(JSON.stringify(selectorMap)).digest("hex");
  const sourceTraceId = createHash("sha256")
    .update(JSON.stringify({ runId: input.runId, portalHost: input.portalHost, screenshotChecksum: input.screenshotChecksum, fieldEvidenceHash }))
    .digest("hex");
  return {
    sourceTraceId,
    portalHost: input.portalHost,
    screenshotChecksum: input.screenshotChecksum,
    fieldEvidenceHash,
    scrapedFieldCount: input.scrapedFields.length,
    extractedFieldKeys: input.scrapedFields.filter((field) => field.confidence > 0).map((field) => field.fieldKey),
    missingFieldKeys,
    lowConfidenceFieldKeys,
    selectorMap,
    layoutDriftEvidence,
    extractionAttempts: input.extractionAttempts,
    sessionState: input.sessionState,
    noPhiInLogs: true,
  };
}

function createFieldEvidenceFingerprint(fieldKey: string, selector: string, text: string, confidence: number) {
  return createHash("sha256").update(JSON.stringify({ fieldKey, selector, confidence, textLength: text.length })).digest("hex");
}

async function sha256File(path: string) {
  const fs = await import("node:fs/promises");
  const buffer = await fs.readFile(path);
  return createHash("sha256").update(buffer).digest("hex");
}

export function assertPortalUrlAllowed(url: string, portalHost: string) {
  if (!url.startsWith(`https://${portalHost}`)) throw new PayerPortalRunError("PAYER_PORTAL_NAVIGATION_BLOCKED", "Portal navigation blocked outside configured host.");
}

export function redactPayerPortalError(error: unknown) {
  const message = getErrorMessage(error);
  return message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]").replace(/\d{4,}/g, "[redacted-number]");
}

class PayerPortalRunError extends Error {
  constructor(public readonly code: PortalBrowserErrorCode, message: string) {
    super(message);
  }
}

export function classifyPayerPortalError(error: unknown): { errorCode: PortalBrowserErrorCode; runStatus: "FAILED" | "NEEDS_MANUAL_REVIEW" | "BLOCKED"; retryable: boolean } {
  const code = error instanceof PayerPortalRunError ? error.code : undefined;
  const message = getErrorMessage(error);
  if (!code && /PAYER_PORTAL_MFA_REQUIRED|MFA_REQUIRED|one-time code/i.test(message)) {
    return { errorCode: "PAYER_PORTAL_MFA_REQUIRED", runStatus: "NEEDS_MANUAL_REVIEW", retryable: false };
  }
  if (!code && /PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED|CAPTCHA_REQUIRED|TERMS_ATTESTATION_REQUIRED/i.test(message)) {
    return { errorCode: "PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED", runStatus: "NEEDS_MANUAL_REVIEW", retryable: false };
  }
  if (code === "PAYER_PORTAL_MFA_REQUIRED" || code === "PAYER_PORTAL_MANUAL_CHECKPOINT_REQUIRED") {
    return { errorCode: code, runStatus: "NEEDS_MANUAL_REVIEW", retryable: false };
  }
  if (code === "PAYER_PORTAL_NAVIGATION_BLOCKED") return { errorCode: code, runStatus: "BLOCKED", retryable: false };
  if (/timeout/i.test(message)) return { errorCode: "PAYER_PORTAL_TIMEOUT", runStatus: "FAILED", retryable: true };
  if (/login|credential|auth/i.test(message)) return { errorCode: "PAYER_PORTAL_AUTH_FAILED", runStatus: "FAILED", retryable: false };
  return { errorCode: "PAYER_PORTAL_BROWSER_RUN_FAILED", runStatus: "FAILED", retryable: true };
}

function getErrorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : "Payer portal browser run failed.";
}

async function fileExists(path: string) {
  const fs = await import("node:fs/promises");
  return fs.access(path).then(() => true, () => false);
}
