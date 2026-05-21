import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createReviewWorkflow, getReputationOperatingCenter, updateReviewWorkflowStatus } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type PatientRow = { id: string; firstName: string; lastName: string; chartNumber: string };
type ReviewRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  reviewSite: string;
  serviceLine: string | null;
  providerName: string | null;
  requestChannel: string;
  requestStatus: string;
  publicReviewText: string | null;
  responseDraft: string | null;
};
type SurveyRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  surveyType: string;
  status: string;
  score: number | null;
  nps: number | null;
  recoveryRequired: boolean;
  responseText: string | null;
};
type RecoveryRow = { id: string; firstName: string | null; lastName: string | null; status: string; reason: string };

async function createAction(formData: FormData) {
  "use server";
  await createReviewWorkflow({
    patientId: String(formData.get("patientId") ?? "") || undefined,
    serviceLine: String(formData.get("serviceLine") ?? "General dentistry"),
    reviewSite: String(formData.get("reviewSite") ?? "GOOGLE"),
    requestChannel: String(formData.get("requestChannel") ?? "SMS"),
    responseDraft: String(formData.get("responseDraft") ?? ""),
  });
  revalidatePath("/app/reputation");
}

async function statusAction(formData: FormData) {
  "use server";
  await updateReviewWorkflowStatus(String(formData.get("id") ?? ""), String(formData.get("requestStatus") ?? "READY_FOR_APPROVAL"));
  revalidatePath("/app/reputation");
}

export default async function ReputationPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getReputationOperatingCenter();
  const metrics = center.metrics;
  const reviews = center.reviews as ReviewRow[];
  const surveys = center.surveys as SurveyRow[];
  const recoveryCases = center.recoveryCases as RecoveryRow[];
  const patients = center.patients as PatientRow[];

  return (
    <FoundationShell active="/app/reputation" roleKey={role.key}>
      <PageHeader
        eyebrow="Reputation and patient experience"
        title="Reviews, surveys, and service recovery"
        body="Review requests are driven by PMS appointments, providers, service lines, surveys, phone events, and recovery holds. The system should ask happy patients at the right time and stop review automation when a patient needs a human response."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/reputation" />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Ready requests" value={metrics.readyRequests} />
        <Metric label="Blocked requests" value={metrics.blockedRequests} />
        <Metric label="Low surveys" value={metrics.lowSurveys} />
        <Metric label="AI response drafts" value={metrics.responseDrafts} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <PmsCard title="Create review workflow" eyebrow="PMS-triggered reputation work">
          <form action={createAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Patient<select name="patientId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">Practice-level</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} · {p.chartNumber}</option>)}</select></label>
            <Input name="serviceLine" label="Service line" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="reviewSite" label="Review site" options={["GOOGLE", "FACEBOOK", "YELP", "HEALTHGRADES", "INTERNAL_TESTIMONIAL"]} />
              <Select name="requestChannel" label="Request channel" options={["SMS", "EMAIL", "PHONE", "QR", "PORTAL"]} />
            </div>
            <Textarea name="responseDraft" label="AI response draft or request note" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create reputation item</button>
          </form>
        </PmsCard>

        <PmsCard title="Review request and response queue" eyebrow="No public posting without approval">
          <div className="grid gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{review.lastName ? `${review.lastName}, ${review.firstName}` : "Practice-level"} · {review.reviewSite}</p>
                    <p className="mt-1 text-xs text-neutral-600">{review.serviceLine ?? "General dentistry"} · {review.providerName ?? "No provider"} · {review.requestChannel}</p>
                  </div>
                  <StatusFor value={review.requestStatus} />
                </div>
                {review.publicReviewText ? <p className="mt-2 text-sm leading-6 text-neutral-700">{review.publicReviewText}</p> : null}
                {review.responseDraft ? <p className="mt-2 rounded-md border border-cyan-100 bg-white p-2 text-xs leading-5 text-neutral-700">{review.responseDraft}</p> : null}
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <StatusButton id={review.id} requestStatus="READY_FOR_APPROVAL" label="Ready" />
                  <StatusButton id={review.id} requestStatus="APPROVED_STAGED" label="Approve staged" />
                  <StatusButton id={review.id} requestStatus="BLOCKED_SERVICE_RECOVERY" label="Block recovery" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Survey signals" eyebrow="Patient experience before reviews">
          <div className="grid gap-2">
            {surveys.map((survey) => <div key={survey.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3"><div className="flex items-start justify-between"><p className="text-sm font-semibold text-neutral-950">{survey.lastName}, {survey.firstName} · {survey.surveyType}</p><StatusFor value={survey.status} /></div><p className="mt-1 text-xs text-neutral-600">Score {survey.score ?? "pending"} · NPS {survey.nps ?? "pending"} · recovery {survey.recoveryRequired ? "required" : "not required"}</p>{survey.responseText ? <p className="mt-2 text-sm text-neutral-700">{survey.responseText}</p> : null}</div>)}
          </div>
        </PmsCard>
        <PmsCard title="Service recovery holds" eyebrow="Protect review quality">
          <div className="grid gap-2">
            {recoveryCases.map((item) => <div key={item.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3"><div className="flex items-start justify-between"><p className="text-sm font-semibold text-neutral-950">{item.lastName}, {item.firstName}</p><StatusFor value={item.status} /></div><p className="mt-1 text-xs leading-5 text-neutral-600">{item.reason}</p></div>)}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function StatusButton({ id, requestStatus, label }: { id: string; requestStatus: string; label: string }) {
  return <form action={statusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="requestStatus" value={requestStatus} /><button className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-white">{label}</button></form>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Textarea({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} rows={3} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}
