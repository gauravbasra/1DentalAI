export type ScribeProcedureCode = {
  id: string;
  code: string;
  description: string;
  category: string;
  defaultFeeCents: number;
};

export type ScribeTemplateKey = "specific_exam" | "hygiene" | "restorative" | "emergency" | "consult";

export type ScribeTemplate = {
  key: ScribeTemplateKey;
  label: string;
  noteType: string;
  sections: string[];
};

export type ScribeSuggestion = {
  code: string;
  procedureCodeId?: string;
  description: string;
  tooth: string;
  surface: string;
  phase: number;
  priority: "HIGH" | "NORMAL";
  ownerRoleKey: string;
  reason: string;
};

export type ScribeTaskDraft = {
  ownerRoleKey: string;
  title: string;
  taskType: string;
  priority: "HIGH" | "NORMAL";
};

export type ScribeDraft = {
  templateKey: ScribeTemplateKey;
  noteType: string;
  noteBody: string;
  sections: Array<{ title: string; body: string }>;
  treatmentPlanName: string;
  treatmentPlanNote: string;
  treatmentSuggestions: ScribeSuggestion[];
  taskDrafts: ScribeTaskDraft[];
  analytics: {
    completeness: number;
    suggestedCdtCodes: string[];
    treatmentItemCount: number;
    openTaskCount: number;
    needsReview: string[];
  };
  generation: {
    source: "openai_structured" | "rules_fallback";
    model: string;
    blockedReason?: string;
  };
};

export const scribeTemplates: ScribeTemplate[] = [
  {
    key: "specific_exam",
    label: "Specific Examination",
    noteType: "EXAM",
    sections: ["Medical History Update", "Chief Complaint", "Clinical Findings", "Radiographs", "Diagnosis", "Discussion", "Treatment Plan", "Next Visit"],
  },
  {
    key: "hygiene",
    label: "Hygiene / Perio Maintenance",
    noteType: "HYGIENE",
    sections: ["Medical History Update", "Periodontal Findings", "Radiographs", "Assessment", "Treatment Provided", "Home Care Instructions", "Next Visit"],
  },
  {
    key: "restorative",
    label: "Restorative",
    noteType: "RESTORATIVE",
    sections: ["Medical History Update", "Tooth and Surface", "Diagnosis", "Procedure Discussion", "Materials", "Treatment Plan", "Post-op Instructions"],
  },
  {
    key: "emergency",
    label: "Emergency",
    noteType: "EMERGENCY",
    sections: ["Chief Complaint", "History of Present Illness", "Clinical Findings", "Radiographs", "Diagnosis", "Treatment Rendered", "Treatment Plan", "Next Visit"],
  },
  {
    key: "consult",
    label: "Consult / Second Opinion",
    noteType: "CONSULT",
    sections: ["Reason for Consult", "History Reviewed", "Findings", "Options Discussed", "Recommended Treatment Plan", "Patient Decision", "Next Step"],
  },
];

const cdtRules = [
  { code: "D0140", keywords: ["limited exam", "problem focused", "emergency exam", "emergency visit"], ownerRoleKey: "associate_provider", priority: "HIGH" as const },
  { code: "D0150", keywords: ["comprehensive exam", "new patient exam", "complete exam"], ownerRoleKey: "associate_provider", priority: "NORMAL" as const },
  { code: "D0210", keywords: ["complete series", "fmx", "full mouth series"], ownerRoleKey: "dental_assistant", priority: "NORMAL" as const },
  { code: "D0274", keywords: ["bitewing", "bitewings", "bw"], ownerRoleKey: "dental_assistant", priority: "NORMAL" as const },
  { code: "D2740", keywords: ["crown", "ceramic crown", "porcelain crown"], ownerRoleKey: "treatment_coordinator", priority: "HIGH" as const },
  { code: "D2950", keywords: ["core buildup", "build up", "buildup"], ownerRoleKey: "treatment_coordinator", priority: "HIGH" as const },
  { code: "D2392", keywords: ["composite", "mo composite", "do composite", "two surface restoration"], ownerRoleKey: "treatment_coordinator", priority: "NORMAL" as const },
  { code: "D4341", keywords: ["srp", "scaling and root planing", "deep cleaning"], ownerRoleKey: "rdh", priority: "HIGH" as const },
  { code: "D4910", keywords: ["perio maintenance", "periodontal maintenance", "maintenance cleaning"], ownerRoleKey: "rdh", priority: "NORMAL" as const },
  { code: "D6010", keywords: ["implant", "implant body", "implant placement"], ownerRoleKey: "treatment_coordinator", priority: "HIGH" as const },
  { code: "D7210", keywords: ["surgical extraction", "extract", "extraction", "remove tooth"], ownerRoleKey: "treatment_coordinator", priority: "HIGH" as const },
];

export function generateScribeDraft(input: {
  transcript: string;
  templateKey?: string;
  procedureCodes: ScribeProcedureCode[];
  patientName?: string;
}): ScribeDraft {
  const template = scribeTemplates.find((item) => item.key === input.templateKey) ?? scribeTemplates[0];
  const transcript = normalize(input.transcript);
  const lower = transcript.toLowerCase();
  const tooth = extractTooth(transcript);
  const surface = extractSurface(lower);
  const sections = template.sections.map((title) => ({ title, body: bodyForSection(title, transcript, lower, tooth, surface) }));
  const needsReview = sections.filter((section) => !section.body || section.body.includes("Provider review needed")).map((section) => section.title);
  const treatmentSuggestions = suggestTreatment(lower, tooth, surface, input.procedureCodes);
  const taskDrafts = buildTasks(treatmentSuggestions, needsReview);
  const noteBody = sections.map((section) => `${section.title}:\n${section.body || "Provider review needed."}`).join("\n\n");

  return {
    templateKey: template.key,
    noteType: template.noteType,
    noteBody,
    sections,
    treatmentPlanName: treatmentSuggestions.length ? `${input.patientName ?? "Patient"} AI scribe treatment plan` : "",
    treatmentPlanNote: treatmentSuggestions.length ? "Generated from scribe transcript. Review CDT codes, tooth, surface, fees, and sequence before presentation." : "",
    treatmentSuggestions,
    taskDrafts,
    analytics: {
      completeness: Math.round(((sections.length - needsReview.length) / Math.max(1, sections.length)) * 100),
      suggestedCdtCodes: treatmentSuggestions.map((item) => item.code),
      treatmentItemCount: treatmentSuggestions.length,
      openTaskCount: taskDrafts.length,
      needsReview,
    },
    generation: {
      source: "rules_fallback",
      model: "deterministic_rules_v1",
    },
  };
}

export function normalizeGeneratedDraft(input: {
  parsed: Partial<ScribeDraft> | null;
  fallback: ScribeDraft;
  procedureCodes: ScribeProcedureCode[];
  model: string;
}): ScribeDraft {
  if (!input.parsed?.noteBody || !Array.isArray(input.parsed.sections)) return input.fallback;
  const procedureByCode = new Map(input.procedureCodes.map((code) => [code.code, code]));
  const treatmentSuggestions = Array.isArray(input.parsed.treatmentSuggestions)
    ? input.parsed.treatmentSuggestions
        .filter((item) => item?.code && procedureByCode.has(item.code))
        .map((item, index) => {
          const code = procedureByCode.get(String(item.code))!;
          return {
            code: code.code,
            procedureCodeId: code.id,
            description: code.description,
            tooth: String(item.tooth ?? ""),
            surface: String(item.surface ?? ""),
            phase: Number(item.phase || Math.max(1, Math.floor(index / 3) + 1)),
            priority: item.priority === "HIGH" ? "HIGH" as const : "NORMAL" as const,
            ownerRoleKey: String(item.ownerRoleKey || "treatment_coordinator"),
            reason: String(item.reason || "AI suggested from reviewed transcript."),
          };
        })
    : input.fallback.treatmentSuggestions;
  const taskDrafts = Array.isArray(input.parsed.taskDrafts)
    ? input.parsed.taskDrafts
        .filter((task) => task?.title && task?.ownerRoleKey && task?.taskType)
        .map((task) => ({
          ownerRoleKey: String(task.ownerRoleKey),
          title: String(task.title),
          taskType: String(task.taskType),
          priority: task.priority === "HIGH" ? "HIGH" as const : "NORMAL" as const,
        }))
    : input.fallback.taskDrafts;
  const sections = input.parsed.sections.map((section) => ({
    title: String(section.title ?? "Section"),
    body: String(section.body ?? ""),
  }));
  const needsReview = sections.filter((section) => !section.body.trim() || /provider review needed/i.test(section.body)).map((section) => section.title);
  return {
    templateKey: input.fallback.templateKey,
    noteType: input.fallback.noteType,
    noteBody: String(input.parsed.noteBody),
    sections,
    treatmentPlanName: String(input.parsed.treatmentPlanName || input.fallback.treatmentPlanName),
    treatmentPlanNote: String(input.parsed.treatmentPlanNote || input.fallback.treatmentPlanNote),
    treatmentSuggestions,
    taskDrafts,
    analytics: {
      completeness: Math.round(((sections.length - needsReview.length) / Math.max(1, sections.length)) * 100),
      suggestedCdtCodes: treatmentSuggestions.map((item) => item.code),
      treatmentItemCount: treatmentSuggestions.length,
      openTaskCount: taskDrafts.length,
      needsReview,
    },
    generation: {
      source: "openai_structured",
      model: input.model,
    },
  };
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTooth(text: string) {
  const match = text.match(/(?:tooth|#)\s*(\d{1,2})/i);
  return match ? match[1] : "";
}

function extractSurface(lower: string) {
  if (lower.includes("mod")) return "MOD";
  if (lower.includes("mo ")) return "MO";
  if (lower.includes("do ")) return "DO";
  const surfaces = ["mesial", "distal", "occlusal", "buccal", "lingual", "facial"];
  return surfaces.filter((surface) => lower.includes(surface)).map((surface) => surface[0].toUpperCase()).join("");
}

function bodyForSection(title: string, transcript: string, lower: string, tooth: string, surface: string) {
  if (!transcript) return "";
  if (title.includes("Medical History")) return sentenceWith(lower, transcript, ["medical", "medication", "allergy"]) || "No medical history changes reported in the captured discussion.";
  if (title.includes("Chief Complaint") || title.includes("Reason for Consult")) return sentenceWith(lower, transcript, ["pain", "sensitive", "broke", "broken", "came off", "consult"]) || "Patient presented for evaluation.";
  if (title.includes("History")) return sentenceWith(lower, transcript, ["reports", "started", "duration", "intermittent", "constant"]) || "History captured from patient conversation.";
  if (title.includes("Finding") || title.includes("Assessment")) return findings(lower, tooth, surface);
  if (title.includes("Radiograph")) return sentenceWith(lower, transcript, ["radiograph", "x-ray", "xray", "bitewing", "pa "]) || (hasAny(lower, ["radiograph", "x-ray", "xray"]) ? "Radiographs reviewed." : "");
  if (title.includes("Diagnosis")) return diagnosis(lower);
  if (title.includes("Discussion") || title.includes("Options")) return "Risks, benefits, alternatives, timing, and patient questions were reviewed.";
  if (title.includes("Treatment Plan") || title.includes("Recommended Treatment")) return treatmentSummary(lower);
  if (title.includes("Next")) return nextStep(lower);
  if (title.includes("Treatment Provided") || title.includes("Treatment Rendered")) return sentenceWith(lower, transcript, ["completed", "provided", "performed", "anesthesia", "temporary"]) || "";
  if (title.includes("Home Care")) return "Home care instructions reviewed.";
  if (title.includes("Tooth")) return tooth ? `Tooth #${tooth}${surface ? `, surface ${surface}` : ""}.` : "Provider review needed for tooth and surface.";
  if (title.includes("Materials")) return sentenceWith(lower, transcript, ["composite", "ceramic", "porcelain", "bond", "cement", "shade"]) || "";
  if (title.includes("Post-op")) return "Post-operative instructions reviewed as applicable.";
  if (title.includes("Patient Decision")) return sentenceWith(lower, transcript, ["accepted", "declined", "wants", "scheduled"]) || "Provider review needed for patient decision.";
  return "";
}

function suggestTreatment(lower: string, tooth: string, surface: string, procedureCodes: ScribeProcedureCode[]) {
  const byCode = new Map(procedureCodes.map((item) => [item.code, item]));
  return cdtRules
    .filter((rule) => rule.keywords.some((keyword) => lower.includes(keyword)))
    .map((rule) => {
      const code = byCode.get(rule.code);
      return {
        code: rule.code,
        procedureCodeId: code?.id,
        description: code?.description ?? rule.code,
        tooth,
        surface,
        phase: 1,
        priority: rule.priority,
        ownerRoleKey: rule.ownerRoleKey,
        reason: `Matched transcript language for ${rule.code}.`,
      };
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.code === item.code) === index)
    .map((item, index) => ({ ...item, phase: Math.max(1, Math.floor(index / 3) + 1) }));
}

function buildTasks(suggestions: ScribeSuggestion[], needsReview: string[]) {
  const tasks = suggestions.map((item) => ({
    ownerRoleKey: item.ownerRoleKey,
    title: `Review ${item.code} treatment plan item${item.tooth ? ` for tooth ${item.tooth}` : ""}`,
    taskType: "SCRIBE_TREATMENT_REVIEW",
    priority: item.priority,
  }));
  if (needsReview.length) {
    tasks.push({
      ownerRoleKey: "associate_provider",
      title: `Complete scribe note sections: ${needsReview.slice(0, 3).join(", ")}`,
      taskType: "SCRIBE_NOTE_REVIEW",
      priority: "NORMAL",
    });
  }
  return tasks;
}

function findings(lower: string, tooth: string, surface: string) {
  const parts = [];
  if (tooth) parts.push(`Tooth #${tooth}${surface ? ` ${surface}` : ""} discussed.`);
  if (hasAny(lower, ["fracture", "broken", "came off", "crown"])) parts.push("Restorative concern documented.");
  if (hasAny(lower, ["bleeding", "pocket", "periodontal", "srp"])) parts.push("Periodontal findings discussed.");
  if (hasAny(lower, ["swelling", "infection", "abscess"])) parts.push("Possible infection/swelling discussed.");
  return parts.join(" ") || "Provider review needed for clinical findings.";
}

function diagnosis(lower: string) {
  if (hasAny(lower, ["crown", "fracture", "broken", "came off"])) return "Tooth-specific restorative concern requiring provider-confirmed diagnosis.";
  if (hasAny(lower, ["periodontal", "srp", "pocket", "bleeding"])) return "Periodontal inflammation or disease activity requiring provider-confirmed diagnosis.";
  if (hasAny(lower, ["extract", "extraction", "swelling", "infection"])) return "Urgent dental concern requiring provider-confirmed diagnosis.";
  return "Provider review needed for diagnosis.";
}

function treatmentSummary(lower: string) {
  if (hasAny(lower, ["crown", "buildup"])) return "Proposed restorative treatment includes crown and related buildup as clinically appropriate.";
  if (hasAny(lower, ["srp", "scaling and root planing"])) return "Proposed periodontal therapy with scaling and root planing and re-evaluation.";
  if (hasAny(lower, ["implant"])) return "Proposed implant evaluation/treatment sequence.";
  if (hasAny(lower, ["extract", "extraction"])) return "Proposed extraction or surgical consult.";
  return "Provider review needed for treatment plan.";
}

function nextStep(lower: string) {
  if (hasAny(lower, ["crown", "buildup"])) return "Schedule restorative treatment and confirm patient estimate.";
  if (hasAny(lower, ["srp", "periodontal"])) return "Schedule periodontal therapy and maintenance interval.";
  if (hasAny(lower, ["extract", "implant"])) return "Schedule surgical consult or treatment appointment.";
  return "Schedule follow-up based on finalized provider plan.";
}

function sentenceWith(lower: string, original: string, keywords: string[]) {
  return original
    .split(/(?<=[.!?])\s+/)
    .find((sentence) => keywords.some((keyword) => sentence.toLowerCase().includes(keyword)))
    ?.trim();
}

function hasAny(lower: string, keywords: string[]) {
  return keywords.some((keyword) => lower.includes(keyword));
}
