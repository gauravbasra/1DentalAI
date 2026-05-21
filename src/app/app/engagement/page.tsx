import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
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
  appointmentStatus: string | null;
  readinessStatus: string | null;
  consentStatus: string | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  openForms: number;
  openTasks: number;
  medicalAlertCount: number;
  preMedAlertCount: number;
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
type LifecycleRow = {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  appointmentType: string;
  startsAt: Date | string;
  status: string;
  readinessStatus: string;
  consentStatus: string | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  openForms: number;
  reminderCount: number;
  medicalAlertCount: number;
  preMedAlertCount: number;
  allergyCount: number;
  medicationCount: number;
};
type BookingRequestRow = { id: string; patientId: string | null; firstName: string | null; lastName: string | null; chartNumber: string | null; requestType: string; source: string; urgency: string; preferredWindow: string | null; note: string | null; consentStatus: string | null; quietHoursStart: string | null; quietHoursEnd: string | null; stagedCount: number };
type FormPacketRow = { id: string; patientId: string; appointmentId: string | null; firstName: string; lastName: string; chartNumber: string; status: string; dueAt: Date | string | null; templateName: string | null; formType: string | null; appointmentType: string | null; startsAt: Date | string | null; consentStatus: string | null; quietHoursStart: string | null; quietHoursEnd: string | null; stagedCount: number };
type RecallRow = { id: string; patientId: string; firstName: string; lastName: string; recallType: string; dueDate: Date | string; status: string; consentStatus: string | null; quietHoursStart: string | null; quietHoursEnd: string | null };
type BrokenAppointmentRow = { id: string; patientId: string; firstName: string; lastName: string; appointmentType: string; startsAt: Date | string; status: string };
type WaitlistRow = { id: string; patientId: string | null; firstName: string | null; lastName: string | null; chartNumber: string | null; requestType: string; source: string; urgency: string; preferredWindow: string | null; note: string | null };
type PostOpRow = { id: string; patientId: string; appointmentId: string | null; firstName: string; lastName: string; serviceDate: Date | string; code: string; description: string; postOpCount: number };
type MedicalAlertRow = { id: string; patientId: string; appointmentId: string | null; firstName: string; lastName: string; chartNumber: string; severity: string; title: string; details: string | null; appointmentType: string | null; startsAt: Date | string | null; stagedCount: number };
type TaskRow = { id: string; firstName: string | null; lastName: string | null; chartNumber: string | null; ownerRoleKey: string; title: string; priority: string; dueAt: Date | string | null };
type GovernanceRow = { area: string; control: string; status: string };

const eventTypes = [
  "BOOKING_REQUEST_RESPONSE",
  "POST_VISIT_REVIEW_REQUEST",
  "POST_OP_INSTRUCTIONS",
  "RECALL_REACTIVATION",
  "REACTIVATION",
  "APPOINTMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
  "FORMS_REMINDER",
  "INTAKE_PACKET_REMINDER",
  "MEDICAL_ALERT_REVIEW",
  "PRE_MED_ALERT_REVIEW",
  "NO_SHOW_RECOVERY",
  "CANCELLATION_FILL",
  "WAITLIST_FILL",
  "PAYMENT_FOLLOW_UP",
  "INSURANCE_DOCUMENT_REQUEST",
  "CONSENT_REVIEW",
  "SERVICE_RECOVERY_HOLD",
];

const channels = ["SMS", "EMAIL", "PHONE", "PORTAL"];

function fmtDate(value: Date | string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date needs review";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function signalValue(signals: SignalRow[], key: string) {
  return Number(signals.find((signal) => signal.key === key)?.value ?? 0);
}

function personName(row: { firstName: string | null; lastName: string | null; chartNumber?: string | null }) {
  const name = [row.lastName, row.firstName].filter(Boolean).join(", ");
  return name || row.chartNumber || "Unassigned patient";
}

function consentLabel(status: string | null) {
  return status ? status.replaceAll("_", " ") : "No preference";
}

function quietWindow(start: string | null, end: string | null) {
  return start && end ? `${start}-${end}` : "Not set";
}

async function stageAction(formData: FormData) {
  "use server";
  await stageEngagementEvent({
    patientId: String(formData.get("patientId") ?? ""),
    sourceModule: String(formData.get("sourceModule") ?? "PMS_MANUAL_REVIEW"),
    eventType: String(formData.get("eventType") ?? "POST_VISIT_REVIEW_REQUEST"),
    channel: String(formData.get("channel") ?? "SMS"),
    appointmentId: String(formData.get("appointmentId") ?? "") || undefined,
    procedureLogId: String(formData.get("procedureLogId") ?? "") || undefined,
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
  const lifecycle = command.lifecycle as LifecycleRow[];
  const bookingRequests = command.bookingRequests as BookingRequestRow[];
  const formPackets = command.formPackets as FormPacketRow[];
  const recallQueue = command.recallQueue as RecallRow[];
  const brokenAppointments = command.brokenAppointments as BrokenAppointmentRow[];
  const waitlist = command.waitlist as WaitlistRow[];
  const postOpQueue = command.postOpQueue as PostOpRow[];
  const medicalAlerts = command.medicalAlerts as MedicalAlertRow[];
  const crossModuleTasks = command.crossModuleTasks as TaskRow[];
  const governance = command.governance as GovernanceRow[];
  const approvalCount = events.filter((event) => event.approvalStatus === "NEEDS_REVIEW").length;
  const blockedCount = recoveryCases.filter((item) => item.status !== "RESOLVED").length;

  return (
    <FoundationShell active="/app/engagement" roleKey={role.key}>
      <PageHeader
        eyebrow="PMS-connected engagement"
        title="Patient engagement scheduling lifecycle"
        body="Every outreach item starts from a PMS event: booking request, appointment, completed procedure, recall due, readiness blocker, intake packet, medical alert, ledger balance, or appointment status. Post-visit review, reminders, recalls, forms, and recovery work stay staff-approved before any patient-facing message leaves the practice."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/engagement" />

      <section className="grid gap-3 md:grid-cols-5">
        <Metric label="PMS triggers available" value={signalValue(signals, "completed_procedures") + signalValue(signals, "due_recalls") + signalValue(signals, "open_balances") + signalValue(signals, "booking_requests")} detail="booking, care, recalls, balances" />
        <Metric label="Needs approval" value={approvalCount} detail="message review required" />
        <Metric label="Recovery holds" value={blockedCount} detail="review requests blocked" />
        <Metric label="Forms and waitlist" value={signalValue(signals, "open_forms") + signalValue(signals, "waitlist_requests")} detail="consent, intake, ASAP fill" />
        <Metric label="Medical/pre-med" value={signalValue(signals, "medical_alerts") + signalValue(signals, "pre_med_alerts")} detail="clinical safety gates" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Operating model</p>
            <h2 className="mt-0.5 text-base font-semibold text-neutral-950">PMS operating graph</h2>
          </div>
          <div className="grid gap-3 p-4">
            <div className="grid gap-2 lg:grid-cols-5">
              {["Booking requests", "Appointments", "Clinical chart", "Forms", "Recall"].map((item) => (
                <div key={item} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-xs font-semibold text-neutral-950">{item}</p>
                  <p className="mt-1 text-[11px] leading-4 text-neutral-500">PMS source record</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2">
              <p className="text-sm font-semibold text-cyan-950">Workflow policy and approval queue</p>
              <p className="mt-1 text-xs leading-5 text-cyan-800">Tenant rules decide timing, channel, role ownership, consent, quiet hours, forms readiness, service recovery holds, and whether a human must approve the communication. Approval queues work for staff only; this surface does not send messages.</p>
            </div>
            <div className="grid gap-2 lg:grid-cols-4">
              {["Confirmations", "Forms/intake packets", "Post-op instructions", "Recall and waitlist", "No-show recovery"].map((item) => (
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
            <Select name="sourceModule" label="PMS source" options={["PMS_MANUAL_REVIEW", "PMS_PROCEDURE_LOG", "PMS_RECALL", "PMS_LEDGER", "PMS_INSURANCE", "PMS_APPOINTMENT", "PMS_FORMS", "PMS_WAITLIST"]} />
            <Input name="scheduledFor" label="Schedule for" type="datetime-local" />
            <Textarea name="triggerReason" label="Trigger reason" rows={2} required />
            <Textarea name="messageBody" label="Message body" rows={4} required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Stage for approval</button>
          </form>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel eyebrow="Appointment lifecycle" title="Reminders, forms, consent, and quiet hours">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Visit</th>
                  <th className="px-3 py-2">Controls</th>
                  <th className="px-3 py-2">Process</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {lifecycle.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-neutral-950">{item.lastName}, {item.firstName}</p>
                      <p className="mt-1 text-xs text-neutral-500">{item.chartNumber}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-600">
                      <p className="font-semibold text-neutral-800">{item.appointmentType}</p>
                      <p className="mt-1">{fmtDate(item.startsAt)}</p>
                      <p className="mt-1">{item.status.replaceAll("_", " ")}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-600">
                      <p><span className="font-semibold text-neutral-800">Consent:</span> {consentLabel(item.consentStatus)}</p>
                      <p className="mt-1"><span className="font-semibold text-neutral-800">Quiet:</span> {quietWindow(item.quietHoursStart, item.quietHoursEnd)}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-600">
                      <p><span className="font-semibold text-neutral-800">Readiness:</span> {item.readinessStatus.replaceAll("_", " ")}</p>
                      <p className="mt-1"><span className="font-semibold text-neutral-800">Open forms:</span> {item.openForms}</p>
                      <p className="mt-1"><span className="font-semibold text-neutral-800">Reminder drafts:</span> {item.reminderCount}</p>
                      <p className="mt-1"><span className="font-semibold text-neutral-800">Medical:</span> {item.medicalAlertCount} alerts · {item.preMedAlertCount} pre-med · {item.allergyCount} allergies · {item.medicationCount} meds</p>
                      <div className="mt-2 grid gap-1 sm:grid-cols-2">
                        <StageSourceButton patientId={item.patientId} appointmentId={item.id} eventType="APPOINTMENT_CONFIRMATION" sourceModule="PMS_APPOINTMENT" channel="SMS" triggerReason={`Confirm ${item.appointmentType} appointment on ${fmtDate(item.startsAt)}.`} messageBody="Confirmation is staged for staff approval only. Verify consent, quiet hours, forms, and medical alerts before any connector delivery." label="Stage confirmation" />
                        <StageSourceButton patientId={item.patientId} appointmentId={item.id} eventType={item.openForms > 0 ? "INTAKE_PACKET_REMINDER" : "APPOINTMENT_REMINDER"} sourceModule={item.openForms > 0 ? "PMS_FORMS" : "PMS_APPOINTMENT"} channel="SMS" triggerReason={item.openForms > 0 ? "Open intake packet is due before visit." : `Reminder for ${item.appointmentType}.`} messageBody="Reminder is staged internally. No external send occurs until consent, quiet hours, connector readiness, and staff approval clear." label={item.openForms > 0 ? "Stage intake" : "Stage reminder"} />
                        {item.preMedAlertCount || item.medicalAlertCount ? <StageSourceButton patientId={item.patientId} appointmentId={item.id} eventType={item.preMedAlertCount ? "PRE_MED_ALERT_REVIEW" : "MEDICAL_ALERT_REVIEW"} sourceModule="PMS_MEDICAL_ALERT" channel="PHONE" triggerReason="Medical or pre-med safety review is required before patient-facing appointment outreach." messageBody="Clinical safety task is staged internally for staff review. No clinical instruction or external send is claimed." label="Stage safety review" /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel eyebrow="Governance" title="No-send process gates">
          <div className="grid gap-2 p-4">
            {governance.map((item) => (
              <div key={item.area} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{item.area}</p>
                  <StatusFor value={item.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{item.control}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <QueueCard title="Booking request lifecycle" empty="No open booking requests" rows={bookingRequests.map((item) => ({
          id: item.id,
          title: `${personName(item)} · ${item.requestType}`,
          detail: `${item.source} · ${item.preferredWindow ?? item.note ?? "No preference"} · ${consentLabel(item.consentStatus)} · quiet ${quietWindow(item.quietHoursStart, item.quietHoursEnd)} · staged ${item.stagedCount}`,
          status: item.urgency,
          action: item.patientId ? <StageSourceButton patientId={item.patientId} eventType="BOOKING_REQUEST_RESPONSE" sourceModule="PMS_APPOINTMENT_REQUEST" channel="SMS" triggerReason={`Booking request from ${item.source}: ${item.preferredWindow ?? item.note ?? item.requestType}.`} messageBody="Booking response is staged for staff approval only. Create or update the PMS appointment from the schedule workflow after reviewing availability." label="Stage response" /> : null,
        }))} />
        <QueueCard title="Forms and intake packets" empty="No open form packets" rows={formPackets.map((item) => ({
          id: item.id,
          title: `${item.lastName}, ${item.firstName} · ${item.templateName ?? item.formType ?? "Form packet"}`,
          detail: `Due ${fmtDate(item.dueAt)} · ${item.appointmentType ?? "No appointment"} · ${consentLabel(item.consentStatus)} · staged ${item.stagedCount}`,
          status: item.status,
          action: <StageSourceButton patientId={item.patientId} appointmentId={item.appointmentId ?? undefined} eventType="INTAKE_PACKET_REMINDER" sourceModule="PMS_FORMS" channel="SMS" triggerReason={`${item.templateName ?? "Intake packet"} remains open before ${item.appointmentType ?? "the visit"}.`} messageBody="Secure forms/intake reminder is staged internally. No form link is fabricated or sent until the connector and consent gates clear." label="Stage packet" />,
        }))} />
        <QueueCard title="Medical and pre-med alerts" empty="No active medical alert follow-ups" rows={medicalAlerts.map((item) => ({
          id: item.id,
          title: `${item.lastName}, ${item.firstName} · ${item.title}`,
          detail: `${item.details ?? "Active clinical safety alert"} · next ${item.appointmentType ?? "visit not scheduled"} ${fmtDate(item.startsAt)} · staged ${item.stagedCount}`,
          status: item.severity,
          action: <StageSourceButton patientId={item.patientId} appointmentId={item.appointmentId ?? undefined} eventType={item.title.toLowerCase().includes("pre") || String(item.details ?? "").toLowerCase().includes("antibiotic") ? "PRE_MED_ALERT_REVIEW" : "MEDICAL_ALERT_REVIEW"} sourceModule="PMS_MEDICAL_ALERT" channel="PHONE" triggerReason={`Active ${item.severity.toLowerCase()} medical alert: ${item.title}.`} messageBody="Clinical safety review is staged for staff only. No medical advice or patient-facing message is sent from this queue." label="Stage review" />,
        }))} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <QueueCard title="Recall and reactivation" empty="No due recall patients" rows={recallQueue.map((item) => ({
          id: item.id,
          title: `${item.lastName}, ${item.firstName} · ${item.recallType}`,
          detail: `Due ${fmtDate(item.dueDate)} · ${consentLabel(item.consentStatus)} · quiet ${quietWindow(item.quietHoursStart, item.quietHoursEnd)}`,
          status: item.status,
          action: <StageSourceButton patientId={item.patientId} eventType="RECALL_REACTIVATION" sourceModule="PMS_RECALL" channel="SMS" triggerReason={`Recall due: ${item.recallType} on ${fmtDate(item.dueDate)}.`} messageBody="Recall/reactivation outreach is staged internally for staff approval only. No external send occurs from this workbench." label="Stage recall" />,
        }))} />
        <QueueCard title="No-show and cancel recovery" empty="No broken appointments awaiting recovery" rows={brokenAppointments.map((item) => ({
          id: item.id,
          title: `${item.lastName}, ${item.firstName} · ${item.appointmentType}`,
          detail: `${fmtDate(item.startsAt)} · reschedule before review or recall drip`,
          status: item.status,
          action: <StageSourceButton patientId={item.patientId} appointmentId={item.id} eventType={item.status === "NO_SHOW" ? "NO_SHOW_RECOVERY" : "CANCELLATION_FILL"} sourceModule="PMS_APPOINTMENT" channel="SMS" triggerReason={`${item.status.replaceAll("_", " ")} recovery for ${item.appointmentType}.`} messageBody="Broken appointment recovery is staged internally for approval. Staff must review availability and consent before any connector delivery." label="Stage recovery" />,
        }))} />
        <QueueCard title="Waitlist and ASAP fill" empty="No open waitlist requests" rows={waitlist.map((item) => ({
          id: item.id,
          title: `${personName(item)} · ${item.requestType}`,
          detail: `${item.source} · ${item.preferredWindow ?? item.note ?? "Any matching slot"}`,
          status: item.urgency,
          action: item.patientId ? <StageSourceButton patientId={item.patientId} eventType="WAITLIST_FILL" sourceModule="PMS_WAITLIST" channel="SMS" triggerReason={`Waitlist/ASAP request: ${item.preferredWindow ?? item.note ?? item.requestType}.`} messageBody="Waitlist fill outreach is staged for staff approval only. PMS schedule changes must be completed in the scheduler." label="Stage waitlist" /> : null,
        }))} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <QueueCard title="Post-op and clinical follow-up" empty="No recent completed procedures need post-op review" rows={postOpQueue.map((item) => ({
          id: item.id,
          title: `${item.lastName}, ${item.firstName} · ${item.code}`,
          detail: `${item.description} · ${fmtDate(item.serviceDate)} · ${item.postOpCount ? "post-op staged" : "needs clinical decision"}`,
          status: item.postOpCount ? "STAGED" : "OPEN",
          action: <StageSourceButton patientId={item.patientId} appointmentId={item.appointmentId ?? undefined} procedureLogId={item.id} eventType="POST_OP_INSTRUCTIONS" sourceModule="PMS_PROCEDURE_LOG" channel="SMS" triggerReason={`Completed procedure ${item.code}: ${item.description}.`} messageBody="Post-op instructions are staged for clinical review and staff approval only. No patient-facing medical instruction is sent from this action." label="Stage post-op" />,
        }))} />
        <QueueCard title="Cross-module PMS tasks" empty="No open engagement handoff tasks" rows={crossModuleTasks.map((item) => ({
          id: item.id,
          title: item.title,
          detail: `${personName(item)} · ${item.ownerRoleKey.replaceAll("_", " ")} · due ${fmtDate(item.dueAt)}`,
          status: item.priority,
        }))} />
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
                      <p className="mt-1">{event.appointmentType ?? event.procedureCode ?? "Manual review"} · {event.appointmentStatus?.replaceAll("_", " ") ?? "PMS linked"}</p>
                      <p className="mt-1">{fmtDate(event.scheduledFor)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-neutral-950">{event.eventType.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-neutral-500">{event.channel}</p>
                    </td>
                    <td className="max-w-xl px-4 py-3">
                      <p className="text-xs font-semibold text-neutral-700">{event.triggerReason}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">{event.messageBody}</p>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500">Consent {consentLabel(event.consentStatus)} · quiet {quietWindow(event.quietHoursStart, event.quietHoursEnd)} · forms {event.openForms} · medical {event.medicalAlertCount} · pre-med {event.preMedAlertCount} · tasks {event.openTasks}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusFor value={event.status} />
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-neutral-500">{event.approvalStatus.replaceAll("_", " ")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-48 flex-col gap-2">
                        <StatusButton eventId={event.id} status="READY_FOR_APPROVAL" label="Mark ready" />
                        <StatusButton eventId={event.id} status="APPROVED_TO_SEND" label="Approve queue only" />
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

function StageSourceButton({
  patientId,
  appointmentId,
  procedureLogId,
  eventType,
  sourceModule,
  channel,
  triggerReason,
  messageBody,
  label,
}: {
  patientId: string;
  appointmentId?: string;
  procedureLogId?: string;
  eventType: string;
  sourceModule: string;
  channel: string;
  triggerReason: string;
  messageBody: string;
  label: string;
}) {
  return (
    <form action={stageAction}>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="appointmentId" value={appointmentId ?? ""} />
      <input type="hidden" name="procedureLogId" value={procedureLogId ?? ""} />
      <input type="hidden" name="eventType" value={eventType} />
      <input type="hidden" name="sourceModule" value={sourceModule} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="triggerReason" value={triggerReason} />
      <input type="hidden" name="messageBody" value={messageBody} />
      <button className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{label}</button>
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

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">{eyebrow}</p>
        <h2 className="mt-0.5 text-base font-semibold text-neutral-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function QueueCard({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; title: string; detail: string; status: string; action?: ReactNode | null }> }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      </div>
      <div className="grid gap-2 p-4">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-950">{row.title}</p>
              <StatusFor value={row.status} />
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-600">{row.detail}</p>
            {row.action ? <div className="mt-3">{row.action}</div> : null}
          </div>
        )) : <EmptyPmsState title={empty} body="This queue is sourced from PMS records and only creates internal follow-up work until a real communications connector is configured." />}
      </div>
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
