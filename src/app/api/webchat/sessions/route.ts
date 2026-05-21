import { createWebchatSession } from "@/lib/webchat/repository";
import { jsonResponse, optionsResponse } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const session = await createWebchatSession({
    tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
    visitorName: typeof body.visitorName === "string" ? body.visitorName : undefined,
    visitorPhone: typeof body.visitorPhone === "string" ? body.visitorPhone : undefined,
    visitorEmail: typeof body.visitorEmail === "string" ? body.visitorEmail : undefined,
    sourcePage: typeof body.sourcePage === "string" ? body.sourcePage : undefined,
    serviceLine: typeof body.serviceLine === "string" ? body.serviceLine : undefined,
    preferredTime: typeof body.preferredTime === "string" ? body.preferredTime : undefined,
    patientStatus: typeof body.patientStatus === "string" ? body.patientStatus : undefined,
    urgency: typeof body.urgency === "string" ? body.urgency : undefined,
    sourceChannel: typeof body.sourceChannel === "string" ? body.sourceChannel : undefined,
    campaignSource: typeof body.campaignSource === "string" ? body.campaignSource : undefined,
    referrerUrl: typeof body.referrerUrl === "string" ? body.referrerUrl : undefined,
    landingPageSlug: typeof body.landingPageSlug === "string" ? body.landingPageSlug : undefined,
    consentAccepted: body.consentAccepted === true,
    privacyNoticeVersion: typeof body.privacyNoticeVersion === "string" ? body.privacyNoticeVersion : undefined,
  });
  return jsonResponse({ session });
}
