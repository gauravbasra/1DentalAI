import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { addClinicalNote, addProcedureLog, addToothCondition, getChart, listProcedureCodes } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type ChartAlert = { id: string; title: string; details: string | null };
type ChartAllergy = { id: string; allergen: string; reaction: string | null };
type ChartMedication = { id: string; name: string; dosage: string | null };
type ChartProcedure = { id: string; code: string; description: string; tooth: string | null; status: string };
type ChartNote = { id: string; noteType: string; status: string; body: string };
type ToothCondition = { id: string; tooth: string; surface: string | null; condition: string; status: string };

async function addNoteAction(formData: FormData) {
  "use server";
  const patientId = String(formData.get("patientId"));
  await addClinicalNote(patientId, String(formData.get("body") ?? ""), String(formData.get("noteType") ?? "PROGRESS"));
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addConditionAction(formData: FormData) {
  "use server";
  const patientId = String(formData.get("patientId"));
  await addToothCondition(patientId, {
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addProcedureAction(formData: FormData) {
  "use server";
  const patientId = String(formData.get("patientId"));
  await addProcedureLog(patientId, {
    procedureCodeId: String(formData.get("procedureCodeId") ?? ""),
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    status: String(formData.get("status") ?? "TREATMENT_PLANNED"),
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

export default async function ChartPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ role?: string }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const role = getRole(query.role);
  const [chart, procedureCodes] = await Promise.all([getChart(patientId), listProcedureCodes()]);
  const patient = chart.patient;
  const conditions = chart.conditions as ToothCondition[];

  if (!patient) {
    return <FoundationShell active="/app/pms" roleKey={role.key}><PageHeader eyebrow="Chart" title="Patient not found" body="The requested chart is not available." /></FoundationShell>;
  }

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow={patient.chartNumber} title={`${patient.firstName} ${patient.lastName} clinical chart`} body="Dental charting workspace for odontogram findings, tooth/surface conditions, treatment-planned procedures, progress notes, medical alerts, and provider documentation." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={`/app/pms/chart/${patient.id}`} />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <PmsCard title="Odontogram" eyebrow="Tooth and surface charting">
          <div className="grid grid-cols-8 gap-2">
            {toothNumbers.map((tooth) => {
              const toothConditions = conditions.filter((item) => item.tooth === String(tooth));
              return (
                <div key={tooth} className={`min-h-24 rounded-2xl border p-2 ${toothConditions.length ? "border-cyan-300 bg-cyan-50" : "border-neutral-200 bg-neutral-50"}`}>
                  <p className="text-sm font-semibold text-neutral-950">{tooth}</p>
                  <div className="mt-2 space-y-1">
                    {toothConditions.slice(0, 3).map((item) => (
                      <p key={item.id} className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700">{item.surface ?? "all"} · {item.condition}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PmsCard>

        <PmsCard title="Clinical alerts and history" eyebrow="Chairside readiness">
          <ClinicalList title="Alerts" items={(chart.alerts as ChartAlert[]).map((item) => `${item.title}${item.details ? `: ${item.details}` : ""}`)} />
          <ClinicalList title="Allergies" items={(chart.allergies as ChartAllergy[]).map((item) => `${item.allergen}${item.reaction ? `: ${item.reaction}` : ""}`)} />
          <ClinicalList title="Medications" items={(chart.medications as ChartMedication[]).map((item) => `${item.name}${item.dosage ? ` ${item.dosage}` : ""}`)} />
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <PmsCard title="Add tooth condition" eyebrow="Diagnosis">
          <form action={addConditionAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <div className="grid grid-cols-2 gap-3">
              <Input name="tooth" label="Tooth" required />
              <Input name="surface" label="Surface" />
            </div>
            <Input name="condition" label="Condition" required />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Status<select name="status" className="rounded-2xl border border-neutral-300 px-4 py-3"><option>ACTIVE</option><option>WATCH</option><option>RESOLVED</option></select></label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Save condition</button>
          </form>
        </PmsCard>

        <PmsCard title="Add procedure" eyebrow="Procedure log">
          <form action={addProcedureAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Procedure<select name="procedureCodeId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{procedureCodes.map((code) => <option key={code.id} value={code.id}>{code.code} · {code.description}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <Input name="tooth" label="Tooth" />
              <Input name="surface" label="Surface" />
            </div>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Status<select name="status" className="rounded-2xl border border-neutral-300 px-4 py-3"><option>TREATMENT_PLANNED</option><option>REFERRED</option><option>COMPLETED</option><option>EXISTING_OTHER</option></select></label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Save procedure</button>
          </form>
        </PmsCard>

        <PmsCard title="New clinical note" eyebrow="Provider documentation">
          <form action={addNoteAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Note type
              <select name="noteType" className="rounded-2xl border border-neutral-300 px-4 py-3">
                <option value="PROGRESS">Progress</option>
                <option value="EXAM">Exam</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="PHONE">Phone note</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Note
              <textarea name="body" required rows={8} className="rounded-2xl border border-neutral-300 px-4 py-3" />
            </label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Save note</button>
          </form>
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <PmsCard title="Procedure history" eyebrow="Clinical ledger">
          {chart.procedures.length ? (chart.procedures as ChartProcedure[]).map((proc) => (
            <div key={proc.id} className="mb-3 rounded-2xl bg-neutral-50 p-4">
              <p className="font-semibold text-neutral-950">{proc.code} · {proc.description}</p>
              <p className="mt-1 text-sm text-neutral-600">{proc.tooth ?? "no tooth"} · {proc.status}</p>
            </div>
          )) : <EmptyPmsState title="No procedures recorded" body="Completed and planned procedures will appear here as providers chart treatment." />}
        </PmsCard>
        <PmsCard title="Notes" eyebrow="Documentation timeline">
          {chart.notes.length ? (chart.notes as ChartNote[]).map((note) => (
            <div key={note.id} className="mb-3 rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-neutral-950">{note.noteType}</p>
                <StatusFor value={note.status} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{note.body}</p>
            </div>
          )) : <EmptyPmsState title="No clinical notes yet" body="Use the note panel to record chairside documentation. Notes persist to the chart immediately." />}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function ClinicalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-5">
      <p className="font-semibold text-neutral-950">{title}</p>
      {items.length ? (
        <div className="mt-2 space-y-2">{items.map((item) => <p key={item} className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">{item}</p>)}</div>
      ) : <p className="mt-2 rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-500">None recorded</p>}
    </div>
  );
}

function Input({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} required={required} className="rounded-2xl border border-neutral-300 px-4 py-3" />
    </label>
  );
}

const toothNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];
