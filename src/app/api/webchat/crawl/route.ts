import { crawlKnowledgePage } from "@/lib/webchat/repository";
import { jsonResponse, optionsResponse } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url : "";
  if (!url) return jsonResponse({ error: "url is required" }, { status: 400 });

  const parsed = new URL(url);
  const token = request.headers.get("x-1dentalai-crawl-token");
  const configuredToken = process.env.WEBCHAT_CRAWL_TOKEN;
  const firstPartyHost = parsed.hostname === "1dentalai.com" || parsed.hostname.endsWith(".1dentalai.com");
  if (!firstPartyHost && (!configuredToken || token !== configuredToken)) {
    return jsonResponse({ error: "Crawler token is required for external knowledge sources" }, { status: 403 });
  }

  const result = await crawlKnowledgePage({
    tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
    url,
  });
  return jsonResponse(result);
}
