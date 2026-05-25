import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  addTreatmentPlanItem,
  buildTreatmentBenefitCase,
  createTreatmentPlan,
  listPatients,
  listProcedureCodes,
  listProviders,
  listTreatmentBenefitCaseWorkup,
  listTreatmentPlans,
  updateTreatmentPlanStatus,
} from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type TreatmentPlanRow = {
  id: string;
  name: string;
  chartNumber: string;
  lastName: string;
  firstName: string;
  providerName: string | null;
  status: string;
  totalFeeCents: number;
  insuranceEstimateCents: number;
  patientEstimateCents: number;
  itemCount: number;
  acceptedItemCount: number;
  casePacketId: string | null;
  casePacketStatus: string | null;
  caseSummary: string | null;
  caseConfidenceScore: number | null;
  caseInsuranceEstimateCents: number | null;
  casePatientEstimateCents: number | null;
  coverageAnalysisCount: number;
  coverageBlockedCount: number;
  coverageReviewCount: number;
};

type CoverageAnalysisRow = {
  id: string;
  planName: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  payerName: string;
  insurancePlanName: string;
  cdtCode: string;
  procedureCategory: string;
  feeCents: number;
  estimatedInsuranceCents: number;
  estimatedPatientCents: number;
  remainingBeforeCents: number;
  remainingAfterCents: number;
  coverageStatus: string;
  denialRisk: string;
  confidenceScore: number;
  blockers: unknown;
  requiredActions: unknown;
};

type CasePacketRow = {
  id: string;
  planName: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  payerName: string;
  packetStatus: string;
  summary: string;
  blockers: unknown;
  nextActions: unknown;
  requiredAttachments: unknown;
  estimatedInsuranceCents: number;
  estimatedPatientCents: number;
  confidenceScore: number;
  generatedAt: string;
};

type BenefitFactRow = {
  id: string;
  factLabel: string;
  factKey: string;
  factValue: unknown;
  valueType: string;
  benefitYear: number | null;
  confidenceScore: number;
  createdAt: string;
};

type BenefitRuleRow = {
  id: string;
  ruleType: string;
  ruleText: string;
  status: string;
  confidenceScore: number;
};

async function createPlanAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createTreatmentPlan({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    providerId: String(formData.get("providerId") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    presentationNote: String(formData.get("presentationNote") ?? ""),
  });
  revalidatePath("/app/pms/treatment-plans");
}

async function addItemAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await addTreatmentPlanItem({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    treatmentPlanId: String(formData.get("treatmentPlanId") ?? ""),
    procedureCodeId: String(formData.get("procedureCodeId") ?? ""),
    phase: Number(formData.get("phase") ?? 1),
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
  });
  revalidatePath("/app/pms/treatment-plans");
}

async function acceptPlanAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updateTreatmentPlanStatus(String(formData.get("treatmentPlanId") ?? ""), "ACCEPTED", session.roleKey, session.tenantId);
  revalidatePath("/app/pms/treatment-plans");
  revalidatePath("/app/pms/tasks");
}

async function buildBenefitCaseAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await buildTreatmentBenefitCase({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    treatmentPlanId: String(formData.get("treatmentPlanId") ?? ""),
  });
  revalidatePath("/app/pms/treatment-plans");
}

export default async function TreatmentPlansPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [plans, patients, procedureCodes, providers, benefitWorkup] = await Promise.all([
    listTreatmentPlans(session.tenantId),
    listPatients(session.tenantId),
    listProcedureCodes(session.tenantId),
    listProviders(session.tenantId),
    listTreatmentBenefitCaseWorkup(session.tenantId),
  ]);
  const casePackets = benefitWorkup.packets as CasePacketRow[];
  const coverageAnalyses = benefitWorkup.analyses as CoverageAnalysisRow[];
  const benefitFacts = benefitWorkup.facts as BenefitFactRow[];
  const benefitRules = benefitWorkup.rules as BenefitRuleRow[];

  return (
    <FoundationShell active="/app/pms/treatment-plans" roleKey={role.key}>
      <PageHeader eyebrow="PMS treatment planning" title="Treatment plan builder" body="Create phased treatment plans from real procedure codes, estimate insurance and patient portions, accept cases, and hand off accepted treatment to scheduling." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/treatment-plans" />
      <PmsSectionNav active="/app/pms/treatment-plans" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="grid gap-6">
          <PmsCard title="Create treatment plan" eyebrow="Case presentation">
            <form action={createPlanAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Provider<select name="providerId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName} · {provider.providerType}</option>)}</select></label>
              <Input name="name" label="Plan name" required />
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Presentation note<textarea name="presentationNote" rows={4} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
              <button disabled={!providers.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Create plan</button>
            </form>
          </PmsCard>

          <PmsCard title="Add procedure to plan" eyebrow="Phased sequencing">
            <form action={addItemAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Plan<select name="treatmentPlanId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{(plans as TreatmentPlanRow[]).map((plan) => <option key={plan.id} value={plan.id}>{plan.lastName}, {plan.firstName} · {plan.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Procedure<select name="procedureCodeId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{procedureCodes.map((code) => <option key={code.id} value={code.id}>{code.code} · {code.description}</option>)}</select></label>
              <div className="grid grid-cols-3 gap-3">
                <Input name="phase" label="Phase" type="number" />
                <Input name="tooth" label="Tooth" />
                <Input name="surface" label="Surface" />
              </div>
              <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Add procedure</button>
            </form>
          </PmsCard>
        </div>

        <PmsCard title="Treatment plan pipeline" eyebrow="Acceptance and scheduling handoff">
          {plans.length ? (
            <div className="space-y-3">
              {(plans as TreatmentPlanRow[]).map((plan) => (
                <div key={plan.id} className="rounded-3xl bg-neutral-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-neutral-950">{plan.name}</p>
                      <p className="mt-1 text-sm text-neutral-600">{plan.lastName}, {plan.firstName} · {plan.chartNumber} · {plan.providerName ?? "provider unassigned"}</p>
                    </div>
                    <StatusFor value={plan.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Metric label="Total" value={<Money cents={plan.totalFeeCents} />} />
                    <Metric label="Insurance est." value={<Money cents={plan.insuranceEstimateCents ?? 0} />} />
                    <Metric label="Patient est." value={<Money cents={plan.patientEstimateCents} />} />
                    <Metric label="Procedures" value={`${plan.itemCount} (${plan.acceptedItemCount} accepted)`} />
                  </div>
                  <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={plan.casePacketStatus?.startsWith("BLOCKED") ? "red" : plan.casePacketStatus ? "green" : "amber"}>{plan.casePacketStatus ?? "benefit case not built"}</StatusPill>
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{plan.coverageAnalysisCount} CDT analysis · {plan.coverageBlockedCount} blocked · {plan.coverageReviewCount} review</span>
                      </div>
                      <p className="mt-2 text-sm text-neutral-700">{plan.caseSummary ?? "Run the benefit case builder to analyze eligibility, annual max, posted claims, pending claims, CDT frequencies, limitations, and attachment needs."}</p>
                    </div>
                    <form action={buildBenefitCaseAction}>
                      <input type="hidden" name="treatmentPlanId" value={plan.id} />
                      <button disabled={!plan.itemCount} className="rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300">Build benefit case</button>
                    </form>
                  </div>
                  <form action={acceptPlanAction} className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                    <input type="hidden" name="treatmentPlanId" value={plan.id} />
                    <StatusPill tone={plan.status === "ACCEPTED" ? "green" : "amber"}>{plan.status === "ACCEPTED" ? "scheduling handoff created" : "ready for acceptance"}</StatusPill>
                    <button disabled={plan.status === "ACCEPTED"} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300">Accept plan</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No treatment plans yet" body="Create a plan, add procedure-code items, then accept it. Accepted plans create a scheduling task and carry patient/insurance estimates." />
          )}
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PmsCard title="Generated payer case packets" eyebrow="Benefit case review">
          {casePackets.length ? (
            <div className="space-y-3">
              {casePackets.map((packet) => (
                <div key={packet.id} className="rounded-3xl bg-neutral-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-neutral-950">{packet.planName}</p>
                      <p className="text-sm text-neutral-600">{packet.lastName}, {packet.firstName} · {packet.chartNumber} · {packet.payerName}</p>
                    </div>
                    <StatusFor value={packet.packetStatus} />
                  </div>
                  <p className="mt-3 text-sm text-neutral-700">{packet.summary}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Metric label="Insurance" value={<Money cents={packet.estimatedInsuranceCents} />} />
                    <Metric label="Patient" value={<Money cents={packet.estimatedPatientCents} />} />
                    <Metric label="Confidence" value={`${packet.confidenceScore}%`} />
                  </div>
                  <JsonList title="Blockers" value={packet.blockers} />
                  <JsonList title="Next actions" value={packet.nextActions} />
                  <JsonList title="Required attachments" value={packet.requiredAttachments} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No payer case packets yet" body="Build a benefit case from a treatment plan to create a staff-review packet with limits, history, blockers, attachments, and patient estimate impact." />
          )}
        </PmsCard>

        <PmsCard title="CDT coverage analysis" eyebrow="Limits, history, and rules">
          {coverageAnalyses.length ? (
            <div className="space-y-3">
              {coverageAnalyses.map((analysis) => (
                <div key={analysis.id} className="rounded-3xl bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">{analysis.cdtCode} · {analysis.procedureCategory}</p>
                      <p className="text-sm text-neutral-600">{analysis.lastName}, {analysis.firstName} · {analysis.payerName}</p>
                    </div>
                    <StatusFor value={analysis.coverageStatus} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <Metric label="Fee" value={<Money cents={analysis.feeCents} />} />
                    <Metric label="Insurance" value={<Money cents={analysis.estimatedInsuranceCents} />} />
                    <Metric label="Patient" value={<Money cents={analysis.estimatedPatientCents} />} />
                    <Metric label="Remaining" value={<><Money cents={analysis.remainingBeforeCents} /> → <Money cents={analysis.remainingAfterCents} /></>} />
                  </div>
                  <JsonList title="Blockers" value={analysis.blockers} />
                  <JsonList title="Required actions" value={analysis.requiredActions} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No CDT analysis yet" body="Coverage analysis is generated from the benefit case builder and stored per treatment-plan item for QA and staff review." />
          )}
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PmsCard title="Extracted benefit facts" eyebrow="Evidence normalization">
          <div className="space-y-2">
            {benefitFacts.slice(0, 12).map((fact) => (
              <div key={fact.id} className="rounded-2xl bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{fact.factLabel}</p>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{fact.confidenceScore}% · {fact.valueType}</span>
                </div>
                <p className="mt-1 break-words text-sm text-neutral-600">{formatUnknown(fact.factValue)}</p>
              </div>
            ))}
            {!benefitFacts.length ? <EmptyPmsState title="No facts extracted" body="Eligibility, deductible, maximum, usage, frequency, and limitation facts appear here after a case packet is generated." /> : null}
          </div>
        </PmsCard>

        <PmsCard title="Benefit rules needing staff review" eyebrow="Frequencies and limitations">
          <div className="space-y-2">
            {benefitRules.slice(0, 12).map((rule) => (
              <div key={rule.id} className="rounded-2xl bg-neutral-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{rule.ruleType.replaceAll("_", " ")}</p>
                  <StatusFor value={rule.status} />
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{rule.ruleText}</p>
              </div>
            ))}
            {!benefitRules.length ? <EmptyPmsState title="No rules extracted" body="Frequency, waiting-period, replacement, prior-auth, downgrade, age, and missing-tooth clauses appear here after benefit evidence is analyzed." /> : null}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}

function JsonList({ title, value }: { title: string; value: unknown }) {
  const items = normalizeList(value);
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-2xl bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-neutral-700">
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

function normalizeList(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => formatUnknown(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return normalizeList(parsed);
    } catch {
      return value ? [value] : [];
    }
  }
  return [formatUnknown(value)];
}

function formatUnknown(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
