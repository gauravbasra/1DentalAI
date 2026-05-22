import { postWebchatMessage } from "@/lib/webchat/repository";
import { jsonResponse, optionsResponse } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const messageBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!conversationId) return jsonResponse({ error: "conversationId is required" }, { status: 400 });
  if (!messageBody) return jsonResponse({ error: "body is required" }, { status: 400 });
  if (messageBody.length > 3000) return jsonResponse({ error: "body must be 3000 characters or fewer" }, { status: 400 });

  try {
    const result = await postWebchatMessage({
      tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
      conversationId,
      body: messageBody,
      senderName: typeof body.senderName === "string" ? body.senderName : undefined,
      leadCapture: {
        visitorName: typeof body.visitorName === "string" ? body.visitorName : undefined,
        visitorPhone: typeof body.visitorPhone === "string" ? body.visitorPhone : undefined,
        visitorEmail: typeof body.visitorEmail === "string" ? body.visitorEmail : undefined,
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
      },
    });
    return jsonResponse(result);
  } catch (error) {
    console.error("Webchat message processing failed", error);
    return jsonResponse({
      userMessageId: null,
      replyId: null,
      reply: {
        body: "I’m having trouble pulling that answer right now. I can still help with appointments, services, insurance questions, forms, and follow-up requests. What would you like to do next?",
      },
      analysis: {
        intent: "SYSTEM_FALLBACK",
        sentiment: "NEEDS_HELP",
        confidence: 0,
        actionType: "SAFE_FALLBACK",
        actionStatus: "SYSTEM_FALLBACK_RESPONDED",
      },
      qualification: {
        leadScore: 0,
        qualificationStage: "NEEDS_REVIEW",
        nextBestAction: "Staff should review the failed webchat turn.",
      },
      automationMode: "AI_AUTO_FALLBACK",
      handoffReason: "MESSAGE_PROCESSING_ERROR",
    });
  }
}
