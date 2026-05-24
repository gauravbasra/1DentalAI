import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createLabCase, listLabCases, listPatients, updateLabCaseStatus } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type LabRow = {
  id: string;
  chartNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  labName: string;
  caseType: string;
  status: string;
  dueDate: string | null;
  trackingNumber: string | null;
  shade: string | null;
  notes: string | null;
};

async function createLabAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createLabCase({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    labName: String(formData.get("labName") ?? ""),
    caseType: String(formData.get("caseType") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    trackingNumber: String(formData.get("trackingNumber") ?? ""),
    shade: String(formData.get("shade") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/app/pms/labs");
  revalidatePath("/app/pms/schedule");
}

async function updateStatusAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updateLabCaseStatus(String(formData.get("labCaseId") ?? ""), String(formData.get("status") ?? "ORDERED"), session.roleKey, session.tenantId);
  revalidatePath("/app/pms/labs");
  revalidatePath("/app/pms/schedule");
}

export default async function LabsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [labs, patients] = await Promise.all([listLabCases(session.tenantId), listPatients(session.tenantId)]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS labs" title="Lab case tracking" body="Order, track, receive, and reconcile crowns, aligners, appliances, surgical guides, and outside lab cases before the appointment day." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/labs" />
      <PmsSectionNav active="/app/pms/labs" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Create lab case" eyebrow="Assistant workflow">
          <form action={createLabAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" className="rounded-2xl border border-neutral-300 px-4 py-3"><option value="">No patient selected</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
            <Input name="labName" label="Lab name" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="caseType" label="Case type" options={["CROWN", "BRIDGE", "IMPLANT", "ALIGNER", "NIGHT_GUARD", "DENTURE", "SURGICAL_GUIDE"]} />
              <Input name="dueDate" label="Due date" type="date" />
              <Input name="trackingNumber" label="Tracking number" />
              <Input name="shade" label="Shade" />
            </div>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Notes<textarea name="notes" rows={4} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Create lab case</button>
          </form>
        </PmsCard>

        <PmsCard title="Lab case board" eyebrow="Due dates and delivery risk">
          {labs.length ? (labs as LabRow[]).map((lab) => (
            <div key={lab.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-neutral-950">{lab.caseType.replaceAll("_", " ")} · {lab.labName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{lab.lastName ? `${lab.lastName}, ${lab.firstName} · ${lab.chartNumber}` : "practice case"} · due {lab.dueDate ? new Date(lab.dueDate).toLocaleDateString() : "not set"}</p>
                </div>
                <StatusFor value={lab.status} />
              </div>
              <p className="mt-3 text-sm text-neutral-700">Tracking {lab.trackingNumber ?? "not recorded"} · shade {lab.shade ?? "not recorded"}</p>
              {lab.notes ? <p className="mt-2 text-sm leading-6 text-neutral-600">{lab.notes}</p> : null}
              <form action={updateStatusAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="labCaseId" value={lab.id} />
                {["ORDERED", "IN_TRANSIT", "RECEIVED", "DELIVERED", "REMAKE_REQUIRED"].map((status) => (
                  <button key={status} name="status" value={status} className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100">{status.replaceAll("_", " ")}</button>
                ))}
              </form>
            </div>
          )) : <EmptyPmsState title="No lab cases yet" body="Create lab cases for work that must arrive before delivery appointments. Status updates persist and surface on schedule readiness." />}
        </PmsCard>
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
