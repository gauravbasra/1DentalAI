import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getLedgerBoard, listPatients, postLedgerCharge, postPatientPayment } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type LedgerRow = {
  id: string;
  description: string;
  chartNumber: string;
  lastName: string;
  firstName: string;
  postedAt: string;
  entryType: string;
  amountCents: number;
  balanceCents: number;
  status: string;
  claimNumber: string | null;
  claimStatus: string | null;
};

type PaymentRow = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  paymentType: string;
  amountCents: number;
  reference: string | null;
  status: string;
  postedAt: string;
};

type ClaimRow = {
  id: string;
  claimNumber: string | null;
  payerName: string;
  status: string;
  billedCents: number;
  paidCents: number;
  patientDueCents: number;
  chartNumber: string;
  firstName: string;
  lastName: string;
};

function moneyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(/[^0-9.-]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

async function postChargeAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await postLedgerCharge({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    description: String(formData.get("description") ?? ""),
    amountCents: moneyToCents(formData.get("amount")),
    serviceDate: String(formData.get("serviceDate") ?? ""),
  });
  revalidatePath("/app/pms/ledger");
  revalidatePath("/app/pms/patients");
}

async function postPaymentAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await postPatientPayment({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    amountCents: moneyToCents(formData.get("amount")),
    paymentType: String(formData.get("paymentType") ?? "CARD"),
    reference: String(formData.get("reference") ?? ""),
  });
  revalidatePath("/app/pms/ledger");
  revalidatePath("/app/pms/patients");
}

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [board, patients] = await Promise.all([getLedgerBoard(session.tenantId), listPatients(session.tenantId)]);
  const rows = board.entries as LedgerRow[];
  const payments = board.payments as PaymentRow[];
  const claims = board.claims as ClaimRow[];
  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS ledger" title="Patient ledger and payments" body="Post charges, accept patient payments, review balances, and keep claims tied to the account ledger." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/ledger" />
      <PmsSectionNav active="/app/pms/ledger" roleKey={role.key} />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Metric label="Open patient balance" value={<Money cents={board.totalBalanceCents} />} />
        <Metric label="Patients with balance" value={board.patientCountWithBalance} />
        <Metric label="Claims in queue" value={claims.length} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="grid gap-6">
          <PmsCard title="Post charge" eyebrow="Account receivable">
            <form action={postChargeAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
              <Input name="description" label="Description" required />
              <div className="grid grid-cols-2 gap-3">
                <Input name="amount" label="Amount" required />
                <Input name="serviceDate" label="Service date" type="date" />
              </div>
              <button disabled={!patients.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Post charge</button>
            </form>
          </PmsCard>

          <PmsCard title="Post patient payment" eyebrow="Cash posting">
            <form action={postPaymentAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3">
                <Select name="paymentType" label="Payment type" options={["CARD", "ACH", "CASH", "CHECK", "HSA_FSA", "FINANCING"]} />
                <Input name="amount" label="Amount" required />
              </div>
              <Input name="reference" label="Reference" />
              <button disabled={!patients.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Post patient payment</button>
            </form>
          </PmsCard>

          <PmsCard title="Payment register" eyebrow="Posted cash">
            {payments.length ? payments.map((payment) => (
              <div key={payment.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950"><Money cents={payment.amountCents} /> · {payment.paymentType.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-neutral-600">{payment.lastName}, {payment.firstName} · {payment.chartNumber} · {payment.reference ?? "no reference"}</p>
                  </div>
                  <StatusFor value={payment.status} />
                </div>
              </div>
            )) : <EmptyPmsState title="No payments posted yet" body="Patient payments create a payment record and a balancing ledger entry, preserving the audit trail." />}
          </PmsCard>
        </div>

        <div className="grid gap-6">
          <PmsCard title="Ledger activity" eyebrow="Account history">
            {rows.length ? rows.map((row) => (
              <div key={row.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{row.description}</p>
                    <p className="mt-1 text-sm text-neutral-600">{row.lastName}, {row.firstName} · {row.chartNumber} · {new Date(row.postedAt).toLocaleDateString()}</p>
                  </div>
                  <StatusFor value={row.entryType} />
                </div>
                <p className="mt-3 text-sm text-neutral-700">Amount <Money cents={row.amountCents} /> · balance impact <Money cents={row.balanceCents} />{row.claimNumber ? <> · claim {row.claimNumber}</> : null}</p>
              </div>
            )) : <EmptyPmsState title="No ledger entries yet" body="Charges, patient payments, insurance payments, adjustments, and claim-linked balances post here from PMS workflows." />}
          </PmsCard>

          <PmsCard title="Claims linked to ledger" eyebrow="Insurance receivables">
            {claims.length ? claims.map((claim) => (
              <div key={claim.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{claim.claimNumber ?? claim.id} · {claim.payerName}</p>
                    <p className="mt-1 text-sm text-neutral-600">{claim.lastName}, {claim.firstName} · {claim.chartNumber}</p>
                  </div>
                  <StatusFor value={claim.status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MiniMetric label="Billed" value={<Money cents={claim.billedCents} />} />
                  <MiniMetric label="Paid" value={<Money cents={claim.paidCents} />} />
                  <MiniMetric label="Patient due" value={<Money cents={claim.patientDueCents} />} />
                </div>
              </div>
            )) : <EmptyPmsState title="No claim receivables yet" body="Create claims from insurance readiness. Claim balances and payer status will remain visible beside the patient ledger." />}
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
  return <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{label}</p><p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}
