import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { executePmsWritebackJob } from "@/lib/pms-connectors/writeback-jobs";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { jobId } = await params;
  try {
    const job = await executePmsWritebackJob({ tenantId: auth.session.tenantId, jobId, actorRole: auth.session.roleKey });
    return NextResponse.json({ ok: job.executionStatus !== "BLOCKED", job }, { status: job.executionStatus === "BLOCKED" ? 409 : 200 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Execution failed." }, { status: 404 });
  }
}
