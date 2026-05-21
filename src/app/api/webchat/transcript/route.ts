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
  return jsonResponse(transcript);
}
