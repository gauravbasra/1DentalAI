import { NextRequest, NextResponse } from "next/server";
import { validateOpenAiCredential } from "@/lib/connector-control-repository";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(_request: NextRequest, params: Record<string, string>) {
  const url = new URL("/app/connectors", "https://app.1dentalai.com");
  url.searchParams.set("view", "credentials");
  Object.entries(params).forEach(([key, item]) => url.searchParams.set(key, item));
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const role = value(formData, "actorRole") || "support_admin";
  try {
    await validateOpenAiCredential({ actorRole: role });
    return redirectTo(request, { role, validated: "OpenAI" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI credential validation failed.";
    return redirectTo(request, { role, error: message });
  }
}
