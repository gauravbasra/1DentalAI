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
  });
  return jsonResponse({ session });
}
