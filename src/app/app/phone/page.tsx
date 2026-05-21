import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createPhoneCallControlAction,
  createPhoneConversation,
  createPhoneDispositionTask,
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
import { crawlKnowledgePage, postStaffWebchatEntry, updateKnowledgeSourceReview } from "@/lib/webchat/repository";

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
type DeviceRow = { id: string; label: string; deviceType: string; manufacturer: string | null; model: string | null; macAddress: string | null; sipUsername: string | null; provisioningStatus: string; registrationStatus: string; assignedTo: string | null; deskLocation: string | null; extensionNumber: string | null; extensionName: string | null };
type ProviderRow = { id: string; providerType: string; name: string; trunkDomain: string | null; outboundCallerId: string | null; credentialStatus: string; webhookStatus: string; e911Status: string; status: string; capabilityMap: unknown; nextAction: string; lastSmokeTestAt: string | null };
type ActiveCallRow = { id: string; conversationId: string | null; fromNumber: string; toNumber: string; direction: string; callState: string; extensionNumber: string | null; extensionName: string | null; callerName: string | null; aiIntent: string | null; parkedSlot: string | null; holdStartedAt: string | null; startedAt: string };
type ControlRow = { id: string; actionType: string; requestedByRole: string; targetNumber: string | null; targetParkSlot: string | null; providerStatus: string; blockedReason: string | null; resultSummary: string | null; targetExtensionName: string | null; extensionNumber: string | null; createdAt: string };
type VoicemailRow = { id: string; callerNumber: string | null; callerName: string | null; status: string; durationSeconds: number | null; transcription: string | null; ownerRoleKey: string; dueAt: string | null; extensionNumber: string | null; extensionName: string | null };
type ChannelSettingRow = { id: string; channel: string; displayName: string; status: string; theme: unknown; nlpMode: string; knowledgeBaseStatus: string; schedulingStatus: string; formsStatus: string; connectorStatus: string; approvalPolicy: unknown; nextAction: string };
type KnowledgeSourceRow = { id: string; title: string; sourceType: string; sourceModule: string; serviceLine: string | null; status: string; ownerRoleKey: string; contentSummary: string; sourceUrl: string | null; lastReviewedAt: string | null; nextAction: string };
type WebChatRow = { id: string; visitorName: string | null; visitorPhone: string | null; visitorEmail: string | null; sourcePage: string | null; sourceChannel: string | null; campaignSource: string | null; referrerUrl: string | null; landingPageSlug: string | null; nlpIntent: string | null; nlpConfidence: number; leadScore: number; qualificationStage: string | null; status: string; transcriptSummary: string | null; schedulingOutcome: string; pmsWritebackStatus: string; leadFormName: string | null; serviceLine: string | null; ownerRoleKey: string; nextBestAction: string | null; staffOwnerDueAt: string | null; blockedReason: string | null; createdAt: string; updatedAt: string };
type WebChatMessageRow = { id: string; conversationId: string; senderType: string; senderName: string | null; body: string; intent: string | null; sentiment: string | null; confidence: number; actionType: string | null; actionStatus: string; metadata: unknown; sourcePage: string | null; visitorName: string | null; visitorPhone: string | null; visitorEmail: string | null; conversationStatus: string; createdAt: string };
type LeadFormRow = { id: string; name: string; serviceLine: string; sourceChannel: string; status: string; fieldSchema: unknown; pmsMapping: unknown; routingRule: string | null; connectorStatus: string; conversionStatus: string; nextAction: string };
type FormPacketRow = { id: string; packetType: string; status: string; deliveryChannel: string; pmsWritebackStatus: string; consentStatus: string; dueAt: string | null; nextAction: string; firstName: string | null; lastName: string | null; chartNumber: string | null; appointmentType: string | null; startsAt: string | null };
type SchedulingRuleRow = { id: string; name: string; sourceChannel: string; appointmentCategoryName: string | null; providerName: string | null; locationName: string | null; status: string; bookingWindowDays: number; allowReschedule: boolean; requireHumanApproval: boolean; pmsWritebackStatus: string; conflictPolicy: unknown; nextAction: string };
type ScreenPopAppointment = { id: string; appointmentType: string; startsAt: string; status: string; readinessStatus: string; productionCents: number };
type ScreenPopTreatmentPlan = { id: string; name: string; status: string; totalFeeCents: number; patientEstimateCents: number };
type ScreenPopRecall = { id: string; recallType: string; dueDate: string; status: string };
type ScreenPopForm = { id: string; templateName: string | null; status: string; dueAt: string | null };
type ScreenPopPreference = { channel: string; destination: string; consentStatus: string; quietHoursStart: string | null; quietHoursEnd: string | null };
type SetupReadiness = { status: string; blocked: number; checks: Array<{ label: string; status: string; nextAction: string }> };
type ArchitectureCandidate = { id: string; name: string; role: string; status: string; externalExecutionPolicy: string; modules: string[]; seams: string[]; readiness: Array<{ label: string; status: string; nextAction: string }> };

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

async function dispositionAction(formData: FormData) {
  "use server";
  await createPhoneDispositionTask({
    conversationId: String(formData.get("conversationId") ?? ""),
    disposition: String(formData.get("disposition") ?? "GENERAL_PHONE_DISPOSITION"),
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? "front_desk"),
    priority: String(formData.get("priority") ?? "NORMAL"),
    dueIn: String(formData.get("dueIn") ?? "4 hours"),
    nextAction: String(formData.get("nextAction") ?? ""),
  });
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
  await updatePhoneDeviceStatus(
    String(formData.get("id") ?? ""),
    String(formData.get("provisioningStatus") ?? "NOT_PROVISIONED"),
    String(formData.get("registrationStatus") ?? "OFFLINE"),
    String(formData.get("macAddress") ?? ""),
    String(formData.get("sipUsername") ?? ""),
    String(formData.get("assignedTo") ?? ""),
    String(formData.get("deskLocation") ?? ""),
  );
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
  await updatePhoneProviderStatus(
    String(formData.get("id") ?? ""),
    String(formData.get("status") ?? "SETUP_REQUIRED"),
    String(formData.get("credentialStatus") ?? "MISSING"),
    String(formData.get("webhookStatus") ?? "NOT_CONFIGURED"),
    String(formData.get("e911Status") ?? ""),
    String(formData.get("trunkDomain") ?? ""),
    String(formData.get("outboundCallerId") ?? ""),
    String(formData.get("nextAction") ?? ""),
  );
  revalidatePath("/app/phone");
}

async function voicemailAction(formData: FormData) {
  "use server";
  await updatePhoneVoicemailStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "NEW"));
  revalidatePath("/app/phone");
}

async function webchatStaffAction(formData: FormData) {
  "use server";
  await postStaffWebchatEntry({
    conversationId: String(formData.get("conversationId") ?? ""),
    body: String(formData.get("body") ?? ""),
    senderName: String(formData.get("senderName") ?? "Front desk"),
    entryType: String(formData.get("entryType") ?? "STAFF_NOTE") === "STAFF_REPLY" ? "STAFF_REPLY" : "STAFF_NOTE",
    status: String(formData.get("status") ?? "OPEN"),
  });
  revalidatePath("/app/phone");
}

async function webchatKnowledgeReviewAction(formData: FormData) {
  "use server";
  await updateKnowledgeSourceReview({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? "READY_FOR_RETRIEVAL"),
    actorRole: String(formData.get("actorRole") ?? "practice_manager"),
  });
  revalidatePath("/app/phone");
}

async function webchatKnowledgeCrawlAction(formData: FormData) {
  "use server";
  const url = String(formData.get("url") ?? "");
  const parsed = new URL(url);
  const firstPartyHost = parsed.hostname === "1dentalai.com" || parsed.hostname.endsWith(".1dentalai.com");
  if (!firstPartyHost && !process.env.WEBCHAT_CRAWL_TOKEN) throw new Error("External knowledge crawling requires WEBCHAT_CRAWL_TOKEN.");
  await crawlKnowledgePage({ url });
  revalidatePath("/app/phone");
}

export default async function PhonePage({ searchParams }: { searchParams: Promise<{ role?: string; view?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const view = ["today", "setup", "calls", "inbox", "messages", "routing", "webchat", "scheduling", "settings"].includes(params.view ?? "") ? String(params.view) : "today";
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
  const channelSettings = center.channelSettings as ChannelSettingRow[];
  const knowledgeSources = center.knowledgeSources as KnowledgeSourceRow[];
  const webChats = center.webChats as WebChatRow[];
  const webChatMessages = center.webChatMessages as WebChatMessageRow[];
  const leadForms = center.leadForms as LeadFormRow[];
  const formPackets = center.formPackets as FormPacketRow[];
  const schedulingRules = center.schedulingRules as SchedulingRuleRow[];
  const setupReadiness = center.setupReadiness as SetupReadiness;
  const architectureCandidates = center.architectureCandidates as ArchitectureCandidate[];
  const webchatReadiness = buildWebchatReadiness(channelSettings, knowledgeSources, leadForms, schedulingRules);
  const webchatAnalytics = buildWebchatAnalytics(webChats, webChatMessages);

  return (
    <FoundationShell active="/app/phone" roleKey={role.key}>
      <PageHeader
        eyebrow="Patient engagement"
        title="Phone, AI voice, web chat, scheduling, forms, and PMS handoff"
        body="This is the patient engagement operating layer: phone and SMS, AI voice, NLP-enabled webchat, knowledge base, theme settings, lead forms, patient forms, appointment booking, rescheduling, and PMS writeback governance."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/phone" />
      <PhoneViewNav active={view} roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Open calls" value={metrics.openCalls} />
        <Metric label="Web chats" value={metrics.openWebChats ?? 0} />
        <Metric label="Missed calls" value={metrics.missedCalls} />
        <Metric label="KB review" value={metrics.kbNeedsReview ?? 0} />
        <Metric label="Scheduling blocks" value={metrics.schedulingBlocked ?? 0} />
        <Metric label="Form packets" value={metrics.formPackets ?? 0} />
        <Metric label="Offline devices" value={metrics.offlineDevices} />
        <Metric label="Open tasks" value={metrics.openTasks} />
        <Metric label="Opportunity" value={<Money cents={Number(metrics.opportunityCents)} />} />
      </section>

      {view === "today" ? <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <PmsCard title="Channel readiness" eyebrow="Phone, AI voice, webchat, forms">
          <div className="grid gap-3 md:grid-cols-2">
            {channelSettings.map((channel) => (
              <div key={channel.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{channel.displayName}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(channel.channel)} · {clean(channel.nlpMode)}</p>
                  </div>
                  <StatusFor value={channel.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Knowledge" value={clean(channel.knowledgeBaseStatus)} />
                  <MiniMetric label="Scheduling" value={clean(channel.schedulingStatus)} />
                  <MiniMetric label="Forms" value={clean(channel.formsStatus)} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{channel.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Webchat and AI voice opportunities" eyebrow="NLP triage, booking intent, staff approval">
          <div className="grid gap-3">
            {webChats.slice(0, 4).map((chat) => (
              <div key={chat.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{chat.visitorName ?? chat.visitorPhone ?? "Website visitor"} · {clean(chat.nlpIntent ?? "web chat")}</p>
                    <p className="mt-1 text-xs text-neutral-600">{chat.sourcePage ?? "site"} · confidence {chat.nlpConfidence}% · owner {clean(chat.ownerRoleKey)}</p>
                  </div>
                  <StatusFor value={chat.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{chat.transcriptSummary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Scheduling" value={clean(chat.schedulingOutcome)} />
                  <MiniMetric label="PMS writeback" value={clean(chat.pmsWritebackStatus)} />
                  <MiniMetric label="Lead form" value={chat.leadFormName ?? "not captured"} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Lead score" value={`${chat.leadScore ?? 0}`} />
                  <MiniMetric label="Stage" value={clean(chat.qualificationStage ?? "new")} />
                  <MiniMetric label="Source" value={clean(chat.campaignSource ?? chat.sourceChannel ?? "website")} />
                </div>
                {chat.nextBestAction ? <p className="mt-2 text-xs leading-5 text-neutral-700">Next best action: {chat.nextBestAction}</p> : null}
                {chat.blockedReason ? <p className="mt-2 text-xs leading-5 text-amber-900">{chat.blockedReason}</p> : null}
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {(view === "today" || view === "setup") ? <section className="mt-4">
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
      </section> : null}

      {view === "setup" ? <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <PmsCard title="Carrier, numbers, and compliance setup" eyebrow="Porting, E911, voice, SMS, recording policy">
          <div className="grid gap-3">
            {architectureCandidates.map((candidate) => (
              <div key={candidate.id} className="rounded-md border border-neutral-300 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{candidate.name}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{candidate.role}</p>
                  </div>
                  <StatusFor value={candidate.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-900">{candidate.externalExecutionPolicy}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label="FreeSWITCH modules" value={candidate.modules.join(", ")} />
                  <MiniMetric label="Integration seams" value={candidate.seams.join(", ")} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {candidate.readiness.map((check) => (
                    <div key={check.label} className="rounded-md bg-neutral-50 p-2 ring-1 ring-neutral-200">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-neutral-950">{check.label}</p>
                        <StatusFor value={check.status} />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">{check.nextAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label="SIP trunk" value={provider.trunkDomain ?? "not configured"} />
                  <MiniMetric label="Outbound caller ID" value={provider.outboundCallerId ?? "not assigned"} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Capabilities: {jsonSummary(provider.capabilityMap)}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{provider.nextAction}</p>
                <form action={providerAction} className="mt-3 grid gap-2 sm:grid-cols-4">
                  <input type="hidden" name="id" value={provider.id} />
                  <Select name="status" label="Status" options={["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} defaultValue={provider.status} compact />
                  <Select name="credentialStatus" label="Credentials" options={["MISSING", "STAGED_IN_VAULT", "VALIDATED"]} defaultValue={provider.credentialStatus} compact />
                  <Select name="webhookStatus" label="Webhooks" options={["NOT_CONFIGURED", "CONFIGURED", "VERIFIED"]} defaultValue={provider.webhookStatus} compact />
                  <Select name="e911Status" label="Provider E911" options={["NOT_CONFIGURED", "NEEDS_VALIDATION", "VALIDATED", "ACTIVE", "NOT_APPLICABLE", "BLOCKED"]} defaultValue={provider.e911Status} compact />
                  <Input name="trunkDomain" label="SIP trunk domain" defaultValue={provider.trunkDomain ?? ""} />
                  <Input name="outboundCallerId" label="Outbound caller ID" defaultValue={provider.outboundCallerId ?? ""} />
                  <Input name="nextAction" label="Next setup action" defaultValue={provider.nextAction} />
                  <label className="grid gap-1 text-xs font-semibold text-transparent">Update<button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update carrier</button></label>
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
                <p className="mt-2 text-xs leading-5 text-neutral-600">Emergency route: {number.emergencyRoute ?? "not assigned"} · SMS registration must be active before outbound texts leave the approval queue.</p>
                <form action={numberAction} className="mt-3 grid gap-2 sm:grid-cols-6">
                  <input type="hidden" name="id" value={number.id} />
                  <Select name="portStatus" label="Port" options={["NOT_STARTED", "READY_TO_PORT", "PORTING", "PORTED", "BLOCKED"]} defaultValue={number.portStatus} compact />
                  <Select name="voiceStatus" label="Voice" options={["NOT_CONFIGURED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} defaultValue={number.voiceStatus} compact />
                  <Select name="smsStatus" label="SMS/A2P" options={["NOT_CONFIGURED", "REGISTRATION_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} defaultValue={number.smsStatus} compact />
                  <Select name="e911Status" label="E911" options={["NOT_CONFIGURED", "NEEDS_VALIDATION", "VALIDATED", "ACTIVE", "BLOCKED"]} defaultValue={number.e911Status} compact />
                  <Select name="status" label="Number" options={["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED"]} defaultValue={number.status} compact />
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
                  <Select name="status" label="Extension" options={["ACTIVE", "SETUP_REQUIRED", "DISABLED", "BLOCKED"]} defaultValue={extension.status} compact />
                  <Select name="voicemailEnabled" label="Voicemail" options={["true", "false"]} defaultValue={String(extension.voicemailEnabled)} compact />
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
                    <p className="mt-1 text-xs text-neutral-600">{device.assignedTo ?? "No assignment"} · {device.deskLocation ?? "No location"} · MAC {device.macAddress ?? "missing"} · SIP {device.sipUsername ?? "missing"}</p>
                  </div>
                  <StatusFor value={device.registrationStatus} />
                </div>
                <form action={deviceAction} className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="id" value={device.id} />
                  <Select name="provisioningStatus" label="Provisioning" options={["NOT_PROVISIONED", "NEEDS_MAC_ADDRESS", "CREDENTIALS_REQUIRED", "PROVISIONED"]} defaultValue={device.provisioningStatus} compact />
                  <Select name="registrationStatus" label="Registration" options={["OFFLINE", "REGISTERING", "ONLINE", "ERROR"]} defaultValue={device.registrationStatus} compact />
                  <Input name="macAddress" label="MAC address" defaultValue={device.macAddress ?? ""} />
                  <Input name="sipUsername" label="SIP username" defaultValue={device.sipUsername ?? ""} />
                  <Input name="assignedTo" label="Assigned to" defaultValue={device.assignedTo ?? ""} />
                  <Input name="deskLocation" label="Desk location" defaultValue={device.deskLocation ?? ""} />
                  <label className="grid gap-1 text-xs font-semibold text-transparent">Update<button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update device</button></label>
                </form>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {(view === "today" || view === "calls") ? <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Active calls and call controls" eyebrow="Dial, answer, hold, warm transfer, call park">
          <form action={callControlAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs leading-5 text-neutral-600">Actions here are connector-gated work items. They require carrier credentials, voice number activation, webhook verification, and a provider call ID before anything can leave the app.</p>
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
                    <p className="mt-1 text-xs text-neutral-600">{call.aiIntent ? clean(call.aiIntent) : "Unclassified"} · started {new Date(call.startedAt).toLocaleString()}</p>
                  </div>
                  <StatusFor value={call.callState} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <CallControlButton call={call} actionType="HOLD" label="Hold" />
                  <CallControlButton call={call} actionType="RESUME" label="Resume" />
                  <CallControlButton call={call} actionType="END_CALL" label="End" />
                  <CallControlButton call={call} actionType="SEND_TO_VOICEMAIL" label="Voicemail" targetExtensionId={extensions[0]?.id} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <form action={callControlAction} className="grid gap-2 rounded-md bg-neutral-50 p-2 ring-1 ring-neutral-200">
                    <input type="hidden" name="activeCallId" value={call.id} />
                    <input type="hidden" name="conversationId" value={call.conversationId ?? ""} />
                    <input type="hidden" name="actionType" value="WARM_TRANSFER" />
                    <input type="hidden" name="requestedByRole" value={role.key} />
                    <label className="grid gap-1 text-xs font-semibold text-neutral-700">Warm transfer target<select name="targetExtensionId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{extensions.map((extension) => <option key={extension.id} value={extension.id}>{extension.extensionNumber} - {extension.displayName}</option>)}</select></label>
                    <ActionButton label="Stage transfer" />
                  </form>
                  <form action={callControlAction} className="grid gap-2 rounded-md bg-neutral-50 p-2 ring-1 ring-neutral-200">
                    <input type="hidden" name="activeCallId" value={call.id} />
                    <input type="hidden" name="conversationId" value={call.conversationId ?? ""} />
                    <input type="hidden" name="actionType" value="CALL_PARK" />
                    <input type="hidden" name="requestedByRole" value={role.key} />
                    <Input name="targetParkSlot" label="Park slot" defaultValue={call.parkedSlot ?? "701"} />
                    <ActionButton label="Stage park" />
                  </form>
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
      </section> : null}

      {(view === "today" || view === "inbox") ? <section className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
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
                <form action={dispositionAction} className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-white p-3">
                  <input type="hidden" name="conversationId" value={call.id} />
                  <div className="grid gap-2 md:grid-cols-4">
                    <Select name="disposition" label="Disposition" options={["CALLBACK_REQUIRED", "BOOKING_HANDOFF", "BILLING_REVIEW", "EMERGENCY_TRIAGE", "VOICEMAIL_FOLLOW_UP", "SERVICE_RECOVERY", "CHART_REVIEW", "NO_PMS_MATCH"]} defaultValue={call.outcome ?? "CALLBACK_REQUIRED"} compact />
                    <Select name="ownerRoleKey" label="Owner" options={["front_desk", "billing_rcm", "associate_provider", "practice_manager"]} defaultValue={call.followUpStatus === "BLOCKED_RCM_REVIEW" ? "billing_rcm" : "front_desk"} compact />
                    <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} defaultValue={call.aiIntent === "EMERGENCY" ? "HIGH" : "NORMAL"} compact />
                    <Select name="dueIn" label="Due" options={["15 minutes", "30 minutes", "1 hour", "4 hours", "1 day"]} defaultValue={call.aiIntent === "EMERGENCY" ? "15 minutes" : "1 hour"} compact />
                  </div>
                  <Textarea name="nextAction" label="Patient task next action" defaultValue={defaultDispositionAction(call)} required />
                  <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Write disposition task</button>
                </form>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {view === "webchat" ? <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Webchat setup readiness" eyebrow="Widget install, consent, KB, lead forms, scheduling handoff">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-950">{clean(webchatReadiness.status)} · {webchatReadiness.blocked} blocked checks</p>
            <StatusFor value={webchatReadiness.status} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {webchatReadiness.checks.map((check) => (
              <div key={check.label} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-950">{check.label}</p>
                  <StatusFor value={check.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{check.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Transcript analytics" eyebrow="Intent mix, handoff load, consent capture">
          <div className="grid gap-2 sm:grid-cols-3">
            <MiniMetric label="Open chats" value={webchatAnalytics.openChats} />
            <MiniMetric label="Handoffs" value={webchatAnalytics.handoffs} />
            <MiniMetric label="Urgent" value={webchatAnalytics.urgent} />
            <MiniMetric label="Staff entries" value={webchatAnalytics.staffEntries} />
            <MiniMetric label="Consent captured" value={webchatAnalytics.consentCaptured} />
            <MiniMetric label="Top intent" value={clean(webchatAnalytics.topIntent)} />
            <MiniMetric label="Booking ready" value={webchatAnalytics.bookingReady} />
            <MiniMetric label="Avg lead score" value={webchatAnalytics.averageLeadScore} />
            <MiniMetric label="Top source" value={clean(webchatAnalytics.topCampaignSource)} />
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-600">Analytics are derived from saved visitor and assistant messages; no external AI or outbound send is claimed from this view.</p>
        </PmsCard>

        <PmsCard title="Lead qualification board" eyebrow="OutreachHub-style conversation-to-conversion queue">
          <div className="grid gap-3">
            {webChats.slice().sort((a, b) => Number(b.leadScore ?? 0) - Number(a.leadScore ?? 0)).slice(0, 6).map((chat) => (
              <div key={`${chat.id}-qualification`} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{chat.visitorName ?? chat.visitorPhone ?? "Website visitor"} · score {chat.leadScore ?? 0}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(chat.qualificationStage ?? "new")} · {clean(chat.campaignSource ?? "direct website")} · landing {chat.landingPageSlug ?? "unknown"}</p>
                  </div>
                  <StatusFor value={chat.qualificationStage ?? chat.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{chat.nextBestAction ?? chat.transcriptSummary}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Owner" value={clean(chat.ownerRoleKey)} />
                  <MiniMetric label="Due" value={chat.staffOwnerDueAt ? new Date(chat.staffOwnerDueAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "not assigned"} />
                  <MiniMetric label="PMS" value={clean(chat.pmsWritebackStatus)} />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="NLP webchat queue" eyebrow="Lead capture, scheduling request handoff, PMS writeback">
          <div className="grid gap-3">
            {webChats.map((chat) => (
              <div key={chat.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{chat.visitorName ?? chat.visitorPhone ?? "Website visitor"}</p>
                    <p className="mt-1 text-xs text-neutral-600">{chat.sourcePage ?? "site"} · {clean(chat.nlpIntent ?? "unknown intent")} · confidence {chat.nlpConfidence}% · owner {clean(chat.ownerRoleKey)}</p>
                  </div>
                  <StatusFor value={chat.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{chat.transcriptSummary}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <MiniMetric label="Service" value={chat.serviceLine ?? "unknown"} />
                  <MiniMetric label="Lead form" value={chat.leadFormName ?? "none"} />
                  <MiniMetric label="Booking" value={clean(chat.schedulingOutcome)} />
                  <MiniMetric label="PMS" value={clean(chat.pmsWritebackStatus)} />
                  <MiniMetric label="Lead score" value={`${chat.leadScore ?? 0}`} />
                  <MiniMetric label="Stage" value={clean(chat.qualificationStage ?? "new")} />
                  <MiniMetric label="Campaign" value={clean(chat.campaignSource ?? "direct website")} />
                  <MiniMetric label="Landing" value={chat.landingPageSlug ?? "unknown"} />
                </div>
                {chat.nextBestAction ? <p className="mt-2 text-xs leading-5 text-neutral-700">Next best action: {chat.nextBestAction}</p> : null}
                {chat.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{chat.blockedReason}</p> : null}
                <form action={webchatStaffAction} className="mt-3 grid gap-2 rounded-md border border-neutral-200 bg-white p-3">
                  <input type="hidden" name="conversationId" value={chat.id} />
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Input name="senderName" label="Staff name" />
                    <Select name="entryType" label="Entry" options={["STAFF_NOTE", "STAFF_REPLY"]} />
                    <Select name="status" label="Status" options={["OPEN", "STAFF_REVIEW", "WAITING_ON_PATIENT", "CLOSED"]} />
                    <div className="self-end"><button className="w-full rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">Save staff entry</button></div>
                  </div>
                  <Textarea name="body" label="Operator reply or staff note" required />
                  <p className="text-xs leading-5 text-neutral-500">Staff replies are staged in the transcript only; patient delivery remains blocked until a live webchat connector and consent policy are approved.</p>
                </form>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Transcript and action stream" eyebrow="Saved messages, intent, sentiment, task handoff">
          <div className="grid gap-3">
            {webChatMessages.map((message) => (
              <div key={message.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{message.senderType === "VISITOR" ? (message.visitorName ?? message.visitorPhone ?? "Website visitor") : "1DentalAI assistant"}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(message.senderType)} · {message.sourcePage ?? "site"} · {message.createdAt ? new Date(message.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}</p>
                  </div>
                  <StatusFor value={message.actionStatus} />
                </div>
                <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-sm leading-6 text-neutral-700">{message.body}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Intent" value={clean(message.intent ?? "unclassified")} />
                  <MiniMetric label="Sentiment" value={clean(message.sentiment ?? "none")} />
                  <MiniMetric label="Confidence" value={`${message.confidence ?? 0}%`} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-500">{messageMetadataSummary(message.metadata)}</p>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Knowledge base source management" eyebrow="Controls what webchat and AI voice can say">
          <form action={webchatKnowledgeCrawlAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <Input name="url" label="Crawl source URL" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Queue crawl</button>
            <p className="text-xs leading-5 text-neutral-500">First-party sources can be crawled directly. External sources require the crawl connector token before content is fetched.</p>
          </form>
          <div className="grid gap-3">
            {knowledgeSources.map((source) => (
              <div key={source.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{source.title}</p>
                  <StatusFor value={source.status} />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{clean(source.sourceType)} · {source.serviceLine ?? source.sourceModule} · owner {clean(source.ownerRoleKey)}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{source.contentSummary}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-500">Source: {source.sourceUrl ?? "manual policy"} · Reviewed {source.lastReviewedAt ? fmtDate(source.lastReviewedAt) : "not yet"}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{source.nextAction}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <KnowledgeReviewButton id={source.id} actorRole={source.ownerRoleKey} status="NEEDS_REVIEW" label="Needs review" />
                  <KnowledgeReviewButton id={source.id} actorRole={source.ownerRoleKey} status="READY_FOR_RETRIEVAL" label="Approve retrieval" />
                  <KnowledgeReviewButton id={source.id} actorRole={source.ownerRoleKey} status="BLOCKED_POLICY_REVIEW" label="Block" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {view === "scheduling" ? <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Scheduling and reschedule rules" eyebrow="PMS slot search, writeback, staff approval">
          <div className="grid gap-3">
            {schedulingRules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{rule.name}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(rule.sourceChannel)} · {rule.locationName ?? "all locations"} · category {rule.appointmentCategoryName ?? "not mapped"}</p>
                  </div>
                  <StatusFor value={rule.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <MiniMetric label="Window" value={`${rule.bookingWindowDays} days`} />
                  <MiniMetric label="Reschedule" value={rule.allowReschedule ? "allowed" : "blocked"} />
                  <MiniMetric label="Approval" value={rule.requireHumanApproval ? "required" : "not required"} />
                  <MiniMetric label="PMS" value={clean(rule.pmsWritebackStatus)} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{rule.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Lead forms and patient forms" eyebrow="Lead capture, intake packets, PMS mapping">
          <div className="grid gap-3">
            {leadForms.map((form) => (
              <div key={form.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{form.name}</p><StatusFor value={form.status} /></div>
                <p className="mt-1 text-xs text-neutral-600">{form.serviceLine} · {clean(form.sourceChannel)} · {clean(form.connectorStatus)}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Fields: {jsonSummary(form.fieldSchema)}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">PMS mapping: {jsonSummary(form.pmsMapping)}</p>
              </div>
            ))}
            {formPackets.map((packet) => (
              <div key={packet.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{clean(packet.packetType)}</p><StatusFor value={packet.status} /></div>
                <p className="mt-1 text-xs text-neutral-600">{packet.lastName ? `${packet.lastName}, ${packet.firstName}` : "template packet"} · {clean(packet.deliveryChannel)} · {clean(packet.pmsWritebackStatus)}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{packet.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {view === "settings" ? <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Widget themes and channel settings" eyebrow="Colors, launcher, NLP mode, approvals">
          <div className="grid gap-3">
            {channelSettings.map((channel) => (
              <div key={channel.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{channel.displayName}</p><StatusFor value={channel.connectorStatus} /></div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Theme: {jsonSummary(channel.theme)}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">Approvals: {jsonSummary(channel.approvalPolicy)}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{channel.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="PMS integration status" eyebrow="Schedule, reschedule, forms, writeback">
          <div className="grid gap-3">
            {channelSettings.map((channel) => (
              <div key={`${channel.id}-pms`} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-neutral-950">{channel.displayName}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniMetric label="Scheduling" value={clean(channel.schedulingStatus)} />
                  <MiniMetric label="Forms" value={clean(channel.formsStatus)} />
                  <MiniMetric label="Knowledge" value={clean(channel.knowledgeBaseStatus)} />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section> : null}

      {view === "messages" ? <section className="mt-4 grid gap-4 xl:grid-cols-2">
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
      </section> : null}

      {view === "routing" ? <section className="mt-4">
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
      </section> : null}
    </FoundationShell>
  );
}

function PhoneViewNav({ active, roleKey }: { active: string; roleKey: string }) {
  const items = [
    { key: "today", label: "Today" },
    { key: "calls", label: "Phone" },
    { key: "webchat", label: "Web chat" },
    { key: "scheduling", label: "Scheduling" },
    { key: "settings", label: "Settings" },
    { key: "setup", label: "Carrier setup" },
    { key: "inbox", label: "PMS inbox" },
    { key: "messages", label: "Messages" },
    { key: "routing", label: "Routing" },
  ];
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
      {items.map((item) => (
        <a
          key={item.key}
          href={`/app/phone?role=${roleKey}&view=${item.key}`}
          className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition ${
            active === item.key ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
          }`}
        >
          {item.label}
        </a>
      ))}
    </div>
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

function KnowledgeReviewButton({ id, actorRole, status, label }: { id: string; actorRole: string; status: string; label: string }) {
  return <form action={webchatKnowledgeReviewAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="actorRole" value={actorRole} /><input type="hidden" name="status" value={status} /><ActionButton label={label} /></form>;
}

function VoicemailButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={voicemailAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><ActionButton label={label} /></form>;
}

function CallControlButton({ call, actionType, label, targetExtensionId }: { call: ActiveCallRow; actionType: string; label: string; targetExtensionId?: string }) {
  return (
    <form action={callControlAction}>
      <input type="hidden" name="activeCallId" value={call.id} />
      <input type="hidden" name="conversationId" value={call.conversationId ?? ""} />
      <input type="hidden" name="actionType" value={actionType} />
      <input type="hidden" name="targetExtensionId" value={targetExtensionId ?? ""} />
      <ActionButton label={label} />
    </form>
  );
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

function Input({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} defaultValue={defaultValue} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options, defaultValue, compact = false }: { name: string; label: string; options: string[]; defaultValue?: string; compact?: boolean }) {
  return <label className={`grid gap-1 text-xs font-semibold text-neutral-700 ${compact ? "min-w-0" : ""}`}>{label}<select name={name} defaultValue={defaultValue} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option ? clean(option) : "None"}</option>)}</select></label>;
}

function Textarea({ name, label, required = false, defaultValue = "" }: { name: string; label: string; required?: boolean; defaultValue?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} defaultValue={defaultValue} rows={4} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
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

function buildWebchatReadiness(channelSettings: ChannelSettingRow[], knowledgeSources: KnowledgeSourceRow[], leadForms: LeadFormRow[], schedulingRules: SchedulingRuleRow[]) {
  const webchat = channelSettings.find((channel) => channel.channel === "WEB_CHAT");
  const checks = [
    {
      label: "Widget channel",
      status: webchat?.status ?? "SETUP_REQUIRED",
      nextAction: webchat?.nextAction ?? "Create the WEB_CHAT channel setting before public installation.",
    },
    {
      label: "Consent and privacy",
      status: "READY_FOR_REVIEW",
      nextAction: "Widget requires privacy notice acceptance before saving visitor messages; practice counsel should approve final language.",
    },
    {
      label: "Knowledge sources",
      status: knowledgeSources.some((source) => source.status === "NEEDS_REVIEW") ? "NEEDS_REVIEW" : "READY_FOR_RETRIEVAL",
      nextAction: knowledgeSources.some((source) => source.status === "NEEDS_REVIEW") ? "Review and approve source language before relying on KB responses." : "Approved sources are available for guarded retrieval.",
    },
    {
      label: "Lead capture",
      status: leadForms.length ? "READY_FOR_REVIEW" : "SETUP_REQUIRED",
      nextAction: leadForms.length ? "Lead fields are mapped to internal handoff metadata; PMS creation remains connector-gated." : "Add at least one webchat lead form.",
    },
    {
      label: "Scheduling handoff",
      status: schedulingRules.some((rule) => rule.sourceChannel === "WEB_CHAT" && rule.pmsWritebackStatus === "READY") ? "READY" : "PMS_CONNECTOR_REQUIRED",
      nextAction: "Appointment requests create staff tasks until PMS slot search and writeback are approved.",
    },
    {
      label: "External sends",
      status: webchat?.connectorStatus === "READY" ? "READY" : "CONNECTOR_REQUIRED",
      nextAction: "Operator replies are staged internally until a live webchat transport connector is active.",
    },
  ];
  const blocked = checks.filter((check) => /REQUIRED|NEEDS|SETUP|BLOCKED/.test(check.status)).length;
  return { status: blocked ? "SETUP_REQUIRED" : "READY", blocked, checks };
}

function buildWebchatAnalytics(webChats: WebChatRow[], messages: WebChatMessageRow[]) {
  const visitorMessages = messages.filter((message) => message.senderType === "VISITOR");
  const handoffs = visitorMessages.filter((message) => message.actionType && message.actionType !== "KNOWLEDGE_RESPONSE").length;
  const urgent = visitorMessages.filter((message) => message.intent === "EMERGENCY_TRIAGE" || message.sentiment === "URGENT").length;
  const staffEntries = messages.filter((message) => message.senderType === "STAFF" || message.senderType === "STAFF_NOTE").length;
  const consentCaptured = visitorMessages.filter((message) => metadataFlag(message.metadata, "consentAccepted")).length;
  const intentCounts = visitorMessages.reduce<Record<string, number>>((acc, message) => {
    const intent = message.intent ?? "UNCLASSIFIED";
    acc[intent] = (acc[intent] ?? 0) + 1;
    return acc;
  }, {});
  const topIntent = Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "UNCLASSIFIED";
  const bookingReady = webChats.filter((chat) => chat.qualificationStage === "BOOKING_READY").length;
  const averageLeadScore = webChats.length ? Math.round(webChats.reduce((sum, chat) => sum + Number(chat.leadScore ?? 0), 0) / webChats.length) : 0;
  const sourceCounts = webChats.reduce<Record<string, number>>((acc, chat) => {
    const source = chat.campaignSource ?? chat.sourceChannel ?? "DIRECT_WEBSITE";
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});
  const topCampaignSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "DIRECT_WEBSITE";
  return {
    openChats: webChats.filter((chat) => chat.status === "OPEN").length,
    handoffs,
    urgent,
    staffEntries,
    consentCaptured,
    topIntent,
    bookingReady,
    averageLeadScore,
    topCampaignSource,
  };
}

function metadataFlag(value: unknown, key: string) {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>)[key]);
}

function messageMetadataSummary(value: unknown) {
  if (!value || typeof value !== "object") return "No metadata recorded.";
  const metadata = value as { leadCapture?: Record<string, unknown>; sourceTitles?: unknown; externalSendBlocked?: unknown; connectorGated?: unknown; noExternalBooking?: unknown };
  const leadCapture = metadata.leadCapture && typeof metadata.leadCapture === "object" ? metadata.leadCapture : {};
  const capture = ["serviceLine", "preferredTime", "patientStatus", "urgency"]
    .map((key) => leadCapture[key] ? `${clean(key)}: ${String(leadCapture[key])}` : "")
    .filter(Boolean)
    .join(" · ");
  const sources = Array.isArray(metadata.sourceTitles) && metadata.sourceTitles.length ? `Sources: ${metadata.sourceTitles.join(", ")}.` : "";
  const gated = metadata.externalSendBlocked || metadata.connectorGated || metadata.noExternalBooking ? "Connector-gated; no external booking/send claimed." : "";
  return [capture, sources, gated].filter(Boolean).join(" ");
}

function defaultDispositionAction(call: ConversationRow) {
  if (call.aiIntent === "EMERGENCY") return "Escalate to clinical triage, document symptoms, and confirm same-day or after-hours protocol before giving advice.";
  if (call.followUpStatus === "BLOCKED_RCM_REVIEW" || call.aiIntent === "PAYMENT_QUESTION" || call.aiIntent === "INSURANCE_QUESTION") return "Review ledger, claim/EOB, and patient balance before calling back or staging any billing message.";
  if (call.outcome === "MISSED_CALL") return "Call back, document outcome, and convert to Patient Finder or scheduling follow-up if the patient is not reached.";
  if (call.aiIntent === "CONFIRM_APPOINTMENT") return "Confirm appointment readiness, forms, consent, and any schedule changes before closing the call.";
  return "Review the call summary, complete patient follow-up, and write only approved details to the PMS task.";
}

function jsonSummary(value: unknown) {
  if (!value || typeof value !== "object") return "not configured";
  if (Array.isArray(value)) return value.join(", ");
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : String(item)}`)
    .join(" | ");
}

function clean(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function list(label: string, values: string[] | null) {
  return values?.length ? `${label}: ${values.join(", ")}.` : "";
}
