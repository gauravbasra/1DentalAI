import { NextResponse } from "next/server";

import {
  buildRcmPacketForApi,
  createClaimsWritebackFromRcmSource,
} from "@/lib/rcm-writeback-workflow";
import { requirePmsApiSession } from "@/lib/pms-api-auth";

export const dynamic = "force-dynamic";

type PriorAuthPacketActionBody = {
  action?: string;
  connectorInstanceId?: string;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { id } = await params;
  try {
    const packet = await buildRcmPacketForApi({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      packetType: "PRIOR_AUTH",
      sourceRecordId: id,
    });
    return NextResponse.json({ ok: true, data: packet });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to build prior authorization packet." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as PriorAuthPacketActionBody;
  const action = String(body.action ?? "build").trim().toLowerCase();

  try {
    if (action === "submit" || action === "send" || action === "writeback") {
      const result = await createClaimsWritebackFromRcmSource({
        session: {
          tenantId: auth.session.tenantId,
          roleKey: auth.session.roleKey,
          userId: auth.session.userId,
        },
        packetType: "PRIOR_AUTH",
        sourceRecordId: id,
        connectorInstanceId: typeof body.connectorInstanceId === "string" ? body.connectorInstanceId : undefined,
      });
      return NextResponse.json({ ok: true, data: result.packet, writeback: result.writeback });
    }

    const packet = await buildRcmPacketForApi({
      tenantId: auth.session.tenantId,
      actorRole: auth.session.roleKey,
      packetType: "PRIOR_AUTH",
      sourceRecordId: id,
    });
    return NextResponse.json({ ok: true, data: packet });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Prior authorization packet action failed." }, { status });
  }
}
