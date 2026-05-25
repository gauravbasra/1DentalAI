import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { VoiceAgentOrchestrator } from "@/lib/voice-agent/orchestrator";
import { MockSchedulingAdapter } from "@/lib/voice-agent/scheduling/adapters";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // API tests run without Next cookies; allow an explicit test header only when explicitly enabled.
  const testTenantId = request.headers.get("x-1dentalai-test-tenant");
  const session = testTenantId && process.env.ONE_DENTAL_ALLOW_TEST_AUTH === "1"
    ? { tenantId: testTenantId, roleKey: "super_admin" }
    : await requireAuth();
  const body = await request.json().catch(() => ({}));
  const callerPhone = typeof body.caller_phone === "string" ? body.caller_phone : "";
  if (!callerPhone) return NextResponse.json({ ok: false, error: "caller_phone is required" }, { status: 400 });

  const orchestrator = new VoiceAgentOrchestrator(new MockSchedulingAdapter());
  const call = await orchestrator.startCall({
    tenantId: session.tenantId,
    practiceId: typeof body.practice_id === "string" ? body.practice_id : null,
    callerPhone,
    callProvider: typeof body.call_provider === "string" ? body.call_provider : "MOCK",
    providerCallId: typeof body.provider_call_id === "string" ? body.provider_call_id : null,
  });
  return NextResponse.json({ ok: true, ...call });
}
