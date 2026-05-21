import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createPhoneConversation,
  createPhoneOutboundMessage,
  createPhoneRoutingRule,
  getPhoneOperatingCenter,
  updatePhoneCallTaskStatus,
  updatePhoneConversationStatus,
  updatePhoneOutboundMessageApproval,
} from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type PatientRow = { id: string; firstName: string; lastName: string; chartNumber: string };
type ConversationRow = {
  id: string;
  patientId: string | null;
  appointmentId: string | null;
  callerName: string | null;
  callerNumber: string | null;
  direction: string;
  channel: string;
  aiIntent: string | null;
  aiSentiment: string | null;
  outcome: string | null;
  lastName: string | null;
  firstName: string | null;
  chartNumber: string | null;
  appointmentType: string | null;
  startsAt: Date | string | null;
  startedAt: Date | string;
  followUpStatus: string;
  transcriptSummary: string | null;
  bookingIntentScore: number;
  serviceRecoveryScore: number;
  revenueOpportunityCents: number;
  keywords: string[] | null;
  riskFlags: string[] | null;
};
type MessageRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  channel: string;
  recipientNumber: string | null;
  messageType: string;
  body: string;
  approvalStatus: string;
  deliveryStatus: string;
  consentStatus: string;
  blockedReason: string | null;
};
type RouteRow = { id: string; name: string; triggerType: string; destinationType: string; destination: string; priority: number; status: string; failoverAction: string | null; locationName: string | null };
type TaskRow = { id: string; firstName: string | null; lastName: string | null; chartNumber: string | null; aiIntent: string | null; callerNumber: string | null; taskType: string; priority: string; status: string; dueAt: string | null; ownerRoleKey: string; nextAction: string };
type AnalyticsRow = { id: string; callerName: string | null; callerNumber: string | null; aiIntent: string | null; firstName: string | null; lastName: string | null; chartNumber: string | null; bookingIntentScore: number; serviceRecoveryScore: number; revenueOpportunityCents: number; keywords: string[] | null; riskFlags: string[] | null; summaryQuality: string };

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

async function messageAction(formData: FormData) {
  "use server";
  const selected = String(formData.get("conversationKey") ?? "").split("|");
  await createPhoneOutboundMessage({
    conversationId: selected[0] || undefined,
    patientId: selected[1] || undefined,
    appointmentId: selected[2] || undefined,
    recipientNumber: selected[3] || undefined,
    channel: String(formData.get("channel") ?? "SMS"),
    messageType: String(formData.get("messageType") ?? "FOLLOW_UP"),
    body: String(formData.get("body") ?? ""),
    consentStatus: String(formData.get("consentStatus") ?? "UNKNOWN"),
    blockedReason: String(formData.get("blockedReason") ?? "") || undefined,
  });
  revalidatePath("/app/phone");
}

async function messageApprovalAction(formData: FormData) {
  "use server";
  await updatePhoneOutboundMessageApproval(String(formData.get("id") ?? ""), String(formData.get("approvalStatus") ?? "NEEDS_APPROVAL"));
  revalidatePath("/app/phone");
}

async function taskAction(formData: FormData) {
  "use server";
  await updatePhoneCallTaskStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "OPEN"), String(formData.get("actorRole") ?? "front_desk"));
  revalidatePath("/app/phone");
}

async function routeAction(formData: FormData) {
  "use server";
  await createPhoneRoutingRule({
    name: String(formData.get("name") ?? ""),
    triggerType: String(formData.get("triggerType") ?? "INTENT_NEW_PATIENT"),
    destinationType: String(formData.get("destinationType") ?? "QUEUE"),
    destination: String(formData.get("destination") ?? ""),
    priority: Number(formData.get("priority") ?? 100),
    failoverAction: String(formData.get("failoverAction") ?? ""),
  });
  revalidatePath("/app/phone");
}

export default async function PhonePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getPhoneOperatingCenter();
  const metrics = center.metrics;
  const conversations = center.conversations as ConversationRow[];
  const messages = center.messages as MessageRow[];
  const routes = center.routes as RouteRow[];
  const tasks = center.tasks as TaskRow[];
  const analytics = center.analytics as AnalyticsRow[];
  const patients = center.patients as PatientRow[];

  return (
    <FoundationShell active="/app/phone" roleKey={role.key}>
      <PageHeader
        eyebrow="AI phone and communications"
        title="Phone inbox, AI receptionist, routing, SMS approvals, and call recovery"
        body="Mango/Weave-style phone work belongs inside the PMS: screen pop, missed-call recovery, voicemail transcripts, routing rules, call analytics, appointment handoffs, RCM blocks, review recovery, and approved outbound messages are all tied to patient records."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/phone" />

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Metric label="Open calls" value={metrics.openCalls} />
        <Metric label="Missed calls" value={metrics.missedCalls} />
        <Metric label="Needs review" value={metrics.needsReview} />
        <Metric label="High-intent leads" value={metrics.highIntent} />
        <Metric label="Staged messages" value={metrics.stagedMessages} />
        <Metric label="Open tasks" value={metrics.openTasks} />
        <Metric label="Opportunity" value={<Money cents={Number(metrics.opportunityCents)} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <PmsCard title="Log or import call" eyebrow="Telephony connector intake">
          <form action={createAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Matched patient<select name="patientId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">Unknown caller</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} · {p.chartNumber}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="direction" label="Direction" options={["INBOUND", "OUTBOUND"]} />
              <Select name="aiIntent" label="Intent" options={["NEW_PATIENT_BOOKING", "IMPLANT_CONSULT_PRICE", "CONFIRM_APPOINTMENT", "EMERGENCY", "INSURANCE_QUESTION", "PAYMENT_QUESTION", "TREATMENT_INTEREST", "REPUTATION_RECOVERY"]} />
              <Input name="callerName" label="Caller name" />
              <Input name="callerNumber" label="Caller number" />
              <Select name="outcome" label="Outcome" options={["MISSED_CALL", "CALL_SUMMARY_REVIEW", "BOOKING_HANDOFF", "BILLING_HANDOFF", "SERVICE_RECOVERY", "AI_VOICE_REVIEW"]} />
            </div>
            <Textarea name="transcriptSummary" label="Transcript summary" required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create phone work item</button>
          </form>
        </PmsCard>

        <PmsCard title="Live phone inbox" eyebrow="PMS screen pop and call recovery">
          <div className="grid gap-3">
            {conversations.map((call) => (
              <div key={call.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-950">{call.callerName ?? call.callerNumber ?? "Unknown caller"} · {clean(call.aiIntent ?? "call")}</p>
                    <p className="mt-1 text-xs text-neutral-600">{call.lastName ? `${call.lastName}, ${call.firstName} · ${call.chartNumber}` : "No PMS match"} · {new Date(call.startedAt).toLocaleString()}</p>
                    {call.appointmentType ? <p className="mt-1 text-xs text-neutral-600">Appointment: {call.appointmentType} · {call.startsAt ? new Date(call.startsAt).toLocaleString() : "not scheduled"}</p> : null}
                  </div>
                  <StatusFor value={call.followUpStatus} />
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{call.transcriptSummary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Booking intent" value={`${call.bookingIntentScore ?? 0}%`} />
                  <MiniMetric label="Recovery risk" value={`${call.serviceRecoveryScore ?? 0}%`} />
                  <MiniMetric label="Opportunity" value={<Money cents={Number(call.revenueOpportunityCents ?? 0)} />} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{list("Keywords", call.keywords)} {list("Risks", call.riskFlags)}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <StatusButton id={call.id} status="OPEN" followUpStatus="READY_FOR_APPROVAL" label="Ready follow-up" />
                  <StatusButton id={call.id} status="OPEN" followUpStatus="BLOCKED_RCM_REVIEW" label="Send to RCM" />
                  <StatusButton id={call.id} status="OPEN" followUpStatus="PATIENT_FINDER" label="Patient Finder" />
                  <StatusButton id={call.id} status="CLOSED" followUpStatus="COMPLETED" label="Close" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Outbound messages" eyebrow="Approved SMS/email drafts, no fake sends">
          <form action={messageAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Conversation<select name="conversationKey" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{conversations.map((call) => <option key={call.id} value={`${call.id}|${call.patientId ?? ""}|${call.appointmentId ?? ""}|${call.callerNumber ?? ""}`}>{call.callerName ?? call.callerNumber ?? call.id} - {clean(call.aiIntent ?? "call")}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select name="channel" label="Channel" options={["SMS", "EMAIL"]} />
              <Select name="messageType" label="Type" options={["MISSED_CALL_TEXT", "APPOINTMENT_CONFIRMATION_REPLY", "BILLING_HANDOFF_REPLY", "RECALL_REPLY", "REVIEW_RECOVERY"]} />
              <Select name="consentStatus" label="Consent" options={["UNKNOWN", "VERIFIED", "OPTED_OUT"]} />
            </div>
            <Textarea name="body" label="Message body" required />
            <Input name="blockedReason" label="Blocked reason" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Stage message</button>
          </form>
          <div className="grid gap-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{clean(message.messageType)} · {message.channel}</p>
                  <StatusFor value={message.approvalStatus} />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{message.lastName ? `${message.lastName}, ${message.firstName} · ${message.chartNumber}` : message.recipientNumber ?? "No recipient"} · {message.deliveryStatus.toLowerCase()}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{message.body}</p>
                {message.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{message.blockedReason}</p> : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MessageButton id={message.id} approvalStatus="NEEDS_APPROVAL" label="Needs approval" />
                  <MessageButton id={message.id} approvalStatus="APPROVED_STAGED" label="Approve/stage" />
                  <MessageButton id={message.id} approvalStatus="BLOCKED" label="Block" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Phone tasks" eyebrow="Missed calls, billing handoffs, forms checks">
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{clean(task.taskType)}</p>
                    <p className="mt-1 text-xs text-neutral-600">{task.lastName ? `${task.lastName}, ${task.firstName} · ${task.chartNumber}` : task.callerNumber ?? "No PMS match"} · owner {clean(task.ownerRoleKey)}</p>
                  </div>
                  <StatusFor value={task.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{task.nextAction}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <TaskButton id={task.id} actorRole={task.ownerRoleKey} status="OPEN" label="Keep open" />
                  <TaskButton id={task.id} actorRole={task.ownerRoleKey} status="IN_PROGRESS" label="In progress" />
                  <TaskButton id={task.id} actorRole={task.ownerRoleKey} status="COMPLETED" label="Complete" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <PmsCard title="Routing rules" eyebrow="Queues, ring groups, failover">
          <form action={routeAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <Input name="name" label="Rule name" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="triggerType" label="Trigger" options={["INTENT_NEW_PATIENT_OR_IMPLANT", "INTENT_EMERGENCY", "INTENT_BILLING_OR_INSURANCE", "AFTER_HOURS", "MISSED_CALL"]} />
              <Select name="destinationType" label="Destination type" options={["QUEUE", "RING_GROUP", "VOICEMAIL", "AI_RECEPTIONIST"]} />
              <Input name="destination" label="Destination" />
              <Input name="priority" label="Priority" />
            </div>
            <Input name="failoverAction" label="Failover action" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Save routing rule</button>
          </form>
          <div className="grid gap-3">
            {routes.map((route) => (
              <div key={route.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{route.name}</p>
                  <StatusFor value={route.status} />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{clean(route.triggerType)} → {clean(route.destinationType)} · {route.destination}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Failover: {route.failoverAction ?? "not configured"}</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Call intelligence" eyebrow="Intent, service recovery, revenue opportunity">
          <div className="grid gap-3 lg:grid-cols-2">
            {analytics.map((row) => (
              <div key={row.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-neutral-950">{row.callerName ?? row.callerNumber ?? "Unknown caller"} · {clean(row.aiIntent ?? "call")}</p>
                <p className="mt-1 text-xs text-neutral-600">{row.lastName ? `${row.lastName}, ${row.firstName} · ${row.chartNumber}` : "No PMS match"}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Booking" value={`${row.bookingIntentScore}%`} />
                  <MiniMetric label="Recovery" value={`${row.serviceRecoveryScore}%`} />
                  <MiniMetric label="Revenue" value={<Money cents={Number(row.revenueOpportunityCents)} />} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{list("Keywords", row.keywords)} {list("Risks", row.riskFlags)}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function StatusButton({ id, status, followUpStatus, label }: { id: string; status: string; followUpStatus: string; label: string }) {
  return <form action={statusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><input type="hidden" name="followUpStatus" value={followUpStatus} /><ActionButton label={label} /></form>;
}

function MessageButton({ id, approvalStatus, label }: { id: string; approvalStatus: string; label: string }) {
  return <form action={messageApprovalAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="approvalStatus" value={approvalStatus} /><ActionButton label={label} /></form>;
}

function TaskButton({ id, actorRole, status, label }: { id: string; actorRole: string; status: string; label: string }) {
  return <form action={taskAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="actorRole" value={actorRole} /><input type="hidden" name="status" value={status} /><ActionButton label={label} /></form>;
}

function ActionButton({ label }: { label: string }) {
  return <button className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{label}</button>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-white p-2 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{clean(option)}</option>)}</select></label>;
}

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={4} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function clean(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

function list(label: string, values: string[] | null) {
  return values?.length ? `${label}: ${values.join(", ")}.` : "";
}
