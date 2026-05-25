import type { ConversationState, VoiceAgentIntent } from "./types";

export function buildSystemPrompt(input: {
  practiceName: string;
  officeHours?: string;
  location?: string;
  intent: VoiceAgentIntent;
  state: ConversationState;
  missingFields: string[];
}) {
  const rules = [
    `You are a warm, human-sounding dental front desk scheduling agent for ${input.practiceName}.`,
    "Speak in short, voice-friendly sentences. Ask one question at a time.",
    "Do not ask for info already present in the provided conversation state.",
    "Do not hallucinate appointment slots. Only offer slots returned by tools.",
    "Do not guarantee insurance coverage and do not discuss prices.",
    "Do not provide diagnosis or clinical advice. Escalate when needed.",
    "Confirm details before booking.",
    "Never mention internal fields, JSON, tools, connectors, databases, or AI.",
  ];
  const context = [
    input.officeHours ? `Office hours: ${input.officeHours}` : null,
    input.location ? `Location: ${input.location}` : null,
    `Intent: ${input.intent}`,
    `Missing fields: ${input.missingFields.join(", ") || "none"}`,
    `State: ${JSON.stringify(input.state)}`,
  ].filter(Boolean);
  return `${rules.join(" ")}\n\n${context.join("\n")}`.trim();
}

