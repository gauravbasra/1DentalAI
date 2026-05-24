import { getConnectorSecret } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";

export type TwilioProviderResult = {
  ok: boolean;
  providerStatus: string;
  sid?: string;
  status?: string;
  error?: string;
  data?: Record<string, unknown>;
};

export async function getTwilioCredentials(tenantId = defaultTenantId) {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || await getTwilioSecretAny(["account_sid", "accountSid", "account sid", "sid", "api_key"], tenantId),
    authToken: process.env.TWILIO_AUTH_TOKEN || await getTwilioSecretAny(["auth_token", "authToken", "auth token", "api_secret", "client_secret", "secret"], tenantId),
  };
}

export async function getTwilioSecret(label: string, tenantId = defaultTenantId) {
  try {
    const secret = await getConnectorSecret({ tenantId, providerKey: "TWILIO", credentialLabel: label, requireValidated: false });
    return secret?.value || null;
  } catch {
    return null;
  }
}

async function getTwilioSecretAny(labels: string[], tenantId = defaultTenantId) {
  for (const label of labels) {
    const value = await getTwilioSecret(label, tenantId);
    if (value) return value;
  }
  return null;
}

export async function twilioRequest(input: {
  tenantId?: string;
  method?: "GET" | "POST";
  path: string;
  body?: URLSearchParams;
}): Promise<TwilioProviderResult> {
  const credentials = await getTwilioCredentials(input.tenantId);
  if (!credentials.accountSid || !credentials.authToken) {
    return { ok: false, providerStatus: "BLOCKED_CONNECTOR_REQUIRED", error: "Twilio Account SID/Auth Token are not configured." };
  }
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}${input.path}`, {
    method: input.method ?? "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: input.method === "GET" ? undefined : input.body?.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data?.message === "string" ? data.message : `HTTP ${response.status}`;
    return { ok: false, providerStatus: "PROVIDER_ERROR", error: `Twilio rejected request: ${detail}`, data };
  }
  return { ok: true, providerStatus: "PROVIDER_ACCEPTED", sid: String(data.sid || ""), status: String(data.status || "accepted"), data };
}

export async function createTwilioCall(input: { tenantId?: string; from: string; to: string; twiml: string; statusCallback?: string }) {
  const body = new URLSearchParams({
    From: input.from,
    To: input.to,
    Twiml: input.twiml,
  });
  if (input.statusCallback) {
    body.set("StatusCallback", input.statusCallback);
    body.append("StatusCallbackEvent", "initiated");
    body.append("StatusCallbackEvent", "ringing");
    body.append("StatusCallbackEvent", "answered");
    body.append("StatusCallbackEvent", "completed");
    body.set("StatusCallbackMethod", "POST");
  }
  return twilioRequest({ tenantId: input.tenantId, path: "/Calls.json", body });
}

export async function getTwilioCall(input: { tenantId?: string; callSid: string }) {
  return twilioRequest({
    tenantId: input.tenantId,
    method: "GET",
    path: `/Calls/${encodeURIComponent(input.callSid)}.json`,
  });
}

export async function updateTwilioCall(input: { tenantId?: string; callSid: string; twiml?: string; status?: "completed" }) {
  const body = new URLSearchParams();
  if (input.twiml) body.set("Twiml", input.twiml);
  if (input.status) body.set("Status", input.status);
  return twilioRequest({ tenantId: input.tenantId, path: `/Calls/${encodeURIComponent(input.callSid)}.json`, body });
}

export async function findTwilioConferenceSid(input: { tenantId?: string; friendlyName: string }) {
  const result = await twilioRequest({
    tenantId: input.tenantId,
    method: "GET",
    path: `/Conferences.json?FriendlyName=${encodeURIComponent(input.friendlyName)}&Status=in-progress`,
  });
  const conferences = Array.isArray(result.data?.conferences) ? result.data.conferences as Array<Record<string, unknown>> : [];
  const conference = conferences[0];
  return typeof conference?.sid === "string" ? conference.sid : null;
}

export async function updateTwilioConferenceParticipant(input: {
  tenantId?: string;
  conferenceSid: string;
  callSid: string;
  hold?: boolean;
  muted?: boolean;
  holdUrl?: string;
}) {
  const body = new URLSearchParams();
  if (typeof input.hold === "boolean") body.set("Hold", input.hold ? "true" : "false");
  if (typeof input.muted === "boolean") body.set("Muted", input.muted ? "true" : "false");
  if (input.holdUrl) body.set("HoldUrl", input.holdUrl);
  return twilioRequest({
    tenantId: input.tenantId,
    path: `/Conferences/${encodeURIComponent(input.conferenceSid)}/Participants/${encodeURIComponent(input.callSid)}.json`,
    body,
  });
}

export function twilioXmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
