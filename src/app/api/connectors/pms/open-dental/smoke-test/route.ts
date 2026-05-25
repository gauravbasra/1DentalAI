import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { runOpenDentalReadSmokeTest } from "@/lib/pms-connectors/smoke-tests";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const result = await runOpenDentalReadSmokeTest({
    tenantId: auth.session.tenantId,
    connectorInstanceId: typeof body.connectorInstanceId === "string" ? body.connectorInstanceId : undefined,
    actorRole: auth.session.roleKey,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
