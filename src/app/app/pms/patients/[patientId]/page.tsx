import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getChart, getFamilyAccount, getFamilyMembers, getPatient, getPatientAccount } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export default async function PatientRecordPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ role?: string }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const role = getRole(query.role);
  const [patient, chart, family, familyMembers, account] = await Promise.all([
    getPatient(patientId),
    getChart(patientId),
    getFamilyAccount(patientId),
    getFamilyMembers(patientId),
    getPatientAccount(patientId),
  ]);

  if (!patient) {
    return (
      <FoundationShell active="/app/pms" roleKey={role.key}>
        <PageHeader eyebrow="PMS" title="Patient not found" body="The patient record does not exist in this tenant." />
      </FoundationShell>
    );
  }

  const name = `${patient.firstName} ${patient.lastName}`;

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow={patient.chartNumber} title={name} body="A PMS-grade patient workspace: family account, guarantor, demographics, chart, perio, treatment, insurance, ledger, recall, documents, and role-owned follow-up." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={`/app/pms/patients/${patient.id}`} />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <PmsCard title="Patient and guarantor" eyebrow="Family module">
          <div className="grid gap-3 text-sm">
            <Row label="Status"><StatusFor value={patient.status} /></Row>
            <Row label="DOB">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "not recorded"}</Row>
            <Row label="Responsible party">{patient.responsibleParty ?? "not recorded"}</Row>
            <Row label="Phone">{patient.phone ?? "not recorded"}</Row>
            <Row label="Email">{patient.email ?? "not recorded"}</Row>
            <Row label="Family account">{family?.accountNumber ?? "not linked"}</Row>
            <Row label="Billing status">{family ? <StatusFor value={family.billingStatus} /> : "not linked"}</Row>
            <Row label="Balance"><Money cents={patient.balanceCents} /></Row>
            <Row label="Open tasks">{patient.openTasks}</Row>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link href={`/app/pms/chart/${patient.id}?role=${role.key}`} className="rounded-2xl bg-neutral-950 px-4 py-3 text-center text-sm font-semibold text-white">Open chart</Link>
            <Link href={`/app/pms/perio/${patient.id}?role=${role.key}`} className="rounded-2xl border border-neutral-300 px-4 py-3 text-center text-sm font-semibold text-neutral-800">Open perio</Link>
          </div>
        </PmsCard>

        <PmsCard title="Patient cockpit" eyebrow="Front office, provider, and billing context">
          <div className="grid gap-4 md:grid-cols-4">
            <Snapshot label="Medical alerts" value={chart.alerts.length} />
            <Snapshot label="Allergies" value={chart.allergies.length} />
            <Snapshot label="Clinical notes" value={chart.notes.length} />
            <Snapshot label="Family members" value={familyMembers.length} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Link href={`/app/pms/chart/${patient.id}?role=${role.key}`} className="rounded-3xl bg-neutral-50 p-5 transition hover:bg-cyan-50">
              <p className="font-semibold text-neutral-950">Charting</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Conditions, procedure history, notes, alerts, medication, allergies, and clinical follow-up.</p>
            </Link>
            <Link href={`/app/pms/perio/${patient.id}?role=${role.key}`} className="rounded-3xl bg-neutral-50 p-5 transition hover:bg-cyan-50">
              <p className="font-semibold text-neutral-950">Perio</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Enter pocket depths, bleeding, recession, mobility, furcation, diagnosis, and hygiene follow-up.</p>
            </Link>
            <Link href={`/app/pms/ledger?role=${role.key}`} className="rounded-3xl bg-neutral-50 p-5 transition hover:bg-cyan-50">
              <p className="font-semibold text-neutral-950">Account</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Ledger, claims, insurance, estimates, patient due, documents, and payment follow-up.</p>
            </Link>
            <Link href={`/app/pms/imaging?role=${role.key}`} className="rounded-3xl bg-neutral-50 p-5 transition hover:bg-cyan-50">
              <p className="font-semibold text-neutral-950">Imaging</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">X-rays, CBCT, intraoral photos, DICOM identifiers, findings, and review status.</p>
            </Link>
            <Link href={`/app/pms/labs?role=${role.key}`} className="rounded-3xl bg-neutral-50 p-5 transition hover:bg-cyan-50">
              <p className="font-semibold text-neutral-950">Labs</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Outside lab cases, due dates, delivery status, shade, tracking, and remake risk.</p>
            </Link>
            <Link href={`/app/pms/documents?role=${role.key}`} className="rounded-3xl bg-neutral-50 p-5 transition hover:bg-cyan-50">
              <p className="font-semibold text-neutral-950">Documents</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Forms, consents, EOBs, statements, prescriptions, and referrals attached to the chart.</p>
            </Link>
          </div>
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <PmsCard title="Family members" eyebrow={family?.displayName ?? "No family account"}>
          <div className="space-y-3">
            {familyMembers.map((member) => (
              <Link key={member.id} href={`/app/pms/patients/${member.id}?role=${role.key}`} className="block rounded-2xl bg-neutral-50 p-4">
                <p className="font-semibold text-neutral-950">{member.lastName}, {member.firstName}</p>
                <p className="mt-1 text-sm text-neutral-600">{member.chartNumber} · {member.responsibleParty ?? "relationship not set"} · <Money cents={member.balanceCents} /></p>
              </Link>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Account readiness" eyebrow="Insurance, claims, ledger">
          <div className="grid gap-3 text-sm">
            <Row label="Insurance plans">{account.insurance.length}</Row>
            <Row label="Open claims">{account.claims.length}</Row>
            <Row label="Ledger entries">{account.ledger.length}</Row>
            <Row label="Treatment plans">{account.treatmentPlans.length}</Row>
            <Row label="Lab cases">{account.labCases.length}</Row>
          </div>
        </PmsCard>
        <PmsCard title="Recall and documents" eyebrow="Patient access">
          <div className="grid gap-3 text-sm">
            <Row label="Recall items">{account.recalls.length}</Row>
            <Row label="Documents">{account.documents.length}</Row>
            <Row label="Imaging studies">{account.imaging.length}</Row>
            <Row label="Prescriptions">{account.prescriptions.length}</Row>
            <Row label="Referrals">{account.referrals.length}</Row>
            <Row label="Patient note">{patient.patientNote ?? "none"}</Row>
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="font-medium text-neutral-500">{label}</span>
      <span className="text-right font-semibold text-neutral-950">{children}</span>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-5">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
