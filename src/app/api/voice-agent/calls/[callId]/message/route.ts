import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { VoiceAgentOrchestrator } from "@/lib/voice-agent/orchestrator";
import { MockSchedulingAdapter } from "@/lib/voice-agent/scheduling/adapters";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ callId: string }> }) {
  const testTenantId = request.headers.get("x-1dentalai-test-tenant");
  const session = testTenantId && process.env.ONE_DENTAL_ALLOW_TEST_AUTH === "1"
    ? { tenantId: testTenantId, roleKey: "super_admin" }
    : await requireAuth();
  const { callId } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  if (!text.trim()) return NextResponse.json({ ok: false, error: "text is required" }, { status: 400 });

  const orchestrator = new VoiceAgentOrchestrator(new MockSchedulingAdapter());
  const result = await orchestrator.handleMessage({
    tenantId: session.tenantId,
    practiceId: typeof body.practice_id === "string" ? body.practice_id : null,
    callId,
    text,
  });
  return NextResponse.json({ ok: true, ...result });
}
