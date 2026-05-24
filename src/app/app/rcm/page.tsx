import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createDenialCase,
  createPayerFollowUp,
  createPriorAuthorization,
  createRcmWorkItem,
  getRcmOperatingCenter,
  attachEobProofToEra,
  postEraToLedger,
  stagePriorAuthorizationPacket,
  updateDenialCaseStatus,
  updatePayerFollowUpStatus,
  updatePriorAuthorizationStatus,
  updateRcmWorkItemStatus,
  updateRevenueFindingStatus,
} from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type RcmItemRow = {
  id: string;
  workType: string;
  stage: string;
  priority: string;
  status: string;
  amountCents: number;
  lastName: string | null;
  firstName: string | null;
  chartNumber: string | null;
  payerName: string | null;
  blockerReason: string | null;
  connectorStatus: string;
  proofRequired: unknown;
  approvalPolicy: unknown;
  nextAction: string;
};

type ClaimRow = {
  id: string;
  patientId: string;
  claimNumber: string | null;
  clearinghouseTraceId: string | null;
  submittedAt: string | null;
  status: string;
  attachmentStatus: string;
  lastName: string;
  firstName: string;
  chartNumber: string;
  payerName: string;
  billedCents: number;
  allowedCents: number;
  paidCents: number;
  patientDueCents: number;
  lineCount: number;
  readyLines: number;
  blockedLines: number;
  openDenialCount: number;
  eraPostingCount: number;
  payerFollowUpCount: number;
  claimLineDetails: unknown;
  claimLifecycle: unknown;
};

type BenefitRow = {
  id: string;
  patientId: string;
  payerName: string;
  payerId: string | null;
  planName: string;
  networkStatus: string;
  eligibilityStatus: string;
  lastVerifiedAt: string | null;
  verificationNote: string | null;
  firstName: string;
  lastName: string;
  chartNumber: string;
  subscriberId: string;
  deductibleCents: number | null;
  deductibleMetCents: number | null;
  annualMaxCents: number | null;
  annualUsedCents: number | null;
  frequencies: Record<string, string> | null;
  limitations: Record<string, string> | null;
  coverageSnapshot: unknown;
};

type TreatmentPlanRow = {
  id: string;
  patientId: string;
  patientInsuranceId: string | null;
  payerName: string | null;
  firstName: string;
  lastName: string;
  chartNumber: string;
  name: string;
  status: string;
  totalFeeCents: number;
  insuranceEstimateCents: number;
  patientEstimateCents: number;
  requiresAuthCount: number;
};

type PriorAuthRow = {
  id: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  treatmentPlanName: string | null;
  payerName: string;
  requestedCents: number;
  status: string;
  requiredEvidence: string[] | null;
  evidenceChecklist: unknown;
  treatmentPlanEvidence: unknown;
  submissionReadiness: unknown;
  connectorStatus: string;
  blockedReason: string | null;
  expiresAt: string | null;
  nextAction: string;
};

type DenialRow = {
  id: string;
  claimNumber: string | null;
  firstName: string;
  lastName: string;
  chartNumber: string;
  payerName: string;
  denialCode: string | null;
  denialReason: string;
  rootCause: string | null;
  deniedCents: number;
  appealDeadline: string | null;
  appealDaysRemaining: number | null;
  claimStatus: string;
  attachmentStatus: string;
  status: string;
  appealPacketStatus: string;
  requiredEvidence: string[] | null;
  appealPackageChecklist: unknown;
  submissionReadiness: unknown;
  connectorStatus: string;
  blockedReason: string | null;
  nextAction: string;
};

type EraRow = {
  id: string;
  claimNumber: string | null;
  firstName: string;
  lastName: string;
  chartNumber: string;
  payerName: string;
  eraTraceNumber: string | null;
  eobDocumentId: string | null;
  allowedCents: number;
  paidCents: number;
  patientDueCents: number;
  adjustmentCents: number;
  postingVarianceCents: number;
  status: string;
  exceptionReason: string | null;
  postingReadiness: unknown;
  postingChecklist: unknown;
  connectorStatus: string;
  blockedReason: string | null;
};

type PayerFollowUpRow = {
  id: string;
  claimNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  payerName: string;
  reason: string;
  channel: string;
  status: string;
  dueAt: string | null;
  contactOutcome: string | null;
  connectorStatus: string;
  blockedReason: string | null;
  proofRequired: unknown;
  nextAction: string;
};

type RevenueFindingRow = {
  id: string;
  claimNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  payerName: string | null;
  findingType: string;
  severity: string;
  status: string;
  expectedCents: number;
  actualCents: number;
  varianceCents: number;
  rootCause: string | null;
  recoveryStatus: string;
  connectorStatus: string;
  proofRequired: unknown;
  leakageWorkflow: unknown;
  nextAction: string;
};

type LedgerRow = {
  id: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  claimNumber: string | null;
  entryType: string;
  description: string;
  amountCents: number;
  balanceCents: number;
  postedAt: string;
};

type PaymentRow = {
  id: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  paymentType: string;
  amountCents: number;
  reference: string | null;
  status: string;
};

function moneyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(/[^0-9.-]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

function evidenceList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function createAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createRcmWorkItem({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? "") || undefined,
    claimId: String(formData.get("claimId") ?? "") || undefined,
    workType: String(formData.get("workType") ?? "ELIGIBILITY_AND_BENEFITS"),
    stage: String(formData.get("stage") ?? "PRE_VISIT_CLEARANCE"),
    priority: String(formData.get("priority") ?? "NORMAL"),
    payerName: String(formData.get("payerName") ?? "") || undefined,
    amountCents: moneyToCents(formData.get("amountDollars")),
    blockerReason: String(formData.get("blockerReason") ?? ""),
    nextAction: String(formData.get("nextAction") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
  });
  revalidatePath("/app/rcm");
}

async function statusAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updateRcmWorkItemStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "OPEN"), session.roleKey, session.tenantId);
  revalidatePath("/app/rcm");
}

async function priorAuthAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const [patientId, treatmentPlanId, patientInsuranceId, payerName, amount] = String(formData.get("treatmentPlanKey") ?? "").split("|");
  await createPriorAuthorization({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId,
    treatmentPlanId,
    patientInsuranceId: patientInsuranceId || undefined,
    payerName: payerName || String(formData.get("payerName") ?? "Unknown payer"),
    requestedCents: Number(amount || 0),
    requiredEvidence: evidenceList(formData.get("requiredEvidence")),
    nextAction: String(formData.get("nextAction") ?? ""),
    expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
  });
  revalidatePath("/app/rcm");
}

async function priorAuthStatusAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updatePriorAuthorizationStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "READY_FOR_REVIEW"), session.roleKey, session.tenantId);
  revalidatePath("/app/rcm");
}

async function priorAuthPacketAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await stagePriorAuthorizationPacket({
    id: String(formData.get("id") ?? ""),
    tenantId: session.tenantId,
    clinicalNarrative: String(formData.get("clinicalNarrative") ?? ""),
    actorRole: session.roleKey,
  });
  revalidatePath("/app/rcm");
}

async function denialAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const [claimId, patientId, payerName, billed] = String(formData.get("claimKey") ?? "").split("|");
  await createDenialCase({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    claimId,
    patientId,
    payerName,
    denialCode: String(formData.get("denialCode") ?? ""),
    denialReason: String(formData.get("denialReason") ?? ""),
    rootCause: String(formData.get("rootCause") ?? ""),
    deniedCents: moneyToCents(formData.get("deniedDollars")) || Number(billed || 0),
    appealDeadline: String(formData.get("appealDeadline") ?? "") || undefined,
    requiredEvidence: evidenceList(formData.get("requiredEvidence")),
    nextAction: String(formData.get("nextAction") ?? ""),
  });
  revalidatePath("/app/rcm");
}

async function denialStatusAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updateDenialCaseStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "APPEAL_READY"), session.roleKey, session.tenantId);
  revalidatePath("/app/rcm");
}

async function payerFollowUpAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const [claimId, patientId, payerName] = String(formData.get("claimKey") ?? "").split("|");
  await createPayerFollowUp({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    claimId: claimId || undefined,
    patientId: patientId || undefined,
    payerName: payerName || String(formData.get("payerName") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    channel: String(formData.get("channel") ?? "PHONE"),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
    nextAction: String(formData.get("nextAction") ?? ""),
  });
  revalidatePath("/app/rcm");
}

async function payerFollowUpStatusAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updatePayerFollowUpStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "WAITING_ON_PAYER"), String(formData.get("outcome") ?? ""), session.roleKey, session.tenantId);
  revalidatePath("/app/rcm");
}

async function eraPostAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await postEraToLedger(String(formData.get("id") ?? ""), session.roleKey, session.tenantId);
  revalidatePath("/app/rcm");
  revalidatePath("/app/pms/ledger");
}

async function eobProofAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await attachEobProofToEra({
    id: String(formData.get("id") ?? ""),
    tenantId: session.tenantId,
    adjustmentSummary: { staffSummary: String(formData.get("adjustmentSummary") ?? "") },
    actorRole: session.roleKey,
  });
  revalidatePath("/app/rcm");
}

async function revenueStatusAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updateRevenueFindingStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "IN_REVIEW"), session.roleKey, session.tenantId);
  revalidatePath("/app/rcm");
}

export default async function RcmPage({ searchParams }: { searchParams: Promise<{ role?: string; view?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const view = ["today", "benefits", "auth", "claims", "denials", "era", "revenue", "queue"].includes(params.view ?? "") ? String(params.view) : "today";
  const center = await getRcmOperatingCenter(session.tenantId);
  const items = center.items as RcmItemRow[];
  const claims = center.claims as ClaimRow[];
  const benefits = center.benefits as BenefitRow[];
  const priorAuths = center.priorAuths as PriorAuthRow[];
  const denials = center.denials as DenialRow[];
  const eras = center.eras as EraRow[];
  const payerFollowUps = center.payerFollowUps as PayerFollowUpRow[];
  const revenueFindings = center.revenueFindings as RevenueFindingRow[];
  const treatmentPlans = center.treatmentPlans as TreatmentPlanRow[];
  const ledger = center.ledger as LedgerRow[];
  const payments = center.payments as PaymentRow[];
  const metrics = center.metrics;
  const openClaimDollars = claims.reduce((sum, claim) => sum + Number(claim.billedCents ?? 0) - Number(claim.paidCents ?? 0), 0);
  const eraReady = eras.filter((era) => ["READY_TO_POST", "NEEDS_REVIEW"].includes(era.status));
  const eraCanPost = (era: EraRow) => era.status !== "POSTED" && (era.eraTraceNumber || era.eobDocumentId) && Number(era.postingVarianceCents) === 0;

  return (
    <FoundationShell active="/app/rcm" roleKey={role.key}>
      <PageHeader
        eyebrow="Revenue cycle command center"
        title="Benefits, prior auth, claims, denials, ERA, billing, and payments"
        body="RCM work starts from the PMS: treatment plans, coverage, benefits, clinical evidence, claims, payer follow-up, EOB/ERA posting, ledger balances, payments, and revenue integrity all stay tied to the patient record."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/rcm" />
      <RcmViewNav active={view} roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="Coverage reviews" value={benefits.filter((row) => row.eligibilityStatus !== "ACTIVE").length} detail="eligibility or benefit gaps" />
        <Metric label="Open claims" value={claims.filter((claim) => !["PAID", "CLOSED", "VOID"].includes(claim.status)).length} detail={<Money cents={openClaimDollars} />} />
        <Metric label="Prior auth" value={priorAuths.filter((row) => !["APPROVED", "CLOSED"].includes(row.status)).length} detail="evidence and approvals" />
        <Metric label="Denials" value={denials.filter((row) => !["WON", "CLOSED"].includes(row.status)).length} detail="appeal cases" />
        <Metric label="Leakage" value={<Money cents={Number(metrics.leakageDollars)} />} detail="recoverable variance" />
      </section>

      {(view === "today" || view === "benefits") ? <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Coverage and benefits" eyebrow="Eligibility, annual max, deductible, frequency, limitations">
          <div className="grid gap-3 lg:grid-cols-2">
            {benefits.map((row) => (
              <div key={row.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{row.lastName}, {row.firstName} · {row.chartNumber}</p>
                    <p className="mt-1 text-xs text-neutral-600">{row.payerName} · {row.planName} · subscriber {row.subscriberId}</p>
                  </div>
                  <StatusFor value={row.eligibilityStatus} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Deductible" value={<><Money cents={Number(row.deductibleMetCents ?? 0)} /> / <Money cents={Number(row.deductibleCents ?? 0)} /></>} />
                  <MiniMetric label="Annual max" value={<Money cents={Number(row.annualMaxCents ?? 0)} />} />
                  <MiniMetric label="Remaining" value={<Money cents={Math.max(0, Number(row.annualMaxCents ?? 0) - Number(row.annualUsedCents ?? 0))} />} />
                </div>
                <Checklist title="Coverage checklist" value={row.coverageSnapshot} itemKey="coverageChecklist" />
                <div className="mt-3 grid gap-2 text-xs leading-5 text-neutral-600">
                  <p><span className="font-semibold text-neutral-800">Frequencies:</span> {jsonSummary(row.frequencies)}</p>
                  <p><span className="font-semibold text-neutral-800">Limitations:</span> {jsonSummary(row.limitations)}</p>
                  <p><span className="font-semibold text-neutral-800">Network:</span> {clean(row.networkStatus)} · verified {fieldText(row.coverageSnapshot, "verificationAgeDays") ?? "not recorded"} day(s) ago</p>
                  {row.verificationNote ? <p><span className="font-semibold text-neutral-800">Evidence:</span> {row.verificationNote}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Treatment-plan financial clearance" eyebrow="Insurance estimate, patient estimate, prior-auth need">
          <div className="grid gap-3">
            {treatmentPlans.map((plan) => (
              <div key={plan.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{plan.name}</p>
                    <p className="mt-1 text-xs text-neutral-600">{plan.lastName}, {plan.firstName} · {plan.payerName ?? "No payer"} · {plan.status.toLowerCase()}</p>
                  </div>
                  <StatusFor value={plan.requiresAuthCount > 0 ? "AUTH_REVIEW" : "ESTIMATE_READY"} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Total" value={<Money cents={Number(plan.totalFeeCents)} />} />
                  <MiniMetric label="Insurance est." value={<Money cents={Number(plan.insuranceEstimateCents)} />} />
                  <MiniMetric label="Patient est." value={<Money cents={Number(plan.patientEstimateCents)} />} />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {view === "auth" ? <section className="mt-4 grid gap-4 xl:grid-cols-[0.62fr_1.38fr]">
        <PmsCard title="Stage prior authorization" eyebrow="Evidence bundle before payer submission">
          <form action={priorAuthAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Treatment plan<select name="treatmentPlanKey" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{treatmentPlans.map((plan) => <option key={plan.id} value={`${plan.patientId}|${plan.id}|${plan.patientInsuranceId ?? ""}|${plan.payerName ?? ""}|${plan.totalFeeCents}`}>{plan.lastName}, {plan.firstName} - {plan.name} - {plan.payerName ?? "no payer"}</option>)}</select></label>
            <Textarea name="requiredEvidence" label="Required evidence" defaultValue={"radiograph\nclinical note\nsigned treatment plan"} />
            <Input name="expiresAt" label="Expiration / follow-up date" type="datetime-local" />
            <Textarea name="nextAction" label="Next action" required defaultValue="Collect evidence, review against payer rules, and stage for approval." />
            <button disabled={!treatmentPlans.length} className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300">Create prior auth case</button>
          </form>
        </PmsCard>

        <PmsCard title="Prior authorization worklist" eyebrow="Evidence, status, payer deadline">
          <div className="grid gap-3 lg:grid-cols-2">
            {priorAuths.map((auth) => (
              <WorkCard key={auth.id} title={auth.treatmentPlanName ?? "Prior authorization"} status={auth.status} patient={`${auth.lastName}, ${auth.firstName} · ${auth.chartNumber}`} payer={auth.payerName} amount={<Money cents={Number(auth.requestedCents)} />} body={auth.nextAction} evidence={auth.requiredEvidence}>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label="Connector" value={clean(auth.connectorStatus)} />
                  <MiniMetric label="Readiness" value={jsonSummary(auth.submissionReadiness)} />
                </div>
                <Checklist title="Prior auth evidence checklist" value={auth.evidenceChecklist} itemKey="items" />
                <p className="mt-2 text-xs leading-5 text-neutral-600"><span className="font-semibold text-neutral-800">Treatment evidence:</span> {jsonSummary(auth.treatmentPlanEvidence)}</p>
                {auth.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{auth.blockedReason}</p> : null}
                <form action={priorAuthPacketAction} className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-white p-2">
                  <input type="hidden" name="id" value={auth.id} />
                  <Textarea name="clinicalNarrative" label="Clinical narrative" defaultValue="Provider reviewed diagnosis, procedure codes, supporting images, and medical necessity for payer review." />
                  <button className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Generate prior-auth packet</button>
                </form>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <PriorAuthStatusButton id={auth.id} status="READY_FOR_REVIEW" label="Ready for review" />
                  <PriorAuthStatusButton id={auth.id} status="APPROVED_STAGED" label="Stage connector packet" />
                </div>
              </WorkCard>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {(view === "today" || view === "claims") ? <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <PmsCard title="Claim management" eyebrow="Line readiness, attachments, payer exposure">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr><th className="px-3 py-2">Claim</th><th className="px-3 py-2">Patient / payer</th><th className="px-3 py-2">Dollars</th><th className="px-3 py-2">Readiness</th><th className="px-3 py-2">Work</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {claims.map((claim) => (
                  <tr key={claim.id} className="align-top">
                    <td className="px-3 py-3"><p className="font-semibold text-neutral-950">{claim.claimNumber ?? claim.id}</p><p className="mt-1 text-xs text-neutral-500">{claim.lineCount} line(s) · trace {claim.clearinghouseTraceId ?? "not attached"}</p></td>
                    <td className="px-3 py-3 text-xs text-neutral-600">{claim.lastName}, {claim.firstName} · {claim.chartNumber}<br />{claim.payerName}</td>
                    <td className="px-3 py-3 text-xs text-neutral-600">Billed <Money cents={Number(claim.billedCents)} /><br />Paid <Money cents={Number(claim.paidCents)} /><br />Patient due <Money cents={Number(claim.patientDueCents)} /></td>
                    <td className="px-3 py-3">
                      <StatusFor value={claim.status} />
                      <p className="mt-2 text-xs text-neutral-500">{claim.attachmentStatus.replaceAll("_", " ").toLowerCase()} · {claim.readyLines}/{claim.lineCount} ready · {claim.blockedLines} blocked</p>
                      <p className="mt-1 text-xs text-neutral-500">{claim.openDenialCount} denial(s) · {claim.eraPostingCount} ERA/EOB · {claim.payerFollowUpCount} follow-up(s)</p>
                    </td>
                    <td className="px-3 py-3">
                      <Link href="/app/pms/insurance" className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700">Open PMS claim</Link>
                      <p className="mt-2 text-xs leading-5 text-neutral-600">{fieldText(claim.claimLifecycle, "nextAction")}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">Lines: {compactLineSummary(claim.claimLineDetails)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>

        <PmsCard title="Create denial / appeal case" eyebrow="Root cause and evidence">
          <form action={denialAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Claim<select name="claimKey" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{claims.map((claim) => <option key={claim.id} value={`${claim.id}|${claim.patientId}|${claim.payerName}|${claim.billedCents}`}>{claim.claimNumber ?? claim.id} - {claim.payerName}</option>)}</select></label>
            <Input name="denialCode" label="Denial code" />
            <Select name="rootCause" label="Root cause" options={["MISSING_ATTACHMENT", "BENEFIT_LIMITATION", "FREQUENCY_LIMITATION", "COB_OR_ELIGIBILITY", "PAYER_PROCESSING", "CODING_REVIEW", "UNDERPAYMENT"]} />
            <Input name="deniedDollars" label="Denied dollars" />
            <Input name="appealDeadline" label="Appeal deadline" type="datetime-local" />
            <Textarea name="denialReason" label="Denial reason" required />
            <Textarea name="requiredEvidence" label="Required evidence" defaultValue={"EOB\nradiograph\nclinical narrative"} />
            <Textarea name="nextAction" label="Next action" required defaultValue="Build appeal packet, verify evidence, and route for biller approval." />
            <button disabled={!claims.length} className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300">Create denial case</button>
          </form>
        </PmsCard>
      </section> : null}

      {view === "denials" ? <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Denial management" eyebrow="Appeals, root cause, evidence">
          <div className="grid gap-3">
            {denials.map((denial) => (
              <WorkCard key={denial.id} title={`${denial.claimNumber ?? denial.id} · ${denial.denialCode ?? "denial"}`} status={denial.status} patient={`${denial.lastName}, ${denial.firstName} · ${denial.chartNumber}`} payer={denial.payerName} amount={<Money cents={Number(denial.deniedCents)} />} body={`${denial.denialReason} ${denial.nextAction}`} evidence={denial.requiredEvidence}>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Appeal packet" value={clean(denial.appealPacketStatus)} />
                  <MiniMetric label="Connector" value={clean(denial.connectorStatus)} />
                  <MiniMetric label="Deadline" value={denial.appealDaysRemaining === null ? "not recorded" : `${denial.appealDaysRemaining} day(s)`} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Root cause" value={clean(denial.rootCause ?? "not classified")} />
                  <MiniMetric label="Claim" value={clean(denial.claimStatus)} />
                  <MiniMetric label="Attachment" value={clean(denial.attachmentStatus)} />
                </div>
                <Checklist title="Denial appeal package" value={denial.appealPackageChecklist} itemKey="checklist" />
                <p className="mt-2 text-xs leading-5 text-neutral-600">Submission readiness: {jsonSummary(denial.submissionReadiness)}</p>
                {denial.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{denial.blockedReason}</p> : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <DenialStatusButton id={denial.id} status="APPEAL_READY" label="Appeal ready" />
                  <DenialStatusButton id={denial.id} status="APPROVED_STAGED" label="Stage appeal packet" />
                </div>
              </WorkCard>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Payer follow-up" eyebrow="Claim status, eligibility calls, portal references">
          <form action={payerFollowUpAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Claim<select name="claimKey" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{claims.map((claim) => <option key={claim.id} value={`${claim.id}|${claim.patientId}|${claim.payerName}`}>{claim.claimNumber ?? claim.id} - {claim.payerName}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2"><Select name="channel" label="Channel" options={["PHONE", "PORTAL", "FAX", "EDI_276_277"]} /><Input name="dueAt" label="Due" type="datetime-local" /></div>
            <Textarea name="reason" label="Reason" required />
            <Textarea name="nextAction" label="Next action" required />
            <button disabled={!claims.length} className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300">Create payer follow-up</button>
          </form>
          <div className="grid gap-3">
            {payerFollowUps.map((followUp) => (
              <WorkCard key={followUp.id} title={followUp.reason} status={followUp.status} patient={followUp.lastName ? `${followUp.lastName}, ${followUp.firstName} · ${followUp.chartNumber}` : "Practice-level payer work"} payer={`${followUp.payerName} · ${followUp.channel}`} body={followUp.nextAction}>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label="Connector" value={clean(followUp.connectorStatus)} />
                  <MiniMetric label="Proof" value={jsonSummary(followUp.proofRequired)} />
                </div>
                {followUp.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{followUp.blockedReason}</p> : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <PayerFollowUpStatusButton id={followUp.id} status="WAITING_ON_PAYER" label="Contacted payer" outcome="Payer contacted; waiting on response." />
                  <PayerFollowUpStatusButton id={followUp.id} status="MANUAL_PROOF_REQUIRED" label="Attach proof" outcome="Manual proof required before payer status is treated as verified." />
                </div>
              </WorkCard>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {view === "era" ? <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="EOB / ERA posting" eyebrow="Reconcile, post, update claim and ledger">
          <div className="grid gap-3">
            {eras.map((era) => (
              <WorkCard key={era.id} title={`${era.claimNumber ?? era.id} · ${era.eraTraceNumber ?? "manual EOB"}`} status={era.status} patient={`${era.lastName}, ${era.firstName} · ${era.chartNumber}`} payer={era.payerName} amount={<Money cents={Number(era.paidCents)} />} body={era.exceptionReason ?? "ERA is ready for ledger posting."}>
                <div className="grid gap-2 sm:grid-cols-4">
                  <MiniMetric label="Allowed" value={<Money cents={Number(era.allowedCents)} />} />
                  <MiniMetric label="Paid" value={<Money cents={Number(era.paidCents)} />} />
                  <MiniMetric label="Patient due" value={<Money cents={Number(era.patientDueCents)} />} />
                  <MiniMetric label="Connector" value={clean(era.connectorStatus)} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Adjustment" value={<Money cents={Number(era.adjustmentCents)} />} />
                  <MiniMetric label="Variance" value={<Money cents={Number(era.postingVarianceCents)} />} />
                  <MiniMetric label="EOB proof" value={era.eraTraceNumber || era.eobDocumentId ? "Captured" : "Missing"} />
                </div>
                <BooleanChecklist title="ERA/EOB posting checklist" value={era.postingChecklist} />
                <p className="mt-2 text-xs leading-5 text-neutral-600">Readiness: {jsonSummary(era.postingReadiness)}</p>
                {Number(era.postingVarianceCents) !== 0 ? <p className="mt-1 text-xs leading-5 text-red-700">Posting blocked until EOB variance is reconciled to $0.00.</p> : null}
                {era.blockedReason ? <p className="mt-1 text-xs leading-5 text-red-700">{era.blockedReason}</p> : null}
                <form action={eobProofAction} className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-white p-2">
                  <input type="hidden" name="id" value={era.id} />
                  <Textarea name="adjustmentSummary" label="Adjustment summary" defaultValue="Review allowed, paid, patient due, adjustment, and variance against EOB before ledger posting." />
                  <button className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Generate EOB proof</button>
                </form>
                <form action={eraPostAction} className="mt-3"><input type="hidden" name="id" value={era.id} /><button disabled={!eraCanPost(era)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:bg-neutral-100 disabled:text-neutral-400">Post to PMS ledger after review</button></form>
              </WorkCard>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Billing and payment register" eyebrow="Ledger, patient payments, insurance payments">
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniMetric label="Ready ERA" value={eraReady.length} />
              <MiniMetric label="Payments" value={payments.length} />
              <MiniMetric label="Ledger rows" value={ledger.length} />
            </div>
            {ledger.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{entry.description}</p>
                  <StatusFor value={entry.entryType} />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{entry.lastName}, {entry.firstName} · {entry.chartNumber}{entry.claimNumber ? ` · ${entry.claimNumber}` : ""}</p>
                <p className="mt-2 text-xs text-neutral-600">Amount <Money cents={Number(entry.amountCents)} /> · balance impact <Money cents={Number(entry.balanceCents)} /></p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {(view === "today" || view === "revenue" || view === "queue") ? <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <PmsCard title="Revenue integrity" eyebrow="Underpayments, unposted ERA, missed charges, write-off review">
          <div className="grid gap-3 lg:grid-cols-2">
            {revenueFindings.map((finding) => (
              <WorkCard key={finding.id} title={finding.findingType.replaceAll("_", " ")} status={finding.status} patient={finding.lastName ? `${finding.lastName}, ${finding.firstName} · ${finding.chartNumber}` : "Practice finding"} payer={finding.payerName ?? "No payer"} amount={<Money cents={Math.abs(Number(finding.varianceCents))} />} body={`${finding.rootCause ?? ""} ${finding.nextAction}`}>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Recovery" value={clean(finding.recoveryStatus)} />
                  <MiniMetric label="Connector" value={clean(finding.connectorStatus)} />
                  <MiniMetric label="Proof" value={jsonSummary(finding.proofRequired)} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Expected" value={<Money cents={Number(finding.expectedCents)} />} />
                  <MiniMetric label="Actual" value={<Money cents={Number(finding.actualCents)} />} />
                  <MiniMetric label="Leakage" value={<Money cents={Math.abs(Number(finding.varianceCents))} />} />
                </div>
                <Checklist title="Revenue integrity leakage workflow" value={finding.leakageWorkflow} itemKey="workflow" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <RevenueStatusButton id={finding.id} status="IN_REVIEW" label="In review" />
                  <RevenueStatusButton id={finding.id} status="RECOVERY_STAGED" label="Stage recovery proof" />
                </div>
              </WorkCard>
            ))}
          </div>
        </PmsCard>

        {view === "revenue" ? null : <PmsCard title="General RCM queue" eyebrow="Manual exceptions and escalations">
          <form action={createAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="workType" label="Work type" options={["ELIGIBILITY_AND_BENEFITS", "PRIOR_AUTH", "CLAIM_ATTACHMENT", "DENIAL_APPEAL", "ERA_EOB_POSTING", "REVENUE_INTEGRITY", "CREDENTIALING", "PATIENT_BALANCE"]} />
              <Select name="stage" label="Stage" options={["PRE_VISIT_CLEARANCE", "ESTIMATE_READY", "CLAIM_READY", "PAYER_FOLLOW_UP", "DENIAL_REVIEW", "UNDERPAYMENT_REVIEW", "PAYMENT_POSTING", "PAYER_ENROLLMENT"]} />
              <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} />
              <Input name="payerName" label="Payer" />
              <Input name="amountDollars" label="Amount dollars" />
              <Input name="dueAt" label="Due" type="datetime-local" />
            </div>
            <Textarea name="blockerReason" label="Blocker reason" />
            <Textarea name="nextAction" label="Next action" required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create RCM item</button>
          </form>
          <div className="grid gap-3">
            {items.map((item) => (
              <WorkCard key={item.id} title={item.workType.replaceAll("_", " ")} status={item.status} patient={item.lastName ? `${item.lastName}, ${item.firstName} · ${item.chartNumber}` : "Practice-level item"} payer={item.payerName ?? "No payer"} amount={<Money cents={Number(item.amountCents ?? 0)} />} body={`${item.blockerReason ?? ""} ${item.nextAction}`}>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Connector" value={clean(item.connectorStatus)} />
                  <MiniMetric label="Proof" value={jsonSummary(item.proofRequired)} />
                  <MiniMetric label="Policy" value={jsonSummary(item.approvalPolicy)} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <RcmItemStatusButton id={item.id} status="READY_FOR_REVIEW" label="Review" />
                  <RcmItemStatusButton id={item.id} status="APPROVED_STAGED" label="Stage" />
                  <RcmItemStatusButton id={item.id} status="MANUAL_PROOF_REQUIRED" label="Proof" />
                </div>
              </WorkCard>
            ))}
          </div>
        </PmsCard>}
      </section> : null}
    </FoundationShell>
  );
}

function clean(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function fieldText(value: unknown, key: string) {
  const record = asRecord(value);
  const field = record?.[key];
  if (field === null || field === undefined || field === "") return null;
  return String(field);
}

function checklistItems(value: unknown, itemKey: string) {
  const record = asRecord(value);
  const rawItems = Array.isArray(value) ? value : record?.[itemKey];
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      label: String(item.label ?? item.name ?? "Checklist item"),
      status: String(item.status ?? "PENDING"),
      source: item.source ? String(item.source) : null,
    }));
}

function compactLineSummary(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  if (!rows.length) return "not recorded";
  return rows.slice(0, 3).map((row) => {
    const record = asRecord(row);
    if (!record) return "line";
    const code = String(record.code ?? "code");
    const tooth = record.tooth ? ` tooth ${record.tooth}` : "";
    return `${code}${tooth} ${clean(String(record.status ?? "READY"))}`;
  }).join("; ");
}

function RcmViewNav({ active, roleKey }: { active: string; roleKey: string }) {
  const items = [
    { key: "today", label: "Today" },
    { key: "benefits", label: "Benefits" },
    { key: "auth", label: "Prior Auth" },
    { key: "claims", label: "Claims" },
    { key: "denials", label: "Denials" },
    { key: "era", label: "ERA / EOB" },
    { key: "revenue", label: "Revenue Integrity" },
    { key: "queue", label: "Queue" },
  ];
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
      {items.map((item) => (
        <a
          key={item.key}
          href={`/app/rcm?role=${roleKey}&view=${item.key}`}
          className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition ${
            active === item.key ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
          }`}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

function jsonSummary(value: unknown) {
  if (!value || !Object.keys(value).length) return "not recorded";
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item || typeof item !== "object") return String(item);
      const record = item as Record<string, unknown>;
      return [record.code, record.label, record.description, record.status].filter(Boolean).map(String).join(" ");
    }).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, val]) => `${clean(key)}: ${Array.isArray(val) ? val.join(", ") : typeof val === "object" && val !== null ? JSON.stringify(val) : String(val)}`).join("; ");
  }
  return String(value);
}

function WorkCard({ title, status, patient, payer, amount, body, evidence, children }: { title: string; status: string; patient: string; payer?: string; amount?: React.ReactNode; body: string; evidence?: string[] | null; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-950">{title}</p>
          <p className="mt-1 text-xs text-neutral-600">{patient}{payer ? ` · ${payer}` : ""}</p>
        </div>
        <StatusFor value={status} />
      </div>
      {amount ? <p className="mt-2 text-lg font-semibold text-neutral-950">{amount}</p> : null}
      <p className="mt-2 text-xs leading-5 text-neutral-600">{body}</p>
      {evidence?.length ? <p className="mt-2 text-xs leading-5 text-neutral-600"><span className="font-semibold text-neutral-800">Evidence:</span> {evidence.join(", ")}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function Checklist({ title, value, itemKey }: { title: string; value: unknown; itemKey: string }) {
  const items = checklistItems(value, itemKey);
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-md bg-white p-2 ring-1 ring-neutral-200">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{title}</p>
      <div className="mt-2 grid gap-1.5">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 text-xs">
            <span className="leading-5 text-neutral-700">{item.label}{item.source ? <span className="text-neutral-400"> · {item.source}</span> : null}</span>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600">{item.status.replaceAll("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BooleanChecklist({ title, value }: { title: string; value: unknown }) {
  const record = asRecord(value);
  if (!record) return null;
  const items = Object.entries(record).filter(([, val]) => typeof val === "boolean");
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-md bg-white p-2 ring-1 ring-neutral-200">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{title}</p>
      <div className="mt-2 grid gap-1.5">
        {items.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-neutral-700">{clean(key)}</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600">{val ? "Ready" : "Needs review"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorAuthStatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={priorAuthStatusAction}><StatusFields id={id} status={status} /><StatusButtonLabel label={label} /></form>;
}

function DenialStatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={denialStatusAction}><StatusFields id={id} status={status} /><StatusButtonLabel label={label} /></form>;
}

function PayerFollowUpStatusButton({ id, status, label, outcome }: { id: string; status: string; label: string; outcome: string }) {
  return <form action={payerFollowUpStatusAction}><StatusFields id={id} status={status} outcome={outcome} /><StatusButtonLabel label={label} /></form>;
}

function RevenueStatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={revenueStatusAction}><StatusFields id={id} status={status} /><StatusButtonLabel label={label} /></form>;
}

function RcmItemStatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={statusAction}><StatusFields id={id} status={status} /><StatusButtonLabel label={label} /></form>;
}

function StatusFields({ id, status, outcome = "" }: { id: string; status: string; outcome?: string }) {
  return <><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><input type="hidden" name="outcome" value={outcome} /></>;
}

function StatusButtonLabel({ label }: { label: string }) {
  return <button className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{label}</button>;
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-white p-2 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} type={type} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Textarea({ name, label, required = false, defaultValue = "" }: { name: string; label: string; required?: boolean; defaultValue?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={3} defaultValue={defaultValue} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}
