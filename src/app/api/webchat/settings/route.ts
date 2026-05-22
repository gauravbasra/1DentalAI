import { getWebchatSettings } from "@/lib/webchat/repository";
import { jsonResponse, optionsResponse } from "@/lib/webchat/http";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant") ?? undefined;
  const result = await getWebchatSettings(tenantId);
  const settings = result.settings;
  return jsonResponse({
    settings,
    status: settings?.status ?? "SETUP_REQUIRED",
    connectorStatus: settings?.connectorStatus ?? "CONNECTOR_REQUIRED",
    schedulingStatus: settings?.schedulingStatus ?? "PMS_CONNECTOR_REQUIRED",
    readiness: result.readiness,
    leadForms: result.leadForms,
    privacyNotice: {
      version: "webchat-privacy-v1",
      label: "I understand this chat is saved for staff follow-up and is not for emergencies, diagnosis, payments, or final appointment changes.",
      emergencyNotice: "If you have trouble breathing, uncontrolled bleeding, facial swelling, trauma, or other severe symptoms, call emergency services or the practice directly.",
    },
    theme: settings?.theme ?? {
      primaryColor: "#0891b2",
      backgroundColor: "#ffffff",
      launcherText: "Ask us",
      position: "bottom-right",
      font: "system",
    },
  });
}
