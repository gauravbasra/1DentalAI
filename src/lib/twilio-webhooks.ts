import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import { createHmac, timingSafeEqual } from "crypto";

type TwilioPayload = Record<string, string>;

export function twiml(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function formPayload(request: Request) {
  const formData = await request.formData();
  const payload: TwilioPayload = {};
  for (const [key, value] of formData.entries()) payload[key] = String(value);
  await assertTwilioSignature(request, payload);
  return payload;
}

export function publicWebhookUrl(request: Request) {
  const url = new URL(request.url);
  const configuredBase = process.env.ONE_DENTAL_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_APP_URL;
  if (configuredBase) {
    const base = new URL(configuredBase);
    url.protocol = base.protocol;
    url.host = base.host;
    return url.toString();
  }
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    url.host = forwardedHost;
    url.protocol = `${forwardedProto}:`;
  } else if (url.hostname === "app.1dentalai.com") {
    url.protocol = "https:";
    url.host = "app.1dentalai.com";
  }
  return url.toString();
}

async function assertTwilioSignature(request: Request, payload: TwilioPayload) {
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_WEBHOOK_SIGNING_SECRET;
  const required = process.env.TWILIO_WEBHOOK_VALIDATION_REQUIRED === "true";
  if (!authToken) {
    if (required) throw new Error("Twilio webhook validation is required but no signing token is configured.");
    return;
  }
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) {
    if (required) throw new Error("Missing Twilio webhook signature.");
    return;
  }
  const expected = createHmac("sha1", authToken)
    .update(`${publicWebhookUrl(request)}${Object.keys(payload).sort().map((key) => `${key}${payload[key]}`).join("")}`)
    .digest("base64");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Invalid Twilio webhook signature.");
  }
}

export async function ingestIncomingVoice(payload: TwilioPayload, tenantId = defaultTenantId) {
  const conversationId = newId("phone");
  const phoneNumberId = await lookupPhoneNumberId(tenantId, payload.To);
  await query(
    `insert into "PhoneConversation"
       ("id", "tenantId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "updatedAt")
     values ($1, $2, 'INBOUND', 'VOICE', 'OPEN', $3, $4, $5, 'INBOUND_CALL', 'NEEDS_REVIEW', $6, 'NEEDS_REVIEW', 'TWILIO_INBOUND_STARTED', current_timestamp)`,
    [
      conversationId,
      tenantId,
      payload.From || null,
      payload.To || null,
      payload.CallerName || payload.From || null,
      `Twilio inbound call ${payload.CallSid || "without CallSid"} from ${payload.From || "unknown"} to ${payload.To || "practice"}.`,
    ],
  );
  await query(
    `insert into "PhoneActiveCall"
       ("id", "tenantId", "conversationId", "phoneNumberId", "fromNumber", "toNumber", "direction", "callState", "providerCallId", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'INBOUND', 'RINGING', $7, current_timestamp)
     on conflict do nothing`,
    [newId("pcall"), tenantId, conversationId, phoneNumberId, payload.From || "unknown", payload.To || "unknown", payload.CallSid || null],
  );
  await query(
    `insert into "PhoneCallTask"
       ("id", "tenantId", "conversationId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "sourceModule", "updatedAt")
     values ($1, $2, $3, 'TWILIO_INBOUND_REVIEW', 'NORMAL', 'OPEN', current_timestamp + interval '30 minutes', 'front_desk', $4, 'TWILIO', current_timestamp)`,
    [newId("ptask"), tenantId, conversationId, `Review Twilio inbound call from ${payload.From || "unknown"}. If voicemail was recorded, work the voicemail and patient follow-up queue.`],
  );
  await addAudit(tenantId, "twilio_webhook", "TWILIO_VOICE_INBOUND_RECEIVED", "PhoneConversation", conversationId, "ALLOWED", redactedPayload(payload));
  return { conversationId };
}

export async function ingestVoiceStatus(payload: TwilioPayload, tenantId = defaultTenantId) {
  const callSid = payload.CallSid || "";
  const status = payload.CallStatus || payload.CallStatusCallbackEvent || "unknown";
  const callState = mapTwilioCallState(status);
  const result = await query<{ conversationId: string | null }>(
    `update "PhoneActiveCall"
     set "callState" = $3,
       "endedAt" = case when $3 in ('COMPLETED','FAILED','BUSY','NO_ANSWER','CANCELED') then current_timestamp else "endedAt" end,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "providerCallId" = $2
     returning "conversationId"`,
    [tenantId, callSid, callState],
  );
  const conversationId = result.rows[0]?.conversationId ?? null;
  if (conversationId) {
    await query(
      `update "PhoneConversation"
       set "status" = case when $3 in ('COMPLETED','FAILED','BUSY','NO_ANSWER','CANCELED') then 'CLOSED' else "status" end,
         "durationSeconds" = coalesce($4::int, "durationSeconds"),
         "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [tenantId, conversationId, callState, Number(payload.CallDuration || payload.Duration || 0) || null],
    );
  }
  await addAudit(tenantId, "twilio_webhook", "TWILIO_VOICE_STATUS_RECEIVED", "PhoneActiveCall", conversationId, "ALLOWED", redactedPayload(payload));
}

export async function ingestRecording(payload: TwilioPayload, tenantId = defaultTenantId) {
  const active = await query<{ conversationId: string | null; phoneNumberId: string | null; fromNumber: string | null }>(
    `select "conversationId", "phoneNumberId", "fromNumber"
     from "PhoneActiveCall"
     where "tenantId" = $1 and "providerCallId" = $2
     order by "createdAt" desc
     limit 1`,
    [tenantId, payload.CallSid || ""],
  );
  const row = active.rows[0];
  await query(
    `insert into "PhoneVoicemail"
       ("id", "tenantId", "conversationId", "phoneNumberId", "callerNumber", "callerName", "status", "durationSeconds", "recordingUrl", "ownerRoleKey", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'TRIAGE_REQUIRED', $7, $8, 'front_desk', current_timestamp + interval '30 minutes', current_timestamp)`,
    [
      newId("vm"),
      tenantId,
      row?.conversationId ?? null,
      row?.phoneNumberId ?? null,
      payload.From || row?.fromNumber || null,
      payload.CallerName || payload.From || row?.fromNumber || null,
      Number(payload.RecordingDuration || 0) || null,
      payload.RecordingUrl || null,
    ],
  );
  if (row?.conversationId) {
    await query(
      `update "PhoneConversation"
       set "recordingUrl" = $3,
         "outcome" = 'VOICEMAIL_RECORDED',
         "followUpStatus" = 'VOICEMAIL_REVIEW',
         "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [tenantId, row.conversationId, payload.RecordingUrl || null],
    );
  }
  await addAudit(tenantId, "twilio_webhook", "TWILIO_RECORDING_RECEIVED", "PhoneVoicemail", row?.conversationId ?? null, "ALLOWED", redactedPayload(payload));
}

export async function ingestTranscription(payload: TwilioPayload, tenantId = defaultTenantId) {
  const text = payload.TranscriptionText || "";
  if (!text.trim()) return;
  const active = await query<{ conversationId: string | null }>(
    `select "conversationId"
     from "PhoneActiveCall"
     where "tenantId" = $1 and "providerCallId" = $2
     order by "createdAt" desc
     limit 1`,
    [tenantId, payload.CallSid || ""],
  );
  const conversationId = active.rows[0]?.conversationId ?? null;
  if (conversationId) {
    await query(
      `update "PhoneConversation"
       set "transcriptSummary" = $3,
         "followUpStatus" = 'VOICEMAIL_TRANSCRIBED',
         "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [tenantId, conversationId, `Twilio voicemail transcription: ${text.slice(0, 1000)}`],
    );
    await query(
      `update "PhoneVoicemail"
       set "transcription" = $3,
         "status" = 'TRIAGE_REQUIRED',
         "updatedAt" = current_timestamp
       where "id" in (
         select "id" from "PhoneVoicemail" where "tenantId" = $1 and "conversationId" = $2 order by "createdAt" desc limit 1
       )`,
      [tenantId, conversationId, text],
    );
  }
  await addAudit(tenantId, "twilio_webhook", "TWILIO_TRANSCRIPTION_RECEIVED", "PhoneConversation", conversationId, "ALLOWED", { ...redactedPayload(payload), transcriptionLength: text.length });
}

export async function ingestIncomingSms(payload: TwilioPayload, tenantId = defaultTenantId) {
  const conversationId = newId("phone");
  await query(
    `insert into "PhoneConversation"
       ("id", "tenantId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "updatedAt")
     values ($1, $2, 'INBOUND', 'SMS', 'OPEN', $3, $4, $5, 'SMS_INBOUND', 'NEEDS_REVIEW', $6, 'NEEDS_REVIEW', 'TWILIO_SMS_RECEIVED', current_timestamp)`,
    [
      conversationId,
      tenantId,
      payload.From || null,
      payload.To || null,
      payload.From || null,
      `Inbound SMS from ${payload.From || "unknown"}: ${(payload.Body || "").slice(0, 500)}`,
    ],
  );
  await query(
    `insert into "PhoneCallTask"
       ("id", "tenantId", "conversationId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "sourceModule", "updatedAt")
     values ($1, $2, $3, 'TWILIO_SMS_REPLY_REVIEW', 'NORMAL', 'OPEN', current_timestamp + interval '30 minutes', 'front_desk', $4, 'TWILIO_SMS', current_timestamp)`,
    [newId("ptask"), tenantId, conversationId, `Review inbound SMS from ${payload.From || "unknown"}. Reply only after consent, quiet-hours, and connector policy checks.`],
  );
  await addAudit(tenantId, "twilio_webhook", "TWILIO_SMS_INBOUND_RECEIVED", "PhoneConversation", conversationId, "ALLOWED", redactedPayload(payload));
  return { conversationId };
}

export async function ingestSmsStatus(payload: TwilioPayload, tenantId = defaultTenantId) {
  const providerMessageId = payload.MessageSid || payload.SmsSid || "";
  if (!providerMessageId) {
    await addAudit(tenantId, "twilio_webhook", "TWILIO_SMS_STATUS_WITHOUT_MESSAGE_ID", "PhoneOutboundMessage", null, "BLOCKED", redactedPayload(payload));
    return;
  }
  const normalizedStatus = mapTwilioSmsStatus(payload.MessageStatus || payload.SmsStatus || "unknown");
  const result = await query<{ id: string; tenantId: string }>(
    `update "PhoneOutboundMessage"
     set "deliveryStatus" = $2,
       "providerStatus" = $3,
       "providerError" = coalesce($4, "providerError"),
       "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('twilioLastStatusAt', current_timestamp, 'twilioDeliveryStatus', $2),
       "updatedAt" = current_timestamp
     where "provider" = 'TWILIO' and "providerMessageId" = $1
     returning "id", "tenantId"`,
    [providerMessageId, normalizedStatus, payload.MessageStatus || payload.SmsStatus || "unknown", payload.ErrorMessage || payload.ErrorCode || null],
  );
  const message = result.rows[0];
  await addAudit(message?.tenantId ?? tenantId, "twilio_webhook", "TWILIO_SMS_STATUS_RECEIVED", "PhoneOutboundMessage", message?.id ?? null, message ? "ALLOWED" : "BLOCKED", {
    ...redactedPayload(payload),
    deliveryStatus: normalizedStatus,
    messageMatched: Boolean(message),
  });
}

async function lookupPhoneNumberId(tenantId: string, phoneNumber?: string) {
  if (!phoneNumber) return null;
  const result = await query<{ id: string }>(
    `select "id" from "PhoneNumber" where "tenantId" = $1 and regexp_replace("phoneNumber", '[^0-9+]', '', 'g') = regexp_replace($2, '[^0-9+]', '', 'g') limit 1`,
    [tenantId, phoneNumber],
  );
  return result.rows[0]?.id ?? null;
}

function mapTwilioSmsStatus(status: string) {
  const normalized = status.toLowerCase();
  if (["accepted", "queued", "sending"].includes(normalized)) return "SENT_TO_PROVIDER";
  if (["sent"].includes(normalized)) return "SENT";
  if (["delivered"].includes(normalized)) return "DELIVERED";
  if (["undelivered"].includes(normalized)) return "UNDELIVERED";
  if (["failed"].includes(normalized)) return "FAILED";
  return status.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function mapTwilioCallState(status: string) {
  const normalized = status.toLowerCase();
  if (["initiated", "ringing"].includes(normalized)) return "RINGING";
  if (["answered", "in-progress"].includes(normalized)) return "CONNECTED";
  if (["completed"].includes(normalized)) return "COMPLETED";
  if (["busy"].includes(normalized)) return "BUSY";
  if (["no-answer"].includes(normalized)) return "NO_ANSWER";
  if (["failed"].includes(normalized)) return "FAILED";
  if (["canceled", "cancelled"].includes(normalized)) return "CANCELED";
  return status.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function redactedPayload(payload: TwilioPayload) {
  return {
    provider: "TWILIO",
    CallSid: payload.CallSid ?? null,
    MessageSid: payload.MessageSid ?? payload.SmsSid ?? null,
    From: payload.From ?? null,
    To: payload.To ?? null,
    CallStatus: payload.CallStatus ?? null,
    RecordingSid: payload.RecordingSid ?? null,
    RecordingUrlPresent: Boolean(payload.RecordingUrl),
    BodyLength: payload.Body?.length ?? 0,
    noSecretLogged: true,
  };
}

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}
