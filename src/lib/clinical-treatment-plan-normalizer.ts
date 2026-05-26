export type ScribeTreatmentPlanItem = {
  sequence: number;
  phase: number;
  procedureCode: string;
  tooth?: string | null;
  surface?: string | null;
  feeCents: number;
  status: string;
};

export type NormalizedScribeTreatmentPlan = {
  treatmentPlanId: string;
  patientId: string;
  providerId: string | null;
  name: string;
  presentationNote: string | null;
  status: string;
  totalFeeCents: number;
  items: ScribeTreatmentPlanItem[];
};

export type ScribeCdtValidation = {
  totalItems: number;
  validatedItems: number;
  codes: string[];
  missingOrInvalidCodes: string[];
};

const cdtPattern = /^D[0-9]{4}$/;

export function normalizeTreatmentPlanItems(rows: Array<{ sequence: number | null; phase: number | null; code: string | null; tooth?: string | null; surface?: string | null; feeCents?: number | null; status?: string | null }>) {
  return rows
    .filter((row): row is { sequence: number; phase: number; code: string; tooth?: string | null; surface?: string | null; feeCents: number; status: string } => Boolean(row.code))
    .map((row) => ({
      sequence: Number(row.sequence ?? 0),
      phase: Number(row.phase ?? 1),
      procedureCode: String(row.code),
      tooth: row.tooth ?? null,
      surface: row.surface ?? null,
      feeCents: Number(row.feeCents ?? 0),
      status: String(row.status ?? "PROPOSED"),
    }));
}

export function buildTreatmentPlanCdtValidation(items: ScribeTreatmentPlanItem[]): ScribeCdtValidation {
  const missingOrInvalidCodes = items
    .filter((item) => !cdtPattern.test(item.procedureCode))
    .map((item) => item.procedureCode)
    .filter((value, index, all) => all.indexOf(value) === index);

  const validatedItems = items.filter((item) => cdtPattern.test(item.procedureCode)).length;
  return {
    totalItems: items.length,
    validatedItems,
    codes: items.map((item) => item.procedureCode),
    missingOrInvalidCodes,
  };
}

export function normalizeTreatmentPlanForWriteback(input: {
  treatmentPlanId: string;
  patientId: string;
  providerId: string | null;
  name: string;
  presentationNote: string | null;
  status: string;
  totalFeeCents: number;
  items: Array<{ sequence: number | null; phase: number | null; code: string | null; tooth?: string | null; surface?: string | null; feeCents?: number | null; status?: string | null }>;
}) {
  const items = normalizeTreatmentPlanItems(input.items);
  const cdtValidation = buildTreatmentPlanCdtValidation(items);
  const normalized: NormalizedScribeTreatmentPlan = {
    treatmentPlanId: input.treatmentPlanId,
    patientId: input.patientId,
    providerId: input.providerId,
    name: input.name,
    presentationNote: input.presentationNote,
    status: input.status,
    totalFeeCents: Number(input.totalFeeCents ?? 0),
    items,
  };
  return { plan: normalized, cdtValidation };
}
