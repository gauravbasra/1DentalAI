import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  addAllergy,
  addCommunicationPreference,
  addMedicalAlert,
  addMedicalHistoryEntry,
  addMedication,
  addPatientConsent,
  addPatientPharmacy,
  getChart,
  getFamilyAccount,
  getFamilyMembers,
  getPatient,
  getPatientAccount,
  getPatientOnboardingCompleteness,
  getPatientProfile,
  updatePatientAdministrativeProfile,
} from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type ProfileRow = Record<string, string | number | boolean | Date | null>;

async function updateProfileAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId") ?? "");
  await updatePatientAdministrativeProfile({
    tenantId: session.tenantId,
    patientId,
    preferredName: String(formData.get("preferredName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    genderIdentity: String(formData.get("genderIdentity") ?? ""),
    responsibleParty: String(formData.get("responsibleParty") ?? ""),
    emergencyContactName: String(formData.get("emergencyContactName") ?? ""),
    emergencyContactPhone: String(formData.get("emergencyContactPhone") ?? ""),
    referralSource: String(formData.get("referralSource") ?? ""),
    privacyLevel: String(formData.get("privacyLevel") ?? "STANDARD"),
    patientNote: String(formData.get("patientNote") ?? ""),
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/patients/${patientId}`);
}

async function addCommunicationAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId") ?? "");
  await addCommunicationPreference({
    tenantId: session.tenantId,
    patientId,
    channel: String(formData.get("channel") ?? "SMS"),
    destination: String(formData.get("destination") ?? ""),
    consentStatus: String(formData.get("consentStatus") ?? "UNKNOWN"),
    priority: Number(formData.get("priority") ?? 1),
    quietHoursStart: String(formData.get("quietHoursStart") ?? ""),
    quietHoursEnd: String(formData.get("quietHoursEnd") ?? ""),
    source: String(formData.get("source") ?? "STAFF_VERIFIED"),
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/patients/${patientId}`);
}

async function addConsentAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId") ?? "");
  await addPatientConsent({
    tenantId: session.tenantId,
    patientId,
    consentType: String(formData.get("consentType") ?? ""),
    status: String(formData.get("status") ?? "NEEDS_SIGNATURE"),
    signedByName: String(formData.get("signedByName") ?? ""),
    signedAt: String(formData.get("signedAt") ?? "") || undefined,
    expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
    sourceDocumentId: String(formData.get("sourceDocumentId") ?? ""),
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/patients/${patientId}`);
}

async function addHistoryAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId") ?? "");
  await addMedicalHistoryEntry({
    tenantId: session.tenantId,
    patientId,
    category: String(formData.get("category") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    severity: String(formData.get("severity") ?? ""),
    onsetDate: String(formData.get("onsetDate") ?? "") || undefined,
    resolvedDate: String(formData.get("resolvedDate") ?? "") || undefined,
    notes: String(formData.get("notes") ?? ""),
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/patients/${patientId}`);
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addSafetyAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId") ?? "");
  const recordType = String(formData.get("recordType") ?? "ALERT");
  if (recordType === "ALLERGY") {
    await addAllergy({
      tenantId: session.tenantId,
      patientId,
      allergen: String(formData.get("title") ?? ""),
      reaction: String(formData.get("details") ?? ""),
      severity: String(formData.get("severity") ?? "MODERATE"),
      actorRole: session.roleKey,
    });
  } else if (recordType === "MEDICATION") {
    await addMedication({
      tenantId: session.tenantId,
      patientId,
      name: String(formData.get("title") ?? ""),
      dosage: String(formData.get("details") ?? ""),
      status: "ACTIVE",
      actorRole: session.roleKey,
    });
  } else {
    await addMedicalAlert({
      tenantId: session.tenantId,
      patientId,
      title: String(formData.get("title") ?? ""),
      details: String(formData.get("details") ?? ""),
      severity: String(formData.get("severity") ?? "MODERATE"),
      actorRole: session.roleKey,
    });
  }
  revalidatePath(`/app/pms/patients/${patientId}`);
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addPharmacyAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId") ?? "");
  await addPatientPharmacy({
    tenantId: session.tenantId,
    patientId,
    pharmacyName: String(formData.get("pharmacyName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    fax: String(formData.get("fax") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    isPreferred: String(formData.get("isPreferred") ?? "on") === "on",
    notes: String(formData.get("notes") ?? ""),
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/patients/${patientId}`);
}

export default async function PatientRecordPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ role?: string }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const session = await requireAuth();
  const role = getRole(query.role);
  const [patient, chart, family, familyMembers, account, profile, onboarding] = await Promise.all([
    getPatient(patientId, session.tenantId),
    getChart(patientId, session.tenantId),
    getFamilyAccount(patientId, session.tenantId),
    getFamilyMembers(patientId, session.tenantId),
    getPatientAccount(patientId, session.tenantId),
    getPatientProfile(patientId, session.tenantId),
    getPatientOnboardingCompleteness(patientId, session.tenantId),
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
            <Row label="Emergency contact">{patient.emergencyContactName ? `${patient.emergencyContactName} · ${patient.emergencyContactPhone ?? "no phone"}` : "not recorded"}</Row>
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

      {onboarding ? (
        <section className="mt-4">
          <PmsCard title="Onboarding completeness gates" eyebrow={onboarding.ready ? "Ready for PMS operations" : `${onboarding.completedCount}/${onboarding.totalCount} complete`}>
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              {onboarding.gates.map((gate) => (
                <div key={gate.key} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-950">{gate.label}</p>
                      <p className="mt-1 text-sm leading-6 text-neutral-600">{gate.detail}</p>
                    </div>
                    <StatusFor value={gate.status} />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">{gate.action}</p>
                </div>
              ))}
            </div>
          </PmsCard>
        </section>
      ) : null}

      <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PmsCard title="Administrative profile" eyebrow="Demographics, privacy, emergency contact">
          <form action={updateProfileAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input name="preferredName" label="Preferred name" defaultValue={patient.preferredName ?? ""} />
              <Input name="phone" label="Phone" defaultValue={patient.phone ?? ""} />
              <Input name="email" label="Email" type="email" defaultValue={patient.email ?? ""} />
              <Input name="genderIdentity" label="Gender identity" />
              <Select name="responsibleParty" label="Responsible party" options={["SELF", "PARENT", "SPOUSE", "GUARANTOR", "OTHER"]} defaultValue={patient.responsibleParty ?? "SELF"} />
              <Select name="privacyLevel" label="Privacy level" options={["STANDARD", "SENSITIVE", "VIP", "MINOR"]} defaultValue={patient.privacyLevel} />
              <Input name="emergencyContactName" label="Emergency contact" defaultValue={patient.emergencyContactName ?? ""} />
              <Input name="emergencyContactPhone" label="Emergency phone" defaultValue={patient.emergencyContactPhone ?? ""} />
              <Input name="referralSource" label="Referral source" defaultValue={patient.referralSource ?? ""} />
            </div>
            <Textarea name="patientNote" label="Patient note" rows={3} defaultValue={patient.patientNote ?? ""} />
            <button className={buttonClass}>Save administrative profile</button>
          </form>
        </PmsCard>

        <PmsCard title="Communication and consent" eyebrow="Permissioned patient access">
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <form action={addCommunicationAction} className="grid min-w-0 gap-3">
              <input type="hidden" name="patientId" value={patient.id} />
              <Select name="channel" label="Channel" options={["SMS", "EMAIL", "PHONE", "PORTAL"]} />
              <Input name="destination" label="Destination" defaultValue={patient.phone ?? patient.email ?? ""} required />
              <Select name="consentStatus" label="Consent status" options={["OPTED_IN", "OPTED_OUT", "UNKNOWN", "DO_NOT_CONTACT"]} />
              <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                <Input name="priority" label="Priority" type="number" defaultValue="1" />
                <Input name="quietHoursStart" label="Quiet start" defaultValue="20:00" />
                <Input name="quietHoursEnd" label="Quiet end" defaultValue="08:00" />
              </div>
              <Input name="source" label="Source" defaultValue="STAFF_VERIFIED" />
              <button className={buttonClass}>Save contact permission</button>
            </form>
            <form action={addConsentAction} className="grid min-w-0 gap-3">
              <input type="hidden" name="patientId" value={patient.id} />
              <Select name="consentType" label="Consent type" options={["HIPAA_ACKNOWLEDGEMENT", "GENERAL_TREATMENT", "FINANCIAL_POLICY", "RELEASE_OF_INFORMATION", "PROCEDURE_CONSENT", "TELEDENTISTRY"]} />
              <Select name="status" label="Status" options={["NEEDS_SIGNATURE", "SIGNED", "EXPIRED", "REVOKED"]} />
              <Input name="signedByName" label="Signed by" defaultValue={name} />
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Input name="signedAt" label="Signed at" type="datetime-local" />
                <Input name="expiresAt" label="Expires at" type="date" />
              </div>
              <Input name="sourceDocumentId" label="Document ID" />
              <button className={buttonClass}>Record consent</button>
            </form>
          </div>
          <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
            <CompactList title="Contact permissions" rows={profile.communicationPreferences as ProfileRow[]} primary="channel" secondary="destination" status="consentStatus" />
            <CompactList title="Consents" rows={profile.consents as ProfileRow[]} primary="consentType" secondary="signedByName" status="status" />
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
        <PmsCard title="Medical history" eyebrow="Provider-reviewed health profile">
          <form action={addHistoryAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <Select name="category" label="Category" options={["CARDIOVASCULAR", "ENDOCRINE", "RESPIRATORY", "NEUROLOGIC", "PREGNANCY", "INFECTIOUS_DISEASE", "DENTAL_HISTORY", "CURRENT_COMPLAINT", "OTHER"]} />
            <Input name="condition" label="Condition" required />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Select name="status" label="Status" options={["ACTIVE", "RESOLVED", "HISTORICAL", "RULED_OUT"]} />
              <Select name="severity" label="Severity" options={["LOW", "MODERATE", "HIGH", "CRITICAL"]} />
              <Input name="onsetDate" label="Onset date" type="date" />
              <Input name="resolvedDate" label="Resolved date" type="date" />
            </div>
            <Textarea name="notes" label="Notes" rows={3} />
            <button className={buttonClass}>Add medical history</button>
          </form>
          <CompactList title="History entries" rows={profile.medicalHistory as ProfileRow[]} primary="condition" secondary="category" status="status" />
        </PmsCard>

        <PmsCard title="Safety profile" eyebrow="Alerts, allergies, medications">
          <form action={addSafetyAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <Select name="recordType" label="Record type" options={["ALERT", "ALLERGY", "MEDICATION"]} />
            <Input name="title" label="Name or alert title" required />
            <Select name="severity" label="Severity" options={["LOW", "MODERATE", "HIGH", "CRITICAL"]} />
            <Textarea name="details" label="Reaction, dosage, or details" rows={3} />
            <button className={buttonClass}>Save safety record</button>
          </form>
          <div className="mt-4 grid min-w-0 gap-3">
            <CompactList title="Alerts" rows={profile.alerts as ProfileRow[]} primary="title" secondary="details" status="severity" />
            <CompactList title="Allergies" rows={profile.allergies as ProfileRow[]} primary="allergen" secondary="reaction" status="severity" />
            <CompactList title="Medications" rows={profile.medications as ProfileRow[]} primary="name" secondary="dosage" status="status" />
          </div>
        </PmsCard>

        <PmsCard title="Preferred pharmacy" eyebrow="Prescribing readiness">
          <form action={addPharmacyAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <Input name="pharmacyName" label="Pharmacy name" required />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input name="phone" label="Phone" />
              <Input name="fax" label="Fax" />
            </div>
            <Input name="addressLine1" label="Address" />
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <Input name="city" label="City" />
              <Input name="state" label="State" />
              <Input name="postalCode" label="ZIP" />
            </div>
            <Textarea name="notes" label="Notes" rows={3} />
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700"><input name="isPreferred" type="checkbox" defaultChecked /> Preferred pharmacy</label>
            <button className={buttonClass}>Save pharmacy</button>
          </form>
          <CompactList title="Pharmacies" rows={profile.pharmacies as ProfileRow[]} primary="pharmacyName" secondary="phone" status="isPreferred" />
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-6 xl:grid-cols-3">
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

function Input({
  label,
  name,
  type = "text",
  defaultValue = "",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required={required} className={controlClass} />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <select name={name} defaultValue={defaultValue} className={controlClass}>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );
}

function Textarea({
  label,
  name,
  rows,
  defaultValue = "",
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <textarea name={name} rows={rows} defaultValue={defaultValue} className={controlClass} />
    </label>
  );
}

function CompactList({
  title,
  rows,
  primary,
  secondary,
  status,
}: {
  title: string;
  rows: ProfileRow[];
  primary: string;
  secondary: string;
  status: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{title}</p>
      <div className="mt-2 grid gap-2">
        {rows.length ? rows.slice(0, 6).map((row) => (
          <div key={String(row.id)} className="min-w-0 rounded-md bg-white px-3 py-2 text-sm">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <p className="truncate font-semibold text-neutral-950">{String(row[primary] ?? "not recorded")}</p>
              <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-neutral-700">{String(row[status] ?? "")}</span>
            </div>
            <p className="mt-1 truncate text-xs text-neutral-500">{String(row[secondary] ?? "")}</p>
          </div>
        )) : <p className="rounded-md bg-white px-3 py-2 text-sm text-neutral-500">None recorded</p>}
      </div>
    </div>
  );
}

const controlClass = "min-w-0 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const buttonClass = "w-full rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800";
