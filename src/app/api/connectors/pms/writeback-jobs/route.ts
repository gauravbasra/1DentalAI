import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createPmsWritebackJob } from "@/lib/pms-connectors/writeback-jobs";
import { defaultPmsConnectorInstanceId } from "@/lib/pms-connectors/capability-map";
import type { PmsCapabilityKey } from "@/lib/pms-connectors/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const payload = typeof body.payload === "object" && body.payload !== null ? body.payload as Record<string, unknown> : {};
  const evidence = Array.isArray(body.evidence) ? body.evidence.filter((item: unknown) => typeof item === "object" && item !== null) as Array<Record<string, unknown>> : [];
  const capabilityKey = String(body.capabilityKey ?? "") as PmsCapabilityKey;

  if (!capabilityKey || !body.localType || !body.localId || !body.externalType) {
    return NextResponse.json({ ok: false, error: "capabilityKey, localType, localId, and externalType are required." }, { status: 400 });
  }

  const job = await createPmsWritebackJob({
    tenantId: auth.session.tenantId,
    connectorInstanceId: typeof body.connectorInstanceId === "string" ? body.connectorInstanceId : defaultPmsConnectorInstanceId,
    capabilityKey,
    localType: String(body.localType),
    localId: String(body.localId),
    externalType: String(body.externalType),
    requestedByRole: auth.session.roleKey,
    payload,
    evidence,
    idempotencyKey: typeof body.idempotencyKey === "string" && body.idempotencyKey ? body.idempotencyKey : `${capabilityKey}:${body.localType}:${body.localId}`,
  });

  return NextResponse.json({ ok: job.status !== "BLOCKED", job }, { status: job.status === "BLOCKED" ? 409 : 201 });
}
