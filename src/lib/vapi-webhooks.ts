import "server-only";

import { timingSafeEqual } from "node:crypto";
import { query, newId } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import { getConnectorSecret } from "@/lib/connector-control-repository";
import { OnlineSchedulingAdapter } from "@/lib/voice-agent/scheduling/adapters";

type VapiBody = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function getVapiSharedSecret(tenantId: string) {
  // Prefer env for server-to-server hardening; fall back to vault for multi-tenant.
  if (process.env.VAPI_WEBHOOK_TOKEN) return process.env.VAPI_WEBHOOK_TOKEN;
  const secret = await getConnectorSecret({ tenantId, providerKey: "VAPI", credentialLabel: "webhook_token", requireValidated: false }).catch(() => null);
  return secret?.value || null;
}

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

async function verifyVapiAuth(request: Request, tenantId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim()
    || request.headers.get("x-vapi-token")?.trim()
    || request.headers.get("x-1dentalai-vapi-token")?.trim()
    || "";
  const shared = await getVapiSharedSecret(tenantId);
  if (!shared) throw new Error("Vapi webhook auth is not configured (missing VAPI webhook token).");
  if (!token || !safeEqual(token, shared)) throw new Error("Unauthorized Vapi webhook request.");
}

export async function handleVapiWebhook(input: { request: Request; body: VapiBody; tenantId?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  await verifyVapiAuth(input.request, tenantId);

  // Vapi canonical shape is { message: { type, ... } } but their CLI examples use top-level { type, ... }.
  const message = object(input.body.message) ?? input.body;
  const type = text(message.type);

  if (!type) return { ok: true };

  if (type === "tool-calls") {
    const msg = message as Record<string, unknown>;
    const toolCallList = Array.isArray(msg.toolCallList) ? msg.toolCallList as unknown[] : [];
    const toolWithToolCallList = Array.isArray(msg.toolWithToolCallList) ? msg.toolWithToolCallList as unknown[] : [];
    const flattened = toolCallList.length
      ? toolCallList
      : toolWithToolCallList.map((row) => {
        const toolRow = object(row) ?? {};
        const toolCall = object(toolRow.toolCall) ?? {};
        return { id: toolCall.id, name: toolRow.name, parameters: toolCall.parameters };
      });

    const results = [];
    for (const call of flattened) {
      const callObj = object(call) ?? {};
      const toolCallId = text(callObj.id);
      const name = text(callObj.name);
      const parameters = object(callObj.parameters) ?? {};
      try {
        const result = await runTool({ tenantId, name, parameters });
        results.push({ name, toolCallId, result: JSON.stringify(result) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tool failed";
        results.push({ name, toolCallId, result: JSON.stringify({ ok: false, error: message }) });
      }
    }

    return { results };
  }

  if (type === "assistant-request") {
    // Fast path: return an assistantId already configured in Vapi (recommended for low latency).
    const assistantId = process.env.VAPI_DEFAULT_ASSISTANT_ID;
    if (assistantId) return { assistantId };
    return { error: "Assistant is not configured." };
  }

  // Informational events: accept quickly.
  return { ok: true };
}

async function runTool(input: { tenantId: string; name: string; parameters: Record<string, unknown> }) {
  const name = input.name;
  if (name === "get_available_slots") {
    const adapter = new OnlineSchedulingAdapter(input.tenantId);
    const slots = await adapter.fetchAvailableSlots(null, {
      serviceType: text(input.parameters.serviceType) || "cleaning",
      preferredDays: Array.isArray(input.parameters.preferredDays) ? input.parameters.preferredDays.map(String) : [],
      preferredTimeWindows: Array.isArray(input.parameters.preferredTimeWindows) ? input.parameters.preferredTimeWindows.map(String) : [],
      preferredProvider: text(input.parameters.preferredProvider) || null,
      patientType: (["new", "existing", "unknown"].includes(text(input.parameters.patientType)) ? text(input.parameters.patientType) : "unknown") as "new" | "existing" | "unknown",
    });
    return { ok: true, slots };
  }

  if (name === "hold_appointment_slot") {
    const adapter = new OnlineSchedulingAdapter(input.tenantId);
    const held = await adapter.holdSlot(null, text(input.parameters.slotId), { patient: input.parameters.patient || {} });
    return { ok: true, held };
  }

  if (name === "confirm_appointment") {
    const adapter = new OnlineSchedulingAdapter(input.tenantId);
    const confirmed = await adapter.confirmAppointment(null, text(input.parameters.heldSlotId), {
      patient: object(input.parameters.patient) ?? {},
      appointment: object(input.parameters.appointment) ?? {},
    });
    return { ok: true, confirmed };
  }

  if (name === "escalate_to_human") {
    const callId = text(input.parameters.callId) || newId("vapi");
    const reason = text(input.parameters.reason) || "Caller requested human assistance.";
    await query(
      `insert into "PhoneCallTask"
         ("id","tenantId","conversationId","patientId","taskType","priority","status","dueAt","ownerRoleKey","nextAction","sourceModule","updatedAt")
       values ($1,$2,$3,$4,'VAPI_ESCALATION','HIGH','OPEN',current_timestamp + interval '5 minutes','front_desk',$5,'VAPI',current_timestamp)`,
      [newId("ptask"), input.tenantId, callId, null, reason],
    );
    return { ok: true, status: "ESCALATED" };
  }

  return { ok: false, error: `Unknown tool: ${name}` };
}
