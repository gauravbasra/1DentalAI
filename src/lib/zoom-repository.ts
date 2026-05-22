import { newId, query } from "@/lib/db";

type ZoomTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  reason?: string;
};

type ZoomMeetingResponse = {
  id?: number | string;
  uuid?: string;
  topic?: string;
  start_url?: string;
  join_url?: string;
  password?: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  status?: string;
  [key: string]: unknown;
};

export function getZoomCredentialStatus() {
  return {
    hasAccountId: Boolean(process.env.ZOOM_ACCOUNT_ID),
    hasClientId: Boolean(process.env.ZOOM_CLIENT_ID),
    hasClientSecret: Boolean(process.env.ZOOM_CLIENT_SECRET),
    hasWebhookSecret: Boolean(process.env.ZOOM_WEBHOOK_SECRET_TOKEN),
  };
}

function assertZoomCredentials() {
  const missing = Object.entries({
    ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID: process.env.ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET: process.env.ZOOM_CLIENT_SECRET,
  }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) throw new Error(`Missing Zoom credentials: ${missing.join(", ")}`);
  return {
    accountId: process.env.ZOOM_ACCOUNT_ID!,
    clientId: process.env.ZOOM_CLIENT_ID!,
    clientSecret: process.env.ZOOM_CLIENT_SECRET!,
  };
}

export async function getZoomAccessToken() {
  const credentials = assertZoomCredentials();
  const basic = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const response = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(credentials.accountId)}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as ZoomTokenResponse;
  if (!response.ok || !data.access_token) {
    const reason = data.reason || data.error || `Zoom token request failed with HTTP ${response.status}.`;
    throw new Error(reason);
  }
  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "bearer",
    expiresIn: data.expires_in ?? null,
    scope: data.scope || "",
  };
}

export async function runZoomConnectionSmokeTest() {
  const started = Date.now();
  const token = await getZoomAccessToken();
  const response = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const reason = typeof data.message === "string" ? data.message : `Zoom user lookup failed with HTTP ${response.status}.`;
    return {
      ok: true,
      latencyMs: Date.now() - started,
      tokenExpiresIn: token.expiresIn,
      scope: token.scope,
      userLookup: {
        ok: false,
        status: response.status,
        blockedReason: reason,
        requiredScopes: ["user:read:user", "user:read:user:admin"],
      },
      zoomUser: null,
    };
  }
  return {
    ok: true,
    latencyMs: Date.now() - started,
    tokenExpiresIn: token.expiresIn,
    scope: token.scope,
    userLookup: { ok: true, status: response.status, blockedReason: null, requiredScopes: [] },
    zoomUser: {
      id: typeof data.id === "string" ? data.id : null,
      email: typeof data.email === "string" ? data.email : null,
      type: data.type ?? null,
      status: data.status ?? null,
      accountId: typeof data.account_id === "string" ? data.account_id : null,
    },
  };
}

function minutesBetween(startsAt: string, endsAt: string) {
  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
}

function appointmentTopic(row: { appointmentType: string; providerName: string | null }) {
  return `1DentalAI virtual visit: ${row.appointmentType}${row.providerName ? ` with ${row.providerName}` : ""}`;
}

export async function createZoomMeetingForAppointment(input: { appointmentId: string; actorRole?: string; agenda?: string }) {
  const appointment = (await query<{
    id: string;
    tenantId: string;
    patientId: string | null;
    providerId: string | null;
    patientName: string | null;
    providerName: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
    appointmentType: string;
  }>(
    `select a."id", a."tenantId", a."patientId", a."providerId",
      case when p."id" is null then null else p."firstName" || ' ' || p."lastName" end as "patientName",
      pr."displayName" as "providerName",
      a."startsAt"::text as "startsAt", a."endsAt"::text as "endsAt", a."status", a."appointmentType"
     from "PmsAppointment" a
     left join "PmsPatient" p on p."id" = a."patientId"
     left join "PmsProvider" pr on pr."id" = a."providerId"
     where a."id" = $1`,
    [input.appointmentId],
  )).rows[0];
  if (!appointment) throw new Error("Appointment not found.");
  if (["CANCELED", "BROKEN", "NO_SHOW", "COMPLETED"].includes(appointment.status)) throw new Error(`Cannot create Zoom meeting for ${appointment.status.toLowerCase()} appointment.`);

  const existing = (await query<{ id: string; joinUrl: string; status: string }>(
    `select "id", "joinUrl", "status"
     from "PmsVirtualVisit"
     where "tenantId" = $1 and "appointmentId" = $2 and "provider" = 'ZOOM' and "status" not in ('CANCELED','DELETED')
     order by "createdAt" desc
     limit 1`,
    [appointment.tenantId, appointment.id],
  )).rows[0];
  if (existing) return { id: existing.id, joinUrl: existing.joinUrl, status: existing.status, reused: true };

  const token = await getZoomAccessToken();
  const topic = appointmentTopic(appointment);
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: new Date(appointment.startsAt).toISOString(),
      duration: minutesBetween(appointment.startsAt, appointment.endsAt),
      timezone: "America/Denver",
      agenda: input.agenda?.trim() || "Virtual dental visit. Patient-specific details remain inside 1DentalAI.",
      settings: {
        waiting_room: true,
        join_before_host: false,
        approval_type: 0,
        audio: "both",
        host_video: true,
        participant_video: true,
      },
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as ZoomMeetingResponse & { message?: string };
  if (!response.ok || !data.id || !data.join_url) {
    throw new Error(typeof data.message === "string" ? data.message : `Zoom meeting creation failed with HTTP ${response.status}.`);
  }

  const visitId = newId("vvisit");
  await query(
    `insert into "PmsVirtualVisit"
      ("id", "tenantId", "appointmentId", "patientId", "providerId", "providerMeetingId", "providerUuid", "topic", "startUrl", "joinUrl", "password", "status", "createdByRole", "metadata", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'CREATED', $12, $13::jsonb, current_timestamp)`,
    [
      visitId,
      appointment.tenantId,
      appointment.id,
      appointment.patientId,
      appointment.providerId,
      String(data.id),
      data.uuid || null,
      data.topic || topic,
      data.start_url || null,
      data.join_url,
      data.password || null,
      input.actorRole || "front_desk",
      JSON.stringify({ zoom: { id: data.id, uuid: data.uuid, startTime: data.start_time, duration: data.duration, timezone: data.timezone }, source: "PMS_APPOINTMENT" }),
    ],
  );
  await query(
    `update "PmsAppointment"
     set "notes" = trim(coalesce("notes", '') || E'\nZoom virtual visit: ' || $2),
       "updatedAt" = current_timestamp
     where "id" = $1`,
    [appointment.id, data.join_url],
  );
  await query(
    `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
     values ($1, $2, $3, $4, $5)`,
    [newId("apst"), appointment.id, appointment.status, input.actorRole || "front_desk", `Zoom meeting created: ${data.join_url}`],
  );
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, 'ZOOM_MEETING_CREATED_FOR_APPOINTMENT', 'PmsVirtualVisit', $4, 'ALLOWED', $5::jsonb)`,
    [newId("audit"), appointment.tenantId, input.actorRole || "front_desk", visitId, JSON.stringify({ appointmentId: appointment.id, zoomMeetingId: data.id, noPhiInTopic: true })],
  );

  return { id: visitId, joinUrl: data.join_url, startUrl: data.start_url ?? null, status: "CREATED", reused: false };
}

export async function listVirtualVisitsForAppointment(appointmentId: string) {
  const result = await query<{
    id: string;
    providerMeetingId: string;
    providerUuid: string | null;
    topic: string;
    joinUrl: string;
    startUrl: string | null;
    status: string;
    participantStatus: string;
    startedAt: string | null;
    endedAt: string | null;
    lastEventAt: string | null;
    createdAt: string;
  }>(
    `select "id", "providerMeetingId", "providerUuid", "topic", "joinUrl", "startUrl", "status", "participantStatus",
      "startedAt"::text as "startedAt", "endedAt"::text as "endedAt", "lastEventAt"::text as "lastEventAt", "createdAt"::text as "createdAt"
     from "PmsVirtualVisit"
     where "appointmentId" = $1
     order by "createdAt" desc`,
    [appointmentId],
  );
  return result.rows;
}

export async function applyZoomWebhookToVirtualVisit(input: { event: string; payload: Record<string, unknown>; eventTs?: number }) {
  const object = input.payload.object && typeof input.payload.object === "object" ? input.payload.object as Record<string, unknown> : {};
  const meetingId = object.id ? String(object.id) : "";
  const uuid = object.uuid ? String(object.uuid) : "";
  if (!meetingId && !uuid) return { matched: false };
  const eventAt = input.eventTs ? new Date(input.eventTs > 10_000_000_000 ? input.eventTs : input.eventTs * 1000).toISOString() : new Date().toISOString();
  const status = input.event.includes("ended") ? "ENDED" : input.event.includes("started") ? "STARTED" : input.event.includes("deleted") ? "DELETED" : null;
  const participantStatus = input.event.includes("participant_joined") ? "JOINED" : input.event.includes("participant_left") ? "LEFT" : null;
  const result = await query<{ id: string; tenantId: string; appointmentId: string }>(
    `update "PmsVirtualVisit"
     set "providerUuid" = coalesce("providerUuid", nullif($2, '')),
       "status" = coalesce($3, "status"),
       "participantStatus" = coalesce($4, "participantStatus"),
       "startedAt" = case when $3 = 'STARTED' then $5::timestamptz else "startedAt" end,
       "endedAt" = case when $3 = 'ENDED' then $5::timestamptz else "endedAt" end,
       "lastEventAt" = $5::timestamptz,
       "metadata" = coalesce("metadata", '{}'::jsonb) || jsonb_build_object('lastZoomEvent', $6::jsonb),
       "updatedAt" = current_timestamp
     where "provider" = 'ZOOM' and ("providerMeetingId" = $1 or "providerUuid" = $2)
     returning "id", "tenantId", "appointmentId"`,
    [meetingId, uuid, status, participantStatus, eventAt, JSON.stringify({ event: input.event, payload: input.payload })],
  );
  const row = result.rows[0];
  if (!row) return { matched: false };
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, 'zoom_webhook', 'ZOOM_EVENT_APPLIED_TO_VISIT', 'PmsVirtualVisit', $3, 'ALLOWED', $4::jsonb)`,
    [newId("audit"), row.tenantId, row.id, JSON.stringify({ appointmentId: row.appointmentId, event: input.event })],
  );
  return { matched: true, visitId: row.id, appointmentId: row.appointmentId };
}
