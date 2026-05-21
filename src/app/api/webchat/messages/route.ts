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
  });
  return jsonResponse(result);
}
