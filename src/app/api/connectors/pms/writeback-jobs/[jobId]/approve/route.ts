import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { approvePmsWritebackJob } from "@/lib/pms-connectors/writeback-jobs";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { jobId } = await params;
  try {
    const job = await approvePmsWritebackJob({ tenantId: auth.session.tenantId, jobId, approvedByRole: auth.session.roleKey });
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Approval failed." }, { status: 404 });
  }
}
