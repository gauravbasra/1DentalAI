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
      consentAccepted: body.consentAccepted === true,
      privacyNoticeVersion: typeof body.privacyNoticeVersion === "string" ? body.privacyNoticeVersion : undefined,
    },
  });
  return jsonResponse(result);
}
