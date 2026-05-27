import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { addClinicalNote, addClinicalNoteAddendum, addProcedureLog, addToothCondition, getChart, listProcedureCodes, signClinicalNote } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type ChartAlert = { id: string; title: string; details: string | null };
type ChartAllergy = { id: string; allergen: string; reaction: string | null };
type ChartMedication = { id: string; name: string; dosage: string | null };
type ChartProcedure = { id: string; code: string; description: string; tooth: string | null; status: string };
type ChartTreatmentPlan = { id: string; name: string; status: string; totalFeeCents: number; insuranceEstimateCents: number; patientEstimateCents: number; providerName: string | null; itemCount: number };
type ChartImagingStudy = { id: string; studyType: string; acquisitionStatus: string; tooth: string | null; region: string | null; findings: string | null; aiReviewStatus: string; providerName: string | null };
type ChartNote = {
  id: string;
  noteType: string;
  status: string;
  body: string;
  signedAt: string | null;
  signedByRole: string | null;
  addendumOfNoteId: string | null;
  addendumReason: string | null;
};
type ToothCondition = { id: string; tooth: string; surface: string | null; condition: string; status: string };

async function addNoteAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await addClinicalNote(patientId, String(formData.get("body") ?? ""), String(formData.get("noteType") ?? "PROGRESS"), session.tenantId, session.roleKey, {
    noteTemplateKey: String(formData.get("noteTemplateKey") ?? "chart_progress"),
    sourceModule: "chart",
    sourceRecordId: patientId,
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function signNoteAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await signClinicalNote({
    noteId: String(formData.get("noteId") ?? ""),
    tenantId: session.tenantId,
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addNoteAddendumAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await addClinicalNoteAddendum({
    noteId: String(formData.get("noteId") ?? ""),
    body: String(formData.get("body") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    tenantId: session.tenantId,
    actorRole: session.roleKey,
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addConditionAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await addToothCondition(patientId, {
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

async function addProcedureAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await addProcedureLog(patientId, {
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    procedureCodeId: String(formData.get("procedureCodeId") ?? ""),
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    feeCents: formData.get("fee") ? Math.round(Number(String(formData.get("fee")).replace(/[^0-9.-]/g, "") || "0") * 100) : undefined,
    status: String(formData.get("status") ?? "PLANNED"),
  });
  revalidatePath(`/app/pms/chart/${patientId}`);
}

export default async function ChartPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ role?: string }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const session = await requireAuth();
  const role = getRole(query.role);
  const [chart, procedureCodes] = await Promise.all([getChart(patientId, session.tenantId), listProcedureCodes(session.tenantId)]);
  const patient = chart.patient;
  const conditions = chart.conditions as ToothCondition[];
  const treatmentPlans = chart.treatmentPlans as ChartTreatmentPlan[];
  const imaging = chart.imaging as ChartImagingStudy[];
  const profile = chart.profile as { alerts: ChartAlert[]; allergies: ChartAllergy[]; medications: ChartMedication[]; medicalHistory: Array<{ category: string; condition: string; note: string | null }> } | null;

  if (!patient) {
    return <FoundationShell active="/app/pms/patients" roleKey={role.key}><PageHeader eyebrow="Chart" title="Patient not found" body="The requested chart is not available." /></FoundationShell>;
  }

  return (
    <FoundationShell active="/app/pms/patients" roleKey={role.key}>
      <PageHeader eyebrow={patient.chartNumber} title={`${patient.firstName} ${patient.lastName} clinical chart`} body="Dental charting workspace for odontogram findings, tooth/surface conditions, treatment-planned procedures, progress notes, medical alerts, and provider documentation." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={`/app/pms/chart/${patient.id}`} />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Patient demographics" eyebrow="Chart identity">
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <Detail label="Name" value={`${patient.lastName}, ${patient.firstName}${patient.preferredName ? ` (${patient.preferredName})` : ""}`} />
            <Detail label="Chart number" value={patient.chartNumber} />
            <Detail label="Date of birth" value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "Not recorded"} />
            <Detail label="Contact" value={[patient.phone ?? "No phone", patient.email ?? "No email"].join(" · ")} />
            <Detail label="Family account" value={patient.familyAccountId ?? "None"} />
            <Detail label="Responsible party" value={patient.responsibleParty ?? "Not recorded"} />
            <Detail label="Emergency contact" value={[patient.emergencyContactName, patient.emergencyContactPhone].filter(Boolean).join(" · ") || "Not recorded"} />
            <Detail label="Referral source" value={patient.referralSource ?? "Not recorded"} />
          </div>
        </PmsCard>

        <PmsCard title="Clinical spine" eyebrow="Treatment and imaging">
          <div className="grid gap-3 md:grid-cols-2">
            <MiniMetric label="Treatment plans" value={treatmentPlans.length} detail={`${treatmentPlans.filter((plan) => ["DRAFT", "PRESENTED", "ACCEPTED"].includes(plan.status)).length} active/presented`} />
            <MiniMetric label="Imaging studies" value={imaging.length} detail="Patient-linked studies" />
            <MiniMetric label="Family members" value={((chart.familyMembers as Array<unknown>) || []).length} detail="Same family account" />
            <MiniMetric label="Medical history" value={profile?.medicalHistory.length ?? 0} detail="System medical history entries" />
          </div>
        </PmsCard>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <PmsCard title="Odontogram" eyebrow="Tooth and surface charting">
          <div className="grid min-w-0 grid-cols-4 gap-2 sm:grid-cols-8">
            {toothNumbers.map((tooth) => {
              const toothConditions = conditions.filter((item) => item.tooth === String(tooth));
              return (
                <div key={tooth} className={`min-h-20 min-w-0 rounded-md border p-2 ${toothConditions.length ? "border-cyan-300 bg-cyan-50" : "border-neutral-200 bg-neutral-50"}`}>
                  <p className="text-sm font-semibold text-neutral-950">{tooth}</p>
                  <div className="mt-2 space-y-1">
                    {toothConditions.slice(0, 3).map((item) => (
                      <p key={item.id} className="truncate rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-neutral-700">{item.surface ?? "all"} · {item.condition}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PmsCard>

        <PmsCard title="Clinical alerts and history" eyebrow="Chairside readiness">
          <ClinicalList title="Alerts" items={(profile?.alerts ?? chart.alerts as ChartAlert[]).map((item) => `${item.title}${item.details ? `: ${item.details}` : ""}`)} />
          <ClinicalList title="Allergies" items={(profile?.allergies ?? chart.allergies as ChartAllergy[]).map((item) => `${item.allergen}${item.reaction ? `: ${item.reaction}` : ""}`)} />
          <ClinicalList title="Medications" items={(profile?.medications ?? chart.medications as ChartMedication[]).map((item) => `${item.name}${item.dosage ? ` ${item.dosage}` : ""}`)} />
          <ClinicalList title="Medical history" items={(profile?.medicalHistory ?? []).map((item) => `${item.category} · ${item.condition}${item.note ? `: ${item.note}` : ""}`)} />
        </PmsCard>
      </section>

      <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
        <PmsCard title="Add tooth condition" eyebrow="Diagnosis">
          <form action={addConditionAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input name="tooth" label="Tooth" required />
              <Input name="surface" label="Surface" />
            </div>
            <Input name="condition" label="Condition" required />
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">Status<select name="status" className={controlClass}><option>ACTIVE</option><option>WATCH</option><option>RESOLVED</option></select></label>
            <button className={buttonClass}>Save condition</button>
          </form>
        </PmsCard>

        <PmsCard title="Add procedure" eyebrow="Procedure log">
          <form action={addProcedureAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">Procedure<select name="procedureCodeId" required className={controlClass}>{procedureCodes.map((code) => <option key={code.id} value={code.id}>{code.code} · {code.description}</option>)}</select></label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Input name="tooth" label="Tooth" />
              <Input name="surface" label="Surface" />
              <Input name="fee" label="Fee override" placeholder="0.00" />
              <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">Status<select name="status" className={controlClass}><option>PROPOSED</option><option>ACCEPTED</option><option>PLANNED</option><option>IN_PROGRESS</option><option>COMPLETED</option><option>BILLED</option></select></label>
            </div>
            <button className={buttonClass}>Save procedure</button>
          </form>
        </PmsCard>

        <PmsCard title="New clinical note" eyebrow="Provider documentation">
          <form action={addNoteAction} className="grid min-w-0 gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
              Note type
              <select name="noteType" className={controlClass}>
                <option value="PROGRESS">Progress</option>
                <option value="EXAM">Exam</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="PHONE">Phone note</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
              Template
              <select name="noteTemplateKey" className={controlClass}>
                <option value="chart_progress">Chart progress</option>
                <option value="doctor_exam">Doctor exam</option>
                <option value="staff_note">Staff note</option>
                <option value="rdh_note">RDH note</option>
                <option value="clinical_ai_review">Clinical AI review</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
              Note
              <textarea name="body" required rows={8} className={controlClass} />
            </label>
            <button className={buttonClass}>Save note</button>
          </form>
        </PmsCard>
      </section>

      <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
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
                <div>
                  <p className="font-semibold text-neutral-950">{note.noteType}</p>
                  {note.addendumOfNoteId ? <p className="mt-1 text-xs text-neutral-500">Addendum to {note.addendumOfNoteId}</p> : null}
                </div>
                <StatusFor value={note.status} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{note.body}</p>
              {note.signedAt ? <p className="mt-2 text-xs font-semibold text-emerald-700">Signed by {note.signedByRole ?? "provider"} on {new Date(note.signedAt).toLocaleString()}</p> : null}
              {note.addendumReason ? <p className="mt-2 text-xs text-neutral-500">Reason: {note.addendumReason}</p> : null}
              {note.status === "DRAFT" ? (
                <form action={signNoteAction} className="mt-3">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="noteId" value={note.id} />
                  <button className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Sign and lock note</button>
                </form>
              ) : null}
              {note.status === "SIGNED" && !note.addendumOfNoteId ? (
                <form action={addNoteAddendumAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="patientId" value={patient.id} />
                  <input type="hidden" name="noteId" value={note.id} />
                  <input name="reason" required placeholder="Addendum reason" className={controlClass} />
                  <textarea name="body" required rows={3} placeholder="Signed addendum text" className={controlClass} />
                  <button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800">Add signed addendum</button>
                </form>
              ) : null}
            </div>
          )) : <EmptyPmsState title="No clinical notes yet" body="Use the note panel to record chairside documentation. Notes persist to the chart immediately." />}
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Treatment plans" eyebrow="Active cases">
          {treatmentPlans.length ? treatmentPlans.map((plan) => (
            <div key={plan.id} className="mb-3 rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{plan.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">{plan.providerName ?? "Provider unassigned"} · {plan.itemCount} item{plan.itemCount === 1 ? "" : "s"}</p>
                </div>
                <StatusFor value={plan.status} />
              </div>
              <p className="mt-2 text-sm text-neutral-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(plan.totalFeeCents / 100)} total · {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(plan.insuranceEstimateCents / 100)} insurance est. · {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(plan.patientEstimateCents / 100)} patient est.</p>
            </div>
          )) : <EmptyPmsState title="No treatment plans" body="Accepted or draft plans for this patient will appear here." />}
        </PmsCard>

        <PmsCard title="Imaging studies" eyebrow="Clinical images">
          {imaging.length ? imaging.map((study) => (
            <div key={study.id} className="mb-3 rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{study.studyType.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-neutral-500">{study.tooth ? `Tooth ${study.tooth}` : study.region ?? "Region not recorded"} · {study.providerName ?? "Provider unassigned"}</p>
                </div>
                <StatusFor value={study.acquisitionStatus} />
              </div>
              <p className="mt-2 text-sm text-neutral-700">AI review: {study.aiReviewStatus.replaceAll("_", " ").toLowerCase()}</p>
              {study.findings ? <p className="mt-1 text-sm text-neutral-600">{study.findings}</p> : null}
            </div>
          )) : <EmptyPmsState title="No imaging studies" body="Ordered, acquired, and reviewed imaging records will appear here." />}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-600">{detail}</p>
    </div>
  );
}

function Input({ label, name, required = false, placeholder = "", type = "text" }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} required={required} placeholder={placeholder} type={type} className={controlClass} />
    </label>
  );
}

const controlClass = "min-w-0 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const buttonClass = "w-full rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800";

const toothNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];
