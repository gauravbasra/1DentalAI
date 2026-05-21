import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createDocument, createPrescription, createReferral, listDocuments, listPatients, listPrescriptions, listProviders, listReferrals, updateDocumentStatus } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  title: string;
  documentType: string;
  chartNumber: string | null;
  lastName: string | null;
  firstName: string | null;
  claimNumber: string | null;
  sourceModule: string | null;
  status: string;
  signatureStatus: string;
};

type PrescriptionRow = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  providerName: string | null;
  medicationName: string;
  dosage: string | null;
  directions: string;
  pharmacyName: string | null;
  status: string;
};

type ReferralRow = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  providerName: string | null;
  referralType: string;
  referredToName: string;
  referredToSpecialty: string | null;
  reason: string;
  status: string;
  dueAt: string | null;
};

async function createDocumentAction(formData: FormData) {
  "use server";
  await createDocument({
    patientId: String(formData.get("patientId") ?? ""),
    documentType: String(formData.get("documentType") ?? ""),
    title: String(formData.get("title") ?? ""),
    storageUri: String(formData.get("storageUri") ?? ""),
    sourceModule: String(formData.get("sourceModule") ?? "PMS"),
    signatureStatus: String(formData.get("signatureStatus") ?? "NOT_REQUIRED"),
    status: String(formData.get("status") ?? "RECEIVED"),
    expiresAt: String(formData.get("expiresAt") ?? ""),
  });
  revalidatePath("/app/pms/documents");
}

async function updateDocumentAction(formData: FormData) {
  "use server";
  await updateDocumentStatus(String(formData.get("documentId") ?? ""), String(formData.get("status") ?? "REVIEWED"));
  revalidatePath("/app/pms/documents");
}

async function createPrescriptionAction(formData: FormData) {
  "use server";
  await createPrescription({
    patientId: String(formData.get("patientId") ?? ""),
    providerId: String(formData.get("providerId") ?? ""),
    medicationName: String(formData.get("medicationName") ?? ""),
    dosage: String(formData.get("dosage") ?? ""),
    directions: String(formData.get("directions") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    refills: Number(formData.get("refills") ?? 0),
    pharmacyName: String(formData.get("pharmacyName") ?? ""),
    pharmacyPhone: String(formData.get("pharmacyPhone") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
  });
  revalidatePath("/app/pms/documents");
}

async function createReferralAction(formData: FormData) {
  "use server";
  await createReferral({
    patientId: String(formData.get("patientId") ?? ""),
    providerId: String(formData.get("providerId") ?? ""),
    referralType: String(formData.get("referralType") ?? ""),
    referredToName: String(formData.get("referredToName") ?? ""),
    referredToSpecialty: String(formData.get("referredToSpecialty") ?? ""),
    referredToPhone: String(formData.get("referredToPhone") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    dueAt: String(formData.get("dueAt") ?? ""),
  });
  revalidatePath("/app/pms/documents");
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const [docs, patients, providers, prescriptions, referrals] = await Promise.all([listDocuments(), listPatients(), listProviders(), listPrescriptions(), listReferrals()]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS documents" title="Documents, prescriptions, and referrals" body="Manage patient forms, consents, EOBs, statements, prescription records, referrals, and signed clinical documents attached to the patient chart." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/documents" />
      <PmsSectionNav active="/app/pms/documents" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="grid gap-6">
          <PmsCard title="Add document" eyebrow="Chart attachment">
            <form action={createDocumentAction} className="grid gap-3">
              <PatientSelect patients={patients} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select name="documentType" label="Type" options={["INTAKE_FORM", "CONSENT", "MEDICAL_HISTORY", "INSURANCE_CARD", "EOB", "STATEMENT", "REFERRAL", "TREATMENT_PRESENTATION", "CLINICAL_PDF"]} />
                <Select name="signatureStatus" label="Signature" options={["NOT_REQUIRED", "REQUIRED", "SIGNED", "DECLINED"]} />
              </div>
              <Input name="title" label="Title" required />
              <Input name="storageUri" label="Storage URI" />
              <Input name="sourceModule" label="Source module" />
              <Input name="expiresAt" label="Expires" type="date" />
              <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Save document</button>
            </form>
          </PmsCard>

          <PmsCard title="Write prescription record" eyebrow="Medication order">
            <form action={createPrescriptionAction} className="grid gap-3">
              <PatientSelect patients={patients} />
              <ProviderSelect providers={providers} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="medicationName" label="Medication" required />
                <Input name="dosage" label="Dosage" />
                <Input name="quantity" label="Quantity" />
                <Input name="refills" label="Refills" type="number" />
              </div>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Directions<textarea name="directions" required rows={3} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="pharmacyName" label="Pharmacy" />
                <Input name="pharmacyPhone" label="Pharmacy phone" />
              </div>
              <Select name="status" label="Status" options={["DRAFT", "SIGNED", "SENT", "VOID"]} />
              <button disabled={!patients.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Save prescription</button>
            </form>
          </PmsCard>

          <PmsCard title="Create referral" eyebrow="Care coordination">
            <form action={createReferralAction} className="grid gap-3">
              <PatientSelect patients={patients} />
              <ProviderSelect providers={providers} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select name="referralType" label="Type" options={["SPECIALIST", "ORAL_SURGERY", "ENDO", "PERIO", "ORTHO", "MEDICAL", "HOSPITAL"]} />
                <Input name="referredToName" label="Referred to" required />
                <Input name="referredToSpecialty" label="Specialty" />
                <Input name="referredToPhone" label="Phone" />
                <Input name="dueAt" label="Due" type="date" />
                <Select name="status" label="Status" options={["DRAFT", "SENT", "SCHEDULED", "COMPLETED", "CANCELED"]} />
              </div>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Reason<textarea name="reason" required rows={3} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
              <button disabled={!patients.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Create referral</button>
            </form>
          </PmsCard>
        </div>

        <div className="grid gap-6">
          <PmsCard title="Document queue" eyebrow="Forms and PDFs">
            {docs.length ? (docs as DocumentRow[]).map((doc) => (
              <div key={doc.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{doc.title}</p>
                    <p className="mt-1 text-sm text-neutral-600">{doc.documentType.replaceAll("_", " ").toLowerCase()} · {doc.lastName ? `${doc.lastName}, ${doc.firstName} · ${doc.chartNumber}` : "practice document"}{doc.claimNumber ? ` · claim ${doc.claimNumber}` : ""}</p>
                  </div>
                  <StatusFor value={doc.status} />
                </div>
                <p className="mt-3 text-sm text-neutral-700">Signature: {doc.signatureStatus.replaceAll("_", " ").toLowerCase()} · source {doc.sourceModule ?? "PMS"}</p>
                <form action={updateDocumentAction} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="documentId" value={doc.id} />
                  {["RECEIVED", "REVIEWED", "NEEDS_SIGNATURE", "ARCHIVED"].map((status) => <button key={status} name="status" value={status} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100">{status.replaceAll("_", " ")}</button>)}
                </form>
              </div>
            )) : <EmptyPmsState title="No documents yet" body="Generated PDFs, imported forms, signed consents, treatment presentations, EOBs, referrals, and statements appear here once created." />}
          </PmsCard>

          <PmsCard title="Prescription register" eyebrow="Clinical medication records">
            {prescriptions.length ? (prescriptions as PrescriptionRow[]).map((rx) => (
              <div key={rx.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{rx.medicationName} {rx.dosage ?? ""}</p>
                    <p className="mt-1 text-sm text-neutral-600">{rx.lastName}, {rx.firstName} · {rx.chartNumber} · {rx.providerName ?? "provider unassigned"}</p>
                  </div>
                  <StatusFor value={rx.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{rx.directions}</p>
                <p className="mt-2 text-sm text-neutral-600">Pharmacy: {rx.pharmacyName ?? "not recorded"}</p>
              </div>
            )) : <EmptyPmsState title="No prescription records" body="Prescription records capture medication, directions, pharmacy, provider, status, and patient chart linkage." />}
          </PmsCard>

          <PmsCard title="Referral tracker" eyebrow="Specialist and emergency handoffs">
            {referrals.length ? (referrals as ReferralRow[]).map((referral) => (
              <div key={referral.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{referral.referredToName} · {referral.referralType.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-neutral-600">{referral.lastName}, {referral.firstName} · {referral.chartNumber} · {referral.referredToSpecialty ?? "specialty not recorded"}</p>
                  </div>
                  <StatusFor value={referral.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{referral.reason}</p>
              </div>
            )) : <EmptyPmsState title="No referrals yet" body="Referral records capture the destination provider, specialty, urgency, reason, status, and patient handoff history." />}
          </PmsCard>
        </div>
      </section>
    </FoundationShell>
  );
}

function PatientSelect({ patients }: { patients: Array<{ id: string; lastName: string; firstName: string; chartNumber: string }> }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>;
}

function ProviderSelect({ providers }: { providers: Array<{ id: string; displayName: string }> }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">Provider<select name="providerId" className="rounded-2xl border border-neutral-300 px-4 py-3"><option value="">Unassigned</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}</select></label>;
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>;
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<select name={name} className="rounded-2xl border border-neutral-300 px-4 py-3">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}
