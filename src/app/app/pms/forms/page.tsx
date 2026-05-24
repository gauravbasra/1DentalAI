import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  assignFormToPatient,
  getFormsWorkbench,
  recordFormResponse,
  reviewProfileChangeRequest,
} from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type TemplateRow = {
  id: string;
  name: string;
  formType: string;
  version: number;
  status: string;
  description: string | null;
  fieldCount: number;
};

type FieldRow = {
  id: string;
  templateId: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  options: string[] | null;
  displayOrder: number;
  helpText: string | null;
  targetModel: string | null;
  targetField: string | null;
};

type AssignmentRow = {
  id: string;
  patientId: string;
  templateId: string;
  status: string;
  dueAt: Date | string | null;
  templateName: string;
  formType: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  pendingChanges: number;
};

type ChangeRow = {
  id: string;
  status: string;
  targetModel: string;
  targetField: string;
  currentValue: string | null;
  proposedValue: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
};

type PatientRow = { id: string; firstName: string; lastName: string; chartNumber: string };

async function assignAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await assignFormToPatient({
    tenantId: session.tenantId,
    patientId: String(formData.get("patientId") ?? ""),
    templateId: String(formData.get("templateId") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
    assignedByRole: session.roleKey,
  });
  revalidatePath("/app/pms/forms");
}

async function responseAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("answer_")) {
      answers[key.replace("answer_", "")] = String(value ?? "");
    }
  }
  await recordFormResponse({
    tenantId: session.tenantId,
    assignmentId: String(formData.get("assignmentId") ?? ""),
    submittedByName: String(formData.get("submittedByName") ?? ""),
    signatureName: String(formData.get("signatureName") ?? ""),
    submittedByType: "STAFF_KIOSK",
    answers,
    actorRole: session.roleKey,
  });
  revalidatePath("/app/pms/forms");
}

async function reviewAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await reviewProfileChangeRequest({
    tenantId: session.tenantId,
    changeId: String(formData.get("changeId") ?? ""),
    decision: String(formData.get("decision") ?? "REJECTED") as "ACCEPTED" | "REJECTED",
    reviewNote: String(formData.get("reviewNote") ?? ""),
    reviewedByRole: session.roleKey,
  });
  revalidatePath("/app/pms/forms");
  revalidatePath("/app/pms/patients");
}

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const workbench = await getFormsWorkbench(session.tenantId);
  const templates = workbench.templates as TemplateRow[];
  const fields = workbench.fields as FieldRow[];
  const assignments = workbench.assignments as AssignmentRow[];
  const changes = workbench.changes as ChangeRow[];
  const patients = workbench.patients as PatientRow[];
  const assigned = assignments.filter((assignment) => assignment.status === "ASSIGNED");
  const pendingChanges = changes.filter((change) => change.status === "PENDING");

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="PMS forms foundation"
        title="Intake forms and profile review"
        body="Assign form packets, capture kiosk responses, review patient-reported changes field by field, and accept only the changes that should update the canonical PMS record."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/forms" />
      <PmsSectionNav active="/app/pms/forms" roleKey={role.key} />

      <section className="grid min-w-0 gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Assign form packet" eyebrow="No external send until connector is live">
          <form action={assignAction} className="grid min-w-0 gap-3">
            <Select name="patientId" label="Patient" options={patients.map((patient) => ({ value: patient.id, label: `${patient.lastName}, ${patient.firstName} · ${patient.chartNumber}` }))} />
            <Select name="templateId" label="Template" options={templates.map((template) => ({ value: template.id, label: `${template.name} v${template.version}` }))} />
            <Input name="dueAt" label="Due at" type="datetime-local" />
            <button disabled={!patients.length || !templates.length} className={buttonClass}>Assign packet</button>
          </form>
          <div className="mt-4 grid gap-2">
            {templates.map((template) => (
              <div key={template.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{template.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{template.formType.replaceAll("_", " ")} · {template.fieldCount} fields</p>
                  </div>
                  <StatusFor value={template.status} />
                </div>
                {template.description ? <p className="mt-2 text-xs leading-5 text-neutral-600">{template.description}</p> : null}
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Pending profile changes" eyebrow="Staff review before profile update">
          {pendingChanges.length ? (
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Current</th>
                    <th className="px-3 py-2">Proposed</th>
                    <th className="px-3 py-2">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pendingChanges.map((change) => (
                    <tr key={change.id} className="align-top">
                      <td className="px-3 py-2 font-semibold text-neutral-950">{change.lastName}, {change.firstName}<p className="text-xs font-medium text-neutral-500">{change.chartNumber}</p></td>
                      <td className="px-3 py-2 text-xs text-neutral-600">{change.targetModel}<p className="font-semibold text-neutral-800">{change.targetField}</p></td>
                      <td className="max-w-56 px-3 py-2 text-xs text-neutral-600">{change.currentValue || "blank"}</td>
                      <td className="max-w-64 px-3 py-2 text-xs font-semibold text-neutral-950">{change.proposedValue}</td>
                      <td className="px-3 py-2">
                        <div className="grid min-w-40 gap-2">
                          <ReviewButton changeId={change.id} decision="ACCEPTED" label="Accept update" />
                          <ReviewButton changeId={change.id} decision="REJECTED" label="Reject" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPmsState title="No pending profile changes" body="Submitted forms create reviewable field changes. Accepted changes update patient, communication, allergy, consent, or medical-history records with audit." />
          )}
        </PmsCard>
      </section>

      <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
        {assigned.length ? assigned.map((assignment) => {
          const assignmentFields = fields.filter((field) => field.templateId === assignment.templateId);
          return (
            <PmsCard key={assignment.id} title={`Capture response: ${assignment.templateName}`} eyebrow={`${assignment.lastName}, ${assignment.firstName} · ${assignment.chartNumber}`}>
              <form action={responseAction} className="grid min-w-0 gap-3">
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <Input name="submittedByName" label="Completed by" defaultValue={`${assignment.firstName} ${assignment.lastName}`} />
                  <Input name="signatureName" label="Signature name" defaultValue={`${assignment.firstName} ${assignment.lastName}`} />
                </div>
                <div className="grid min-w-0 gap-3">
                  {assignmentFields.map((field) => <FormField key={field.id} field={field} />)}
                </div>
                <button className={buttonClass}>Record response for review</button>
              </form>
            </PmsCard>
          );
        }) : (
          <PmsCard title="No assigned packets" eyebrow="Kiosk capture">
            <EmptyPmsState title="No active assignments" body="Assign a packet to a patient. The response capture form appears here and submitted answers become field-level profile-change requests." />
          </PmsCard>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Assignment queue</p>
          <h2 className="mt-0.5 text-base font-semibold text-neutral-950">Form packet status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
              <tr>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Packet</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Pending changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-4 py-3 font-semibold text-neutral-950">{assignment.lastName}, {assignment.firstName}<p className="text-xs font-medium text-neutral-500">{assignment.chartNumber}</p></td>
                  <td className="px-4 py-3 text-neutral-700">{assignment.templateName}<p className="text-xs text-neutral-500">{assignment.formType.replaceAll("_", " ")}</p></td>
                  <td className="px-4 py-3 text-neutral-700">{assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : "not set"}</td>
                  <td className="px-4 py-3"><StatusFor value={assignment.status} /></td>
                  <td className="px-4 py-3 text-neutral-700">{assignment.pendingChanges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FoundationShell>
  );
}

function FormField({ field }: { field: FieldRow }) {
  const name = `answer_${field.fieldKey}`;
  const label = `${field.label}${field.required ? " *" : ""}`;
  if (field.fieldType === "TEXTAREA") {
    return <Textarea name={name} label={label} required={field.required} />;
  }
  if (field.fieldType === "SELECT") {
    const options = Array.isArray(field.options) ? field.options : [];
    return <Select name={name} label={label} options={options.map((option) => ({ value: option, label: option.replaceAll("_", " ") }))} required={field.required} />;
  }
  const type = field.fieldType === "EMAIL" ? "email" : field.fieldType === "PHONE" ? "tel" : "text";
  return <Input name={name} label={label} type={type} required={field.required} />;
}

function ReviewButton({ changeId, decision, label }: { changeId: string; decision: "ACCEPTED" | "REJECTED"; label: string }) {
  return (
    <form action={reviewAction}>
      <input type="hidden" name="changeId" value={changeId} />
      <input type="hidden" name="decision" value={decision} />
      <button className={decision === "ACCEPTED" ? buttonClass : secondaryButtonClass}>{label}</button>
    </form>
  );
}

function Input({ label, name, type = "text", defaultValue = "", required = false }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required={required} className={controlClass} />
    </label>
  );
}

function Textarea({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-neutral-700">
      {label}
      <textarea name={name} rows={3} required={required} className={controlClass} />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-neutral-700">
      {label}
      <select name={name} defaultValue={defaultValue} required={required} className={controlClass}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

const controlClass = "min-w-0 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const buttonClass = "w-full rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300";
const secondaryButtonClass = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50";
