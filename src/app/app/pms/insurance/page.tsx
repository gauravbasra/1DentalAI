import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { attachInsuranceToPatient, createClaimFromProcedures, createInsurancePlan, getInsuranceBoard, listPatients } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type InsuranceRow = {
  id: string;
  payerName: string;
  payerId: string | null;
  planName: string;
  planType: string;
  chartNumber: string;
  lastName: string;
  firstName: string;
  subscriberId: string;
  relationship: string;
  eligibilityStatus: string;
  deductibleCents: number | null;
  deductibleMetCents: number | null;
  annualMaxCents: number | null;
  annualUsedCents: number | null;
};

type PlanRow = {
  id: string;
  payerName: string;
  payerId: string | null;
  planName: string;
  planType: string;
  groupNumber: string | null;
  networkStatus: string;
  coveredPatients: number;
};

type ClaimRow = {
  id: string;
  claimNumber: string | null;
  payerName: string;
  status: string;
  billedCents: number;
  firstName: string;
  lastName: string;
  chartNumber: string;
  lineCount: number;
};

type ReadyProcedureRow = {
  id: string;
  patientId: string;
  patientInsuranceId: string | null;
  code: string;
  description: string;
  feeCents: number;
  firstName: string;
  lastName: string;
  chartNumber: string;
  payerName: string | null;
  planName: string | null;
};

type CoverageGapRow = {
  id: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  dateOfBirth: string | null;
  coverageCount: number;
  activeCoverageCount: number;
  coverageGate: string;
};

type BenefitUtilizationRow = {
  patientInsuranceId: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  payerName: string;
  planName: string;
  benefitYear: number;
  annualMaxCents: number;
  payerReportedAnnualUsedCents: number;
  postedPaidCents: number;
  pendingBilledCents: number;
  openClaimCount: number;
  estimatedRemainingCents: number;
  benefitGate: string;
};

function moneyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(/[^0-9.-]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

async function createPlanAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createInsurancePlan({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    payerName: String(formData.get("payerName") ?? ""),
    payerId: String(formData.get("payerId") ?? ""),
    planName: String(formData.get("planName") ?? ""),
    planType: String(formData.get("planType") ?? "PPO"),
    groupNumber: String(formData.get("groupNumber") ?? ""),
    employerName: String(formData.get("employerName") ?? ""),
    networkStatus: String(formData.get("networkStatus") ?? "UNKNOWN"),
  });
  revalidatePath("/app/pms/insurance");
}

async function attachCoverageAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await attachInsuranceToPatient({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    planId: String(formData.get("planId") ?? ""),
    subscriberId: String(formData.get("subscriberId") ?? ""),
    memberNumber: String(formData.get("memberNumber") ?? ""),
    employer: String(formData.get("employer") ?? ""),
    relationship: String(formData.get("relationship") ?? "SELF"),
    priority: Number(formData.get("priority") ?? 1),
    eligibilityStatus: String(formData.get("eligibilityStatus") ?? "NOT_CHECKED"),
    verificationNote: String(formData.get("verificationNote") ?? ""),
    deductibleCents: moneyToCents(formData.get("deductible")),
    deductibleMetCents: moneyToCents(formData.get("deductibleMet")),
    annualMaxCents: moneyToCents(formData.get("annualMax")),
    annualUsedCents: moneyToCents(formData.get("annualUsed")),
  });
  revalidatePath("/app/pms/insurance");
  revalidatePath("/app/pms/patients");
}

async function createClaimAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const selected = String(formData.get("procedureKey") ?? "").split("|");
  await createClaimFromProcedures({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: selected[0] ?? "",
    patientInsuranceId: selected[1] ?? "",
    procedureLogIds: [selected[2] ?? ""],
  });
  revalidatePath("/app/pms/insurance");
  revalidatePath("/app/pms/ledger");
}

export default async function InsurancePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [board, patients] = await Promise.all([getInsuranceBoard(session.tenantId), listPatients(session.tenantId)]);
  const rows = board.coverage as InsuranceRow[];
  const plans = board.plans as PlanRow[];
  const claims = board.claims as ClaimRow[];
  const readyProcedures = board.readyProcedures as ReadyProcedureRow[];
  const coverageGaps = board.coverageGaps as CoverageGapRow[];
  const benefitUtilization = board.benefitUtilization as BenefitUtilizationRow[];
  return (
    <FoundationShell active="/app/pms/insurance" roleKey={role.key}>
      <PageHeader eyebrow="PMS insurance" title="Insurance and claim readiness" body="Maintain payer plans, attach patient coverage, track verified benefits, and build clean claims from posted clinical procedures." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/insurance" />
      <PmsSectionNav active="/app/pms/insurance" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-6">
          <PmsCard title="Create payer plan" eyebrow="Plan library">
            <form action={createPlanAction} className="grid gap-3">
              <Input name="payerName" label="Payer name" required />
              <Input name="payerId" label="Payer ID" />
              <Input name="planName" label="Plan name" required />
              <div className="grid grid-cols-2 gap-3">
                <Select name="planType" label="Plan type" options={["PPO", "HMO", "MEDICAID", "MEDICARE", "DISCOUNT", "SELF_PAY"]} />
                <Select name="networkStatus" label="Network" options={["UNKNOWN", "IN_NETWORK", "OUT_OF_NETWORK"]} />
              </div>
              <Input name="groupNumber" label="Group number" />
              <Input name="employerName" label="Employer" />
              <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Save payer plan</button>
            </form>
          </PmsCard>

          <PmsCard title="Attach patient coverage" eyebrow="Eligibility file">
            <form action={attachCoverageAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Plan<select name="planId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.payerName} · {plan.planName}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3">
                <Input name="subscriberId" label="Subscriber ID" required />
                <Input name="memberNumber" label="Member number" />
                <Select name="relationship" label="Relationship" options={["SELF", "SPOUSE", "CHILD", "OTHER"]} />
                <Input name="priority" label="Priority" type="number" />
              </div>
              <Select name="eligibilityStatus" label="Eligibility" options={["NOT_CHECKED", "ACTIVE", "NEEDS_REVIEW", "INACTIVE"]} />
              <div className="grid grid-cols-2 gap-3">
                <Input name="deductible" label="Deductible" />
                <Input name="deductibleMet" label="Deductible met" />
                <Input name="annualMax" label="Annual max" />
                <Input name="annualUsed" label="Annual used" />
              </div>
              <Input name="verificationNote" label="Verification note" />
              <button disabled={!patients.length || !plans.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Attach coverage</button>
            </form>
          </PmsCard>

          <PmsCard title="Create claim" eyebrow="Procedure to claim">
            <form action={createClaimAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Unclaimed procedure<select name="procedureKey" required className="rounded-2xl border border-neutral-300 px-4 py-3">{readyProcedures.filter((row) => row.patientInsuranceId).map((row) => <option key={row.id} value={`${row.patientId}|${row.patientInsuranceId}|${row.id}`}>{row.lastName}, {row.firstName} - {row.code} - {formatMoney(row.feeCents)} - {row.payerName}</option>)}</select></label>
              <button disabled={!readyProcedures.some((row) => row.patientInsuranceId)} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Create claim</button>
            </form>
          </PmsCard>
        </div>

        <div className="grid gap-6">
          <PmsCard title="Coverage worklist" eyebrow="Benefits and patient estimates">
            {rows.length ? rows.map((row) => (
              <div key={row.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{row.payerName} · {row.planName}</p>
                    <p className="mt-1 text-sm text-neutral-600">{row.lastName}, {row.firstName} · {row.chartNumber} · subscriber {row.subscriberId} · {row.relationship.toLowerCase()}</p>
                  </div>
                  <StatusFor value={row.eligibilityStatus} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Metric label="Deductible" value={<><Money cents={row.deductibleMetCents ?? 0} /> / <Money cents={row.deductibleCents ?? 0} /></>} />
                  <Metric label="Annual max" value={<Money cents={row.annualMaxCents ?? 0} />} />
                  <Metric label="Used" value={<Money cents={row.annualUsedCents ?? 0} />} />
                </div>
              </div>
            )) : <EmptyPmsState title="No coverage records yet" body="Create payer plans and attach coverage to patients. Benefit limits, eligibility status, and claim readiness will be calculated from these records." />}
          </PmsCard>

          <PmsCard title="Coverage onboarding gaps" eyebrow="Attachment and eligibility gate">
            {coverageGaps.length ? coverageGaps.map((gap) => (
              <div key={gap.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{gap.lastName}, {gap.firstName}</p>
                    <p className="mt-1 text-sm text-neutral-600">{gap.chartNumber} · DOB {gap.dateOfBirth ? new Date(gap.dateOfBirth).toLocaleDateString() : "not recorded"} · {gap.coverageCount} coverage record(s)</p>
                  </div>
                  <StatusFor value={gap.coverageGate} />
                </div>
                <p className="mt-3 text-sm text-neutral-700">{gap.coverageCount ? "Verify eligibility or update the attached coverage before claim creation." : "Attach a plan, subscriber ID, relationship, and eligibility status before estimate or claim work."}</p>
              </div>
            )) : <EmptyPmsState title="No coverage onboarding gaps" body="Every active patient has active coverage or is ready for self-pay claim and estimate workflows." />}
          </PmsCard>

          <PmsCard title="Benefit consumption ledger" eyebrow="Claims and remaining max">
            {benefitUtilization.length ? benefitUtilization.map((row) => (
              <div key={row.patientInsuranceId} className="mb-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{row.lastName}, {row.firstName} · {row.payerName}</p>
                    <p className="mt-1 text-sm text-neutral-600">{row.chartNumber} · {row.planName} · benefit year {row.benefitYear}</p>
                  </div>
                  <StatusFor value={row.benefitGate} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <Metric label="Annual max" value={<Money cents={row.annualMaxCents} />} />
                  <Metric label="Payer used" value={<Money cents={row.payerReportedAnnualUsedCents} />} />
                  <Metric label="Posted paid" value={<Money cents={row.postedPaidCents} />} />
                  <Metric label="Pending claims" value={<><Money cents={row.pendingBilledCents} /> · {row.openClaimCount}</>} />
                  <Metric label="Remaining" value={<Money cents={row.estimatedRemainingCents} />} />
                </div>
                <p className="mt-3 text-xs leading-5 text-neutral-600">
                  Remaining uses the greater of payer-reported used and posted paid claims, then reserves open pending claim exposure. Active eligibility alone does not clear a treatment estimate.
                </p>
              </div>
            )) : <EmptyPmsState title="No benefit utilization records" body="Attach insurance and verify benefits before claims or treatment estimates rely on remaining annual maximum." />}
          </PmsCard>

          <PmsCard title="Payer plan library" eyebrow="Contract inventory">
            {plans.length ? plans.map((plan) => (
              <div key={plan.id} className="mb-3 flex items-start justify-between gap-3 rounded-3xl bg-neutral-50 p-5">
                <div>
                  <p className="font-semibold text-neutral-950">{plan.payerName} · {plan.planName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{plan.planType} · payer ID {plan.payerId ?? "not recorded"} · group {plan.groupNumber ?? "not recorded"}</p>
                </div>
                <StatusFor value={plan.networkStatus} />
              </div>
            )) : <EmptyPmsState title="No payer plans yet" body="The plan library stores payer ID, group, plan type, network status, and patient coverage relationships." />}
          </PmsCard>

          <PmsCard title="Claims queue" eyebrow="Submission readiness">
            {claims.length ? claims.map((claim) => (
              <div key={claim.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{claim.claimNumber ?? claim.id} · {claim.payerName}</p>
                    <p className="mt-1 text-sm text-neutral-600">{claim.lastName}, {claim.firstName} · {claim.chartNumber} · {claim.lineCount} line item(s)</p>
                  </div>
                  <StatusFor value={claim.status} />
                </div>
                <p className="mt-3 text-sm text-neutral-700">Billed <Money cents={claim.billedCents} /></p>
              </div>
            )) : <EmptyPmsState title="No claims created yet" body="Claims are created from procedure logs and retain payer, patient coverage, line item, fee, and readiness status." />}
          </PmsCard>
        </div>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>;
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<select name={name} className="rounded-2xl border border-neutral-300 px-4 py-3">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}
