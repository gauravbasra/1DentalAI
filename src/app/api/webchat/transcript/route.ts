import { getConversationTranscript } from "@/lib/webchat/repository";
import { jsonResponse, optionsResponse } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId") ?? "";
  if (!conversationId) return jsonResponse({ error: "conversationId is required" }, { status: 400 });
  const transcript = await getConversationTranscript(conversationId, searchParams.get("tenant") ?? undefined);
  return jsonResponse(publicTranscript(transcript));
}

function publicTranscript(transcript: Awaited<ReturnType<typeof getConversationTranscript>>) {
  return {
    conversation: transcript.conversation
      ? {
        id: transcript.conversation.id,
        status: transcript.conversation.status,
        visitorName: transcript.conversation.visitorName,
        sourceChannel: transcript.conversation.sourceChannel,
        schedulingOutcome: transcript.conversation.schedulingOutcome,
      }
      : null,
    messages: transcript.messages.filter((message) => message.senderType !== "STAFF_NOTE").map((message) => ({
      id: message.id,
      senderType: message.senderType,
      senderName: message.senderType === "STAFF" ? "Practice team" : undefined,
      body: message.body,
      intent: message.intent,
      sentiment: message.sentiment,
      actionType: message.actionType,
      actionStatus: message.actionStatus,
      deliveryStatus: message.deliveryStatus,
    })),
    analytics: transcript.analytics,
  };
}
