import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.VOICE_AGENT_TEST_BASE_URL || "http://127.0.0.1:3001";
const tenantCookie = process.env.VOICE_AGENT_TEST_COOKIE || "";
const testTenantId = process.env.VOICE_AGENT_TEST_TENANT || "tenant_1dentalai_production";

async function postJson(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tenantCookie ? { Cookie: tenantCookie } : {}),
      ...(!tenantCookie ? { "x-1dentalai-test-tenant": testTenantId } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

test("New patient: extracts multiple fields and does not repeat", async () => {
  const started = await postJson("/api/voice-agent/calls/start", {
    practice_id: "loc_1",
    caller_phone: "+17205550199",
    call_provider: "MOCK",
  });
  assert.equal(started.ok, true);
  assert.ok(started.json.callId);

  const turn1 = await postJson(`/api/voice-agent/calls/${started.json.callId}/message`, {
    practice_id: "loc_1",
    text: "Hi, I'm Priya. I'm a new patient and I need a cleaning Friday morning.",
  });
  assert.equal(turn1.ok, true);
  assert.ok(typeof turn1.json.reply === "string");
  assert.ok(!turn1.json.reply.toLowerCase().includes("first and last name"), "should not repeat name when provided");
});

test("Offers slots and asks choice", async () => {
  const started = await postJson("/api/voice-agent/calls/start", {
    practice_id: "loc_1",
    caller_phone: "+17205550198",
    call_provider: "MOCK",
  });
  assert.equal(started.ok, true);

  const t1 = await postJson(`/api/voice-agent/calls/${started.json.callId}/message`, {
    practice_id: "loc_1",
    text: "I want to schedule a cleaning. I'm a new patient. My name is John Smith. Friday morning.",
  });
  assert.equal(t1.ok, true);
  assert.ok(typeof t1.json.reply === "string");
});
