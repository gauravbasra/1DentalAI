import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { applyEligibilityEvidenceToPms, prepareEligibilityEvidenceArtifacts, recordEligibilityScreenScrape, registerEligibilityPortalLayout } from "@/lib/pms-eligibility-rpa";

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "");

  if (action === "registerLayout") {
    const result = await registerEligibilityPortalLayout({
      payerRegistryEntryId: String(body.payerRegistryEntryId ?? ""),
      portalHost: String(body.portalHost ?? ""),
      layoutKey: String(body.layoutKey ?? ""),
      layoutVersion: String(body.layoutVersion ?? ""),
      loginPath: typeof body.loginPath === "string" ? body.loginPath : undefined,
      eligibilityPath: typeof body.eligibilityPath === "string" ? body.eligibilityPath : undefined,
      screenshotPolicy: body.screenshotPolicy as {
        required: true;
        redactPhi: true;
        baselineArtifactId?: string;
        driftDetection: "REJECT_ON_MISSING_SELECTOR" | "WARN_ONLY";
      },
      navigationSteps: Array.isArray(body.navigationSteps) ? body.navigationSteps : [],
      fields: Array.isArray(body.fields) ? body.fields as Parameters<typeof registerEligibilityPortalLayout>[0]["fields"] : [],
      actorRole: auth.session.roleKey,
      tenantId: auth.session.tenantId,
    });
    return NextResponse.json(result);
  }

  if (action === "recordScrape") {
    const result = await recordEligibilityScreenScrape({
      patientInsuranceId: String(body.patientInsuranceId ?? ""),
      payerRegistryEntryId: String(body.payerRegistryEntryId ?? ""),
      rpaRunLogId: String(body.rpaRunLogId ?? ""),
      portalLayoutId: String(body.portalLayoutId ?? ""),
      screenshotArtifactId: String(body.screenshotArtifactId ?? ""),
      pdfArtifactId: String(body.pdfArtifactId ?? ""),
      sourceTraceId: typeof body.sourceTraceId === "string" ? body.sourceTraceId : undefined,
      normalized: body.normalized as Parameters<typeof recordEligibilityScreenScrape>[0]["normalized"],
      scrapedFields: Array.isArray(body.scrapedFields) ? body.scrapedFields as Parameters<typeof recordEligibilityScreenScrape>[0]["scrapedFields"] : [],
      browserEvidenceManifest: body.browserEvidenceManifest as Parameters<typeof recordEligibilityScreenScrape>[0]["browserEvidenceManifest"],
      actorRole: auth.session.roleKey,
      tenantId: auth.session.tenantId,
    });
    return NextResponse.json(result);
  }

  if (action === "prepareArtifacts") {
    const result = await prepareEligibilityEvidenceArtifacts({
      patientInsuranceId: String(body.patientInsuranceId ?? ""),
      payerRegistryEntryId: String(body.payerRegistryEntryId ?? ""),
      rpaRunLogId: String(body.rpaRunLogId ?? ""),
      payerName: String(body.payerName ?? ""),
      planName: String(body.planName ?? ""),
      subscriberIdLastFour: String(body.subscriberIdLastFour ?? ""),
      screenshotStorageUri: String(body.screenshotStorageUri ?? ""),
      screenshotChecksum: String(body.screenshotChecksum ?? ""),
      normalized: body.normalized as Parameters<typeof prepareEligibilityEvidenceArtifacts>[0]["normalized"],
      browserEvidenceManifest: body.browserEvidenceManifest as Parameters<typeof prepareEligibilityEvidenceArtifacts>[0]["browserEvidenceManifest"],
      portalHost: typeof body.portalHost === "string" ? body.portalHost : undefined,
      actorRole: auth.session.roleKey,
      tenantId: auth.session.tenantId,
    });
    return NextResponse.json(result);
  }

  if (action === "applyEvidence") {
    const result = await applyEligibilityEvidenceToPms({
      evidenceId: String(body.evidenceId ?? ""),
      actorRole: auth.session.roleKey,
      tenantId: auth.session.tenantId,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unsupported eligibility RPA action." }, { status: 400 });
}
