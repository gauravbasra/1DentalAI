import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createPhoneCallControlAction,
  createPhoneConversation,
  createPhoneOutboundMessage,
  createPhoneRoutingRule,
  getPhoneOperatingCenter,
  updatePhoneCallTaskStatus,
  updatePhoneConversationStatus,
  updatePhoneDeviceStatus,
  updatePhoneExtensionStatus,
  updatePhoneNumberStatus,
  updatePhoneOutboundMessageApproval,
  updatePhoneProviderStatus,
  updatePhoneVoicemailStatus,
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
  openBalanceCents: number;
  overdueBalanceCents: number;
  openPmsTasks: number;
  nextAppointments: ScreenPopAppointment[];
  openTreatmentPlans: ScreenPopTreatmentPlan[];
  dueRecalls: ScreenPopRecall[];
  openForms: ScreenPopForm[];
  communicationPreferences: ScreenPopPreference[];
};
type MessageRow = { id: string; firstName: string | null; lastName: string | null; chartNumber: string | null; channel: string; recipientNumber: string | null; messageType: string; body: string; approvalStatus: string; deliveryStatus: string; consentStatus: string; connectorStatus: string; linkType: string | null; linkTargetId: string | null; linkLabel: string | null; readiness: unknown; blockedReason: string | null; openBalanceCents: number; openFormCount: number };
type RouteRow = { id: string; name: string; triggerType: string; destinationType: string; destination: string; priority: number; status: string; failoverAction: string | null; locationName: string | null };
type TaskRow = { id: string; firstName: string | null; lastName: string | null; chartNumber: string | null; aiIntent: string | null; callerNumber: string | null; taskType: string; priority: string; status: string; dueAt: string | null; ownerRoleKey: string; nextAction: string };
type AnalyticsRow = { id: string; callerName: string | null; callerNumber: string | null; aiIntent: string | null; firstName: string | null; lastName: string | null; chartNumber: string | null; bookingIntentScore: number; serviceRecoveryScore: number; revenueOpportunityCents: number; keywords: string[] | null; riskFlags: string[] | null; summaryQuality: string };
type NumberRow = { id: string; phoneNumber: string; label: string; numberType: string; provider: string | null; portStatus: string; e911Status: string; smsStatus: string; voiceStatus: string; recordingPolicy: string; status: string; locationName: string | null; routeName: string | null; defaultRouteId: string | null; emergencyRoute: string | null };
type ExtensionRow = { id: string; extensionNumber: string; displayName: string; ownerRoleKey: string; extensionType: string; voicemailEnabled: boolean; status: string; locationName: string | null };
type DeviceRow = { id: string; label: string; deviceType: string; manufacturer: string | null; model: string | null; macAddress: string | null; provisioningStatus: string; registrationStatus: string; assignedTo: string | null; deskLocation: string | null; extensionNumber: string | null; extensionName: string | null };
type ProviderRow = { id: string; providerType: string; name: string; trunkDomain: string | null; outboundCallerId: string | null; credentialStatus: string; webhookStatus: string; e911Status: string; status: string; capabilityMap: unknown; nextAction: string; lastSmokeTestAt: string | null };
type ActiveCallRow = { id: string; conversationId: string | null; fromNumber: string; toNumber: string; direction: string; callState: string; extensionNumber: string | null; extensionName: string | null; callerName: string | null; aiIntent: string | null; parkedSlot: string | null; holdStartedAt: string | null; startedAt: string };
type ControlRow = { id: string; actionType: string; requestedByRole: string; targetNumber: string | null; targetParkSlot: string | null; providerStatus: string; blockedReason: string | null; resultSummary: string | null; targetExtensionName: string | null; extensionNumber: string | null; createdAt: string };
type VoicemailRow = { id: string; callerNumber: string | null; callerName: string | null; status: string; durationSeconds: number | null; transcription: string | null; ownerRoleKey: string; dueAt: string | null; extensionNumber: string | null; extensionName: string | null };
type ScreenPopAppointment = { id: string; appointmentType: string; startsAt: string; status: string; readinessStatus: string; productionCents: number };
type ScreenPopTreatmentPlan = { id: string; name: string; status: string; totalFeeCents: number; patientEstimateCents: number };
type ScreenPopRecall = { id: string; recallType: string; dueDate: string; status: string };
type ScreenPopForm = { id: string; templateName: string | null; status: string; dueAt: string | null };
type ScreenPopPreference = { channel: string; destination: string; consentStatus: string; quietHoursStart: string | null; quietHoursEnd: string | null };
type SetupReadiness = { status: string; blocked: number; checks: Array<{ label: string; status: string; nextAction: string }> };

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
    linkType: String(formData.get("linkType") ?? "") || undefined,
    linkTargetId: String(formData.get("linkTargetId") ?? "") || undefined,
    linkLabel: String(formData.get("linkLabel") ?? "") || undefined,
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

async function callControlAction(formData: FormData) {
  "use server";
  await createPhoneCallControlAction({
    activeCallId: String(formData.get("activeCallId") ?? "") || undefined,
    conversationId: String(formData.get("conversationId") ?? "") || undefined,
    actionType: String(formData.get("actionType") ?? "OUTBOUND_DIAL"),
    requestedByRole: String(formData.get("requestedByRole") ?? "front_desk"),
    targetExtensionId: String(formData.get("targetExtensionId") ?? "") || undefined,
    targetNumber: String(formData.get("targetNumber") ?? "") || undefined,
    targetParkSlot: String(formData.get("targetParkSlot") ?? "") || undefined,
  });
  revalidatePath("/app/phone");
}

async function deviceAction(formData: FormData) {
  "use server";
  await updatePhoneDeviceStatus(String(formData.get("id") ?? ""), String(formData.get("provisioningStatus") ?? "NOT_PROVISIONED"), String(formData.get("registrationStatus") ?? "OFFLINE"));
  revalidatePath("/app/phone");
}

async function numberAction(formData: FormData) {
  "use server";
  await updatePhoneNumberStatus(
    String(formData.get("id") ?? ""),
    String(formData.get("portStatus") ?? "NOT_STARTED"),
    String(formData.get("voiceStatus") ?? "NOT_CONFIGURED"),
    String(formData.get("smsStatus") ?? "NOT_CONFIGURED"),
    String(formData.get("e911Status") ?? "NOT_CONFIGURED"),
    String(formData.get("status") ?? "SETUP_REQUIRED"),
  );
  revalidatePath("/app/phone");
}

async function extensionAction(formData: FormData) {
  "use server";
  await updatePhoneExtensionStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "ACTIVE"), String(formData.get("voicemailEnabled") ?? "true") === "true");
  revalidatePath("/app/phone");
}

async function providerAction(formData: FormData) {
  "use server";
  await updatePhoneProviderStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "SETUP_REQUIRED"), String(formData.get("credentialStatus") ?? "MISSING"), String(formData.get("webhookStatus") ?? "NOT_CONFIGURED"));
  revalidatePath("/app/phone");
}

async function voicemailAction(formData: FormData) {
  "use server";
  await updatePhoneVoicemailStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "NEW"));
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
  const numbers = center.numbers as NumberRow[];
  const extensions = center.extensions as ExtensionRow[];
  const devices = center.devices as DeviceRow[];
  const providers = center.providers as ProviderRow[];
  const activeCalls = center.activeCalls as ActiveCallRow[];
  const controls = center.controls as ControlRow[];
  const voicemails = center.voicemails as VoicemailRow[];
  const setupReadiness = center.setupReadiness as SetupReadiness;

  return (
    <FoundationShell active="/app/phone" roleKey={role.key}>
      <PageHeader
        eyebrow="Voice, SMS, desk phones, and AI receptionist"
        title="Dental phone system control center"
        body="This is the telephony operating layer: carrier setup, number porting, E911, desk phones, softphones, extensions, call routing, hold, transfer, call park, voicemail, missed-call recovery, PMS screen pop, and approved outbound communication."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/phone" />

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Open calls" value={metrics.openCalls} />
        <Metric label="Missed calls" value={metrics.missedCalls} />
        <Metric label="Setup items" value={metrics.setupRequired} />
        <Metric label="Offline devices" value={metrics.offlineDevices} />
        <Metric label="Call controls" value={metrics.activeCallControls} />
        <Metric label="Voicemails" value={metrics.newVoicemails} />
        <Metric label="Open tasks" value={metrics.openTasks} />
        <Metric label="Opportunity" value={<Money cents={Number(metrics.opportunityCents)} />} />
      </section>

      <section className="mt-4">
        <PmsCard title="Phone setup readiness" eyebrow="No live calling, texting, payment links, or form links until every required connector check passes">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-950">{clean(setupReadiness.status)} · {setupReadiness.blocked} blocked readiness checks</p>
            <StatusFor value={setupReadiness.status} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {setupReadiness.checks.map((check) => (
              <div key={check.label} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{check.label}</p>
                  <StatusFor value={check.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{check.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <PmsCard title="Carrier, numbers, and compliance setup" eyebrow="Porting, E911, voice, SMS, recording policy">
          <div className="grid gap-3">
            {providers.map((provider) => (
              <div key={provider.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{provider.name} · {clean(provider.providerType)}</p>
                    <p className="mt-1 text-xs text-neutral-600">Caller ID {provider.outboundCallerId ?? "not assigned"} · trunk {provider.trunkDomain ?? "not configured"}</p>
                  </div>
                  <StatusFor value={provider.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Credentials" value={clean(provider.credentialStatus)} />
                  <MiniMetric label="Webhooks" value={clean(provider.webhookStatus)} />
                  <MiniMetric label="E911" value={clean(provider.e911Status)} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{provider.nextAction}</p>
                <form action={providerAction} className="mt-3 grid gap-2 sm:grid-cols-4">
                  <input type="hidden" name="id" value={provider.id} />
                  <Select name="status" label="Status" options={["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} compact />
                  <Select name="credentialStatus" label="Credentials" options={["MISSING", "STAGED_IN_VAULT", "VALIDATED"]} compact />
                  <Select name="webhookStatus" label="Webhooks" options={["NOT_CONFIGURED", "CONFIGURED", "VERIFIED"]} compact />
                  <label className="grid gap-1 text-xs font-semibold text-transparent">Update<button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update provider</button></label>
                </form>
              </div>
            ))}
            {numbers.map((number) => (
              <div key={number.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{number.label} · {number.phoneNumber}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(number.numberType)} · {number.locationName ?? "Practice"} · route {number.routeName ?? number.defaultRouteId ?? "not assigned"}</p>
                  </div>
                  <StatusFor value={number.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  <MiniMetric label="Port" value={clean(number.portStatus)} />
                  <MiniMetric label="Voice" value={clean(number.voiceStatus)} />
                  <MiniMetric label="SMS" value={clean(number.smsStatus)} />
                  <MiniMetric label="E911" value={clean(number.e911Status)} />
                  <MiniMetric label="Recording" value={clean(number.recordingPolicy)} />
                </div>
                <form action={numberAction} className="mt-3 grid gap-2 sm:grid-cols-6">
                  <input type="hidden" name="id" value={number.id} />
                  <Select name="portStatus" label="Port" options={["NOT_STARTED", "READY_TO_PORT", "PORTING", "PORTED", "BLOCKED"]} compact />
                  <Select name="voiceStatus" label="Voice" options={["NOT_CONFIGURED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} compact />
                  <Select name="smsStatus" label="SMS" options={["NOT_CONFIGURED", "REGISTRATION_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} compact />
                  <Select name="e911Status" label="E911" options={["NOT_CONFIGURED", "NEEDS_VALIDATION", "VALIDATED", "ACTIVE", "BLOCKED"]} compact />
                  <Select name="status" label="Number" options={["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} compact />
                  <label className="grid gap-1 text-xs font-semibold text-transparent">Update<button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update number</button></label>
                </form>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Desk phones, softphones, and extensions" eyebrow="Physical phone service and WebRTC app readiness">
          <div className="grid gap-3 lg:grid-cols-2">
            {extensions.map((extension) => (
              <div key={extension.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">Ext {extension.extensionNumber} · {extension.displayName}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(extension.extensionType)} · owner {clean(extension.ownerRoleKey)} · voicemail {extension.voicemailEnabled ? "on" : "off"}</p>
                  </div>
                  <StatusFor value={extension.status} />
                </div>
                <form action={extensionAction} className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="id" value={extension.id} />
                  <Select name="status" label="Extension" options={["ACTIVE", "SETUP_REQUIRED", "DISABLED", "BLOCKED"]} compact />
                  <Select name="voicemailEnabled" label="Voicemail" options={["true", "false"]} compact />
                  <label className="grid gap-1 text-xs font-semibold text-transparent">Update<button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update extension</button></label>
                </form>
              </div>
            ))}
            {devices.map((device) => (
              <div key={device.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{device.label}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(device.deviceType)} · {device.manufacturer ?? "Unknown"} {device.model ?? ""} · ext {device.extensionNumber ?? "unassigned"}</p>
                    <p className="mt-1 text-xs text-neutral-600">{device.assignedTo ?? "No assignment"} · {device.deskLocation ?? "No location"}</p>
                  </div>
                  <StatusFor value={device.registrationStatus} />
                </div>
                <form action={deviceAction} className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="id" value={device.id} />
                  <Select name="provisioningStatus" label="Provisioning" options={["NOT_PROVISIONED", "NEEDS_MAC_ADDRESS", "CREDENTIALS_REQUIRED", "PROVISIONED"]} compact />
                  <Select name="registrationStatus" label="Registration" options={["OFFLINE", "REGISTERING", "ONLINE", "ERROR"]} compact />
                  <label className="grid gap-1 text-xs font-semibold text-transparent">Update<button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update device</button></label>
                </form>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Active calls and call controls" eyebrow="Dial, answer, hold, warm transfer, call park">
          <form action={callControlAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-xs font-semibold text-neutral-700">Active call<select name="activeCallId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">New outbound/no active call</option>{activeCalls.map((call) => <option key={call.id} value={call.id}>{call.fromNumber} to {call.toNumber} - {clean(call.callState)}</option>)}</select></label>
              <Select name="actionType" label="Action" options={["OUTBOUND_DIAL", "ANSWER", "HOLD", "RESUME", "WARM_TRANSFER", "BLIND_TRANSFER", "CALL_PARK", "PICKUP_PARK", "SEND_TO_VOICEMAIL", "END_CALL"]} />
              <Select name="requestedByRole" label="Role" options={["front_desk", "billing_rcm", "practice_manager", "associate_provider"]} />
              <label className="grid gap-1 text-xs font-semibold text-neutral-700">Target extension<select name="targetExtensionId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">None</option>{extensions.map((extension) => <option key={extension.id} value={extension.id}>{extension.extensionNumber} - {extension.displayName}</option>)}</select></label>
              <Input name="targetNumber" label="Target phone number" />
              <Input name="targetParkSlot" label="Park slot" />
            </div>
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Stage call control</button>
          </form>
          <div className="grid gap-3">
            {activeCalls.map((call) => (
              <div key={call.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{call.fromNumber} → {call.toNumber}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(call.direction)} · {call.callerName ?? "Unknown caller"} · ext {call.extensionNumber ?? "none"} {call.parkedSlot ? `· parked ${call.parkedSlot}` : ""}</p>
                  </div>
                  <StatusFor value={call.callState} />
                </div>
              </div>
            ))}
            {controls.map((control) => (
              <div key={control.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{clean(control.actionType)} · {control.targetExtensionName ?? control.targetNumber ?? control.targetParkSlot ?? "no target"}</p>
                    <p className="mt-1 text-xs text-neutral-600">{control.resultSummary}</p>
                  </div>
                  <StatusFor value={control.providerStatus} />
                </div>
                {control.blockedReason ? <p className="mt-2 text-xs leading-5 text-amber-900">{control.blockedReason}</p> : null}
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Voicemail and missed-call recovery" eyebrow="Transcription, triage, callback ownership">
          <div className="grid gap-3">
            {voicemails.map((vm) => (
              <div key={vm.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{vm.callerName ?? "Unknown caller"} · {vm.callerNumber ?? "No number"}</p>
                    <p className="mt-1 text-xs text-neutral-600">Ext {vm.extensionNumber ?? "none"} · owner {clean(vm.ownerRoleKey)} · {vm.durationSeconds ?? 0}s</p>
                  </div>
                  <StatusFor value={vm.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{vm.transcription ?? "No transcription yet."}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <VoicemailButton id={vm.id} status="NEW" label="New" />
                  <VoicemailButton id={vm.id} status="IN_PROGRESS" label="Working" />
                  <VoicemailButton id={vm.id} status="COMPLETED" label="Done" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <PmsCard title="Log or import call" eyebrow="Telephony connector intake">
          <form action={createAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Matched patient<select name="patientId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">Unknown caller</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} - {p.chartNumber}</option>)}</select></label>
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

        <PmsCard title="PMS caller inbox" eyebrow="Screen pop, schedule context, call recovery">
          <div className="grid gap-3">
            {conversations.map((call) => (
              <div key={call.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-950">{call.callerName ?? call.callerNumber ?? "Unknown caller"} · {clean(call.aiIntent ?? "call")}</p>
                    <p className="mt-1 text-xs text-neutral-600">{call.lastName ? `${call.lastName}, ${call.firstName} - ${call.chartNumber}` : "No PMS match"} · {new Date(call.startedAt).toLocaleString()}</p>
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
                <ScreenPop call={call} />
                <p className="mt-2 text-xs leading-5 text-neutral-500">{list("Keywords", call.keywords)} {list("Risks", call.riskFlags)}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <StatusButton id={call.id} status="OPEN" followUpStatus="READY_FOR_APPROVAL" label="Ready follow-up" />
                  <StatusButton id={call.id} status="OPEN" followUpStatus="BLOCKED_RCM_REVIEW" label="Send to RCM" />
                  <StatusButton id={call.id} status="OPEN" followUpStatus="PATIENT_FINDER" label="Patient Finder" />
                  <StatusButton id={call.id} status="OPEN" followUpStatus="CHART_NOTE_REVIEW" label="Chart review" />
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
              <Select name="messageType" label="Type" options={["MISSED_CALL_TEXT", "APPOINTMENT_CONFIRMATION_REPLY", "OVERDUE_BALANCE_REMINDER", "PAYMENT_LINK", "FORM_PACKET_LINK", "ONLINE_SCHEDULING_LINK", "BILLING_HANDOFF_REPLY", "RECALL_REPLY", "REVIEW_RECOVERY"]} />
              <Select name="consentStatus" label="Consent" options={["UNKNOWN", "VERIFIED", "OPTED_OUT"]} />
              <Select name="linkType" label="Staged link" options={["", "PAYMENT_LINK", "FORM_PACKET_LINK", "ONLINE_SCHEDULING_LINK"]} />
              <Input name="linkTargetId" label="Link target ID" />
              <Input name="linkLabel" label="Link label" />
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
                <p className="mt-1 text-xs text-neutral-600">{message.lastName ? `${message.lastName}, ${message.firstName} - ${message.chartNumber}` : message.recipientNumber ?? "No recipient"} · {clean(message.deliveryStatus)}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <MiniMetric label="Consent" value={clean(message.consentStatus)} />
                  <MiniMetric label="Connector" value={clean(message.connectorStatus)} />
                  <MiniMetric label="Link" value={message.linkLabel ?? clean(message.linkType ?? "none")} />
                  <MiniMetric label="PMS context" value={message.linkType === "PAYMENT_LINK" ? <Money cents={Number(message.openBalanceCents ?? 0)} /> : `${message.openFormCount ?? 0} forms`} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{message.body}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{readinessSummary(message.readiness)}</p>
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

        <PmsCard title="Phone tasks and call intelligence" eyebrow="Missed calls, billing handoffs, conversion analytics">
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{clean(task.taskType)}</p>
                    <p className="mt-1 text-xs text-neutral-600">{task.lastName ? `${task.lastName}, ${task.firstName} - ${task.chartNumber}` : task.callerNumber ?? "No PMS match"} · owner {clean(task.ownerRoleKey)}</p>
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
            {analytics.map((row) => (
              <div key={row.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <p className="text-sm font-semibold text-neutral-950">{row.callerName ?? row.callerNumber ?? "Unknown caller"} · {clean(row.aiIntent ?? "call")}</p>
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

      <section className="mt-4">
        <PmsCard title="Routing rules" eyebrow="Queues, ring groups, AI receptionist, voicemail, failover">
          <form action={routeAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <Input name="name" label="Rule name" />
            <div className="grid gap-3 sm:grid-cols-4">
              <Select name="triggerType" label="Trigger" options={["INTENT_NEW_PATIENT_OR_IMPLANT", "INTENT_EMERGENCY", "INTENT_BILLING_OR_INSURANCE", "AFTER_HOURS", "MISSED_CALL"]} />
              <Select name="destinationType" label="Destination type" options={["QUEUE", "RING_GROUP", "VOICEMAIL", "AI_RECEPTIONIST", "EXTENSION"]} />
              <Input name="destination" label="Destination" />
              <Input name="priority" label="Priority" />
            </div>
            <Input name="failoverAction" label="Failover action" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Save routing rule</button>
          </form>
          <div className="grid gap-3 lg:grid-cols-3">
            {routes.map((route) => (
              <div key={route.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{route.name}</p>
                  <StatusFor value={route.status} />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{clean(route.triggerType)} to {clean(route.destinationType)} · {route.destination}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Failover: {route.failoverAction ?? "not configured"}</p>
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

function VoicemailButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={voicemailAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><ActionButton label={label} /></form>;
}

function ScreenPop({ call }: { call: ConversationRow }) {
  const appointments = asList<ScreenPopAppointment>(call.nextAppointments);
  const treatmentPlans = asList<ScreenPopTreatmentPlan>(call.openTreatmentPlans);
  const recalls = asList<ScreenPopRecall>(call.dueRecalls);
  const forms = asList<ScreenPopForm>(call.openForms);
  const preferences = asList<ScreenPopPreference>(call.communicationPreferences);
  return (
    <div className="mt-3 rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">PMS screen pop</p>
        <p className="text-xs font-semibold text-neutral-700">Tasks {call.openPmsTasks ?? 0} · Balance <Money cents={Number(call.openBalanceCents ?? 0)} /> · Overdue <Money cents={Number(call.overdueBalanceCents ?? 0)} /></p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <ScreenPopList title="Appointments" empty="No upcoming appointment" rows={appointments.map((item) => `${fmtDate(item.startsAt)} · ${item.appointmentType} · ${clean(item.readinessStatus)}`)} />
        <ScreenPopList title="Treatment" empty="No open treatment plan" rows={treatmentPlans.map((item) => `${item.name} · ${clean(item.status)} · ${moneyText(item.patientEstimateCents)} patient est.`)} />
        <ScreenPopList title="Recall" empty="No due recall" rows={recalls.map((item) => `${clean(item.recallType)} · ${fmtDate(item.dueDate)} · ${clean(item.status)}`)} />
        <ScreenPopList title="Forms and consent" empty="No open forms" rows={forms.map((item) => `${item.templateName ?? "Form packet"} · ${clean(item.status)}${item.dueAt ? ` · due ${fmtDate(item.dueAt)}` : ""}`)} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {preferences.length ? preferences.map((pref) => (
          <div key={`${pref.channel}-${pref.destination}`} className="rounded-md bg-neutral-50 p-2 ring-1 ring-neutral-200">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{clean(pref.channel)} preference</p>
            <p className="mt-1 truncate text-xs font-semibold text-neutral-900">{pref.destination}</p>
            <p className="mt-1 text-xs text-neutral-600">Consent {clean(pref.consentStatus)} · Quiet {pref.quietHoursStart ?? "none"}-{pref.quietHoursEnd ?? "none"}</p>
          </div>
        )) : <p className="text-xs leading-5 text-neutral-500">No communication preference is recorded for this PMS patient.</p>}
      </div>
    </div>
  );
}

function ScreenPopList({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{title}</p>
      <div className="mt-1 grid gap-1">
        {rows.length ? rows.map((row) => <p key={row} className="text-xs leading-5 text-neutral-700">{row}</p>) : <p className="text-xs leading-5 text-neutral-500">{empty}</p>}
      </div>
    </div>
  );
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
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options, compact = false }: { name: string; label: string; options: string[]; compact?: boolean }) {
  return <label className={`grid gap-1 text-xs font-semibold text-neutral-700 ${compact ? "min-w-0" : ""}`}>{label}<select name={name} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{clean(option)}</option>)}</select></label>;
}

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={4} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function fmtDate(value: string | Date) {
  return new Date(value).toLocaleDateString();
}

function moneyText(cents: number) {
  return `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function readinessSummary(value: unknown) {
  if (!value || typeof value !== "object") return "Readiness not recorded.";
  const readiness = value as { missing?: unknown; semantics?: unknown; externalSendBlocked?: unknown };
  const missing = Array.isArray(readiness.missing) ? readiness.missing.filter(Boolean).join(", ") : "";
  const semantics = typeof readiness.semantics === "string" ? readiness.semantics : "Internal queue only; no external transport is claimed.";
  return missing ? `${semantics} Missing: ${missing}.` : semantics;
}

function clean(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function list(label: string, values: string[] | null) {
  return values?.length ? `${label}: ${values.join(", ")}.` : "";
}
