import { NextRequest, NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { validateOpenAiCredential } from "@/lib/connector-control-repository";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(_request: NextRequest, params: Record<string, string>) {
  const url = new URL("/app/connectors", "https://app.1dentalai.com");
  url.searchParams.set("view", "credentials");
  Object.entries(params).forEach(([key, item]) => url.searchParams.set(key, item));
  url.hash = "credential-feedback";
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session) return redirectTo(request, { error: "Please sign in before validating connector credentials.", feedback: "auth_required" });
  const formData = await request.formData();
  const role = session.roleKey || value(formData, "actorRole") || "support_admin";
  try {
    await validateOpenAiCredential({ actorRole: role });
    return redirectTo(request, { role, validated: "OpenAI", feedback: "openai_validated" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI credential validation failed.";
    return redirectTo(request, { role, error: message, feedback: "openai_validation_error" });
  }
}
