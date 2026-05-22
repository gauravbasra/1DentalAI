import { getConversationStreamState, getConversationTranscript } from "@/lib/webchat/repository";
import { optionsResponse, sseHeaders } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId") ?? "";
  const tenantId = searchParams.get("tenant") ?? undefined;
  if (!conversationId) {
    return new Response("conversationId is required", { status: 400, headers: sseHeaders });
  }

  const encoder = new TextEncoder();
  let lastSignature = "";
  let closed = false;
  request.signal.addEventListener("abort", () => {
    closed = true;
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      for (let index = 0; index < 240 && !closed; index += 1) {
        try {
          const state = await getConversationStreamState(conversationId, tenantId);
          const signature = `${state.messageCount}:${state.lastMessageAt}:${state.conversationUpdatedAt}:${state.status}`;
          if (signature !== lastSignature) {
            lastSignature = signature;
            const transcript = await getConversationTranscript(conversationId, tenantId);
            send("transcript", {
              conversationId,
              state,
              messages: transcript.messages,
              conversation: transcript.conversation,
              analytics: transcript.analytics,
            });
          } else if (index % 20 === 0) {
            send("heartbeat", { conversationId, at: new Date().toISOString() });
          }
        } catch (error) {
          send("error", { message: error instanceof Error ? error.message : "stream error" });
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: sseHeaders });
}
