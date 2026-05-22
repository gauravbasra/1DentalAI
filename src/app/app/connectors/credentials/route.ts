import { NextRequest, NextResponse } from "next/server";
import { storeConnectorCredential } from "@/lib/connector-control-repository";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/app/connectors", request.url);
  url.searchParams.set("view", "credentials");
  Object.entries(params).forEach(([key, item]) => url.searchParams.set(key, item));
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const role = value(formData, "actorRole") || "support_admin";
  const providerKey = value(formData, "providerKey");
  const credentialLabel = value(formData, "credentialLabel");
  try {
    await storeConnectorCredential({
      installationId: value(formData, "installationId"),
      providerKey,
      credentialLabel,
      credentialType: value(formData, "credentialType"),
      secretValue: value(formData, "secretValue"),
      actorRole: role,
    });
    return redirectTo(request, { role, saved: `${providerKey} ${credentialLabel}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Credential could not be stored.";
    return redirectTo(request, { role, error: message });
  }
}
