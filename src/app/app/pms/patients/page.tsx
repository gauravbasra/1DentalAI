import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createPatient, listPatients } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

async function createPatientAction(formData: FormData) {
  "use server";
  await createPatient({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
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
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const patients = await listPatients(undefined, params.q ?? "");

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS family module" title="Patients and family accounts" body="Create the patient and the guarantor/account record together, then work from the same family, chart, insurance, ledger, recall, treatment, and document context." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/patients" />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

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
