import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createPhoneConversation, getPhoneOperatingCenter, updatePhoneConversationStatus } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type PatientRow = { id: string; firstName: string; lastName: string; chartNumber: string };
type ConversationRow = {
  id: string;
  callerName: string | null;
  callerNumber: string | null;
  aiIntent: string | null;
  lastName: string | null;
  firstName: string | null;
  chartNumber: string | null;
  startedAt: Date | string;
  followUpStatus: string;
  transcriptSummary: string | null;
};

async function createAction(formData: FormData) {
  "use server";
  await createPhoneConversation({
    patientId: String(formData.get("patientId") ?? "") || undefined,
    direction: String(formData.get("direction") ?? "INBOUND"),
    callerNumber: String(formData.get("callerNumber") ?? ""),
    callerName: String(formData.get("callerName") ?? ""),
    aiIntent: String(formData.get("aiIntent") ?? "SCHEDULING"),
    transcriptSummary: String(formData.get("transcriptSummary") ?? ""),
    outcome: String(formData.get("outcome") ?? "CALL_SUMMARY_REVIEW"),
  });
  revalidatePath("/app/phone");
}

async function statusAction(formData: FormData) {
  "use server";
  await updatePhoneConversationStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "OPEN"), String(formData.get("followUpStatus") ?? "NEEDS_REVIEW"));
  revalidatePath("/app/phone");
}

export default async function PhonePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getPhoneOperatingCenter();
  const metrics = center.metrics;
  const conversations = center.conversations as ConversationRow[];
  const patients = center.patients as PatientRow[];

  return (
    <FoundationShell active="/app/phone" roleKey={role.key}>
      <PageHeader
        eyebrow="AI phone and communications"
        title="Phone inbox, AI receptionist, and follow-up work"
        body="Calls are matched to PMS patients, appointments, balances, recalls, and treatment plans. The phone layer can draft follow-up, but outbound calls, SMS, recordings, and AI voice execution remain connector-gated until telephony credentials, consent, and approval policies are live."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/phone" />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Open calls" value={metrics.openCalls} />
        <Metric label="Missed calls" value={metrics.missedCalls} />
        <Metric label="Needs review" value={metrics.needsReview} />
        <Metric label="High-intent leads" value={metrics.highIntent} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Log or import call" eyebrow="Phone connector intake">
          <form action={createAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Matched patient<select name="patientId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">Unknown caller</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} · {p.chartNumber}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="direction" label="Direction" options={["INBOUND", "OUTBOUND"]} />
              <Select name="aiIntent" label="AI intent" options={["NEW_PATIENT_BOOKING", "CONFIRM_APPOINTMENT", "EMERGENCY", "INSURANCE_QUESTION", "PAYMENT_QUESTION", "TREATMENT_INTEREST", "REPUTATION_RECOVERY"]} />
              <Input name="callerName" label="Caller name" />
              <Input name="callerNumber" label="Caller number" />
              <Select name="outcome" label="Outcome" options={["MISSED_CALL", "CALL_SUMMARY_REVIEW", "BOOKING_HANDOFF", "BILLING_HANDOFF", "SERVICE_RECOVERY", "AI_VOICE_REVIEW"]} />
            </div>
            <Textarea name="transcriptSummary" label="Transcript summary" required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create phone work item</button>
          </form>
        </PmsCard>

        <PmsCard title="Unified phone inbox" eyebrow="PMS-linked call work">
          <div className="grid gap-3">
            {conversations.map((call) => (
              <div key={call.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{call.callerName ?? call.callerNumber ?? "Unknown caller"} · {String(call.aiIntent ?? "call").replaceAll("_", " ")}</p>
                    <p className="mt-1 text-xs text-neutral-600">{call.lastName ? `${call.lastName}, ${call.firstName} · ${call.chartNumber}` : "No PMS match"} · {new Date(call.startedAt).toLocaleString()}</p>
                  </div>
                  <StatusFor value={call.followUpStatus} />
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{call.transcriptSummary}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <StatusButton id={call.id} status="OPEN" followUpStatus="READY_FOR_APPROVAL" label="Ready follow-up" />
                  <StatusButton id={call.id} status="OPEN" followUpStatus="BLOCKED_RCM_REVIEW" label="Send to RCM" />
                  <StatusButton id={call.id} status="CLOSED" followUpStatus="COMPLETED" label="Close" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function StatusButton({ id, status, followUpStatus, label }: { id: string; status: string; followUpStatus: string; label: string }) {
  return <form action={statusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><input type="hidden" name="followUpStatus" value={followUpStatus} /><button className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-white">{label}</button></form>;
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

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={4} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}
