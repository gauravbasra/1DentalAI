export type PerioSite = "MB" | "B" | "DB" | "ML" | "L" | "DL";

export type ParsedPerioCommand =
  | {
      type: "MEASUREMENT";
      tooth: string;
      site: PerioSite;
      probingDepth: number;
      bleeding: boolean;
      recession?: number;
      mobility?: string;
      furcation?: string;
      confidence: number;
      rawText: string;
    }
  | {
      type: "CORRECTION";
      tooth: string;
      site: PerioSite;
      probingDepth?: number;
      bleeding?: boolean;
      recession?: number;
      mobility?: string;
      furcation?: string;
      confidence: number;
      rawText: string;
    }
  | {
      type: "CONTROL";
      action: "NEXT_SITE" | "SKIP_TOOTH" | "UNDO" | "COMPLETE_EXAM";
      rawText: string;
    };

type NumberMap = Record<string, number>;

const siteVocabulary: Array<[RegExp, PerioSite]> = [
  [/\bmb\b|\bmesial\s+buccal\b|\bmesial\s+b\b|\bmesi(al)?\b/, "MB"],
  [/\bdb\b|\bdistal\s+buccal\b|\bdistal\s+b\b|\bdisti(al)?\b/, "DB"],
  [/\bml\b|\bmesial\s+lingual\b|\bmesi?al\s+l\b/, "ML"],
  [/\bdl\b|\bdistal\s+lingual\b|\bdisti(al)?\s+l\b/, "DL"],
  [/\bbuccal\b|\bfacial\b|\bb\b/, "B"],
  [/\blingual\b|\blingual\b|\bl\b/, "L"],
];

const numberWords: NumberMap = {
  zero: 0,
  one: 1,
  two: 2,
  too: 2,
  three: 3,
  tree: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

export function parsePerioCommand(rawText: string): ParsedPerioCommand {
  const normalized = normalizeText(rawText);

  if (!normalized.trim()) {
    throw new Error("No command text was provided.");
  }

  if (hasAction(normalized, /\bcomplete\s+exam\b|\bdone\s+exam\b/)) {
    return { type: "CONTROL", action: "COMPLETE_EXAM", rawText };
  }

  if (hasAction(normalized, /\bundo\b|\bcorrect\s+last\b|\brevert\b/)) {
    return { type: "CONTROL", action: "UNDO", rawText };
  }

  if (hasAction(normalized, /\bskip\s+tooth\b|\bskip\s+next\b/)) {
    return { type: "CONTROL", action: "SKIP_TOOTH", rawText };
  }

  if (hasAction(normalized, /\bnext\s+site\b|\bnext\s+to\b/)) {
    return { type: "CONTROL", action: "NEXT_SITE", rawText };
  }

  const tooth = extractTooth(normalized);
  const site = normalizeSite(normalized);
  const numbers = extractNumbers(normalized);
  const depth = selectDepth(numbers);
  const bleeding = /\bbleed|bleeding|bop\b/.test(normalized);
  const recession = extractRecession(normalized);
  const mobility = extractWordValue(normalized, /\bmobility\b[^a-z0-9]*([ivx]{0,3}|\d(?:\.\d)?)/i);
  const furcation = extractWordValue(normalized, /\bfurcation\b[^a-z0-9]*([ivx]{0,3}|\d(?:\.\d)?)/i);

  const isCorrection = /\bcorrection|correct|edit|update|adjust|change\b/.test(normalized);

  if (isCorrection && tooth && site) {
    const command: ParsedPerioCommand = {
      type: "CORRECTION",
      tooth,
      site,
      rawText,
      confidence: site ? 0.86 : 0.7,
    };
    if (typeof depth === "number") command.probingDepth = depth;
    if (bleeding) command.bleeding = true;
    if (typeof recession === "number") command.recession = recession;
    if (mobility) command.mobility = mobility;
    if (furcation) command.furcation = furcation;
    return command;
  }

  if (!tooth || !site || typeof depth !== "number") {
    throw new Error("Could not parse perio tooth, site, and depth. Try: 'tooth 14 MB 5' or 'tooth 14 mesial buccal bleeding'.");
  }

  return {
    type: "MEASUREMENT",
    tooth,
    site,
    probingDepth: depth,
    bleeding,
    recession: typeof recession === "number" ? recession : undefined,
    mobility,
    furcation,
    confidence: 0.84,
    rawText,
  };
}

function normalizeText(value: string) {
  const words = value.toLowerCase();
  return words
    .replace(/[\u2019']/g, "'")
    .replace(/[,.;!?:()]/g, " ")
    .replace(/\bmm\b/g, " ")
    .split(/\s+/)
    .map((token) => {
      if (numberWords[token]) return String(numberWords[token]);
      return token;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAction(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function extractTooth(text: string) {
  const tooth = text.match(/\b(?:tooth\s*#?|\#?)\s*(\d{1,2})\b/);
  return tooth ? tooth[1] : null;
}

function normalizeSite(text: string): PerioSite | null {
  for (const [pattern, site] of siteVocabulary) {
    if (pattern.test(text)) return site;
  }
  return null;
}

function extractNumbers(text: string): number[] {
  const explicit = Array.from(text.matchAll(/-?\d{1,2}(?:\.\d+)?/g)).map((match) => Number(match[0]));
  const words = text
    .split(/\s+/)
    .map((part) => numberWords[part])
    .filter((value) => Number.isFinite(value));
  return [...explicit, ...words.map((value) => Number(value))].filter((value) => Number.isFinite(value));
}

function selectDepth(numbers: number[]) {
  return numbers.find((value) => Number.isFinite(value) && value >= 1 && value <= 15);
}

function extractRecession(text: string) {
  const match = text.match(/\brecession\b[^a-z0-9-]*(-?\d{1,2})/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function extractWordValue(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match?.[1]) return undefined;
  return match[1].toUpperCase();
}
