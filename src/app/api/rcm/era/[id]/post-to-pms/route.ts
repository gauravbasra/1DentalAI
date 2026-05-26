import { NextResponse } from "next/server";

import {
  buildRcmPacketForApi,
  postEraToPms,
} from "@/lib/rcm-writeback-workflow";
import { requirePmsApiSession } from "@/lib/pms-api-auth";

export const dynamic = "force-dynamic";

type EraPostActionBody = {
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
      packetType: "ERA_POSTING",
      sourceRecordId: id,
    });
    return NextResponse.json({ ok: true, data: packet });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to build ERA packet." }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as EraPostActionBody;
  const action = String(body.action ?? "post").trim().toLowerCase();

  try {
    if (action === "build" || action === "preview") {
      const packet = await buildRcmPacketForApi({
        tenantId: auth.session.tenantId,
        actorRole: auth.session.roleKey,
        packetType: "ERA_POSTING",
        sourceRecordId: id,
      });
      return NextResponse.json({ ok: true, data: packet });
    }

    if (action === "post") {
      const result = await postEraToPms({
        session: {
          tenantId: auth.session.tenantId,
          roleKey: auth.session.roleKey,
          userId: auth.session.userId,
        },
        packetType: "ERA_POSTING",
        sourceRecordId: id,
        connectorInstanceId: typeof body.connectorInstanceId === "string" ? body.connectorInstanceId : undefined,
      });
      return NextResponse.json({ ok: true, data: { packet: result.packet, posting: result.posting, jobId: result.jobId, jobStatus: result.jobStatus, blockedReason: result.blockedReason } });
    }

    return NextResponse.json({ ok: false, error: "Unsupported action. Use one of: build, post." }, { status: 400 });
  } catch (error) {
    const status = typeof (error as { status?: unknown }).status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ERA post failed." }, { status });
  }
}
