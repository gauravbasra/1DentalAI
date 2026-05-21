import fs from "node:fs";

const page = fs.readFileSync("src/app/app/phone/page.tsx", "utf8");
const repository = fs.readFileSync("src/lib/operating-system-repository.ts", "utf8");
const twilioWebhooks = fs.readFileSync("src/lib/twilio-webhooks.ts", "utf8");
const schema = fs.readFileSync("prisma/schema.prisma", "utf8");

const requiredSchemaModels = [
  "PhoneNumber",
  "PhoneExtension",
  "PhoneDevice",
  "PhoneProviderConnection",
  "PhoneActiveCall",
  "PhoneCallControlAction",
  "PhoneVoicemail",
  "PhoneCallTask",
];

const requiredTokens = [
  "SIP trunk and caller ID",
  "SMS registration",
  "MAC provisioning",
  "provider call identifier from webhook",
  "READY_FOR_CONNECTOR",
  "BLOCKED_CONNECTOR_REQUIRED",
  "no fake call action was sent",
  "createPhoneDispositionTask",
  "PHONE_DISPOSITION_TASK_CREATED",
  "PhoneVoicemail",
  "transcription",
  "Write disposition task",
  "Stage transfer",
  "Stage park",
  "SignalWire/FreeSWITCH PBX and media control plane",
  "FreeSWITCH PBX/media layer",
  "mod_sofia",
  "mod_event_socket",
  "mod_callcenter",
  "mod_conference",
  "mod_verto",
  "SMS provider and 10DLC",
  "STIR/SHAKEN and carrier compliance",
  "FreeSWITCH is the PBX/media layer, not the carrier replacement",
  "deployed FreeSWITCH/PBX media layer with verified Event Socket or webhook bridge",
  "TWILIO_INBOUND_REVIEW",
  "TWILIO_SMS_REPLY_REVIEW",
  "TWILIO_RECORDING_RECEIVED",
  "TWILIO_TRANSCRIPTION_RECEIVED",
  "TWILIO_WEBHOOK_VALIDATION_REQUIRED",
  "x-twilio-signature",
];

const failures = [];
for (const model of requiredSchemaModels) {
  if (!schema.includes(`model ${model}`)) failures.push(`Missing phone Prisma model: ${model}`);
}

const haystack = `${page}\n${repository}\n${twilioWebhooks}`;
for (const token of requiredTokens) {
  if (!haystack.includes(token)) failures.push(`Missing phone workbench token: ${token}`);
}

if (/twilio|telnyx|bandwidth|ringcentral/i.test(page) && !page.includes("CONNECTOR_REQUIRED")) {
  failures.push("Phone page references a carrier directly without connector gating.");
}

if (failures.length) {
  console.error("Phone workbench validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Phone workbench validation passed: carrier setup, E911/SMS/MAC readiness, gated call controls, voicemail, and disposition task writeback are represented.");
