import { getWebchatSettings } from "@/lib/webchat/repository";
import { jsonResponse, optionsResponse } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant") ?? undefined;
  const settings = await getWebchatSettings(tenantId);
  return jsonResponse({
    settings,
    status: settings?.status ?? "SETUP_REQUIRED",
    connectorStatus: settings?.connectorStatus ?? "CONNECTOR_REQUIRED",
    schedulingStatus: settings?.schedulingStatus ?? "PMS_CONNECTOR_REQUIRED",
    theme: settings?.theme ?? {
      primaryColor: "#0891b2",
      backgroundColor: "#ffffff",
      launcherLabel: "Ask us",
      position: "bottom-right",
      font: "system",
    },
  });
}
