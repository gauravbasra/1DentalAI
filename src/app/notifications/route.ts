import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured, newId, query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ZoomNotificationBody = {
  event?: string;
  event_ts?: number;
  payload?: {
    plainToken?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function zoomSecretToken() {
  return process.env.ZOOM_WEBHOOK_SECRET_TOKEN || process.env.ZOOM_SECRET_TOKEN || "";
}

function encryptedToken(plainToken: string, secretToken: string) {
  return createHmac("sha256", secretToken).update(plainToken).digest("hex");
}

function verifyZoomSignature(request: NextRequest, rawBody: string, secretToken: string) {
  const timestamp = request.headers.get("x-zm-request-timestamp") ?? "";
  const signature = request.headers.get("x-zm-signature") ?? "";
  if (!secretToken) return "NOT_CONFIGURED";
  if (!timestamp || !signature) return "MISSING_SIGNATURE";

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return "STALE_TIMESTAMP";

  const expected = `v0=${createHmac("sha256", secretToken).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return "INVALID_SIGNATURE";
  return timingSafeEqual(expectedBuffer, actualBuffer) ? "VERIFIED" : "INVALID_SIGNATURE";
}

function eventDate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const ms = value > 10_000_000_000 ? value : value * 1000;
  return new Date(ms).toISOString();
}

async function storeEvent(input: {
  body: ZoomNotificationBody;
  signatureStatus: string;
  validationStatus: string;
  request: NextRequest;
}) {
  if (!isDatabaseConfigured()) return;
  await query(
    `insert into "ZoomNotificationEvent"
      ("id", "tenantId", "event", "eventTs", "payload", "signatureStatus", "validationStatus", "sourceIp", "userAgent")
     values ($1, 'tenant_1dentalai_production', $2, $3, $4::jsonb, $5, $6, $7, $8)`,
    [
      newId("zoom_evt"),
      input.body.event || "unknown",
      eventDate(input.body.event_ts),
      JSON.stringify(input.body),
      input.signatureStatus,
      input.validationStatus,
      input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      input.request.headers.get("user-agent") || null,
    ],
  ).catch((error) => console.error("Zoom notification event storage failed", error));
}

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: "1DentalAI Zoom notifications",
      expectedMethod: "POST",
      validationEvent: "endpoint.url_validation",
      secretConfigured: Boolean(zoomSecretToken()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: ZoomNotificationBody;
  try {
    body = JSON.parse(rawBody) as ZoomNotificationBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const secretToken = zoomSecretToken();
  const signatureStatus = verifyZoomSignature(request, rawBody, secretToken);

  if (body.event === "endpoint.url_validation") {
    const plainToken = body.payload?.plainToken;
    if (!plainToken || typeof plainToken !== "string") {
      await storeEvent({ body, request, signatureStatus, validationStatus: "INVALID_VALIDATION_PAYLOAD" });
      return NextResponse.json({ ok: false, error: "Missing Zoom plainToken." }, { status: 400 });
    }
    if (!secretToken) {
      await storeEvent({ body, request, signatureStatus, validationStatus: "SECRET_TOKEN_MISSING" });
      return NextResponse.json({ ok: false, error: "ZOOM_WEBHOOK_SECRET_TOKEN is not configured." }, { status: 503 });
    }
    const response = {
      plainToken,
      encryptedToken: encryptedToken(plainToken, secretToken),
    };
    await storeEvent({ body, request, signatureStatus, validationStatus: "VALIDATION_RESPONSE_RETURNED" });
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  }

  if (!["VERIFIED", "NOT_CONFIGURED"].includes(signatureStatus)) {
    await storeEvent({ body, request, signatureStatus, validationStatus: "NOT_VALIDATION_EVENT" });
    return NextResponse.json({ ok: false, error: "Invalid Zoom signature." }, { status: 401 });
  }

  await storeEvent({ body, request, signatureStatus, validationStatus: "NOT_VALIDATION_EVENT" });
  return NextResponse.json({ ok: true, received: true });
}
