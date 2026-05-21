import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createReputationRecoveryCase,
  getEngagementCommandCenter,
  stageEngagementEvent,
  updateEngagementEventStatus,
} from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type EngagementEventRow = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  sourceModule: string;
  eventType: string;
  channel: string;
  status: string;
  triggerReason: string;
  messageBody: string;
  approvalStatus: string;
  scheduledFor: Date | string | null;
  firstName: string;
  lastName: string;
  chartNumber: string;
  phone: string | null;
  email: string | null;
  appointmentType: string | null;
  readinessStatus: string | null;
  procedureCode: string | null;
  procedureDescription: string | null;
};

type RecoveryRow = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  sourceEventId: string | null;
  sentiment: string;
  status: string;
  ownerRoleKey: string;
  reason: string;
  recoveryNote: string | null;
  reviewRequestBlocked: boolean;
  dueAt: Date | string | null;
  firstName: string;
  lastName: string;
  chartNumber: string;
  appointmentType: string | null;
};

type SignalRow = { key: string; value: number };
type PatientRow = { id: string; firstName: string; lastName: string; chartNumber: string };

const eventTypes = [
  "POST_VISIT_REVIEW_REQUEST",
  "POST_OP_INSTRUCTIONS",
  "RECALL_REACTIVATION",
  "PAYMENT_FOLLOW_UP",
  "INSURANCE_DOCUMENT_REQUEST",
  "SERVICE_RECOVERY_HOLD",
];

const channels = ["SMS", "EMAIL", "PHONE", "PORTAL"];

function fmtDate(value: Date | string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function signalValue(signals: SignalRow[], key: string) {
  return Number(signals.find((signal) => signal.key === key)?.value ?? 0);
}

async function stageAction(formData: FormData) {
  "use server";
  await stageEngagementEvent({
    patientId: String(formData.get("patientId") ?? ""),
    sourceModule: String(formData.get("sourceModule") ?? "PMS_MANUAL_REVIEW"),
    eventType: String(formData.get("eventType") ?? "POST_VISIT_REVIEW_REQUEST"),
    channel: String(formData.get("channel") ?? "SMS"),
    triggerReason: String(formData.get("triggerReason") ?? ""),
    messageBody: String(formData.get("messageBody") ?? ""),
    scheduledFor: String(formData.get("scheduledFor") ?? "") || undefined,
    actorRole: "marketing_growth",
  });
  revalidatePath("/app/engagement");
  revalidatePath("/app/pms/tasks");
}

async function updateStatusAction(formData: FormData) {
  "use server";
  await updateEngagementEventStatus({
    eventId: String(formData.get("eventId") ?? ""),
    status: String(formData.get("status") ?? "READY_FOR_APPROVAL"),
    actorRole: "marketing_growth",
  });
  revalidatePath("/app/engagement");
}

async function recoveryAction(formData: FormData) {
  "use server";
  const eventId = String(formData.get("eventId") ?? "");
  await updateEngagementEventStatus({ eventId, status: "BLOCKED_SERVICE_RECOVERY", actorRole: "practice_manager" });
  await createReputationRecoveryCase({
    patientId: String(formData.get("patientId") ?? ""),
    appointmentId: String(formData.get("appointmentId") ?? "") || undefined,
    sourceEventId: eventId,
    sentiment: String(formData.get("sentiment") ?? "NEEDS_ATTENTION"),
    reason: String(formData.get("reason") ?? "Patient experience needs follow-up before review request."),
    recoveryNote: String(formData.get("recoveryNote") ?? ""),
    dueAt: String(formData.get("dueAt") ?? "") || undefined,
    actorRole: "practice_manager",
  });
  revalidatePath("/app/engagement");
  revalidatePath("/app/pms/tasks");
}

export default async function EngagementPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const command = await getEngagementCommandCenter();
  const events = command.events as EngagementEventRow[];
  const recoveryCases = command.recoveryCases as RecoveryRow[];
  const signals = command.sourceSignals as SignalRow[];
  const patients = command.patients as PatientRow[];
  const approvalCount = events.filter((event) => event.approvalStatus === "NEEDS_REVIEW").length;
  const blockedCount = recoveryCases.filter((item) => item.status !== "RESOLVED").length;

  return (
    <FoundationShell active="/app/engagement" roleKey={role.key}>
      <PageHeader
        eyebrow="PMS-connected engagement"
        title="Patient engagement and reputation workbench"
        body="Every outreach item starts from a PMS event: completed procedure, recall due, readiness blocker, ledger balance, or appointment status. Staff approve, block, or hand off the work before any patient-facing message leaves the practice."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/engagement" />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="PMS triggers available" value={signalValue(signals, "completed_procedures") + signalValue(signals, "due_recalls") + signalValue(signals, "open_balances")} detail="completed care, recalls, balances" />
        <Metric label="Needs approval" value={approvalCount} detail="message review required" />
        <Metric label="Recovery holds" value={blockedCount} detail="review requests blocked" />
        <Metric label="Readiness blocks" value={signalValue(signals, "readiness_blocks")} detail="PMS issues before outreach" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Operating model</p>
            <h2 className="mt-0.5 text-base font-semibold text-neutral-950">PMS operating graph</h2>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid gap-2 lg:grid-cols-5">
              {["Appointments", "Clinical chart", "Ledger", "Insurance", "Recall"].map((item) => (
                <div key={item} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-xs font-semibold text-neutral-950">{item}</p>
                  <p className="mt-1 text-[11px] leading-4 text-neutral-500">PMS source record</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2">
              <p className="text-sm font-semibold text-cyan-950">Workflow policy and approval queue</p>
              <p className="mt-1 text-xs leading-5 text-cyan-800">Tenant rules decide timing, channel, role ownership, service recovery holds, and whether a human must approve the communication.</p>
            </div>
            <div className="grid gap-2 lg:grid-cols-4">
              {["Patient reminders", "Post-op instructions", "Post-visit review", "Service recovery"].map((item) => (
                <div key={item} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-neutral-950">{item}</p>
                  <p className="mt-1 text-[11px] leading-4 text-neutral-500">Action layer</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Manual staging</p>
            <h2 className="mt-0.5 text-base font-semibold text-neutral-950">Create PMS-linked outreach</h2>
          </div>
          <form action={stageAction} className="grid gap-3 p-4">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Patient
              <select name="patientId" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="eventType" label="Work type" options={eventTypes} />
              <Select name="channel" label="Channel" options={channels} />
            </div>
            <Select name="sourceModule" label="PMS source" options={["PMS_MANUAL_REVIEW", "PMS_PROCEDURE_LOG", "PMS_RECALL", "PMS_LEDGER", "PMS_INSURANCE", "PMS_APPOINTMENT"]} />
            <Input name="scheduledFor" label="Schedule for" type="datetime-local" />
            <Textarea name="triggerReason" label="Trigger reason" rows={2} required />
            <Textarea name="messageBody" label="Message body" rows={4} required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Stage for approval</button>
          </form>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Daily work queue</p>
          <h2 className="mt-0.5 text-base font-semibold text-neutral-950">PMS-triggered patient engagement</h2>
        </div>
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Patient</th>
                  <th className="px-4 py-2">PMS source</th>
                  <th className="px-4 py-2">Work</th>
                  <th className="px-4 py-2">Message</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {events.map((event) => (
                  <tr key={event.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-950">{event.lastName}, {event.firstName}</p>
                      <p className="mt-1 text-xs text-neutral-500">{event.chartNumber} · {event.phone ?? event.email ?? "No contact on file"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      <p className="font-semibold text-neutral-800">{event.sourceModule.replaceAll("_", " ")}</p>
                      <p className="mt-1">{event.appointmentType ?? event.procedureCode ?? "Manual review"}</p>
                      <p className="mt-1">{fmtDate(event.scheduledFor)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-neutral-950">{event.eventType.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-neutral-500">{event.channel}</p>
                    </td>
                    <td className="max-w-xl px-4 py-3">
                      <p className="text-xs font-semibold text-neutral-700">{event.triggerReason}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">{event.messageBody}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusFor value={event.status} />
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500">{event.approvalStatus.replaceAll("_", " ")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-48 flex-col gap-2">
                        <StatusButton eventId={event.id} status="READY_FOR_APPROVAL" label="Mark ready" />
                        <StatusButton eventId={event.id} status="APPROVED_TO_SEND" label="Approve queue" />
                        <form action={recoveryAction} className="grid gap-2">
                          <input type="hidden" name="eventId" value={event.id} />
                          <input type="hidden" name="patientId" value={event.patientId} />
                          <input type="hidden" name="appointmentId" value={event.appointmentId ?? ""} />
                          <input type="hidden" name="sentiment" value="NEEDS_ATTENTION" />
                          <input type="hidden" name="reason" value={event.triggerReason} />
                          <input type="hidden" name="recoveryNote" value="Review request blocked until staff resolves patient experience issue." />
                          <button className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50">Block for recovery</button>
                        </form>
                        <StatusButton eventId={event.id} status="COMPLETED" label="Mark complete" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <EmptyPmsState title="No engagement events staged" body="Completed procedures, recalls, account balances, and readiness issues can be converted into approval-gated patient outreach from this workbench." />
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Reputation protection</p>
          <h2 className="mt-0.5 text-base font-semibold text-neutral-950">Service recovery before review requests</h2>
        </div>
        <div className="grid gap-3 p-4 xl:grid-cols-2">
          {recoveryCases.length ? recoveryCases.map((item) => (
            <div key={item.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{item.lastName}, {item.firstName} · {item.chartNumber}</p>
                  <p className="mt-1 text-xs text-neutral-600">{item.reason}</p>
                </div>
                <StatusFor value={item.status} />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-3">
                <p><span className="font-semibold text-neutral-800">Owner:</span> {item.ownerRoleKey.replaceAll("_", " ")}</p>
                <p><span className="font-semibold text-neutral-800">Due:</span> {fmtDate(item.dueAt)}</p>
                <p><span className="font-semibold text-neutral-800">Review:</span> {item.reviewRequestBlocked ? "blocked" : "allowed"}</p>
              </div>
              {item.recoveryNote ? <p className="mt-2 text-xs leading-5 text-neutral-600">{item.recoveryNote}</p> : null}
            </div>
          )) : <EmptyPmsState title="No recovery holds" body="If an outreach item signals a poor experience, the team blocks review requests and creates a service recovery task from the same PMS record." />}
        </div>
      </section>
    </FoundationShell>
  );
}

function StatusButton({ eventId, status, label }: { eventId: string; status: string; label: string }) {
  return (
    <form action={updateStatusAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <button className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{label}</button>
    </form>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function Input({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}
      <input name={name} type={type} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
    </label>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}
      <select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
        {options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );
}

function Textarea({ name, label, rows, required = false }: { name: string; label: string; rows: number; required?: boolean }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}
      <textarea name={name} rows={rows} required={required} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
    </label>
  );
}
