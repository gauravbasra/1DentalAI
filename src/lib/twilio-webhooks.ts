import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import { ingestSmsIntoAiConversation } from "@/lib/webchat/repository";
import { getTwilioCredentials, getTwilioSecret } from "@/lib/twilio-provider";
import { getVoiceAiReceptionPolicy } from "@/lib/voice-ai-repository";
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

export async function buildInboundVoiceTwiML(input: { request: Request; payload: TwilioPayload; conversationId: string }) {
  const origin = process.env.ONE_DENTAL_PUBLIC_APP_URL || "https://app.1dentalai.com";
  const recordingUrl = `${origin}/api/twilio/voice/recording`;
  const transcriptionUrl = `${origin}/api/twilio/voice/transcription`;
  const statusUrl = `${origin}/api/twilio/voice/status`;
  const route = await getInboundVoiceRoute(defaultTenantId, input.payload.To);
  const aiPolicy = await getVoiceAiReceptionPolicy(defaultTenantId);
  const aiStartUrl = `${origin}/api/twilio/voice/ai/start?conversationId=${encodeURIComponent(input.conversationId)}&scenario=inbound_takeover&reason=no_answer`;
  const transcription = `<Start><Transcription name="onedentalai-live-${xmlEscape(input.conversationId)}" statusCallbackUrl="${xmlEscape(transcriptionUrl)}" track="both_tracks" languageCode="en-US" /></Start>`;
  const practiceBridgeNumber = resolvePracticeBridgeNumber(route);
  if (practiceBridgeNumber) {
    await query(
      `update "PhoneActiveCall"
       set "callControlMode" = 'TWILIO_DIRECT_DIAL',
         "updatedAt" = current_timestamp
       where "tenantId" = $1 and "conversationId" = $2`,
      [defaultTenantId, input.conversationId],
    );
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${transcription}
  <Dial action="${xmlEscape(aiStartUrl)}" method="POST" timeout="${aiPolicy.ringThreshold * 5}" record="record-from-answer-dual" recordingStatusCallback="${xmlEscape(recordingUrl)}" recordingStatusCallbackMethod="POST">
    <Number statusCallback="${xmlEscape(statusUrl)}" statusCallbackMethod="POST">${xmlEscape(practiceBridgeNumber)}</Number>
  </Dial>
  <Redirect method="POST">${xmlEscape(aiStartUrl)}</Redirect>
</Response>`;
  }
  if (route?.destinationType === "VOICEMAIL") {
    return voicemailTwiML(recordingUrl, transcriptionUrl, transcription, "Thank you for calling. Please leave a message after the tone and a team member will follow up.");
  }
  return voicemailTwiML(recordingUrl, transcriptionUrl, transcription, "Thank you for calling. Your call reached 1DentalAI, but live routing is not configured yet. Please leave a message after the tone and a team member will follow up.");
}

function conferenceNameForConversation(conversationId: string) {
  return `onedentalai-${conversationId}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
}

function voicemailTwiML(recordingUrl: string, transcriptionUrl: string, transcription: string, greeting: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${transcription}
  <Say voice="Polly.Joanna-Neural">${xmlEscape(greeting)} If this is a medical emergency, please hang up and call 911.</Say>
  <Record maxLength="180" playBeep="true" recordingStatusCallback="${xmlEscape(recordingUrl)}" recordingStatusCallbackMethod="POST" transcribe="true" transcribeCallback="${xmlEscape(transcriptionUrl)}" />
  <Say voice="Polly.Joanna-Neural">We did not receive a message. Goodbye.</Say>
</Response>`;
}

function resolvePracticeBridgeNumber(route: { destinationType: string; destination: string } | null) {
  if (route?.destinationType === "PHONE_NUMBER" && route.destination) return normalizePhoneNumber(route.destination);
  const envNumber = process.env.TWILIO_OPERATOR_BRIDGE_NUMBER || process.env.PRACTICE_BRIDGE_NUMBER || "";
  return normalizePhoneNumber(envNumber);
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
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
  const authToken = process.env.TWILIO_WEBHOOK_SIGNING_SECRET || process.env.TWILIO_AUTH_TOKEN || await getTwilioSecret("webhook_signing_secret") || await getTwilioSecret("auth_token");
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

async function getInboundVoiceRoute(tenantId: string, toNumber?: string) {
  const result = await query<{ destinationType: string; destination: string; callerId: string | null }>(
    `select r."destinationType", r."destination", n."phoneNumber" as "callerId"
     from "PhoneNumber" n
     left join "PhoneRoutingRule" r on r."id" = n."defaultRouteId" and r."status" in ('ACTIVE','READY_FOR_SMOKE_TEST')
     where n."tenantId" = $1
       and regexp_replace(n."phoneNumber", '[^0-9]', '', 'g') = regexp_replace(coalesce($2, ''), '[^0-9]', '', 'g')
     limit 1`,
    [tenantId, toNumber || ""],
  );
  return result.rows[0] ?? null;
}

export async function ingestIncomingVoice(payload: TwilioPayload, tenantId = defaultTenantId) {
  const conversationId = newId("phone");
  const phoneNumberId = await lookupPhoneNumberId(tenantId, payload.To);
  const patientMatch = await resolvePatientForCaller(tenantId, payload.From);
  await query(
    `insert into "PhoneConversation"
       ("id", "tenantId", "patientId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "updatedAt")
     values ($1, $2, $3, 'INBOUND', 'VOICE', 'OPEN', $4, $5, $6, 'INBOUND_CALL', 'NEEDS_REVIEW', $7, 'NEEDS_REVIEW', 'TWILIO_INBOUND_STARTED', current_timestamp)`,
    [
      conversationId,
      tenantId,
      patientMatch.patientId,
      payload.From || null,
      payload.To || null,
      payload.CallerName || payload.From || null,
      `Twilio inbound call ${payload.CallSid || "without CallSid"} from ${payload.From || "unknown"} to ${payload.To || "practice"}. Match: ${patientMatch.matchStatus}.`,
    ],
  );
  const activeCallId = newId("pcall");
  await query(
    `insert into "PhoneActiveCall"
       ("id", "tenantId", "conversationId", "phoneNumberId", "fromNumber", "toNumber", "direction", "callState", "providerCallId", "providerConferenceName", "callControlMode", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'INBOUND', 'RINGING', $7, $8, 'TWILIO_CONFERENCE', current_timestamp)
     on conflict do nothing`,
    [activeCallId, tenantId, conversationId, phoneNumberId, payload.From || "unknown", payload.To || "unknown", payload.CallSid || null, conferenceNameForConversation(conversationId)],
  );
  await createOrRefreshPhoneScreenPopSnapshot({
    tenantId,
    conversationId,
    activeCallId,
    callerNumber: payload.From,
    patientMatch,
  });
  await query(
    `insert into "PhoneCallTask"
       ("id", "tenantId", "conversationId", "patientId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "sourceModule", "updatedAt")
     values ($1, $2, $3, $4, 'TWILIO_INBOUND_REVIEW', 'NORMAL', 'OPEN', current_timestamp + interval '30 minutes', 'front_desk', $5, 'TWILIO', current_timestamp)`,
    [
      newId("ptask"),
      tenantId,
      conversationId,
      patientMatch.patientId,
      patientMatch.patientId
        ? `Caller matched to patient chart. Use the screen pop for appointments, balance, insurance, lab cases, forms, and patient links before asking the patient to repeat information.`
        : `Review Twilio inbound call from ${payload.From || "unknown"}. Confirm identity or create a new patient/lead before discussing chart-specific information.`,
    ],
  );
  await addAudit(tenantId, "twilio_webhook", "TWILIO_VOICE_INBOUND_RECEIVED", "PhoneConversation", conversationId, "ALLOWED", { ...redactedPayload(payload), patientMatch });
  return { conversationId, activeCallId, patientId: patientMatch.patientId };
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
  const text = payload.TranscriptionText || parseTwilioTranscriptionData(payload).text || "";
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
    await createPhoneTranscriptEvent({
      tenantId,
      conversationId,
      providerEventId: payload.TranscriptionSid || payload.SequenceId || payload.EventSid,
      transcriptText: text,
      confidence: parseTwilioTranscriptionData(payload).confidence,
      languageCode: payload.LanguageCode || parseTwilioTranscriptionData(payload).languageCode || "en-US",
      isFinal: parseTwilioTranscriptionData(payload).isFinal,
      metadata: redactedPayload(payload),
    });
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

export async function getPhoneScreenPop(input: { tenantId?: string; conversationId?: string; activeCallId?: string; callerNumber?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  let conversationId = input.conversationId ?? null;
  if (!conversationId && input.activeCallId) {
    const active = await query<{ conversationId: string | null }>(
      `select "conversationId" from "PhoneActiveCall" where "tenantId" = $1 and "id" = $2 limit 1`,
      [tenantId, input.activeCallId],
    );
    conversationId = active.rows[0]?.conversationId ?? null;
  }
  if (!conversationId && input.callerNumber) {
    const active = await query<{ conversationId: string | null }>(
      `select "conversationId"
       from "PhoneActiveCall"
       where "tenantId" = $1 and regexp_replace("fromNumber", '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
       order by "createdAt" desc
       limit 1`,
      [tenantId, input.callerNumber],
    );
    conversationId = active.rows[0]?.conversationId ?? null;
  }
  if (!conversationId) return null;
  const snapshot = await query(
    `select s.*, c."callState", c."providerCallId", pc."callerName", pc."callerNumber", pc."practiceNumber", pc."startedAt"
     from "PhoneScreenPopSnapshot" s
     left join "PhoneActiveCall" c on c."id" = s."activeCallId"
     left join "PhoneConversation" pc on pc."id" = s."conversationId"
     where s."tenantId" = $1 and s."conversationId" = $2
     limit 1`,
    [tenantId, conversationId],
  );
  const row = snapshot.rows[0];
  if (!row) return null;
  const [transcript, assists, controls] = await Promise.all([
    query(`select * from "PhoneCallTranscriptEvent" where "tenantId" = $1 and "conversationId" = $2 order by "sequence", "createdAt"`, [tenantId, conversationId]),
    query(`select * from "PhoneCallAiAssistEvent" where "tenantId" = $1 and "conversationId" = $2 order by case "severity" when 'CRITICAL' then 0 when 'WARNING' then 1 else 2 end, "createdAt" desc`, [tenantId, conversationId]),
    query(`select ca.*, e."extensionNumber", e."displayName" as "targetExtensionName" from "PhoneCallControlAction" ca left join "PhoneExtension" e on e."id" = ca."targetExtensionId" where ca."tenantId" = $1 and ca."conversationId" = $2 order by ca."createdAt" desc limit 20`, [tenantId, conversationId]),
  ]);
  return { ...row, transcript: transcript.rows, aiAssist: assists.rows, controls: controls.rows };
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
  const aiConversation = await ingestSmsIntoAiConversation({
    tenantId,
    from: payload.From || "unknown",
    to: payload.To || "practice",
    body: payload.Body || "",
    providerMessageId: payload.MessageSid || payload.SmsSid || undefined,
  });
  const smsSend = await sendSmsAutoReplyIfAllowed({
    tenantId,
    to: payload.From || "",
    body: aiConversation.reply?.body || "",
    sourceConversationId: aiConversation.conversationId,
  });
  return { conversationId, aiConversationId: aiConversation.conversationId, smsSend };
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

type PatientPhoneMatch = {
  patientId: string | null;
  matchStatus: "MATCHED" | "MULTIPLE_MATCHES" | "UNMATCHED";
  matchConfidence: number;
  matchedBy: string | null;
  candidates: Array<Record<string, unknown>>;
};

async function resolvePatientForCaller(tenantId: string, phoneNumber?: string): Promise<PatientPhoneMatch> {
  const normalized = phoneDigits(phoneNumber);
  if (!normalized) {
    return { patientId: null, matchStatus: "UNMATCHED", matchConfidence: 0, matchedBy: null, candidates: [] };
  }
  const result = await query<{
    id: string;
    chartNumber: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    phone: string | null;
    email: string | null;
    matchSource: string;
    familyAccountId: string | null;
  }>(
    `with matches as (
       select p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."phone", p."email", p."familyAccountId", 'patient_phone' as "matchSource", 100 as confidence
       from "PmsPatient" p
       where p."tenantId" = $1 and regexp_replace(coalesce(p."phone", ''), '[^0-9]', '', 'g') = $2
       union all
       select p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."phone", p."email", p."familyAccountId", 'communication_preference' as "matchSource", 95 as confidence
       from "PmsPatient" p
       join "PmsPatientCommunicationPreference" pref on pref."patientId" = p."id"
       where p."tenantId" = $1 and regexp_replace(coalesce(pref."destination", ''), '[^0-9]', '', 'g') = $2
       union all
       select p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."phone", p."email", p."familyAccountId", 'family_account_phone' as "matchSource", 80 as confidence
       from "PmsPatient" p
       join "PmsFamilyAccount" f on f."id" = p."familyAccountId"
       where p."tenantId" = $1 and regexp_replace(coalesce(f."phone", ''), '[^0-9]', '', 'g') = $2
       union all
       select p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."phone", p."email", p."familyAccountId", 'emergency_contact_phone' as "matchSource", 50 as confidence
       from "PmsPatient" p
       where p."tenantId" = $1 and regexp_replace(coalesce(p."emergencyContactPhone", ''), '[^0-9]', '', 'g') = $2
     ),
     ranked as (
       select distinct on ("id") *
       from matches
       order by "id", confidence desc
     )
     select "id", "chartNumber", "firstName", "lastName", "preferredName", "phone", "email", "matchSource", "familyAccountId"
     from ranked
     order by case "matchSource" when 'patient_phone' then 0 when 'communication_preference' then 1 when 'family_account_phone' then 2 else 3 end, "lastName", "firstName"
     limit 10`,
    [tenantId, normalized],
  );
  const candidates = result.rows.map((row) => ({
    patientId: row.id,
    chartNumber: row.chartNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    preferredName: row.preferredName,
    phone: row.phone,
    email: row.email,
    matchSource: row.matchSource,
    familyAccountId: row.familyAccountId,
  }));
  if (result.rows.length === 1) {
    return { patientId: result.rows[0].id, matchStatus: "MATCHED", matchConfidence: confidenceForMatchSource(result.rows[0].matchSource), matchedBy: result.rows[0].matchSource, candidates };
  }
  if (result.rows.length > 1) {
    return { patientId: null, matchStatus: "MULTIPLE_MATCHES", matchConfidence: 70, matchedBy: "multiple_phone_matches", candidates };
  }
  return { patientId: null, matchStatus: "UNMATCHED", matchConfidence: 0, matchedBy: null, candidates: [] };
}

function confidenceForMatchSource(source: string) {
  if (source === "patient_phone") return 100;
  if (source === "communication_preference") return 95;
  if (source === "family_account_phone") return 80;
  if (source === "emergency_contact_phone") return 50;
  return 0;
}

async function createOrRefreshPhoneScreenPopSnapshot(input: {
  tenantId: string;
  conversationId: string;
  activeCallId: string;
  callerNumber?: string;
  patientMatch: PatientPhoneMatch;
}) {
  const snapshot = input.patientMatch.patientId
    ? await buildMatchedPatientSnapshot(input.tenantId, input.patientMatch.patientId)
    : buildUnmatchedCallerSnapshot(input.callerNumber, input.patientMatch);
  const privacyFlags = buildPrivacyFlags(snapshot);
  const recommendedActions = buildPhoneRecommendedActions(snapshot, input.patientMatch.matchStatus);
  const actionLinks = buildPhoneActionLinks(input.patientMatch.patientId);
  await query(
    `insert into "PhoneScreenPopSnapshot"
       ("id", "tenantId", "conversationId", "activeCallId", "patientId", "callerNumber", "matchStatus", "matchConfidence", "matchedBy", "candidatePatients", "snapshotJson", "actionLinks", "recommendedActions", "privacyFlags", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, current_timestamp)
     on conflict ("conversationId") do update set
       "activeCallId" = excluded."activeCallId",
       "patientId" = excluded."patientId",
       "callerNumber" = excluded."callerNumber",
       "matchStatus" = excluded."matchStatus",
       "matchConfidence" = excluded."matchConfidence",
       "matchedBy" = excluded."matchedBy",
       "candidatePatients" = excluded."candidatePatients",
       "snapshotJson" = excluded."snapshotJson",
       "actionLinks" = excluded."actionLinks",
       "recommendedActions" = excluded."recommendedActions",
       "privacyFlags" = excluded."privacyFlags",
       "updatedAt" = current_timestamp`,
    [
      newId("pop"),
      input.tenantId,
      input.conversationId,
      input.activeCallId,
      input.patientMatch.patientId,
      input.callerNumber || null,
      input.patientMatch.matchStatus,
      input.patientMatch.matchConfidence,
      input.patientMatch.matchedBy,
      JSON.stringify(input.patientMatch.candidates),
      JSON.stringify(snapshot),
      JSON.stringify(actionLinks),
      JSON.stringify(recommendedActions),
      JSON.stringify(privacyFlags),
    ],
  );
  await addAudit(input.tenantId, "twilio_webhook", "PHONE_SCREEN_POP_SNAPSHOT_CREATED", "PhoneScreenPopSnapshot", input.conversationId, "ALLOWED", {
    matchStatus: input.patientMatch.matchStatus,
    matchConfidence: input.patientMatch.matchConfidence,
    patientId: input.patientMatch.patientId,
    snapshotSections: Object.keys(snapshot),
  });
}

async function buildMatchedPatientSnapshot(tenantId: string, patientId: string) {
  const [patient, family, members, alerts, allergies, medications, pharmacy, appointments, procedures, treatmentPlans, insurance, benefits, claims, ledger, payments, documents, labs, tasks] = await Promise.all([
    query(`select * from "PmsPatient" where "tenantId" = $1 and "id" = $2 limit 1`, [tenantId, patientId]),
    query(`select f.* from "PmsFamilyAccount" f join "PmsPatient" p on p."familyAccountId" = f."id" where p."tenantId" = $1 and p."id" = $2 limit 1`, [tenantId, patientId]),
    query(`select m."id", m."chartNumber", m."firstName", m."lastName", m."preferredName", m."phone", m."email", m."status", case when m."id" = $2 then true else false end as "isCallerChart" from "PmsPatient" p join "PmsPatient" m on m."familyAccountId" = p."familyAccountId" where p."tenantId" = $1 and p."id" = $2 order by "isCallerChart" desc, m."lastName", m."firstName"`, [tenantId, patientId]),
    query(`select * from "PmsMedicalAlert" where "patientId" = $1 and "active" = true order by case "severity" when 'HIGH' then 0 when 'MEDIUM' then 1 else 2 end, "createdAt" desc`, [patientId]),
    query(`select * from "PmsAllergy" where "patientId" = $1 and "active" = true order by case "severity" when 'HIGH' then 0 when 'MEDIUM' then 1 else 2 end, "allergen"`, [patientId]),
    query(`select * from "PmsMedication" where "patientId" = $1 and "status" = 'ACTIVE' order by "name"`, [patientId]),
    query(`select * from "PmsPatientPharmacy" where "patientId" = $1 order by "isPreferred" desc, "pharmacyName" limit 3`, [patientId]),
    query(`select a.*, pr."displayName" as "providerName", op."name" as "operatoryName" from "PmsAppointment" a left join "PmsProvider" pr on pr."id" = a."providerId" left join "PmsOperatory" op on op."id" = a."operatoryId" where a."tenantId" = $1 and a."patientId" = $2 order by a."startsAt" desc limit 12`, [tenantId, patientId]),
    query(`select pl.*, pc."code", pc."description", pc."category", pr."displayName" as "providerName" from "PmsProcedureLog" pl join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId" left join "PmsProvider" pr on pr."id" = pl."providerId" where pl."patientId" = $1 order by coalesce(pl."serviceDate", pl."createdAt") desc limit 12`, [patientId]),
    query(`select tp.*, coalesce(items."items", '[]'::jsonb) as "items" from "PmsTreatmentPlan" tp left join lateral (select jsonb_agg(jsonb_build_object('id', i."id", 'phase', i."phase", 'sequence', i."sequence", 'status', i."status", 'feeCents', i."feeCents", 'patientEstimateCents', i."patientEstimateCents", 'code', pc."code", 'description', pc."description")) as "items" from "PmsTreatmentPlanItem" i join "PmsProcedureCode" pc on pc."id" = i."procedureCodeId" where i."treatmentPlanId" = tp."id") items on true where tp."tenantId" = $1 and tp."patientId" = $2 order by case tp."status" when 'ACCEPTED' then 0 when 'PRESENTED' then 1 when 'DRAFT' then 2 else 3 end, tp."updatedAt" desc limit 5`, [tenantId, patientId]),
    query(`select pi.*, ip."payerName", ip."payerId", ip."planName", ip."planType", ip."networkStatus" from "PmsPatientInsurance" pi join "PmsInsurancePlan" ip on ip."id" = pi."planId" where pi."patientId" = $1 order by pi."priority"`, [patientId]),
    query(`select bs.* from "PmsBenefitSummary" bs join "PmsPatientInsurance" pi on pi."id" = bs."patientInsuranceId" where pi."patientId" = $1 order by bs."benefitYear" desc`, [patientId]),
    query(`select * from "PmsClaim" where "tenantId" = $1 and "patientId" = $2 order by "createdAt" desc limit 8`, [tenantId, patientId]),
    query(`select "entryType", "description", "amountCents", "balanceCents", "status", "serviceDate", "postedAt" from "PmsLedgerEntry" where "tenantId" = $1 and "patientId" = $2 order by "postedAt" desc limit 12`, [tenantId, patientId]),
    query(`select * from "PmsPayment" where "tenantId" = $1 and "patientId" = $2 order by "postedAt" desc limit 8`, [tenantId, patientId]),
    query(`select * from "PmsDocument" where "tenantId" = $1 and "patientId" = $2 order by case "status" when 'REQUIRED' then 0 when 'NEEDS_REVIEW' then 1 else 2 end, "createdAt" desc limit 10`, [tenantId, patientId]),
    query(`select * from "PmsLabCase" where "tenantId" = $1 and "patientId" = $2 order by case "status" when 'ORDERED' then 0 when 'IN_PROGRESS' then 1 else 2 end, "dueDate" asc nulls last limit 8`, [tenantId, patientId]),
    query(`select * from "PmsTask" where "tenantId" = $1 and "patientId" = $2 and "status" = 'OPEN' order by case "priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, "dueAt" asc nulls last limit 8`, [tenantId, patientId]),
  ]);
  const ledgerRows = ledger.rows as Array<Record<string, unknown>>;
  return {
    patient: patient.rows[0] ?? null,
    familyAccount: family.rows[0] ?? null,
    familyMembers: members.rows,
    clinical: {
      alerts: alerts.rows,
      allergies: allergies.rows,
      medications: medications.rows,
      pharmacy: pharmacy.rows,
      procedures: procedures.rows,
      treatmentPlans: treatmentPlans.rows,
    },
    scheduling: {
      nextAppointments: appointments.rows.filter((row) => new Date(String(row.startsAt)).getTime() >= Date.now()).slice(0, 5),
      recentAppointments: appointments.rows.filter((row) => new Date(String(row.startsAt)).getTime() < Date.now()).slice(0, 5),
    },
    insurance: {
      plans: insurance.rows,
      benefits: benefits.rows,
      claims: claims.rows,
    },
    financial: {
      openBalanceCents: ledgerRows.reduce((sum, row) => sum + Math.max(0, Number(row.balanceCents ?? 0)), 0),
      recentLedger: ledger.rows,
      recentPayments: payments.rows,
    },
    operations: {
      documents: documents.rows,
      labCases: labs.rows,
      tasks: tasks.rows,
    },
  };
}

function buildUnmatchedCallerSnapshot(callerNumber: string | undefined, patientMatch: PatientPhoneMatch) {
  return {
    caller: {
      phone: callerNumber ?? null,
      matchStatus: patientMatch.matchStatus,
      candidatePatients: patientMatch.candidates,
    },
    recommendedPath: patientMatch.matchStatus === "MULTIPLE_MATCHES" ? "Confirm patient identity before opening a chart." : "New caller or unmatched number. Capture name, DOB, phone, and reason for call.",
  };
}

function buildPhoneActionLinks(patientId: string | null) {
  if (!patientId) {
    return {
      newPatient: "/app/pms/patients",
      schedule: "/app/pms/schedule",
      phone: "/patient-engagement/phone",
    };
  }
  return {
    patientChart: `/app/pms/patients/${patientId}`,
    clinicalChart: `/app/pms/chart/${patientId}`,
    schedule: `/app/pms/schedule?patientId=${patientId}`,
    ledger: `/app/pms/ledger?patientId=${patientId}`,
    insurance: `/app/pms/insurance?patientId=${patientId}`,
    treatmentPlans: `/app/pms/treatment-plans?patientId=${patientId}`,
    documents: `/app/pms/documents?patientId=${patientId}`,
    labs: `/app/pms/labs?patientId=${patientId}`,
    tasks: `/app/pms/tasks?patientId=${patientId}`,
  };
}

function buildPrivacyFlags(snapshot: Record<string, unknown>) {
  const patient = snapshot.patient as Record<string, unknown> | null | undefined;
  const flags = [];
  if (patient?.privacyLevel && patient.privacyLevel !== "STANDARD") flags.push({ type: "PRIVACY_LEVEL", severity: "HIGH", detail: patient.privacyLevel });
  const clinical = snapshot.clinical as { alerts?: Array<Record<string, unknown>> } | undefined;
  for (const alert of clinical?.alerts ?? []) flags.push({ type: "MEDICAL_ALERT", severity: alert.severity ?? "INFO", detail: alert.title });
  return flags;
}

function buildPhoneRecommendedActions(snapshot: Record<string, unknown>, matchStatus: string) {
  if (matchStatus === "UNMATCHED") return [{ label: "Identify caller", ownerRoleKey: "front_desk", priority: "HIGH", detail: "Capture name, DOB, phone, and reason before discussing chart-specific details." }];
  if (matchStatus === "MULTIPLE_MATCHES") return [{ label: "Confirm family member", ownerRoleKey: "front_desk", priority: "HIGH", detail: "Multiple charts share this number. Confirm DOB and patient name before opening PHI." }];
  const actions = [];
  const financial = snapshot.financial as { openBalanceCents?: number } | undefined;
  const scheduling = snapshot.scheduling as { nextAppointments?: unknown[] } | undefined;
  const operations = snapshot.operations as { documents?: unknown[]; labCases?: Array<Record<string, unknown>>; tasks?: unknown[] } | undefined;
  if (!scheduling?.nextAppointments?.length) actions.push({ label: "Offer scheduling", ownerRoleKey: "front_desk", priority: "NORMAL", detail: "No future appointment is visible in the pop-up." });
  if ((financial?.openBalanceCents ?? 0) > 0) actions.push({ label: "Balance available", ownerRoleKey: "billing", priority: "NORMAL", detail: "Discuss balance only after identity verification and office policy." });
  if (operations?.documents?.length) actions.push({ label: "Forms/documents pending", ownerRoleKey: "front_desk", priority: "NORMAL", detail: "Offer to send or review pending forms." });
  if (operations?.labCases?.some((lab) => !["DELIVERED", "CLOSED", "CANCELED"].includes(String(lab.status)))) actions.push({ label: "Lab case follow-up", ownerRoleKey: "clinical_admin", priority: "NORMAL", detail: "Review open lab case status if caller asks about treatment progress." });
  if (!actions.length) actions.push({ label: "Confirm reason for call", ownerRoleKey: "front_desk", priority: "NORMAL", detail: "Patient context is loaded. Ask how you can help today." });
  return actions;
}

async function createPhoneTranscriptEvent(input: {
  tenantId: string;
  conversationId: string;
  providerEventId?: string;
  transcriptText: string;
  confidence?: number | null;
  languageCode: string;
  isFinal?: boolean;
  metadata?: unknown;
}) {
  const active = await query<{ id: string | null; nextSequence: string }>(
    `select
       (select "id" from "PhoneActiveCall" where "tenantId" = $1 and "conversationId" = $2 order by "createdAt" desc limit 1) as id,
       (select (coalesce(max("sequence"), 0) + 1)::text from "PhoneCallTranscriptEvent" where "tenantId" = $1 and "conversationId" = $2) as "nextSequence"`,
    [input.tenantId, input.conversationId],
  );
  const sequence = Number(active.rows[0]?.nextSequence ?? 1);
  await query(
    `insert into "PhoneCallTranscriptEvent"
       ("id", "tenantId", "conversationId", "activeCallId", "provider", "providerEventId", "sequence", "speaker", "languageCode", "transcriptText", "confidence", "isFinal", "metadata")
     values ($1, $2, $3, $4, 'TWILIO', nullif($5, ''), $6, 'CALLER_OR_STAFF', $7, $8, $9, $10, $11::jsonb)
     on conflict ("tenantId", "provider", "providerEventId") where "providerEventId" is not null do nothing`,
    [
      newId("ptrx"),
      input.tenantId,
      input.conversationId,
      active.rows[0]?.id ?? null,
      input.providerEventId ?? "",
      sequence,
      input.languageCode,
      input.transcriptText.slice(0, 6000),
      input.confidence ?? null,
      input.isFinal ?? true,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
  await updateCallIntelligenceFromTranscript(input.tenantId, input.conversationId, input.transcriptText);
}

async function updateCallIntelligenceFromTranscript(tenantId: string, conversationId: string, transcriptText: string) {
  const text = transcriptText.toLowerCase();
  const serviceTags = [
    /implant/.test(text) ? "implant" : null,
    /crown/.test(text) ? "crown" : null,
    /root canal/.test(text) ? "root_canal" : null,
    /cleaning|hygiene/.test(text) ? "hygiene" : null,
    /tooth pain|hurts|swelling|emergency/.test(text) ? "urgent_symptom" : null,
    /bill|balance|payment|statement/.test(text) ? "billing" : null,
    /insurance|benefit|coverage/.test(text) ? "insurance" : null,
    /appointment|schedule|reschedule|cancel/.test(text) ? "scheduling" : null,
  ].filter(Boolean) as string[];
  if (!serviceTags.length) return;
  const requiresHuman = /price|cost|how much|estimate|cash price|discount/.test(text);
  const revenueOpportunityCents = /implant/.test(text) ? 350000 : /crown|root canal/.test(text) ? 120000 : /whitening|aligner/.test(text) ? 50000 : 0;
  await query(
    `insert into "PhoneCallAiAssistEvent"
       ("id", "tenantId", "conversationId", "eventType", "severity", "title", "body", "serviceTags", "revenueOpportunityCents", "requiresHuman", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11::jsonb)`,
    [
      newId("paie"),
      tenantId,
      conversationId,
      requiresHuman ? "HUMAN_REQUIRED_PRICING_OR_SENSITIVE_TOPIC" : "CALL_INTENT_DETECTED",
      requiresHuman ? "WARNING" : "INFO",
      requiresHuman ? "Human handoff needed" : "Call intent detected",
      requiresHuman ? "The caller may be asking about pricing or another sensitive topic. Do not quote prices; route to a qualified team member." : `Detected call topics: ${serviceTags.join(", ")}.`,
      serviceTags,
      revenueOpportunityCents,
      requiresHuman,
      JSON.stringify({ transcriptPreview: transcriptText.slice(0, 300), noPricingReleased: true }),
    ],
  );
  await query(
    `insert into "PhoneCallAnalytics"
       ("id", "tenantId", "conversationId", "keywords", "riskFlags", "bookingIntentScore", "serviceRecoveryScore", "revenueOpportunityCents", "summaryQuality", "updatedAt")
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, 'LIVE_SIGNAL', current_timestamp)
     on conflict ("conversationId") do update set
       "keywords" = coalesce("PhoneCallAnalytics"."keywords", '[]'::jsonb) || excluded."keywords",
       "riskFlags" = coalesce("PhoneCallAnalytics"."riskFlags", '[]'::jsonb) || excluded."riskFlags",
       "bookingIntentScore" = greatest("PhoneCallAnalytics"."bookingIntentScore", excluded."bookingIntentScore"),
       "serviceRecoveryScore" = greatest("PhoneCallAnalytics"."serviceRecoveryScore", excluded."serviceRecoveryScore"),
       "revenueOpportunityCents" = greatest("PhoneCallAnalytics"."revenueOpportunityCents", excluded."revenueOpportunityCents"),
       "summaryQuality" = 'LIVE_SIGNAL',
       "updatedAt" = current_timestamp`,
    [
      newId("pca"),
      tenantId,
      conversationId,
      JSON.stringify(serviceTags),
      JSON.stringify(requiresHuman ? ["pricing_human_required"] : []),
      serviceTags.includes("scheduling") ? 85 : 25,
      serviceTags.includes("urgent_symptom") ? 75 : 10,
      revenueOpportunityCents,
    ],
  );
}

function parseTwilioTranscriptionData(payload: TwilioPayload) {
  const raw = payload.TranscriptionData || payload.transcription_data || "";
  if (!raw) return { text: "", confidence: null as number | null, languageCode: null as string | null, isFinal: true };
  try {
    const parsed = JSON.parse(raw);
    return {
      text: String(parsed.transcript || parsed.text || parsed.content || ""),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
      languageCode: typeof parsed.language_code === "string" ? parsed.language_code : typeof parsed.languageCode === "string" ? parsed.languageCode : null,
      isFinal: parsed.final === false || parsed.is_final === false || parsed.isFinal === false ? false : true,
    };
  } catch {
    return { text: raw, confidence: null as number | null, languageCode: null as string | null, isFinal: true };
  }
}

function phoneDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
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

async function sendSmsAutoReplyIfAllowed(input: { tenantId: string; to: string; body: string; sourceConversationId: string }) {
  if (!input.to || !input.body.trim()) return { status: "BLOCKED", reason: "Missing recipient or body." };
  const credentials = await getTwilioCredentials(input.tenantId);
  if (!credentials.accountSid || !credentials.authToken) {
    await recordSmsAssistantDelivery(input, "BLOCKED_CONNECTOR_REQUIRED", "Twilio Account SID/Auth Token are not configured.");
    return { status: "BLOCKED_CONNECTOR_REQUIRED", reason: "Twilio Account SID/Auth Token are not configured." };
  }
  const fromNumber = await getActiveSmsFromNumber(input.tenantId);
  if (!fromNumber) {
    await recordSmsAssistantDelivery(input, "BLOCKED_CONNECTOR_REQUIRED", "No active SMS-capable practice number is configured.");
    return { status: "BLOCKED_CONNECTOR_REQUIRED", reason: "No active SMS-capable practice number is configured." };
  }
  const callbackUrl = `${(process.env.ONE_DENTAL_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.1dentalai.com").replace(/\/$/, "")}/api/twilio/sms/status`;
  try {
    const twilio = await sendTwilioSms({ accountSid: credentials.accountSid, authToken: credentials.authToken, from: fromNumber, to: input.to, body: input.body, statusCallback: callbackUrl });
    await query(
      `update "PatientWebChatMessage"
       set "deliveryStatus" = 'SENT_TO_PROVIDER',
         "provider" = 'TWILIO',
         "providerMessageId" = $3,
         "providerStatus" = $4
       where "id" = (
         select "id" from "PatientWebChatMessage"
         where "tenantId" = $1 and "conversationId" = $2 and "senderType" = 'ASSISTANT'
         order by "createdAt" desc
         limit 1
       )`,
      [input.tenantId, input.sourceConversationId, twilio.sid, twilio.status],
    );
    await addAudit(input.tenantId, "twilio_webhook", "TWILIO_SMS_AI_AUTO_REPLY_SENT", "PatientWebChatConversation", input.sourceConversationId, "ALLOWED", { providerMessageId: twilio.sid, providerStatus: twilio.status });
    return { status: "SENT_TO_PROVIDER", providerMessageId: twilio.sid };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Twilio SMS send failed.";
    await recordSmsAssistantDelivery(input, "PROVIDER_ERROR", reason);
    return { status: "PROVIDER_ERROR", reason };
  }
}

async function recordSmsAssistantDelivery(input: { tenantId: string; sourceConversationId: string }, status: string, reason: string) {
  await query(
    `update "PatientWebChatMessage"
     set "deliveryStatus" = $3,
       "provider" = 'TWILIO',
       "providerError" = $4
     where "id" = (
       select "id" from "PatientWebChatMessage"
       where "tenantId" = $1 and "conversationId" = $2 and "senderType" = 'ASSISTANT'
       order by "createdAt" desc
       limit 1
     )`,
    [input.tenantId, input.sourceConversationId, status, reason],
  );
  await addAudit(input.tenantId, "twilio_webhook", "TWILIO_SMS_AI_AUTO_REPLY_BLOCKED", "PatientWebChatConversation", input.sourceConversationId, "BLOCKED", { deliveryStatus: status, reason });
}

async function getActiveSmsFromNumber(tenantId: string) {
  const result = await query<{ phoneNumber: string }>(
    `select "phoneNumber"
     from "PhoneNumber"
     where "tenantId" = $1 and "status" = 'ACTIVE' and "smsStatus" = 'ACTIVE'
     order by case "numberType" when 'MAIN' then 0 else 1 end, "createdAt" asc
     limit 1`,
    [tenantId],
  );
  return result.rows[0]?.phoneNumber ?? null;
}

async function sendTwilioSms(input: { accountSid: string; authToken: string; from: string; to: string; body: string; statusCallback: string }) {
  const params = new URLSearchParams({
    From: input.from,
    To: input.to,
    Body: input.body,
    StatusCallback: input.statusCallback,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${input.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data?.message === "string" ? data.message : `HTTP ${response.status}`;
    throw new Error(`Twilio SMS rejected: ${detail}`);
  }
  return { sid: String(data.sid || ""), status: String(data.status || "accepted") };
}

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}
