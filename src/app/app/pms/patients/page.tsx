import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createPatient, listPatients, PatientDuplicateError } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

async function createPatientAction(formData: FormData) {
  "use server";
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  if (!firstName || !lastName) {
    redirect("/app/pms/patients?error=First%20name%20and%20last%20name%20are%20required.");
  }

  try {
    const patient = await createPatient({
      firstName,
      lastName,
      preferredName: String(formData.get("preferredName") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? "") || undefined,
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      sex: String(formData.get("sex") ?? ""),
      responsibleParty: String(formData.get("responsibleParty") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      addressLine2: String(formData.get("addressLine2") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      referralSource: String(formData.get("referralSource") ?? ""),
    });
    revalidatePath("/app/pms");
    revalidatePath("/app/pms/patients");
    redirect(`/app/pms/patients?created=${encodeURIComponent(patient.id)}&q=${encodeURIComponent(patient.chartNumber)}`);
  } catch (error) {
    if (error instanceof PatientDuplicateError) {
      const duplicate = error.existingPatient;
      redirect(
        `/app/pms/patients?duplicatePatientId=${encodeURIComponent(duplicate.id)}&duplicateChartNumber=${encodeURIComponent(duplicate.chartNumber)}&duplicateFirstName=${encodeURIComponent(duplicate.firstName)}&duplicateLastName=${encodeURIComponent(duplicate.lastName)}&duplicateMatchType=${encodeURIComponent(duplicate.matchType)}`,
      );
    }
    throw error;
  }
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string;
    q?: string;
    created?: string;
    error?: string;
    duplicatePatientId?: string;
    duplicateChartNumber?: string;
    duplicateFirstName?: string;
    duplicateLastName?: string;
    duplicateMatchType?: string;
  }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const patients = await listPatients(undefined, params.q ?? "");
  const createdPatient = params.created ? patients.find((patient) => patient.id === params.created) : null;

  return (
    <FoundationShell active="/app/pms/patients" roleKey={role.key}>
      <PageHeader eyebrow="PMS family module" title="Patients and family accounts" body="Create the patient and the guarantor/account record together, then work from the same family, chart, insurance, ledger, recall, treatment, and document context." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/patients" />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

      {params.error ? <Banner tone="error" title="Patient intake did not save" body={params.error} /> : null}
      {params.duplicatePatientId ? (
        <Banner
          tone="error"
          title="Duplicate patient blocked"
          body={`A matching active patient already exists: ${params.duplicateLastName}, ${params.duplicateFirstName} (${params.duplicateChartNumber}). Match type: ${String(params.duplicateMatchType ?? "unknown").toLowerCase()}.`}
          linkHref={`/app/pms/patients/${params.duplicatePatientId}?role=${role.key}`}
          linkLabel="Open existing patient"
        />
      ) : null}
      {params.created ? <Banner tone="success" title="Patient created" body={createdPatient ? `${createdPatient.lastName}, ${createdPatient.firstName} (${createdPatient.chartNumber}) is now visible in the directory.` : "The new patient record is now visible in the directory."} /> : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <PmsCard title="Create patient and family account" eyebrow="Front desk intake">
          <form action={createPatientAction} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="firstName" label="First name" required />
              <Input name="lastName" label="Last name" required />
              <Input name="preferredName" label="Preferred name" />
              <Input name="dateOfBirth" label="Date of birth" type="date" />
              <Input name="sex" label="Sex" />
              <Input name="responsibleParty" label="Responsible party" />
              <Input name="phone" label="Phone" />
              <Input name="email" label="Email" type="email" />
              <Input name="addressLine1" label="Address line 1" />
              <Input name="addressLine2" label="Address line 2" />
              <Input name="city" label="City" />
              <Input name="state" label="State" />
              <Input name="postalCode" label="ZIP" />
              <Input name="referralSource" label="Referral source" />
            </div>
            <button className="mt-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Create family account</button>
          </form>
        </PmsCard>

        <PmsCard title="Patient directory" eyebrow="Clinical and admin search">
          <form action="/app/pms/patients" method="get" className="mb-4 grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <input type="hidden" name="role" value={role.key} />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700 sm:col-span-1">
              Search patients
              <input name="q" defaultValue={params.q ?? ""} placeholder="First name, last name, chart number, or phone" className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-950 outline-none focus:border-cyan-600" />
            </label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Search</button>
            {params.q ? <Link href={`/app/pms/patients?role=${role.key}`} className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-700">Clear</Link> : null}
          </form>
          {params.q ? <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">Showing matches for “{params.q}”</p> : null}
          {patients.length ? (
            <div className="overflow-hidden rounded-3xl border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Chart</th>
                    <th className="px-4 py-3">Family</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="bg-white align-top">
                      <td className="px-4 py-3">
                        <Link href={`/app/pms/patients/${patient.id}?role=${role.key}`} className="font-semibold text-neutral-950 hover:text-cyan-700">
                          {patient.lastName}, {patient.firstName}
                        </Link>
                        <p className="mt-1 text-xs text-neutral-500">{patient.openTasks} open tasks</p>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{patient.chartNumber}</td>
                      <td className="px-4 py-3 text-neutral-700">{patient.responsibleParty ?? "not set"}</td>
                      <td className="px-4 py-3 text-neutral-700">{patient.phone ?? patient.email ?? "not recorded"}</td>
                      <td className="px-4 py-3 text-neutral-700"><Money cents={patient.balanceCents} /></td>
                      <td className="px-4 py-3"><StatusFor value={patient.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPmsState title="No matching patients" body="Create the first patient record from the intake panel. The record will persist in Postgres and appear across PMS work areas immediately." />
          )}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} required={required} className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-950 outline-none focus:border-cyan-600" />
    </label>
  );
}

function Banner({
  tone,
  title,
  body,
  linkHref,
  linkLabel,
}: {
  tone: "success" | "error";
  title: string;
  body: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  const styles = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900";
  return (
    <div className={`mb-6 rounded-2xl border px-4 py-3 ${styles}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{body}</p>
      {linkHref && linkLabel ? (
        <Link href={linkHref} className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-950 shadow-sm">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
