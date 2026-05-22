import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import {
  getFormBuilderWorkbench,
  submitCustomForm,
  updateBookingWorkflow,
  upsertCustomFormDefinition,
  type CustomFormDefinitionRow,
  type CustomFormFieldRow,
  type CustomFormSubmissionRow,
} from "@/lib/form-builder-repository";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ saved?: string; error?: string }>;
type BookingLinkRow = {
  id: string;
  slug: string;
  title: string;
  workflowKey: string | null;
  workflowName: string | null;
  workflowScreenSchema: unknown;
  customFormDefinitionIds: string[] | null;
  bookingMode: string | null;
  patientIdentityPolicy: string | null;
  status: string;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checked(formData: FormData, key: string) {
  return value(formData, key) === "true" || formData.get(key) === "on";
}

function selectedValues(formData: FormData, key: string) {
  return formData.getAll(key).map((item) => String(item)).filter(Boolean);
}

async function formDefinitionAction(formData: FormData) {
  "use server";
  try {
    await upsertCustomFormDefinition({
      id: value(formData, "id") || undefined,
      name: value(formData, "name"),
      formKey: value(formData, "formKey"),
      formType: value(formData, "formType"),
      status: value(formData, "status"),
      description: value(formData, "description"),
      workflowUse: value(formData, "workflowUse"),
      visibility: value(formData, "visibility"),
      requiresSignature: checked(formData, "requiresSignature"),
      allowAnonymous: value(formData, "allowAnonymous") !== "false",
      successMessage: value(formData, "successMessage"),
      fieldLines: value(formData, "fieldLines"),
      actorRole: "practice_manager",
    });
  } catch (error) {
    redirect(`/patient-engagement/forms?error=${encodeURIComponent(error instanceof Error ? error.message : "Form could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/forms");
  redirect("/patient-engagement/forms?saved=form");
}

async function workflowAction(formData: FormData) {
  "use server";
  try {
    await updateBookingWorkflow({
      linkId: value(formData, "linkId"),
      workflowKey: value(formData, "workflowKey"),
      workflowName: value(formData, "workflowName"),
      bookingMode: value(formData, "bookingMode"),
      patientIdentityPolicy: value(formData, "patientIdentityPolicy"),
      customFormDefinitionIds: selectedValues(formData, "customFormDefinitionIds"),
      screenKeys: selectedValues(formData, "screenKeys"),
      screenTheme: {
        tone: value(formData, "tone"),
        layout: value(formData, "layout"),
        showProgress: checked(formData, "showProgress"),
      },
      actorRole: "practice_manager",
    });
  } catch (error) {
    redirect(`/patient-engagement/forms?error=${encodeURIComponent(error instanceof Error ? error.message : "Booking workflow could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/forms");
  redirect("/patient-engagement/forms?saved=workflow");
}

async function sampleSubmissionAction(formData: FormData) {
  "use server";
  const answers: Record<string, string> = {};
  for (const [key, item] of formData.entries()) {
    if (key.startsWith("answer_")) answers[key.replace("answer_", "")] = String(item);
  }
  try {
    await submitCustomForm({
      formDefinitionId: value(formData, "formDefinitionId"),
      sourceChannel: "STAFF_TEST",
      submittedByName: value(formData, "submittedByName"),
      submittedByEmail: value(formData, "submittedByEmail"),
      submittedByPhone: value(formData, "submittedByPhone"),
      signatureName: value(formData, "signatureName"),
      answers,
    });
  } catch (error) {
    redirect(`/patient-engagement/forms?error=${encodeURIComponent(error instanceof Error ? error.message : "Form submission could not be saved.")}`);
  }
  revalidatePath("/patient-engagement/forms");
  redirect("/patient-engagement/forms?saved=submission");
}

export default async function PatientEngagementFormsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const workbench = await getFormBuilderWorkbench();
  const forms = workbench.forms as CustomFormDefinitionRow[];
  const fields = workbench.fields as CustomFormFieldRow[];
  const submissions = workbench.submissions as CustomFormSubmissionRow[];
  const bookingLinks = workbench.bookingLinks as BookingLinkRow[];
  const templates = workbench.workflowTemplates;
  const firstActiveForm = forms.find((form) => form.status === "ACTIVE") ?? forms[0];
  const firstFields = firstActiveForm ? fields.filter((field) => field.formDefinitionId === firstActiveForm.id) : [];

  return (
    <PatientEngagementShell active="/patient-engagement/forms">
      <ProductPageTitle
        eyebrow="Forms and booking workflows"
        title="Modular scheduling screens and Typeform-style custom forms."
        body="Build reusable intake, insurance, consent, lead, and booking forms. Attach forms to booking workflows, store normalized field values, and write every submission to its own generated form table."
      />

      {params.saved ? <Feedback tone="green" message={`${clean(params.saved)} saved.`} /> : null}
      {params.error ? <Feedback tone="red" message={params.error} /> : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <WorkSurface title="Form builder" eyebrow="Typeform-style configurable forms">
          <form action={formDefinitionAction} className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="name" label="Form name" placeholder="Implant consult intake" required />
              <Input name="formKey" label="Form key" placeholder="implant-consult-intake" />
              <Select name="formType" label="Form type" options={["INTAKE", "INSURANCE", "CONSENT", "MEDICAL_HISTORY", "LEAD", "CUSTOM"]} />
              <Select name="workflowUse" label="Workflow use" options={["BOOKING_INTAKE", "INSURANCE_CAPTURE", "CONSENT_PACKET", "WEBCHAT_LEAD", "PHONE_FOLLOW_UP", "GENERAL"]} />
              <Select name="status" label="Status" options={["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]} />
              <Select name="visibility" label="Visibility" options={["STAFF_AND_PUBLIC_LINK", "STAFF_ONLY", "PUBLIC_LINK", "BOOKING_ONLY"]} />
              <Select name="requiresSignature" label="Signature required" options={["false", "true"]} />
              <Select name="allowAnonymous" label="Allow anonymous" options={["true", "false"]} />
            </div>
            <Textarea name="description" label="Description" placeholder="Where this form appears and who owns review." />
            <Textarea name="successMessage" label="Success message" placeholder="Thank you. Your form has been received." />
            <Textarea
              name="fieldLines"
              label="Fields"
              rows={8}
              defaultValue={"first_name | First name | short_text | required\nlast_name | Last name | short_text | required\nmobile_phone | Mobile phone | phone | required\nemail | Email | email | required\nvisit_reason | What brings you in? | long_text | required"}
              help="One field per line: field_key | Label | type | required/optional | options. Types: short_text, long_text, email, phone, date, single_select, multi_select, checkbox, signature."
            />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create form and storage table</button>
          </form>
        </WorkSurface>

        <WorkSurface title="Form library" eyebrow="Definitions, fields, storage">
          <div className="grid gap-3">
            {forms.map((form) => (
              <div key={form.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{form.name}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{form.formType} · {form.workflowUse} · table {form.storageTableName}</p>
                  </div>
                  <StateBadge tone={form.status === "ACTIVE" ? "green" : "amber"}>{clean(form.status)}</StateBadge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Mini label="Fields" value={String(form.fieldCount ?? 0)} />
                  <Mini label="Submissions" value={String(form.submissionCount ?? 0)} />
                  <Mini label="Signature" value={form.requiresSignature ? "required" : "optional"} />
                </div>
              </div>
            ))}
          </div>
        </WorkSurface>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkSurface title="Booking workflow builder" eyebrow="Choose screens and attached forms">
          <div className="space-y-4">
            {bookingLinks.map((link) => (
              <form key={link.id} action={workflowAction} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <input type="hidden" name="linkId" value={link.id} />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{link.title}</p>
                    <p className="mt-1 text-xs text-neutral-600">/book/{link.slug} · {clean(link.workflowKey ?? "standard_booking")}</p>
                  </div>
                  <StateBadge tone={link.status === "ACTIVE" ? "green" : "amber"}>{clean(link.status)}</StateBadge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Select name="workflowKey" label="Workflow template" defaultValue={link.workflowKey ?? "new_patient_offer"} options={templates.map((item) => item.key)} />
                  <Input name="workflowName" label="Workflow name" defaultValue={link.workflowName ?? "New patient offer"} />
                  <Select name="bookingMode" label="Booking mode" defaultValue={link.bookingMode ?? "DIRECT_BOOKING"} options={["DIRECT_BOOKING", "STAFF_APPROVAL", "REQUEST_ONLY", "DEPOSIT_REQUIRED"]} />
                  <Select name="patientIdentityPolicy" label="Identity policy" defaultValue={link.patientIdentityPolicy ?? "PHONE_EMAIL_DOB"} options={["PHONE_EMAIL_DOB", "PHONE_EMAIL", "RETURNING_PATIENT_LOGIN", "STAFF_REVIEW"]} />
                  <Select name="tone" label="Visual tone" options={["clean_dental", "premium_cosmetic", "urgent_care", "family_friendly"]} />
                  <Select name="layout" label="Layout" options={["left_progress", "top_progress", "single_question", "compact_embed"]} />
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <CheckboxGroup title="Screens" name="screenKeys" options={templates.flatMap((template) => template.screens.map((screen) => screen.key)).filter(unique)} defaults={["patient_type", "service_line", "calendar", "contact", "insurance", "custom_forms", "review"]} />
                  <CheckboxGroup title="Attach forms" name="customFormDefinitionIds" options={forms.map((form) => form.id)} labels={Object.fromEntries(forms.map((form) => [form.id, form.name]))} defaults={link.customFormDefinitionIds ?? []} />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <input name="showProgress" type="checkbox" defaultChecked className="size-4 rounded border-neutral-300" />
                  Show progress indicator
                </label>
                <button className="mt-3 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save workflow</button>
              </form>
            ))}
            {!bookingLinks.length ? <Empty title="No booking links" body="Create booking links in PMS online scheduling, then attach custom screens and forms here." /> : null}
          </div>
        </WorkSurface>

        <WorkSurface title="Submission test and storage" eyebrow="Writes normalized values and form table row">
          {firstActiveForm ? (
            <form action={sampleSubmissionAction} className="grid gap-3">
              <input type="hidden" name="formDefinitionId" value={firstActiveForm.id} />
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-neutral-950">{firstActiveForm.name}</p>
                <p className="mt-1 text-xs text-neutral-600">Submits to normalized tables and {firstActiveForm.storageTableName}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input name="submittedByName" label="Submitted by" />
                <Input name="submittedByEmail" label="Email" />
                <Input name="submittedByPhone" label="Phone" />
                <Input name="signatureName" label="Signature" />
              </div>
              {firstFields.map((field) => <DynamicField key={field.id} field={field} />)}
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Submit test response</button>
            </form>
          ) : <Empty title="No form available" body="Create an active form to test submission storage." />}
        </WorkSurface>
      </section>

      <div className="mt-5">
        <WorkSurface title="Recent submissions" eyebrow="Stored form values">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Form</th>
                  <th className="px-3 py-2">Submitter</th>
                  <th className="px-3 py-2">Channel</th>
                  <th className="px-3 py-2">Values</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="align-top">
                    <td className="px-3 py-3 font-semibold text-neutral-950">{submission.formName}<p className="text-xs font-normal text-neutral-500">{new Date(submission.createdAt).toLocaleString()}</p></td>
                    <td className="px-3 py-3 text-neutral-700">{submission.submittedByName ?? "unknown"}<p className="text-xs text-neutral-500">{submission.submittedByPhone ?? submission.submittedByEmail ?? ""}</p></td>
                    <td className="px-3 py-3 text-neutral-700">{clean(submission.sourceChannel)}</td>
                    <td className="max-w-xl px-3 py-3 text-xs leading-5 text-neutral-600">{summary(submission.answerSummary)}</td>
                    <td className="px-3 py-3"><StateBadge tone={submission.status === "SUBMITTED" ? "green" : "amber"}>{clean(submission.status)}</StateBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkSurface>
      </div>
    </PatientEngagementShell>
  );
}

function unique(value: string, index: number, array: string[]) {
  return array.indexOf(value) === index;
}

function summary(value: unknown) {
  if (!value || typeof value !== "object") return "No values";
  return Object.entries(value as Record<string, unknown>).slice(0, 8).map(([key, item]) => `${key}: ${String(item)}`).join(" | ");
}

function DynamicField({ field }: { field: CustomFormFieldRow }) {
  const name = `answer_${field.fieldKey}`;
  if (["long_text", "textarea"].includes(field.fieldType)) return <Textarea name={name} label={field.label} />;
  if (["single_select", "select"].includes(field.fieldType) && Array.isArray(field.options)) return <Select name={name} label={field.label} options={field.options.map(String)} />;
  return <Input name={name} label={field.label} type={field.fieldType === "email" ? "email" : field.fieldType === "date" ? "date" : field.fieldType === "phone" ? "tel" : "text"} required={field.required} />;
}

function CheckboxGroup({ title, name, options, labels = {}, defaults = [] }: { title: string; name: string; options: string[]; labels?: Record<string, string>; defaults?: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{title}</p>
      <div className="mt-2 grid gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-neutral-700">
            <input name={name} value={option} type="checkbox" defaultChecked={defaults.includes(option)} className="size-4 rounded border-neutral-300" />
            {labels[option] ?? clean(option)}
          </label>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-white p-2"><p className="text-neutral-500">{label}</p><p className="font-semibold text-neutral-950">{value}</p></div>;
}

function Feedback({ tone, message }: { tone: "green" | "red"; message: string }) {
  const classes = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900";
  return <div className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${classes}`}>{message}</div>;
}

function Input({ name, label, defaultValue, placeholder, type = "text", required }: { name: string; label: string; defaultValue?: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required={required} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
      {label}
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
        {options.map((option) => <option key={option} value={option}>{clean(option)}</option>)}
      </select>
    </label>
  );
}

function Textarea({ name, label, defaultValue, placeholder, rows = 3, help }: { name: string; label: string; defaultValue?: string; placeholder?: string; rows?: number; help?: string }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">
      {label}
      <textarea name={name} rows={rows} defaultValue={defaultValue} placeholder={placeholder} className="mt-1 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-neutral-950 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
      {help ? <span className="mt-1 block text-xs normal-case leading-5 tracking-normal text-neutral-500">{help}</span> : null}
    </label>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p>
    </div>
  );
}
