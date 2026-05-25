/* eslint-disable @typescript-eslint/no-require-imports */
const { createDecipheriv, createHash, randomUUID } = require("crypto");
const { Pool } = require("pg");
const { WebSocketServer, WebSocket } = require("ws");

const TENANT_ID = "tenant_1dentalai_production";
const REALTIME_PATH = "/api/twilio/voice/realtime";

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

function newId(prefix) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

function attachRealtimeVoiceBridge(server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname !== REALTIME_PATH) return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
  wss.on("connection", (twilioSocket, request) => {
    runRealtimeCallBridge(twilioSocket, request).catch((error) => {
      console.error("OpenAI realtime voice bridge failed", { error });
      try {
        twilioSocket.close(1011, "realtime bridge failed");
      } catch {}
    });
  });
}

async function runRealtimeCallBridge(twilioSocket, request) {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  let tenantId = url.searchParams.get("tenantId") || TENANT_ID;
  let conversationId = url.searchParams.get("conversationId") || "";
  let scenario = normalizeScenario(url.searchParams.get("scenario"));
  let openAiSocket = null;
  let streamSid = null;
  let callSid = null;
  let callerPhone = null;
  let lastCallerTranscript = "";
  let closed = false;

  const closeBoth = () => {
    if (closed) return;
    closed = true;
    try {
      if (twilioSocket.readyState === WebSocket.OPEN) twilioSocket.close();
    } catch {}
    try {
      if (openAiSocket?.readyState === WebSocket.OPEN) openAiSocket.close();
    } catch {}
  };

  const startOpenAi = async () => {
    if (openAiSocket) return;
    if (!conversationId) conversationId = newId("phone");
    const [openAiKey, policy, transcript, knowledge] = await Promise.all([
      getOpenAiKey(tenantId),
      getReceptionPolicy(tenantId),
      getTranscriptContext(tenantId, conversationId),
      getKnowledgeContext(tenantId, "appointment schedule dental insurance forms billing"),
    ]);
    if (!openAiKey) {
      await logAssistEvent(tenantId, conversationId, "REALTIME_OPENAI_BLOCKED", "ERROR", "OpenAI Realtime key is not available.", { source: "realtime_bridge" });
      twilioSocket.close(1011, "OpenAI key unavailable");
      return;
    }
    const voiceSettings = sanitizeVoiceSettings(policy.voiceSettings || {});
    const model = voiceSettings.realtimeModel || "gpt-realtime-mini";
    openAiSocket = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });
    attachOpenAiHandlers({ openAiSocket, twilioSocket, tenantId, conversationId, scenario, streamSid, callSid, callerPhone, getLastCallerTranscript: () => lastCallerTranscript, setLastCallerTranscript: (value) => { lastCallerTranscript = value; }, policy, voiceSettings, transcript, knowledge, closeBoth });
  };

  twilioSocket.on("message", async (raw) => {
    const event = parseJson(raw);
    if (!event) return;
    if (event.event === "start") {
      streamSid = event.start?.streamSid || event.streamSid || streamSid;
      callSid = event.start?.callSid || callSid;
      const params = event.start?.customParameters || {};
      tenantId = params.tenantId || tenantId;
      conversationId = params.conversationId || conversationId || newId("phone");
      scenario = normalizeScenario(params.scenario || scenario);
      callerPhone = params.callerPhone || params.From || callerPhone;
      await markRealtimeStarted(tenantId, conversationId, { streamSid, callSid, callerPhone, scenario });
      await startOpenAi();
      return;
    }
    if (event.event === "media" && event.media?.payload && openAiSocket?.readyState === WebSocket.OPEN) {
      openAiSocket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: event.media.payload }));
      return;
    }
    if (event.event === "stop") closeBoth();
  });

  twilioSocket.on("close", closeBoth);
  twilioSocket.on("error", closeBoth);

}

function attachOpenAiHandlers({ openAiSocket, twilioSocket, tenantId, conversationId, scenario, streamSid, callSid, callerPhone, getLastCallerTranscript, setLastCallerTranscript, policy, voiceSettings, transcript, knowledge, closeBoth }) {
  openAiSocket.on("open", () => {
    openAiSocket.send(JSON.stringify({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: buildInstructions({ policy, voiceSettings, scenario, transcript, knowledge }),
        voice: normalizeRealtimeVoice(voiceSettings.voice),
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        input_audio_transcription: { model: voiceSettings.transcriptionModel || "gpt-4o-transcribe" },
        turn_detection: { type: "server_vad", threshold: 0.52, prefix_padding_ms: 350, silence_duration_ms: 650 },
        tools: [appointmentToolSchema()],
        tool_choice: "auto",
        temperature: voiceSettings.temperature,
      },
    }));
    openAiSocket.send(JSON.stringify({
      type: "response.create",
      response: {
        instructions: "Greet the caller warmly in one sentence, say the front desk is helping another patient, and ask how you can help. Do not mention AI.",
      },
    }));
  });

  openAiSocket.on("message", async (raw) => {
    const event = parseJson(raw);
    if (!event) return;
    if (event.type === "response.audio.delta" && event.delta && streamSid && twilioSocket.readyState === WebSocket.OPEN) {
      twilioSocket.send(JSON.stringify({ event: "media", streamSid, media: { payload: event.delta } }));
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
      setLastCallerTranscript(event.transcript);
      await logTranscript(tenantId, conversationId, "CALLER", event.transcript, { provider: "OPENAI_REALTIME", callSid, streamSid });
      return;
    }
    if ((event.type === "response.audio_transcript.done" || event.type === "response.output_text.done") && (event.transcript || event.text)) {
      await logTranscript(tenantId, conversationId, "AI_AGENT", event.transcript || event.text, { provider: "OPENAI_REALTIME", callSid, streamSid });
      return;
    }
    const toolCall = extractToolCall(event);
    if (toolCall) {
      const output = await handleRealtimeToolCall({ tenantId, conversationId, callSid, callerPhone, lastCallerTranscript: getLastCallerTranscript(), toolCall });
      if (openAiSocket.readyState === WebSocket.OPEN) {
        openAiSocket.send(JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: toolCall.callId,
            output: JSON.stringify(output),
          },
        }));
        openAiSocket.send(JSON.stringify({
          type: "response.create",
          response: {
            instructions: output.ok
              ? "Confirm the appointment in a warm, natural sentence. Mention that a text confirmation is being sent. Ask if they need anything else."
              : "Apologize briefly and offer to have the front desk find the closest appointment time. Do not sound technical.",
          },
        }));
      }
      return;
    }
    if (event.type === "error") {
      await logAssistEvent(tenantId, conversationId, "OPENAI_REALTIME_ERROR", "ERROR", event.error?.message || "OpenAI Realtime returned an error.", event);
    }
  });

  openAiSocket.on("close", closeBoth);
  openAiSocket.on("error", async (error) => {
    await logAssistEvent(tenantId, conversationId, "OPENAI_REALTIME_SOCKET_ERROR", "ERROR", error.message || "Realtime socket error.", { callSid, streamSid });
    closeBoth();
  });
}

function buildInstructions({ voiceSettings, scenario, transcript, knowledge }) {
  const now = new Date().toLocaleString("en-US", { timeZone: "America/Denver", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  return [
    voiceSettings.systemPrompt,
    voiceSettings.voicePrompt,
    `Current practice time is ${now} Mountain Time. Scenario: ${scenario}.`,
    "You are the dental office receptionist on a live phone call. Sound like a patient, warm human, not a script.",
    "Keep memory inside the call: once the caller gives name, service, insurance answer, date, or time, do not ask for that same detail again.",
    "For appointment booking, collect first and last name, visit type, requested day, and requested time. Then call the book_appointment tool. Do not say the front desk will confirm if the tool can book it.",
    "If the caller asks for price, quote, diagnosis, prescriptions, emergency medical advice, or guaranteed insurance benefits, be empathetic and route to staff. Do not provide pricing.",
    "Use only the approved local knowledge below for dental process explanations. If the answer is not in the knowledge, offer a staff follow-up.",
    "Speak in short phone-friendly sentences. Ask one question at a time.",
    `Recent transcript:\n${transcript || "No earlier transcript."}`,
    `Approved local knowledge:\n${knowledge || "No matching approved knowledge was available."}`,
  ].filter(Boolean).join("\n\n");
}

function appointmentToolSchema() {
  return {
    type: "function",
    name: "book_appointment",
    description: "Check the PMS schedule and book a dental appointment when a caller has provided name, service, requested date, and requested time.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        callerName: { type: "string", description: "Caller first and last name." },
        service: { type: "string", description: "Requested visit type, such as new patient exam, hygiene cleaning, emergency exam, or implant consultation." },
        requestedDate: { type: "string", description: "Requested local date in YYYY-MM-DD." },
        requestedTime: { type: "string", description: "Requested local time in 24-hour HH:MM." },
        callerPhone: { type: "string", description: "Caller phone number if known." },
      },
      required: ["callerName", "service", "requestedDate", "requestedTime"],
    },
  };
}

async function handleRealtimeToolCall({ tenantId, conversationId, callerPhone, toolCall }) {
  const args = parseJson(toolCall.arguments) || {};
  const name = splitName(args.callerName || "Voice Patient");
  const service = String(args.service || "Dental visit").slice(0, 120);
  const requestedDate = String(args.requestedDate || "").slice(0, 10);
  const requestedTime = String(args.requestedTime || "").slice(0, 5);
  const phone = normalizePhoneNumber(args.callerPhone || callerPhone || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !/^\d{2}:\d{2}$/.test(requestedTime)) {
    await logAssistEvent(tenantId, conversationId, "REALTIME_BOOKING_NEEDS_CLARIFICATION", "WARN", "Realtime booking tool was missing a valid date/time.", { args });
    return { ok: false, reason: "missing_date_or_time" };
  }
  const start = `${requestedDate} ${requestedTime}:00`;
  const end = addMinutes(start, defaultDuration(service));
  const slot = await findSlot(tenantId, start, end, service);
  if (!slot) {
    await createTask(tenantId, conversationId, `Caller requested ${service} on ${requestedDate} at ${requestedTime}, but no available PMS slot was found.`);
    return { ok: false, reason: "no_slot", requestedDate, requestedTime, service };
  }
  const patient = await ensurePatient(tenantId, { ...name, phone });
  const appointmentId = newId("appt");
  await getPool().query(
    `insert into "PmsAppointment"
       ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "readinessStatus", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, 'CONFIRMED', $8, 'READY', $9, current_timestamp)`,
    [appointmentId, tenantId, patient.id, slot.providerId, slot.operatoryId, start, end, service, `Booked by OpenAI Realtime voice call from conversation ${conversationId}.`],
  );
  await getPool().query(
    `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
     values ($1, $2, 'CONFIRMED', 'voice_ai_realtime', $3)`,
    [newId("apst"), appointmentId, `Realtime voice booked ${service} on ${requestedDate} at ${requestedTime}.`],
  );
  await getPool().query(
    `update "PhoneConversation"
     set "patientId" = $3, "appointmentId" = $4, "callerName" = $5,
       "aiIntent" = 'APPOINTMENT_BOOKING', "followUpStatus" = 'APPOINTMENT_BOOKED',
       "outcome" = 'PMS_APPOINTMENT_BOOKED_REALTIME', "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, conversationId, patient.id, appointmentId, `${patient.firstName} ${patient.lastName}`],
  );
  await logAssistEvent(tenantId, conversationId, "REALTIME_APPOINTMENT_BOOKED", "INFO", `Booked ${service} for ${patient.firstName} ${patient.lastName}.`, { appointmentId, patientId: patient.id, slot });
  await stageSmsConfirmation({ tenantId, conversationId, patientId: patient.id, appointmentId, phone: phone || patient.phone, service, startsAt: start });
  return { ok: true, appointmentId, patientId: patient.id, service, requestedDate, requestedTime, providerName: slot.providerName, operatoryName: slot.operatoryName };
}

async function findSlot(tenantId, start, end, service) {
  const result = await getPool().query(
    `select p."id" as "providerId", p."displayName" as "providerName",
            o."id" as "operatoryId", o."name" as "operatoryName"
     from "PmsProvider" p
     cross join "PmsOperatory" o
     where p."tenantId" = $1 and o."tenantId" = $1
       and p."status" = 'ACTIVE' and o."status" in ('READY', 'ACTIVE')
       and not exists (
         select 1 from "PmsAppointment" a
         where a."tenantId" = $1 and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
           and a."startsAt" < $3::timestamp and a."endsAt" > $2::timestamp
           and (a."providerId" = p."id" or a."operatoryId" = o."id")
       )
     order by case when lower(p."providerType") like '%hyg%' and lower($4) like '%hygiene%' then 0 else 1 end,
              p."displayName", o."code"
     limit 1`,
    [tenantId, start, end, service],
  );
  return result.rows[0] || null;
}

async function ensurePatient(tenantId, input) {
  const digits = onlyDigits(input.phone || "");
  const existing = await getPool().query(
    `select "id", "firstName", "lastName", "phone"
     from "PmsPatient"
     where "tenantId" = $1 and (
       ($2 <> '' and right(regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g'), 10) = right($2, 10))
       or (lower("firstName") = lower($3) and lower("lastName") = lower($4))
     )
     order by "updatedAt" desc
     limit 1`,
    [tenantId, digits, input.firstName, input.lastName],
  );
  if (existing.rows[0]) return existing.rows[0];
  const id = newId("pat");
  const chart = `RT-${Date.now().toString(36).toUpperCase()}`;
  const created = await getPool().query(
    `insert into "PmsPatient"
       ("id", "tenantId", "chartNumber", "firstName", "lastName", "phone", "patientNote", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'Created by OpenAI Realtime voice scheduling.', current_timestamp)
     returning "id", "firstName", "lastName", "phone"`,
    [id, tenantId, chart, input.firstName, input.lastName || "Patient", input.phone || null],
  );
  return created.rows[0];
}

async function stageSmsConfirmation(input) {
  if (!input.phone) return;
  const id = newId("pmsg");
  const body = `Your ${input.service.toLowerCase()} is confirmed for ${formatAppointmentTime(input.startsAt)}. Reply here if you need help changing it.`;
  await getPool().query(
    `insert into "PhoneOutboundMessage"
       ("id", "tenantId", "conversationId", "patientId", "appointmentId", "channel", "recipientNumber", "messageType", "body", "approvalStatus", "deliveryStatus", "consentStatus", "connectorStatus", "readiness", "updatedAt")
     values ($1, $2, $3, $4, $5, 'SMS', $6, 'REALTIME_VOICE_APPOINTMENT_CONFIRMATION', $7, 'APPROVED', 'READY_FOR_CONNECTOR', 'VERIFIED', 'READY_FOR_CONNECTOR', $8::jsonb, current_timestamp)`,
    [id, input.tenantId, input.conversationId, input.patientId, input.appointmentId, input.phone, body, JSON.stringify({ source: "openai_realtime_voice", consentUnblockedForDemo: true })],
  );
}

async function getReceptionPolicy(tenantId) {
  const result = await getPool().query(
    `select "voiceSettings", "bookingPolicy", "billingPolicy", "pricingPolicy"
     from "PhoneAiReceptionPolicy"
     where "tenantId" = $1 and "status" in ('ACTIVE','READY_FOR_SMOKE_TEST')
     order by "updatedAt" desc limit 1`,
    [tenantId],
  );
  return result.rows[0] || { voiceSettings: {} };
}

async function getOpenAiKey(tenantId) {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_BAA_ENABLED === "true" && process.env.OPENAI_PHI_ALLOWED === "true") return process.env.OPENAI_API_KEY;
  const result = await getPool().query(
    `select "encryptedValue", "encryptionIv", "encryptionTag"
     from "ConnectorCredentialVault"
     where "tenantId" = $1 and "providerKey" = 'OPENAI' and "credentialLabel" = 'api_key'
       and "status" in ('VALIDATED','STORED_PENDING_VALIDATION')
     order by case when "status" = 'VALIDATED' then 0 else 1 end, "updatedAt" desc
     limit 1`,
    [tenantId],
  );
  const row = result.rows[0];
  if (!row) return "";
  return decryptSecret(row.encryptedValue, row.encryptionIv, row.encryptionTag);
}

function decryptSecret(value, ivValue, tagValue) {
  const configured = process.env.CONNECTOR_SECRET_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!configured || configured.length < 24) throw new Error("CONNECTOR_SECRET_KEY is not configured.");
  const key = createHash("sha256").update(configured).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(value, "base64")), decipher.final()]).toString("utf8");
}

async function getTranscriptContext(tenantId, conversationId) {
  const result = await getPool().query(
    `select "speaker", "transcriptText"
     from "PhoneCallTranscriptEvent"
     where "tenantId" = $1 and "conversationId" = $2
     order by "createdAt" desc limit 10`,
    [tenantId, conversationId],
  );
  return result.rows.reverse().map((row) => `${row.speaker}: ${row.transcriptText}`).join("\n");
}

async function getKnowledgeContext(tenantId, seed) {
  const terms = seed.toLowerCase().match(/[a-z]{4,}/g)?.slice(0, 10) || [];
  const result = await getPool().query(
    `select kc."heading", kc."content", kp."title"
     from "PatientEngagementKnowledgeChunk" kc
     join "PatientEngagementKnowledgePage" kp on kp."id" = kc."pageId"
     where kc."tenantId" = $1 and kc."status" = 'READY_FOR_RETRIEVAL'
       and exists (
         select 1 from unnest($2::text[]) term
         where lower(kc."content") like '%' || term || '%'
            or lower(coalesce(kc."heading", '')) like '%' || term || '%'
            or lower(kp."title") like '%' || term || '%'
       )
     order by kc."updatedAt" desc limit 8`,
    [tenantId, terms],
  ).catch(() => ({ rows: [] }));
  return result.rows.map((row) => `- ${row.heading || row.title}: ${String(row.content).slice(0, 500)}`).join("\n");
}

async function markRealtimeStarted(tenantId, conversationId, metadata) {
  await getPool().query(
    `update "PhoneConversation"
     set "followUpStatus" = 'OPENAI_REALTIME_ACTIVE',
       "outcome" = 'OPENAI_REALTIME_ACTIVE',
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, conversationId],
  );
  await logAssistEvent(tenantId, conversationId, "OPENAI_REALTIME_STARTED", "INFO", "OpenAI Realtime voice bridge connected.", metadata);
}

async function logTranscript(tenantId, conversationId, speaker, text, metadata) {
  if (!text?.trim()) return;
  await getPool().query(
    `insert into "PhoneCallTranscriptEvent"
       ("id", "tenantId", "conversationId", "speaker", "transcriptText", "languageCode", "isFinal", "provider", "metadata")
     values ($1, $2, $3, $4, $5, 'en-US', true, 'OPENAI_REALTIME', $6::jsonb)`,
    [newId("ptrx"), tenantId, conversationId, speaker, text.slice(0, 4000), JSON.stringify(metadata || {})],
  );
}

async function logAssistEvent(tenantId, conversationId, type, severity, body, metadata) {
  await getPool().query(
    `insert into "PhoneCallAiAssistEvent"
       ("id", "tenantId", "conversationId", "eventType", "severity", "title", "body", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("paie"), tenantId, conversationId, type, severity, titleCase(type), body, JSON.stringify(metadata || {})],
  ).catch((error) => console.error("Realtime assist log failed", error));
}

async function createTask(tenantId, conversationId, nextAction) {
  await getPool().query(
    `insert into "PhoneCallTask"
       ("id", "tenantId", "conversationId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "sourceModule", "updatedAt")
     values ($1, $2, $3, 'AI_VOICE_FOLLOW_UP', 'HIGH', 'OPEN', current_timestamp + interval '15 minutes', 'front_desk', $4, 'VOICE_AI', current_timestamp)`,
    [newId("ptask"), tenantId, conversationId, nextAction],
  );
}

function extractToolCall(event) {
  if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
    return { name: event.item.name, callId: event.item.call_id, arguments: event.item.arguments || "{}" };
  }
  if (event.type === "response.function_call_arguments.done") {
    return { name: event.name, callId: event.call_id, arguments: event.arguments || "{}" };
  }
  return null;
}

function sanitizeVoiceSettings(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    realtimeModel: stringValue(input.realtimeModel, "gpt-realtime-mini"),
    transcriptionModel: stringValue(input.transcriptionModel, "gpt-4o-transcribe"),
    voice: stringValue(input.realtimeVoice || input.openAiVoice || input.voice, "alloy"),
    temperature: boundedNumber(input.temperature, 0.45, 0, 1.2),
    systemPrompt: stringValue(input.systemPrompt, "You are the dental practice phone receptionist. Be warm, concise, and remember details across the call."),
    voicePrompt: stringValue(input.voicePrompt, "Book appointments directly when the caller gives name, visit type, date, and time. Do not ask twice for information already provided."),
  };
}

function normalizeRealtimeVoice(value) {
  const allowed = new Set(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"]);
  const voice = String(value || "").trim().toLowerCase();
  return allowed.has(voice) ? voice : "alloy";
}

function normalizeScenario(value) {
  return ["recall", "reactivation", "appointment_reminder", "event_greeting", "inbound_takeover"].includes(value) ? value : "inbound_takeover";
}

function splitName(name) {
  const parts = String(name || "").trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  return { firstName: titleCase(parts[0] || "Voice"), lastName: titleCase(parts.slice(1).join(" ") || "Patient") };
}

function addMinutes(start, minutes) {
  const date = new Date(start.replace(" ", "T"));
  date.setMinutes(date.getMinutes() + minutes);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
}

function defaultDuration(service) {
  const text = String(service || "").toLowerCase();
  if (/emergency|pain|consult/.test(text)) return 30;
  if (/cleaning|hygiene/.test(text)) return 60;
  return 45;
}

function formatAppointmentTime(value) {
  return new Date(value.replace(" ", "T")).toLocaleString("en-US", { timeZone: "America/Denver", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function normalizePhoneNumber(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = onlyDigits(trimmed);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function stringValue(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boundedNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function titleCase(value) {
  return String(value || "").toLowerCase().replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function parseJson(raw) {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

module.exports = { attachRealtimeVoiceBridge };
