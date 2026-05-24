import Link from "next/link";
import { revalidatePath } from "next/cache";
import { StateBadge } from "@/components/products/product-app-shell";
import { clean, money } from "@/components/products/patient-engagement-shell";
import {
  createPhoneExtensionProvisioning,
  createPhoneNumberProvisioning,
  createPhoneCallControlAction,
  createPhoneOutboundMessage,
  createPhoneZoomVideoSession,
  createSoftphoneOutboundDial,
  getPhoneOperatingCenter,
  refreshPhoneCarrierStatus,
  sendApprovedPhoneOutboundMessage,
  updatePhoneConversationStatus,
  updatePhoneOutboundMessageApproval,
} from "@/lib/operating-system-repository";
import { ThemeModeControl } from "./theme-mode-control";

export const dynamic = "force-dynamic";

async function stagePatientMessageAction(formData: FormData) {
  "use server";
  await createPhoneOutboundMessage({
    conversationId: String(formData.get("conversationId") ?? "") || undefined,
    patientId: String(formData.get("patientId") ?? "") || undefined,
    appointmentId: String(formData.get("appointmentId") ?? "") || undefined,
    channel: "SMS",
    recipientNumber: String(formData.get("recipientNumber") ?? ""),
    messageType: String(formData.get("messageType") ?? "PATIENT_MESSAGE"),
    body: String(formData.get("body") ?? ""),
    consentStatus: String(formData.get("consentStatus") ?? "UNKNOWN"),
    linkType: String(formData.get("linkType") ?? "") || undefined,
    linkTargetId: String(formData.get("linkTargetId") ?? "") || undefined,
    linkLabel: String(formData.get("linkLabel") ?? "") || undefined,
  });
  revalidatePath("/patient-engagement");
}

async function updateCallWorkAction(formData: FormData) {
  "use server";
  await updatePhoneConversationStatus(
    String(formData.get("conversationId") ?? ""),
    String(formData.get("status") ?? "OPEN"),
    String(formData.get("followUpStatus") ?? "READY_FOR_APPROVAL"),
  );
  revalidatePath("/patient-engagement");
}

async function callControlAction(formData: FormData) {
  "use server";
  await createPhoneCallControlAction({
    activeCallId: String(formData.get("activeCallId") ?? "") || undefined,
    conversationId: String(formData.get("conversationId") ?? "") || undefined,
    actionType: String(formData.get("actionType") ?? ""),
    requestedByRole: String(formData.get("requestedByRole") ?? "front_desk"),
    targetExtensionId: String(formData.get("targetExtensionId") ?? "") || undefined,
    targetNumber: String(formData.get("targetNumber") ?? "") || undefined,
    targetParkSlot: String(formData.get("targetParkSlot") ?? "") || undefined,
  });
  revalidatePath("/patient-engagement");
}

async function refreshCarrierStatusAction(formData: FormData) {
  "use server";
  await refreshPhoneCarrierStatus({
    activeCallId: String(formData.get("activeCallId") ?? ""),
    requestedByRole: "front_desk",
  });
  revalidatePath("/patient-engagement");
}

async function createVideoSessionAction(formData: FormData) {
  "use server";
  await createPhoneZoomVideoSession({
    conversationId: String(formData.get("conversationId") ?? "") || undefined,
    activeCallId: String(formData.get("activeCallId") ?? "") || undefined,
    requestedByRole: "front_desk",
  });
  revalidatePath("/patient-engagement");
}

async function approveOutboundMessageAction(formData: FormData) {
  "use server";
  await updatePhoneOutboundMessageApproval(String(formData.get("messageId") ?? ""), "APPROVED_STAGED", "front_desk");
  revalidatePath("/patient-engagement");
}

async function sendOutboundMessageAction(formData: FormData) {
  "use server";
  await sendApprovedPhoneOutboundMessage(String(formData.get("messageId") ?? ""), "front_desk");
  revalidatePath("/patient-engagement");
}

async function softphoneDialAction(formData: FormData) {
  "use server";
  await createSoftphoneOutboundDial({
    targetNumber: String(formData.get("targetNumber") ?? ""),
    operatorNumber: String(formData.get("operatorNumber") ?? "") || undefined,
    fromNumberId: String(formData.get("fromNumberId") ?? "") || undefined,
    mode: String(formData.get("mode") ?? "OPERATOR_BRIDGE") === "VOICE_AI" ? "VOICE_AI" : "OPERATOR_BRIDGE",
    requestedByRole: "front_desk",
  });
  revalidatePath("/patient-engagement");
}

async function provisionPhoneNumberAction(formData: FormData) {
  "use server";
  await createPhoneNumberProvisioning({
    phoneNumber: String(formData.get("phoneNumber") ?? ""),
    label: String(formData.get("label") ?? ""),
    numberType: String(formData.get("numberType") ?? "MAIN"),
    provider: String(formData.get("provider") ?? "TWILIO"),
    voiceStatus: String(formData.get("voiceStatus") ?? "ACTIVE"),
    smsStatus: String(formData.get("smsStatus") ?? "ACTIVE"),
    e911Status: String(formData.get("e911Status") ?? "ACTIVE"),
    recordingPolicy: String(formData.get("recordingPolicy") ?? "CONSENT_REQUIRED"),
  });
  revalidatePath("/patient-engagement");
}

async function provisionPhoneExtensionAction(formData: FormData) {
  "use server";
  await createPhoneExtensionProvisioning({
    extensionNumber: String(formData.get("extensionNumber") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? "front_desk"),
    extensionType: String(formData.get("extensionType") ?? "USER"),
    voicemailEnabled: String(formData.get("voicemailEnabled") ?? "true") === "true",
    directDialNumberId: String(formData.get("directDialNumberId") ?? "") || undefined,
  });
  revalidatePath("/patient-engagement");
}

export default async function PatientEngagementHome({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string; queue?: string; panel?: string }>;
}) {
  const params = await searchParams;
  const center = await getPhoneOperatingCenter();
  const conversations = center.conversations as ConversationRow[];
  const messages = center.messages as MessageRow[];
  const tasks = center.tasks as TaskRow[];
  const screenPops = center.screenPops as ScreenPopRow[];
  const transcriptEvents = center.transcriptEvents as Record<string, unknown>[];
  const aiAssistEvents = center.aiAssistEvents as Record<string, unknown>[];
  const metrics = center.metrics as Record<string, string>;
  const selectedConversation = conversations.find((row) => row.id === params.conversationId) ?? conversations[0] ?? null;
  const selectedScreenPop = selectedConversation
    ? screenPops.find((row) => row.conversationId === selectedConversation.id) ?? screenPops.find((row) => row.patientId === selectedConversation.patientId)
    : screenPops[0];
  const snapshot = objectValue(selectedScreenPop?.snapshotJson);
  const patient = buildPatientContext(selectedConversation, selectedScreenPop, snapshot);
  const nextAppointments = [
    ...arrayValue(selectedConversation?.nextAppointments),
    ...arrayValue(objectValue(snapshot.scheduling).nextAppointments),
  ].slice(0, 4);
  const forms = [
    ...arrayValue(selectedConversation?.openForms),
    ...arrayValue(objectValue(snapshot.forms).openForms),
  ].slice(0, 4);
  const family = arrayValue(snapshot.familyMembers);
  const insurancePlans = arrayValue(objectValue(snapshot.insurance).plans);
  const benefits = arrayValue(objectValue(snapshot.insurance).benefitSummaries);
  const procedures = [
    ...arrayValue(selectedConversation?.openTreatmentPlans),
    ...arrayValue(objectValue(objectValue(snapshot.clinical)).procedures),
  ].slice(0, 8);
  const callTranscript = transcriptEvents.filter((event) => String(event.conversationId) === String(selectedConversation?.id)).slice(0, 8);
  const callAi = aiAssistEvents.filter((event) => String(event.conversationId) === String(selectedConversation?.id)).slice(0, 6);
  const patientMessages = messages.filter((message) => message.patientId && message.patientId === selectedConversation?.patientId).slice(0, 8);
  const patientTasks = tasks.filter((task) => task.patientId && task.patientId === selectedConversation?.patientId).slice(0, 6);
  const routes = center.routes as Record<string, unknown>[];
  const analytics = center.analytics as Record<string, unknown>[];
  const numbers = center.numbers as Record<string, unknown>[];
  const extensions = center.extensions as Record<string, unknown>[];
  const devices = center.devices as Record<string, unknown>[];
  const providers = center.providers as Record<string, unknown>[];
  const activeCalls = center.activeCalls as Record<string, unknown>[];
  const controls = center.controls as Record<string, unknown>[];
  const aiReceptionPolicies = center.aiReceptionPolicies as Record<string, unknown>[];
  const channelSettings = center.channelSettings as Record<string, unknown>[];
  const knowledgeSources = center.knowledgeSources as Record<string, unknown>[];
  const webChats = center.webChats as Record<string, unknown>[];
  const webChatMessages = center.webChatMessages as Record<string, unknown>[];
  const leadForms = center.leadForms as Record<string, unknown>[];
  const formPackets = center.formPackets as Record<string, unknown>[];
  const schedulingRules = center.schedulingRules as Record<string, unknown>[];
  const videoSessions = center.videoSessions as Record<string, unknown>[];

  if (params.panel === "phone") {
    return (
      <main className="pe-shell min-h-screen bg-[#f4f6f7] text-neutral-950">
        <div className="flex min-h-screen">
          <GlobalRail />
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex h-20 items-center gap-5 border-b border-neutral-200 bg-white px-6">
              <Link href="/wrapper" className="text-2xl font-black tracking-tight">1DentalAI</Link>
              <div className="relative max-w-2xl flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">⌕</span>
                <input className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Search patients, calls, messages, payments, insurance, forms" />
              </div>
              <ThemeModeControl />
              <Link href="/patient-engagement" className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">Back to messages</Link>
              <Link href="/logout" className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Sign out</Link>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <PhonePanel conversation={selectedConversation} patient={patient} metrics={metrics} activeCalls={activeCalls} controls={controls} numbers={numbers} extensions={extensions} providers={providers} routes={routes} videoSessions={videoSessions} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pe-shell min-h-screen bg-[#f4f6f7] text-neutral-950">
      <div className="flex min-h-screen">
        <GlobalRail />
        <ProductRail active={params.queue ?? "messages"} metrics={metrics} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-5 border-b border-neutral-200 bg-white px-6">
            <Link href="/wrapper" className="text-2xl font-black tracking-tight">1DentalAI</Link>
            <div className="relative max-w-2xl flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">⌕</span>
              <input className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Search patients, calls, messages, payments, insurance, forms" />
            </div>
            <Link href={panelHref("settings", selectedConversation?.id)} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">Settings</Link>
            <Link href="/logout" className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Sign out</Link>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[430px_minmax(0,1fr)_420px]">
            <aside className="hidden min-h-0 border-r border-neutral-200 bg-white lg:block">
              <InboxHeader metrics={metrics} selectedConversationId={selectedConversation?.id} />
              <div className="h-[calc(100vh-244px)] overflow-y-auto">
                {conversations.length ? conversations.map((conversation) => (
                  <ConversationCard key={conversation.id} conversation={conversation} selected={conversation.id === selectedConversation?.id} />
                )) : (
                  <EmptyBlock title="No conversations yet" body="Inbound calls, missed calls, SMS, webchat, and payment request threads appear here." />
                )}
              </div>
            </aside>

            <section className="flex min-w-0 flex-col bg-white">
              <PatientHeader patient={patient} conversation={selectedConversation} />
              <ThreadToolbar conversation={selectedConversation} patient={patient} />
              <div className="min-h-0 flex-1 overflow-y-auto bg-white px-8 py-7">
                <div className="mx-auto max-w-4xl space-y-7">
                  <DatePill label="Today" />
                  {selectedConversation ? (
                    <CallCard conversation={selectedConversation} screenPop={selectedScreenPop} />
                  ) : null}
                  {patientMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} patient={patient} />
                  ))}
                  {callTranscript.map((event) => (
                    <TranscriptBubble key={String(event.id)} event={event} />
                  ))}
                  {!patientMessages.length && !callTranscript.length && selectedConversation ? (
                    <EmptyBlock title="No timeline entries for this patient" body="Calls, texts, webchat messages, payment requests, form requests, and insurance events are stored here as they happen." />
                  ) : null}
                </div>
              </div>
              <Composer conversation={selectedConversation} patient={patient} />
            </section>

            <aside className="hidden min-h-0 border-l border-neutral-200 bg-[#fbfcfb] 2xl:block">
              <div className="h-[calc(100vh-80px)] overflow-y-auto">
                <PatientIntelligence
                  patient={patient}
                  conversation={selectedConversation}
                  nextAppointments={nextAppointments}
                  family={family}
                  forms={forms}
                  insurancePlans={insurancePlans}
                  benefits={benefits}
                  procedures={procedures}
                  tasks={patientTasks}
                  callAi={callAi}
                />
              </div>
            </aside>
          </div>
        </section>
      </div>
      <IncomingCallPop activeCalls={activeCalls} conversations={conversations} screenPops={screenPops} />
      <FlowOverlay
        panel={params.panel}
        selectedConversation={selectedConversation}
        patient={patient}
        nextAppointments={nextAppointments}
        family={family}
        forms={forms}
        insurancePlans={insurancePlans}
        benefits={benefits}
        procedures={procedures}
        tasks={patientTasks}
        callAi={callAi}
        callTranscript={callTranscript}
        metrics={metrics}
        messages={messages}
        allTasks={tasks}
        routes={routes}
        analytics={analytics}
        numbers={numbers}
        extensions={extensions}
        devices={devices}
        providers={providers}
        activeCalls={activeCalls}
        controls={controls}
        aiReceptionPolicies={aiReceptionPolicies}
        channelSettings={channelSettings}
        knowledgeSources={knowledgeSources}
        webChats={webChats}
        webChatMessages={webChatMessages}
        leadForms={leadForms}
        formPackets={formPackets}
        schedulingRules={schedulingRules}
        videoSessions={videoSessions}
      />
    </main>
  );
}

function GlobalRail() {
  const items = [
    ["Home", "⌂", "/patient-engagement"],
    ["Messages", "▣", "/patient-engagement"],
    ["Calls", "☎", panelHref("phone")],
    ["Schedule", "◷", panelHref("schedule")],
    ["Payments", "$", panelHref("payment")],
    ["Forms", "▤", panelHref("forms")],
    ["Fax", "▧", panelHref("fax")],
    ["Patients", "♙", panelHref("patient")],
    ["Reviews", "☆", panelHref("reviews")],
    ["Analytics", "▥", panelHref("analytics")],
    ["Marketing", "☷", panelHref("marketing")],
  ];
  return (
    <aside className="hidden w-[92px] shrink-0 border-r border-neutral-200 bg-[#e9eef2] py-4 xl:block">
      <nav className="flex h-full flex-col items-center gap-2">
        {items.map(([label, icon, href]) => (
          <Link key={label} href={href} className="flex w-full flex-col items-center gap-1 px-2 py-2 text-center text-[11px] font-semibold text-neutral-600 hover:bg-white hover:text-blue-700">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg shadow-sm">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function IncomingCallPop({
  activeCalls,
  conversations,
  screenPops,
}: {
  activeCalls: Record<string, unknown>[];
  conversations: ConversationRow[];
  screenPops: ScreenPopRow[];
}) {
  const ringing = activeCalls.find((call) => String(call.direction) === "INBOUND" && ["RINGING", "QUEUED"].includes(String(call.callState)));
  if (!ringing) return null;
  const conversation = conversations.find((row) => row.id === String(ringing.conversationId));
  const screenPop = screenPops.find((row) => row.activeCallId === String(ringing.id) || row.conversationId === String(ringing.conversationId));
  const snapshot = objectValue(screenPop?.snapshotJson);
  const patient = buildPatientContext(conversation ?? null, screenPop, snapshot);
  const isMatched = Boolean(screenPop?.patientId || conversation?.patientId);
  return (
    <aside className="fixed right-5 top-24 z-[60] w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-2xl">
      <div className="border-b border-white/15 px-5 py-4">
        <p className="text-sm font-semibold">Incoming call</p>
        <p className="mt-1 text-xs text-white/70">via {String(ringing.extensionName ?? ringing.toNumber ?? "main line")}</p>
      </div>
      <div className="flex items-start gap-4 px-5 py-5">
        <Avatar label={patient.initials} tone="peach" />
        <div className="min-w-0 flex-1">
          <Link href={`/patient-engagement?conversationId=${String(ringing.conversationId ?? "")}&panel=phone`} className="truncate text-xl font-semibold text-blue-300 underline">
            {patient.name}
          </Link>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-bold ${isMatched ? "bg-emerald-300 text-emerald-950" : "bg-amber-300 text-amber-950"}`}>{isMatched ? "Matched patient" : "Unmatched caller"}</span>
            {patient.familyCount ? <span className="rounded-md bg-yellow-300 px-2 py-1 text-xs font-bold text-neutral-950">Household {patient.familyCount}</span> : null}
          </div>
          <p className="mt-3 text-sm text-white/80">{String(ringing.fromNumber ?? patient.phone ?? "unknown caller")}</p>
          <div className="mt-4 flex gap-2">
            <Link href={`/patient-engagement?conversationId=${String(ringing.conversationId ?? "")}&panel=phone`} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-neutral-950">Open pop</Link>
            <form action={callControlAction}>
              <input type="hidden" name="activeCallId" value={String(ringing.id ?? "")} />
              <input type="hidden" name="conversationId" value={String(ringing.conversationId ?? "")} />
              <input type="hidden" name="actionType" value="AI_VOICE_TAKEOVER" />
              <button className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold">Send to AI</button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ProductRail({ active, metrics }: { active: string; metrics: Record<string, string> }) {
  const groups = [
    ["Inbox", "messages", metrics.openCalls],
    ["Scheduled", "scheduled", metrics.stagedMessages],
    ["Drafts", "drafts", ""],
    ["Archived", "archived", ""],
    ["Blocked", "blocked", metrics.needsReview],
  ];
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-neutral-200 bg-white lg:block">
      <div className="border-b border-neutral-200 px-6 py-7">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-neutral-500">SMS, calls, webchat, payments, forms</p>
      </div>
      <nav className="space-y-1 px-4 py-4">
        {groups.map(([label, key, count]) => (
          <Link key={key} href={`/patient-engagement?queue=${key}`} className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${active === key || (!active && key === "messages") ? "bg-neutral-100 text-neutral-950" : "text-neutral-600 hover:bg-neutral-50"}`}>
            <span>{label}</span>
            {count ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{count}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="border-t border-neutral-200 px-4 py-5">
        <p className="px-4 text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Connect</p>
        {[
          ["Text messages", panelHref("sms")],
          ["Web chat", panelHref("webchat")],
          ["Auto-messages", panelHref("automessages")],
          ["Payment requests", panelHref("payment")],
          ["Insurance verification", panelHref("insurance")],
        ].map(([label, href]) => (
          <Link key={label} href={href} className="mt-1 block rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950">{label}</Link>
        ))}
      </div>
    </aside>
  );
}

function InboxHeader({ metrics, selectedConversationId }: { metrics: Record<string, string>; selectedConversationId?: string }) {
  return (
    <div className="border-b border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold">Inbox</p>
          <p className="mt-1 text-sm text-neutral-500">{metrics.openCalls ?? 0} open calls · {metrics.openWebChats ?? 0} webchats</p>
        </div>
        <div className="flex gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 text-neutral-600">✓</button>
          <Link href={panelHref("filters", selectedConversationId)} className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 text-neutral-600">☰</Link>
          <Link href={panelHref("settings", selectedConversationId)} className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 text-neutral-600">✎</Link>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {["All", "Unread", "Unreplied", "Read", "Replied", "Error"].map((filter) => (
          <span key={filter} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "All" ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}>{filter}</span>
        ))}
      </div>
    </div>
  );
}

function ConversationCard({ conversation, selected }: { conversation: ConversationRow; selected: boolean }) {
  return (
    <Link href={`/patient-engagement?conversationId=${conversation.id}`} className={`grid grid-cols-[54px_minmax(0,1fr)_auto] gap-3 border-b border-neutral-100 px-6 py-5 ${selected ? "border-l-4 border-l-blue-600 bg-blue-50/50" : "bg-white hover:bg-neutral-50"}`}>
      <Avatar label={initials(conversation.firstName, conversation.lastName, conversation.callerName)} tone={selected ? "blue" : "peach"} />
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{displayName(conversation)}</p>
        <p className="mt-1 truncate text-sm text-neutral-600">{conversation.transcriptSummary || conversation.aiIntent || conversation.callerNumber || "Patient conversation"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {conversation.practiceNumber ? <SmallTag>{conversation.practiceNumber}</SmallTag> : null}
          {Number(conversation.openBalanceCents ?? 0) > 0 ? <SmallTag tone="amber">{money(conversation.openBalanceCents)}</SmallTag> : null}
          {conversation.outcome === "MISSED_CALL" ? <SmallTag tone="red">Missed call</SmallTag> : null}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-neutral-500">{formatDate(conversation.startedAt)}</p>
        <p className="mt-5 text-xs font-semibold text-blue-700">{clean(conversation.followUpStatus)}</p>
      </div>
    </Link>
  );
}

function PatientHeader({ patient, conversation }: { patient: PatientContext; conversation: ConversationRow | null }) {
  return (
    <header className="flex min-h-[116px] items-center justify-between gap-5 border-b border-neutral-200 bg-white px-7 py-5">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar label={patient.initials} tone="peach" size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-3xl font-semibold">{patient.name}</h2>
            {patient.familyCount ? <span className="text-sm font-semibold text-neutral-500">♙ {patient.familyCount}</span> : null}
            <span className="text-sm text-neutral-500">{patient.sex || "Unknown"} · {patient.age || "age unknown"} · {patient.status}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-500">To: {conversation?.callerNumber || patient.phone || "unknown"} · From: {conversation?.practiceNumber || "Main line"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={panelHref("patient", conversation?.id)} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold">Patient</Link>
        <Link href={panelHref("payment", conversation?.id)} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-neutral-950">{money(patient.openBalanceCents)}</Link>
      </div>
    </header>
  );
}

function ThreadToolbar({ conversation }: { conversation: ConversationRow | null; patient: PatientContext }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-7 text-sm text-neutral-600">
      <div className="flex items-center gap-4">
        <span>☏ {conversation?.callerNumber || "No number"}</span>
        <span># {conversation?.practiceNumber || "Main Line"}</span>
      </div>
      <div className="flex gap-2">
        <Link href={panelHref("phone", conversation?.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200">☎</Link>
        <Link href={panelHref("call", conversation?.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200" title="Call insights">▤</Link>
        <Link href={panelHref("forms", conversation?.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-neutral-200" title="Forms">⋯</Link>
      </div>
    </div>
  );
}

function CallCard({ conversation, screenPop }: { conversation: ConversationRow; screenPop?: ScreenPopRow }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar label={initials(conversation.firstName, conversation.lastName, conversation.callerName)} tone="peach" />
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">☎</span>
          <div>
            <p className="text-sm font-semibold">{conversation.direction === "INBOUND" ? "Inbound Call" : "Outbound Call"}</p>
            <p className="text-xs text-neutral-500">{conversation.callerNumber} · {clean(conversation.aiIntent)}</p>
          </div>
          <StateBadge tone={screenPop?.matchStatus === "MATCHED" ? "green" : "amber"}>{clean(screenPop?.matchStatus ?? "screen pop")}</StateBadge>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, patient }: { message: MessageRow; patient: PatientContext }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] rounded-2xl bg-blue-50 px-5 py-4 text-sm leading-6 text-neutral-800">
        <p>{message.body}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <SmallTag>{clean(message.messageType)}</SmallTag>
          <SmallTag tone={message.approvalStatus === "BLOCKED" ? "red" : "blue"}>{clean(message.approvalStatus)}</SmallTag>
          <SmallTag tone={message.deliveryStatus === "READY_FOR_CONNECTOR" ? "green" : "amber"}>{clean(message.deliveryStatus)}</SmallTag>
          {patient.openBalanceCents > 0 ? <SmallTag tone="amber">{money(patient.openBalanceCents)}</SmallTag> : null}
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({ event }: { event: Record<string, unknown> }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-16 pt-3 text-right text-xs font-semibold text-neutral-400">{formatTime(event.createdAt)}</span>
      <div className="max-w-[82%] rounded-2xl bg-neutral-100 px-5 py-4 text-sm leading-6">
        <p><strong>{clean(event.speaker)}:</strong> {String(event.transcriptText ?? "")}</p>
      </div>
    </div>
  );
}

function Composer({ conversation, patient }: { conversation: ConversationRow | null; patient: PatientContext }) {
  return (
    <footer className="border-t border-neutral-200 bg-white px-7 py-5">
      <div className="grid gap-3">
        <form action={stagePatientMessageAction} className="flex items-end gap-3">
          <input type="hidden" name="conversationId" value={conversation?.id ?? ""} />
          <input type="hidden" name="patientId" value={patient.id ?? ""} />
          <input type="hidden" name="recipientNumber" value={patient.phone ?? conversation?.callerNumber ?? ""} />
          <input type="hidden" name="consentStatus" value={patient.smsConsent} />
          <input type="hidden" name="messageType" value="MANUAL_PATIENT_REPLY" />
          <div className="flex min-h-[60px] flex-1 items-center gap-3 rounded-2xl bg-neutral-100 px-4">
            <span className="text-2xl text-neutral-400">+</span>
            <textarea name="body" required className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent py-3 text-sm outline-none" placeholder="Type a patient-safe reply, payment note, form reminder, or appointment follow-up" />
          </div>
          <button className="h-[60px] rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white">Stage</button>
        </form>
        <div className="flex flex-wrap gap-2">
          <QuickMessage conversation={conversation} patient={patient} label="Text-to-pay" messageType="PAYMENT_REQUEST" linkType="PAYMENT_LINK" body={`Hi ${patient.firstName || "there"}, this is your dental office. You have a balance due. Please use this secure payment link: {{payment_link}}`} />
          <QuickMessage conversation={conversation} patient={patient} label="Request forms" messageType="FORM_PACKET_REQUEST" linkType="FORM_PACKET_LINK" body={`Hi ${patient.firstName || "there"}, please complete your secure forms before your visit: {{form_link}}`} />
          <QuickMessage conversation={conversation} patient={patient} label="Appointment confirmation" messageType="APPOINTMENT_CONFIRMATION" linkType="ONLINE_SCHEDULING_LINK" body={`Hi ${patient.firstName || "there"}, please confirm your upcoming appointment here: {{appointment_link}}`} />
          {conversation ? (
            <form action={updateCallWorkAction}>
              <input type="hidden" name="conversationId" value={conversation.id} />
              <input type="hidden" name="status" value="OPEN" />
              <input type="hidden" name="followUpStatus" value="BLOCKED_RCM_REVIEW" />
              <button className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold">Send to billing</button>
            </form>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

function QuickMessage({ conversation, patient, label, messageType, linkType, body }: { conversation: ConversationRow | null; patient: PatientContext; label: string; messageType: string; linkType: string; body: string }) {
  return (
    <form action={stagePatientMessageAction}>
      <input type="hidden" name="conversationId" value={conversation?.id ?? ""} />
      <input type="hidden" name="patientId" value={patient.id ?? ""} />
      <input type="hidden" name="recipientNumber" value={patient.phone ?? conversation?.callerNumber ?? ""} />
      <input type="hidden" name="consentStatus" value={patient.smsConsent} />
      <input type="hidden" name="messageType" value={messageType} />
      <input type="hidden" name="linkType" value={linkType} />
      <input type="hidden" name="linkLabel" value={label} />
      <input type="hidden" name="body" value={body} />
      <button className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50">{label}</button>
    </form>
  );
}

function FlowOverlay({
  panel,
  selectedConversation,
  patient,
  nextAppointments,
  family,
  forms,
  insurancePlans,
  benefits,
  procedures,
  tasks,
  callAi,
  callTranscript,
  metrics,
  messages,
  allTasks,
  routes,
  analytics,
  numbers,
  extensions,
  devices,
  providers,
  activeCalls,
  controls,
  aiReceptionPolicies,
  channelSettings,
  knowledgeSources,
  webChats,
  webChatMessages,
  leadForms,
  formPackets,
  schedulingRules,
  videoSessions,
}: {
  panel?: string;
  selectedConversation: ConversationRow | null;
  patient: PatientContext;
  nextAppointments: Record<string, unknown>[];
  family: Record<string, unknown>[];
  forms: Record<string, unknown>[];
  insurancePlans: Record<string, unknown>[];
  benefits: Record<string, unknown>[];
  procedures: Record<string, unknown>[];
  tasks: TaskRow[];
  callAi: Record<string, unknown>[];
  callTranscript: Record<string, unknown>[];
  metrics: Record<string, string>;
  messages: MessageRow[];
  allTasks: TaskRow[];
  routes: Record<string, unknown>[];
  analytics: Record<string, unknown>[];
  numbers: Record<string, unknown>[];
  extensions: Record<string, unknown>[];
  devices: Record<string, unknown>[];
  providers: Record<string, unknown>[];
  activeCalls: Record<string, unknown>[];
  controls: Record<string, unknown>[];
  aiReceptionPolicies: Record<string, unknown>[];
  channelSettings: Record<string, unknown>[];
  knowledgeSources: Record<string, unknown>[];
  webChats: Record<string, unknown>[];
  webChatMessages: Record<string, unknown>[];
  leadForms: Record<string, unknown>[];
  formPackets: Record<string, unknown>[];
  schedulingRules: Record<string, unknown>[];
  videoSessions: Record<string, unknown>[];
}) {
  if (!panel) return null;
  const closeHref = selectedConversation ? `/patient-engagement?conversationId=${selectedConversation.id}` : "/patient-engagement";
  const title = {
    filters: "Inbox filters",
    patient: "Patient profile",
    call: "Call insights",
    payment: "Payment request",
    insurance: "Insurance details",
    forms: "Forms and documents",
    phone: "Phone console",
    sms: "Text messaging",
    webchat: "Web chat",
    automessages: "Auto-messages",
    fax: "Fax center",
    schedule: "Schedule handoff",
    reviews: "Reviews",
    analytics: "Analytics",
    marketing: "Marketing",
    settings: "Settings",
  }[panel] ?? "Conversation tools";

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/30 backdrop-blur-[1px]">
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-neutral-200 bg-white shadow-2xl">
        <div className="flex h-20 items-center justify-between border-b border-neutral-200 px-7">
          <div className="flex items-center gap-3">
            <Link href={closeHref} className="grid h-10 w-10 place-items-center rounded-full border border-neutral-200 text-xl" aria-label="Back">‹</Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Patient engagement</p>
              <h2 className="text-2xl font-semibold">{title}</h2>
            </div>
          </div>
          <Link href={closeHref} className="grid h-11 w-11 place-items-center rounded-full border border-neutral-200 text-2xl" aria-label="Close">×</Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8f8] p-7">
          {panel === "filters" ? <FiltersPanel metrics={metrics} selectedConversation={selectedConversation} /> : null}
          {panel === "patient" ? <PatientPanel patient={patient} family={family} nextAppointments={nextAppointments} procedures={procedures} /> : null}
          {panel === "call" ? <CallInsightsPanel conversation={selectedConversation} callAi={callAi} callTranscript={callTranscript} tasks={tasks} /> : null}
          {panel === "payment" ? <PaymentPanel conversation={selectedConversation} patient={patient} /> : null}
          {panel === "insurance" ? <InsurancePanel patient={patient} insurancePlans={insurancePlans} benefits={benefits} /> : null}
          {panel === "forms" ? <FormsPanel conversation={selectedConversation} patient={patient} forms={forms} /> : null}
          {panel === "phone" ? <PhonePanel conversation={selectedConversation} patient={patient} metrics={metrics} activeCalls={activeCalls} controls={controls} numbers={numbers} extensions={extensions} providers={providers} routes={routes} videoSessions={videoSessions} /> : null}
          {panel === "sms" ? <SmsPanel conversation={selectedConversation} patient={patient} messages={messages} /> : null}
          {panel === "webchat" ? <WebchatPanel metrics={metrics} webChats={webChats} webChatMessages={webChatMessages} knowledgeSources={knowledgeSources} leadForms={leadForms} schedulingRules={schedulingRules} channelSettings={channelSettings} /> : null}
          {panel === "automessages" ? <AutoMessagesPanel messages={messages} channelSettings={channelSettings} formPackets={formPackets} schedulingRules={schedulingRules} /> : null}
          {panel === "fax" ? <ModuleFlowPanel title="Fax center" body="Inbound and outbound fax work stays in this console with document attachment, patient matching, and delivery status." rows={["Inbound fax matching", "Outbound attachment queue", "Failed delivery review", "Patient document filing"]} /> : null}
          {panel === "schedule" ? <SchedulePanel nextAppointments={nextAppointments} schedulingRules={schedulingRules} leadForms={leadForms} /> : null}
          {panel === "reviews" ? <ModuleFlowPanel title="Review recovery" body="Review requests, private surveys, response approval, and service recovery belong in this same patient engagement workspace." rows={["Visit-completed eligibility", "Recovery hold review", "AI response approval", "Public review connector status"]} /> : null}
          {panel === "analytics" ? <AnalyticsPanel metrics={metrics} analytics={analytics} tasks={allTasks} controls={controls} messages={messages} /> : null}
          {panel === "marketing" ? <ModuleFlowPanel title="Marketing handoff" body="Campaigns should start from PMS audiences and write back outcomes to conversations, appointments, production, and collections." rows={["Unscheduled treatment audience", "Recall and reactivation queue", "Landing page conversion", "Attribution to booked production"]} /> : null}
          {panel === "settings" ? <SettingsPanel providers={providers} numbers={numbers} extensions={extensions} devices={devices} channelSettings={channelSettings} aiReceptionPolicies={aiReceptionPolicies} knowledgeSources={knowledgeSources} /> : null}
          {!["filters", "patient", "call", "payment", "insurance", "forms", "phone", "sms", "webchat", "automessages", "fax", "schedule", "reviews", "analytics", "marketing", "settings"].includes(panel) ? (
            <EmptyBlock title="Tool not found" body="Choose a conversation action from the toolbar." />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PhonePanel({
  conversation,
  patient,
  metrics,
  activeCalls,
  controls,
  numbers,
  extensions,
  providers,
  routes,
  videoSessions,
}: {
  conversation: ConversationRow | null;
  patient: PatientContext;
  metrics: Record<string, string>;
  activeCalls: Record<string, unknown>[];
  controls: Record<string, unknown>[];
  numbers: Record<string, unknown>[];
  extensions: Record<string, unknown>[];
  providers: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  videoSessions: Record<string, unknown>[];
}) {
  const selectedActiveCall = activeCalls.find((call) => String(call.conversationId) === conversation?.id) ?? activeCalls[0];
  const activeNumberOptions = numbers.filter((number) => String(number.status) === "ACTIVE" && String(number.voiceStatus) === "ACTIVE");
  const selectedVideoSession = videoSessions.find((session) => String(session.conversationId) === String(conversation?.id)) ?? videoSessions[0];
  const dialKeys = ["1", "2 ABC", "3 DEF", "4 GHI", "5 JKL", "6 MNO", "7 PQRS", "8 TUV", "9 WXYZ", "*", "0 +", "#"];
  return (
    <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
      <div className="flex h-14 items-center justify-between bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 px-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-xl font-black">1D</span>
          <span className="text-sm font-semibold">Phone console</span>
        </div>
        <div className="flex items-center gap-5 text-xs font-semibold">
          <span className="flex items-center gap-2">Auto answer <span className="h-5 w-10 rounded-full bg-emerald-400 p-0.5"><span className="block h-4 w-4 translate-x-5 rounded-full bg-white" /></span></span>
          <span className="flex items-center gap-2">DND <span className="h-5 w-10 rounded-full bg-orange-500 p-0.5"><span className="block h-4 w-4 translate-x-5 rounded-full bg-white" /></span></span>
          <span>Front desk · REGISTERED</span>
        </div>
      </div>

      <div className="grid min-h-[760px] grid-cols-[72px_350px_minmax(0,1fr)]">
        <nav className="border-r border-neutral-200 bg-white py-5 text-[11px] font-semibold text-neutral-500">
          {[
            ["Keypad", "⠿"],
            ["Video", "▣"],
            ["Recents", "☏"],
            ["Contacts", "♙"],
            ["Chats", "◌"],
            ["Messages", "▤"],
            ["Numbers", "#"],
            ["Settings", "⚙"],
          ].map(([label, icon]) => (
            <a key={label} href={label === "Settings" ? panelHref("settings", conversation?.id) : "#phone-dialer"} className="flex flex-col items-center gap-1 border-l-4 border-transparent px-2 py-3 text-center hover:border-blue-600 hover:text-blue-700">
              <span className="text-xl">{icon}</span>
              {label}
            </a>
          ))}
        </nav>

        <aside id="phone-dialer" className="border-r border-neutral-200 bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h3 className="text-lg font-semibold">Active calls</h3>
            <span className="text-neutral-400">⌄</span>
          </div>
          <div className="mt-3 space-y-2">
            {activeCalls.slice(0, 3).map((call, index) => (
              <div key={String(call.id)} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${String(call.id) === String(selectedActiveCall?.id) ? "bg-blue-50" : "bg-white"}`}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-500 text-sm font-bold text-white">{initials(null, null, String(call.callerName ?? call.fromNumber ?? "Call"))}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{String(call.callerName ?? call.fromNumber ?? `Call ${index + 1}`)}</p>
                  <p className="text-xs text-neutral-500">{clean(call.callState)} · {String(call.toNumber ?? "")}</p>
                </div>
                <form action={callControlAction}>
                  <input type="hidden" name="activeCallId" value={String(call.id)} />
                  <input type="hidden" name="conversationId" value={String(call.conversationId ?? "")} />
                  <input type="hidden" name="actionType" value="HOLD" />
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm shadow-sm">Ⅱ</button>
                </form>
                <form action={callControlAction}>
                  <input type="hidden" name="activeCallId" value={String(call.id)} />
                  <input type="hidden" name="conversationId" value={String(call.conversationId ?? "")} />
                  <input type="hidden" name="actionType" value="END_CALL" />
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-sm text-white">☎</button>
                </form>
              </div>
            ))}
            {!activeCalls.length ? <p className="rounded-xl border border-dashed border-neutral-200 bg-white p-4 text-sm text-neutral-500">No live calls right now. Incoming Twilio webhooks populate this list.</p> : null}
          </div>

          <form action={softphoneDialAction} className="mt-8 space-y-4">
            <select name="fromNumberId" className="mx-auto block h-9 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-violet-700">
              <option value="">Caller ID · default</option>
              {activeNumberOptions.map((number) => (
                <option key={String(number.id)} value={String(number.id)}>{String(number.label)} · {String(number.phoneNumber)}</option>
              ))}
            </select>
            <input name="targetNumber" required defaultValue={conversation?.callerNumber ?? ""} className="h-11 w-full rounded-xl border border-transparent bg-transparent px-4 text-center text-sm outline-none focus:border-blue-300 focus:bg-white" placeholder="Enter number or patient name" />
            <input name="operatorNumber" className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-4 text-center text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Operator bridge phone" />
            <div className="grid grid-cols-3 gap-4">
              {dialKeys.map((key) => {
                const [digit, letters] = key.split(" ");
                return (
                  <button key={key} type="button" className="h-12 rounded-full bg-neutral-100 text-lg font-semibold text-neutral-950">
                    {digit}<span className="block text-[8px] font-bold text-neutral-500">{letters ?? ""}</span>
                  </button>
                );
              })}
            </div>
            <select name="mode" className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold">
              <option value="OPERATOR_BRIDGE">Operator bridge</option>
              <option value="VOICE_AI">Voice AI direct</option>
            </select>
            <div className="flex justify-center">
              <div className="inline-flex overflow-hidden rounded-full bg-emerald-600 shadow-lg">
                <button className="h-12 px-8 text-xl text-white">☎</button>
                <button formAction={createVideoSessionAction} formNoValidate className="h-12 border-l border-emerald-500 px-8 text-xl text-white">▣</button>
              </div>
            </div>
            <input type="hidden" name="conversationId" value={conversation?.id ?? String(selectedActiveCall?.conversationId ?? "")} />
            <input type="hidden" name="activeCallId" value={String(selectedActiveCall?.id ?? "")} />
          </form>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <MetricTile label="Open" value={metrics.openCalls ?? "0"} />
            <MetricTile label="Missed" value={metrics.missedCalls ?? "0"} />
            <MetricTile label="VM" value={metrics.newVoicemails ?? "0"} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-col bg-white">
          <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6">
            <div className="flex items-center gap-6 text-sm font-semibold">
              <Link href="/patient-engagement" className="text-3xl leading-none">‹</Link>
              {["Favorites", "Active Call", "Recent", "Missed Call"].map((tab) => (
                <span key={tab} className={tab === "Active Call" ? "rounded-full bg-slate-100 px-4 py-2 text-blue-700" : "text-neutral-600"}>{tab}</span>
              ))}
            </div>
            <form action={refreshCarrierStatusAction}>
              <input type="hidden" name="activeCallId" value={String(selectedActiveCall?.id ?? "")} />
              <button className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold">Refresh carrier status</button>
            </form>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <h2 className="text-center text-3xl font-semibold">{conversation?.callerName ?? patient.name ?? "Phone workspace"}</h2>
            <div className="mt-5 overflow-hidden rounded-2xl bg-neutral-900 shadow-sm">
              <div className="relative aspect-video bg-[radial-gradient(circle_at_45%_35%,#64748b,#111827_58%,#020617)]">
                <div className="absolute inset-0 grid place-items-center text-center text-white">
                  <div>
                    <p className="text-7xl font-black">{initials(null, null, conversation?.callerName ?? patient.name ?? "Video")}</p>
                    <p className="mt-3 text-sm text-white/70">{selectedVideoSession ? "Zoom video session ready" : "Create Zoom video when the caller needs face-to-face help"}</p>
                    {selectedVideoSession ? <a href={String(selectedVideoSession.joinUrl)} target="_blank" className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-950">Open Zoom</a> : null}
                  </div>
                </div>
                <div className="absolute bottom-5 right-5 w-48 overflow-hidden rounded-xl border border-white/20 bg-black/40 p-4 text-white shadow-2xl">
                  <p className="text-xs font-semibold">You</p>
                  <div className="mt-3 grid aspect-video place-items-center rounded-lg bg-slate-800 text-3xl">☺</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5">
              <span className="rounded-md bg-emerald-500 px-2 py-1 text-sm font-bold text-white">02:00</span>
              {[
                ["HOLD", "Ⅱ", ""],
                ["RESUME", "▶", ""],
                ["CALL_PARK", "⠿", "front-desk-1"],
                ["AI_VOICE_TAKEOVER", "AI", ""],
                ["END_CALL", "☎", ""],
              ].map(([action, label, parkSlot]) => (
                <form key={action} action={callControlAction}>
                  <input type="hidden" name="activeCallId" value={String(selectedActiveCall?.id ?? "")} />
                  <input type="hidden" name="conversationId" value={conversation?.id ?? String(selectedActiveCall?.conversationId ?? "")} />
                  <input type="hidden" name="actionType" value={action} />
                  {parkSlot ? <input type="hidden" name="targetParkSlot" value={parkSlot} /> : null}
                  <button className={`grid h-14 w-14 place-items-center rounded-full text-sm font-bold ${action === "END_CALL" ? "bg-rose-500 text-white" : "bg-neutral-100 text-neutral-700"}`}>{label}</button>
                </form>
              ))}
            </div>

            <div className="mt-7 grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Carrier result</h3>
                  <SmallTag tone={statusTone(selectedActiveCall?.callState)}>{clean(selectedActiveCall?.callState ?? "NO_CALL")}</SmallTag>
                </div>
                <p className="mt-2 text-sm text-neutral-500">Provider SID: {String(selectedActiveCall?.providerCallId ?? "not assigned")}</p>
                <div className="mt-4 space-y-2">
                  {controls.slice(0, 4).map((control) => (
                    <div key={String(control.id)} className="rounded-xl bg-neutral-50 p-3">
                      <p className="text-sm font-semibold">{clean(control.actionType)}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{String(control.resultSummary ?? "No provider result recorded.")}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="text-xl font-semibold">Patient call pop</h3>
                <div className="mt-4 flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-lg font-black">{initials(null, null, patient.name ?? conversation?.callerName ?? "Patient")}</span>
                  <div>
                    <p className="text-lg font-semibold">{patient.name ?? conversation?.callerName ?? "Unknown caller"}</p>
                    <p className="text-sm text-neutral-500">{String(conversation?.callerNumber ?? selectedActiveCall?.fromNumber ?? "No phone number")}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link href={panelHref("patient", conversation?.id)} className="rounded-xl border border-neutral-200 px-3 py-2 text-center text-sm font-semibold">Patient</Link>
                  <Link href={panelHref("payment", conversation?.id)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-semibold">{money(patient.openBalanceCents ?? 0)}</Link>
                  <Link href={panelHref("insurance", conversation?.id)} className="rounded-xl border border-neutral-200 px-3 py-2 text-center text-sm font-semibold">Insurance</Link>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-neutral-200 bg-[#f8fafc] p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Provision numbers</h3>
            <form action={provisionPhoneNumberAction} className="mt-4 grid gap-3">
              <input name="label" required className="h-11 rounded-xl border border-neutral-200 px-3 text-sm" placeholder="Main line / Marketing DID" />
              <input name="phoneNumber" required className="h-11 rounded-xl border border-neutral-200 px-3 text-sm" placeholder="+13035234562" />
              <div className="grid grid-cols-2 gap-2">
                <select name="numberType" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"><option value="MAIN">Main</option><option value="BILLING">Billing</option><option value="MARKETING">Marketing DID</option><option value="HYGIENE">Hygiene</option></select>
                <select name="voiceStatus" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"><option value="ACTIVE">Voice active</option><option value="NOT_CONFIGURED">Voice missing</option></select>
                <select name="smsStatus" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"><option value="ACTIVE">SMS active</option><option value="NOT_CONFIGURED">SMS missing</option></select>
                <select name="e911Status" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"><option value="ACTIVE">E911 active</option><option value="VALIDATED">E911 validated</option><option value="NOT_CONFIGURED">E911 missing</option></select>
              </div>
              <input type="hidden" name="provider" value="TWILIO" />
              <input type="hidden" name="recordingPolicy" value="CONSENT_REQUIRED" />
              <button className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Save number</button>
            </form>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Provision extensions</h3>
            <form action={provisionPhoneExtensionAction} className="mt-4 grid gap-3">
              <input name="extensionNumber" required className="h-11 rounded-xl border border-neutral-200 px-3 text-sm" placeholder="101" />
              <input name="displayName" required className="h-11 rounded-xl border border-neutral-200 px-3 text-sm" placeholder="Front desk" />
              <div className="grid grid-cols-2 gap-2">
                <select name="ownerRoleKey" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"><option value="front_desk">Front desk</option><option value="billing">Billing</option><option value="office_manager">Office manager</option><option value="provider">Provider</option></select>
                <select name="extensionType" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold"><option value="USER">User</option><option value="QUEUE">Queue</option><option value="ROOM">Room</option><option value="AI_AGENT">AI agent</option></select>
              </div>
              <input type="hidden" name="voicemailEnabled" value="true" />
              <button className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold">Save extension</button>
            </form>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-lg font-semibold">Setup inventory</h3>
            <div className="mt-4 space-y-3">
              {numbers.slice(0, 3).map((number) => <RecordLine key={String(number.id)} title={`${String(number.label)} · ${String(number.phoneNumber)}`} meta={`voice ${clean(number.voiceStatus)} · sms ${clean(number.smsStatus)} · E911 ${clean(number.e911Status)}`} />)}
              {extensions.slice(0, 3).map((extension) => <RecordLine key={String(extension.id)} title={`Ext ${String(extension.extensionNumber)} · ${String(extension.displayName)}`} meta={`${clean(extension.ownerRoleKey)} · ${clean(extension.extensionType)}`} />)}
              {routes.slice(0, 2).map((route) => <RecordLine key={String(route.id)} title={`Route: ${String(route.name)}`} meta={`${clean(route.triggerType)} → ${clean(route.destinationType)} · ${clean(route.status)}`} />)}
              {providers.slice(0, 2).map((provider) => <RecordLine key={String(provider.id)} title={`${String(provider.name)} · ${String(provider.providerType)}`} meta={`credentials ${clean(provider.credentialStatus)} · webhook ${clean(provider.webhookStatus)}`} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
function SmsPanel({ conversation, patient, messages }: { conversation: ConversationRow | null; patient: PatientContext; messages: MessageRow[] }) {
  const conversationMessages = messages.filter((message) => message.conversationId === conversation?.id || message.patientId === patient.id).slice(0, 12);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-3xl font-semibold">Text messaging</h3>
        <p className="mt-2 text-sm text-neutral-500">SMS stays consent-gated and connector-gated. Staged messages do not pretend to be sent.</p>
        <form action={stagePatientMessageAction} className="mt-5">
          <input type="hidden" name="conversationId" value={conversation?.id ?? ""} />
          <input type="hidden" name="patientId" value={patient.id ?? ""} />
          <input type="hidden" name="recipientNumber" value={patient.phone ?? conversation?.callerNumber ?? ""} />
          <input type="hidden" name="consentStatus" value={patient.smsConsent} />
          <input type="hidden" name="messageType" value="MANUAL_PATIENT_REPLY" />
          <textarea name="body" required rows={6} className="w-full rounded-2xl border border-neutral-200 p-4 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Write a patient-safe message" />
          <div className="mt-4 flex justify-end">
            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Stage SMS</button>
          </div>
        </form>
      </section>
      <ActionCard title="Outbound SMS queue" empty="No staged texts for this patient. Use the composer above to create one.">
        {conversationMessages.map((message) => (
          <div key={message.id} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{clean(message.messageType)}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{message.body}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <SmallTag tone={statusTone(message.approvalStatus)}>{clean(message.approvalStatus)}</SmallTag>
                <SmallTag tone={statusTone(message.deliveryStatus)}>{clean(message.deliveryStatus)}</SmallTag>
              </div>
            </div>
            {message.blockedReason ? <p className="mt-3 text-xs leading-5 text-red-700">{message.blockedReason}</p> : null}
            {message.providerError ? <p className="mt-2 text-xs leading-5 text-red-700">{message.providerError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={approveOutboundMessageAction}>
                <input type="hidden" name="messageId" value={message.id} />
                <button className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold">Approve</button>
              </form>
              <form action={sendOutboundMessageAction}>
                <input type="hidden" name="messageId" value={message.id} />
                <button className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Send through connector</button>
              </form>
            </div>
          </div>
        ))}
      </ActionCard>
    </div>
  );
}

function WebchatPanel({
  metrics,
  webChats,
  webChatMessages,
  knowledgeSources,
  leadForms,
  schedulingRules,
  channelSettings,
}: {
  metrics: Record<string, string>;
  webChats: Record<string, unknown>[];
  webChatMessages: Record<string, unknown>[];
  knowledgeSources: Record<string, unknown>[];
  leadForms: Record<string, unknown>[];
  schedulingRules: Record<string, unknown>[];
  channelSettings: Record<string, unknown>[];
}) {
  const widgetSetting = channelSettings.find((setting) => String(setting.channel).toUpperCase().includes("WEB"));
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-3xl font-semibold">Web chat</h3>
        <p className="mt-2 text-sm text-neutral-500">Website conversations, AI routing, lead capture, appointment handoff, and staff takeover remain inside this console.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricTile label="Open webchats" value={metrics.openWebChats ?? "0"} />
          <MetricTile label="KB review" value={metrics.kbNeedsReview ?? "0"} />
          <MetricTile label="Scheduling blocked" value={metrics.schedulingBlocked ?? "0"} />
        </div>
      </section>
      <ActionCard title="Open website conversations" empty="No webchat conversations found. The widget creates rows here as visitors message the site.">
        {webChats.slice(0, 8).map((chat) => (
          <div key={String(chat.id)} className="rounded-xl bg-neutral-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{String(chat.visitorName ?? chat.visitorPhone ?? chat.visitorEmail ?? "Website visitor")}</p>
                <p className="mt-1 text-xs text-neutral-500">{String(chat.sourcePage ?? "website")} · {clean(chat.nlpIntent)} · lead score {String(chat.leadScore ?? 0)}</p>
              </div>
              <SmallTag tone={statusTone(chat.status)}>{clean(chat.status)}</SmallTag>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-700">{String(chat.lastMessageBody ?? chat.transcriptSummary ?? chat.nextBestAction ?? "No message body yet.")}</p>
            {chat.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{String(chat.blockedReason)}</p> : null}
          </div>
        ))}
      </ActionCard>
      <ActionCard title="Recent webchat transcript" empty="No webchat messages yet.">
        {webChatMessages.slice(0, 10).map((message) => (
          <RecordLine key={String(message.id)} title={`${clean(message.senderType)} · ${String(message.senderName ?? "visitor")}`} meta={`${String(message.body)} · ${formatDate(message.createdAt)}`} />
        ))}
      </ActionCard>
      <ActionCard title="Knowledge, forms, and scheduling" empty="No setup records found.">
        {knowledgeSources.slice(0, 5).map((source) => <RecordLine key={String(source.id)} title={`KB: ${String(source.title)}`} meta={`${clean(source.status)} · ${String(source.contentSummary ?? "")}`} />)}
        {leadForms.slice(0, 5).map((form) => <RecordLine key={String(form.id)} title={`Lead form: ${String(form.name)}`} meta={`${clean(form.serviceLine)} · ${clean(form.status)} · ${clean(form.connectorStatus)}`} />)}
        {schedulingRules.slice(0, 5).map((rule) => <RecordLine key={String(rule.id)} title={`Scheduling: ${String(rule.name)}`} meta={`${clean(rule.status)} · ${String(rule.bookingWindowDays ?? 0)} days · PMS ${clean(rule.pmsWritebackStatus)}`} />)}
      </ActionCard>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-xl font-semibold">Widget install</h3>
        <p className="mt-2 text-sm text-neutral-500">This is the deployable script. Conversations created by it are stored in PatientWebChatConversation and PatientWebChatMessage.</p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs leading-6 text-white">{`<script async src="https://app.1dentalai.com/api/webchat/widget.js" data-tenant="default" data-channel="${String(widgetSetting?.channel ?? "WEB_CHAT")}"></script>`}</pre>
      </section>
    </div>
  );
}

function AutoMessagesPanel({ messages, channelSettings, formPackets, schedulingRules }: { messages: MessageRow[]; channelSettings: Record<string, unknown>[]; formPackets: Record<string, unknown>[]; schedulingRules: Record<string, unknown>[] }) {
  const counts = messages.reduce<Record<string, number>>((acc, message) => {
    acc[message.messageType] = (acc[message.messageType] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-3xl font-semibold">Auto-messages</h3>
            <p className="mt-2 text-sm text-neutral-500">Automation rules should expand inline and show active volume, schedule timing, method, location, and connector status.</p>
          </div>
          <Link href={panelHref("settings")} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Settings</Link>
        </div>
      </section>
      {Object.entries(counts).map(([name, count]) => (
        <div key={name} className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5">
          <div>
            <p className="text-lg font-semibold">{clean(name)}</p>
            <p className="mt-1 text-sm text-neutral-500">{count} queued/staged · text message · connector gated</p>
          </div>
          <span className="text-2xl">⌄</span>
        </div>
      ))}
      <ActionCard title="Automation inputs" empty="No automation configuration found.">
        {channelSettings.map((setting) => <RecordLine key={String(setting.id)} title={`${String(setting.displayName)} · ${String(setting.channel)}`} meta={`${clean(setting.status)} · connector ${clean(setting.connectorStatus)} · ${String(setting.nextAction ?? "")}`} />)}
        {formPackets.slice(0, 4).map((packet) => <RecordLine key={String(packet.id)} title={`Form packet · ${clean(packet.packetType)}`} meta={`${clean(packet.status)} · ${clean(packet.pmsWritebackStatus)} · due ${formatDate(packet.dueAt)}`} />)}
        {schedulingRules.slice(0, 4).map((rule) => <RecordLine key={String(rule.id)} title={`Schedule rule · ${String(rule.name)}`} meta={`${clean(rule.status)} · human approval ${String(rule.requireHumanApproval)}`} />)}
      </ActionCard>
    </div>
  );
}

function SchedulePanel({ nextAppointments, schedulingRules, leadForms }: { nextAppointments: Record<string, unknown>[]; schedulingRules: Record<string, unknown>[]; leadForms: Record<string, unknown>[] }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-3xl font-semibold">Schedule handoff</h3>
        <p className="mt-2 text-sm text-neutral-500">Booking and rescheduling flows stay in the engagement console, with PMS writeback gating and no double booking.</p>
      </section>
      <ActionCard title="Current appointments" empty="No appointment context loaded.">
        {nextAppointments.map((row, index) => <RecordLine key={index} title={String(row.appointmentType ?? row.name ?? "Appointment")} meta={`${formatDate(row.startsAt)} · ${clean(row.status)}`} />)}
      </ActionCard>
      <ActionCard title="Booking rules and qualifying forms" empty="No scheduling rules configured.">
        {schedulingRules.map((rule) => <RecordLine key={String(rule.id)} title={String(rule.name)} meta={`${clean(rule.sourceChannel)} · ${clean(rule.status)} · writeback ${clean(rule.pmsWritebackStatus)}`} />)}
        {leadForms.map((form) => <RecordLine key={String(form.id)} title={String(form.name)} meta={`${clean(form.serviceLine)} · ${clean(form.status)} · ${clean(form.connectorStatus)}`} />)}
      </ActionCard>
    </div>
  );
}

function AnalyticsPanel({ metrics, analytics, tasks, controls, messages }: { metrics: Record<string, string>; analytics: Record<string, unknown>[]; tasks: TaskRow[]; controls: Record<string, unknown>[]; messages: MessageRow[] }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Open calls" value={metrics.openCalls ?? "0"} />
        <MetricTile label="Needs review" value={metrics.needsReview ?? "0"} />
        <MetricTile label="Revenue opportunity" value={money(Number(metrics.opportunityCents ?? 0))} />
      </section>
      <ActionCard title="Call intelligence rows" empty="No call analytics rows found.">
        {analytics.slice(0, 8).map((row) => <RecordLine key={String(row.id)} title={`${String(row.firstName ?? "")} ${String(row.lastName ?? row.callerName ?? "Caller")}`} meta={`booking ${String(row.bookingIntentScore ?? 0)} · recovery ${String(row.serviceRecoveryScore ?? 0)} · opportunity ${money(Number(row.revenueOpportunityCents ?? 0))}`} />)}
      </ActionCard>
      <ActionCard title="Blocked work" empty="No blocked work in current queues.">
        {tasks.slice(0, 5).map((task) => <RecordLine key={task.id} title={task.nextAction || task.taskType} meta={`${clean(task.priority)} · ${clean(task.status)} · ${clean(task.ownerRoleKey)}`} />)}
        {controls.filter((row) => String(row.providerStatus).includes("BLOCKED")).slice(0, 5).map((row) => <RecordLine key={String(row.id)} title={clean(row.actionType)} meta={String(row.blockedReason ?? row.resultSummary ?? "")} />)}
        {messages.filter((row) => row.approvalStatus === "BLOCKED" || String(row.deliveryStatus).includes("BLOCKED")).slice(0, 5).map((row) => <RecordLine key={row.id} title={clean(row.messageType)} meta={row.blockedReason || row.providerError || row.deliveryStatus} />)}
      </ActionCard>
    </div>
  );
}

function SettingsPanel({ providers, numbers, extensions, devices, channelSettings, aiReceptionPolicies, knowledgeSources }: { providers: Record<string, unknown>[]; numbers: Record<string, unknown>[]; extensions: Record<string, unknown>[]; devices: Record<string, unknown>[]; channelSettings: Record<string, unknown>[]; aiReceptionPolicies: Record<string, unknown>[]; knowledgeSources: Record<string, unknown>[] }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-3xl font-semibold">Appearance</h3>
        <p className="mt-2 text-sm text-neutral-500">Choose how this operating console renders on this device.</p>
        <div className="mt-5">
          <ThemeModeControl />
        </div>
      </section>
      <ActionCard title="Provider credentials and webhooks" empty="No provider connections found.">
        {providers.map((provider) => <RecordLine key={String(provider.id)} title={`${String(provider.name)} · ${String(provider.providerType)}`} meta={`credentials ${clean(provider.credentialStatus)} · webhook ${clean(provider.webhookStatus)} · E911 ${clean(provider.e911Status)} · ${String(provider.nextAction ?? "")}`} />)}
      </ActionCard>
      <ActionCard title="Numbers, extensions, devices" empty="No phone inventory found.">
        {numbers.map((number) => <RecordLine key={String(number.id)} title={`${String(number.label)} · ${String(number.phoneNumber)}`} meta={`${clean(number.status)} · voice ${clean(number.voiceStatus)} · sms ${clean(number.smsStatus)} · E911 ${clean(number.e911Status)}`} />)}
        {extensions.map((extension) => <RecordLine key={String(extension.id)} title={`Extension ${String(extension.extensionNumber)} · ${String(extension.displayName)}`} meta={`${clean(extension.ownerRoleKey)} · ${clean(extension.status)}`} />)}
        {devices.map((device) => <RecordLine key={String(device.id)} title={`${String(device.label)} · ${String(device.deviceType)}`} meta={`${clean(device.provisioningStatus)} · ${clean(device.registrationStatus)} · ${String(device.macAddress ?? "no MAC")}`} />)}
      </ActionCard>
      <ActionCard title="AI, webchat, and knowledge settings" empty="No AI/channel settings found.">
        {channelSettings.map((setting) => <RecordLine key={String(setting.id)} title={`${String(setting.displayName)} · ${String(setting.channel)}`} meta={`${clean(setting.status)} · NLP ${clean(setting.nlpMode)} · KB ${clean(setting.knowledgeBaseStatus)} · connector ${clean(setting.connectorStatus)}`} />)}
        {aiReceptionPolicies.map((policy) => <RecordLine key={String(policy.id)} title={`${String(policy.name)} · ring ${String(policy.ringThreshold)}`} meta={`${clean(policy.status)} · ${clean(policy.mode)} · ${clean(policy.pricingPolicy)}`} />)}
        {knowledgeSources.map((source) => <RecordLine key={String(source.id)} title={`${String(source.title)} · ${String(source.sourceModule)}`} meta={`${clean(source.status)} · ${String(source.nextAction ?? "")}`} />)}
      </ActionCard>
    </div>
  );
}

function ModuleFlowPanel({ title, body, rows }: { title: string; body: string; rows: string[] }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{body}</p>
      <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
        {rows.map((row) => (
          <div key={row} className="flex items-center justify-between border-b border-neutral-100 px-4 py-4 last:border-b-0">
            <span className="font-semibold">{row}</span>
            <span className="text-neutral-400">›</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-semibold text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function FiltersPanel({ metrics, selectedConversation }: { metrics: Record<string, string>; selectedConversation: ConversationRow | null }) {
  const base = selectedConversation ? `/patient-engagement?conversationId=${selectedConversation.id}` : "/patient-engagement";
  const filters = [
    ["All", "messages", metrics.openCalls],
    ["Unread", "unread", metrics.needsReview],
    ["Unreplied", "unreplied", metrics.stagedMessages],
    ["Scheduled", "scheduled", ""],
    ["Archived", "archived", ""],
    ["Blocked", "blocked", metrics.needsReview],
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <label className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Search inbox</label>
        <input className="mt-3 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Patient, phone, tag, payer, message content" />
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-3">
        {filters.map(([label, key, count]) => (
          <Link key={key} href={`${base}&queue=${key}`} className="flex items-center justify-between rounded-xl px-4 py-4 text-sm font-semibold hover:bg-neutral-50">
            <span>{label}</span>
            {count ? <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{count}</span> : null}
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold">Sort and visibility</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SelectLike label="Sort by" value="Newest activity" />
          <SelectLike label="Location" value="All locations" />
          <SelectLike label="Owner" value="Everyone" />
          <SelectLike label="Channel" value="SMS, calls, webchat" />
        </div>
      </div>
    </div>
  );
}

function PatientPanel({ patient, family, nextAppointments, procedures }: { patient: PatientContext; family: Record<string, unknown>[]; nextAppointments: Record<string, unknown>[]; procedures: Record<string, unknown>[] }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-start gap-5">
          <Avatar label={patient.initials} tone="peach" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-neutral-500">Chart {patient.chartNumber || "not assigned"}</p>
            <h3 className="mt-1 text-4xl font-semibold">{patient.name}</h3>
            <p className="mt-2 text-sm text-neutral-500">{patient.sex || "Unknown"} · {patient.age || "age unknown"} yrs · {patient.status}</p>
            <div className="mt-5 flex flex-wrap gap-2">
          <Link href={patient.pmsHref} className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Open PMS record</Link>
          <Link href={panelHref("payment", patient.conversationId)} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold">Payments</Link>
          <Link href={panelHref("insurance", patient.conversationId)} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold">Insurance</Link>
          <Link href={panelHref("forms", patient.conversationId)} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold">Forms</Link>
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-xl font-semibold">Household</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {family.length ? family.map((member, index) => (
            <div key={index} className="rounded-2xl bg-neutral-50 p-4 text-center">
              <Avatar label={initials(String(member.firstName ?? ""), String(member.lastName ?? ""), "FM")} tone="blue" />
              <p className="mt-3 font-semibold">{String(member.firstName ?? "")} {String(member.lastName ?? "")}</p>
              <p className="mt-1 text-xs text-neutral-500">{clean(member.relationship ?? "family member")}</p>
            </div>
          )) : <p className="text-sm text-neutral-500">No household members linked.</p>}
        </div>
      </section>
      <TwoColumnRecords leftTitle="Appointments" leftRows={nextAppointments} rightTitle="Treatment" rightRows={procedures} />
    </div>
  );
}

function CallInsightsPanel({ conversation, callAi, callTranscript, tasks }: { conversation: ConversationRow | null; callAi: Record<string, unknown>[]; callTranscript: Record<string, unknown>[]; tasks: TaskRow[] }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar label={initials(conversation?.firstName, conversation?.lastName, conversation?.callerName)} />
            <div>
              <h3 className="text-2xl font-semibold">{conversation ? displayName(conversation) : "No conversation"}</h3>
              <p className="mt-1 text-sm text-neutral-500">{conversation?.callerNumber || "No phone"} · {clean(conversation?.aiIntent)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-full border border-neutral-200">☎</button>
            <button className="grid h-11 w-11 place-items-center rounded-full border border-neutral-200">▣</button>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-5">
          <h3 className="text-xl font-semibold">Call intelligence</h3>
          <div className="mt-4 flex gap-2">
            {["Summary", "Analysis", "Transcript"].map((tab) => <span key={tab} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "Summary" ? "bg-blue-600 text-white" : "bg-neutral-100 text-neutral-600"}`}>{tab}</span>)}
          </div>
        </div>
        <div className="space-y-3 p-5">
          {callAi.length ? callAi.map((event) => (
            <div key={String(event.id)} className="rounded-xl bg-neutral-50 p-4">
              <p className="font-semibold">{String(event.title)}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{String(event.body)}</p>
            </div>
          )) : <p className="text-sm text-neutral-500">No AI summary yet. Live transcription and call analysis will populate this panel.</p>}
          {callTranscript.map((event) => (
            <div key={String(event.id)} className="grid grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-xl bg-white p-3 text-sm">
              <span className="text-neutral-400">{formatTime(event.createdAt)}</span>
              <span><strong>{clean(event.speaker)}:</strong> {String(event.transcriptText ?? "")}</span>
            </div>
          ))}
        </div>
      </section>
      <ActionCard title="Tasks" empty="No open call tasks.">{tasks.map((task) => <RecordLine key={task.id} title={task.nextAction || task.taskType} meta={`${clean(task.priority)} · ${clean(task.ownerRoleKey)}`} />)}</ActionCard>
    </div>
  );
}

function PaymentPanel({ conversation, patient }: { conversation: ConversationRow | null; patient: PatientContext }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-500">Ready to collect</p>
        <p className="mt-2 text-5xl font-semibold">{money(patient.openBalanceCents)}</p>
        <p className="mt-3 text-sm text-neutral-500">Requests are staged until the payment connector and SMS consent checks allow delivery.</p>
      </section>
      <form action={stagePatientMessageAction} className="rounded-2xl border border-neutral-200 bg-white p-6">
        <input type="hidden" name="conversationId" value={conversation?.id ?? ""} />
        <input type="hidden" name="patientId" value={patient.id ?? ""} />
        <input type="hidden" name="recipientNumber" value={patient.phone ?? conversation?.callerNumber ?? ""} />
        <input type="hidden" name="consentStatus" value={patient.smsConsent} />
        <input type="hidden" name="messageType" value="PAYMENT_REQUEST" />
        <input type="hidden" name="linkType" value="PAYMENT_LINK" />
        <input type="hidden" name="linkLabel" value="Text-to-pay" />
        <h3 className="text-2xl font-semibold">Share in message</h3>
        <p className="mt-2 text-sm text-neutral-500">Use merge fields. The delivery engine must still verify connector, consent, quiet hours, and approval policy.</p>
        <textarea name="body" required rows={7} className="mt-5 w-full rounded-2xl border border-neutral-200 p-4 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" defaultValue={`Hi ${patient.firstName || "there"}, this is your dental office. You have a balance due. Please use this secure payment link: {{payment_link}}`} />
        <div className="mt-4 flex flex-wrap gap-2">
          {["First Name", "Preferred Name", "Practice Name", "Practice Phone", "Payment Link"].map((field) => <SmallTag key={field} tone="blue">{field}</SmallTag>)}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Link href={conversation ? `/patient-engagement?conversationId=${conversation.id}` : "/patient-engagement"} className="rounded-xl border border-neutral-200 px-5 py-3 text-sm font-semibold">Cancel</Link>
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Stage request</button>
        </div>
      </form>
    </div>
  );
}

function InsurancePanel({ patient, insurancePlans, benefits }: { patient: PatientContext; insurancePlans: Record<string, unknown>[]; benefits: Record<string, unknown>[] }) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-semibold">Eligibility report</h3>
            <p className="mt-2 text-sm text-neutral-500">{patient.name} · primary insurance</p>
          </div>
          <Link href="/app/pms/insurance" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Verify insurance</Link>
        </div>
      </section>
      {insurancePlans.map((plan, index) => (
        <section key={index} className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">Payer details</h3>
            <StateBadge tone={String(plan.eligibilityStatus) === "ACTIVE" ? "green" : "amber"}>{clean(plan.eligibilityStatus ?? "unverified")}</StateBadge>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Info label="Payer name" value={String(plan.payerName ?? "Required")} />
            <Info label="Payer ID" value={String(plan.payerId ?? "Required")} />
            <Info label="Member ID" value={String(plan.memberNumber ?? plan.subscriberId ?? "Required")} />
            <Info label="Group number" value={String(plan.groupNumber ?? "-")} />
            <Info label="Effective date" value={formatDate(plan.effectiveDate)} />
            <Info label="Last verified" value={formatDate(plan.lastVerifiedAt)} />
          </div>
        </section>
      ))}
      <section className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="rounded-2xl border border-blue-100 bg-white p-5">
              <p className="text-lg font-semibold">{clean(benefit.category ?? "Dental care")}</p>
              <p className="mt-3 text-sm text-neutral-500">Remaining</p>
              <p className="text-2xl font-semibold">{money(Number(benefit.annualMaxCents ?? 0) - Number(benefit.annualUsedCents ?? 0))}</p>
              <p className="mt-3 text-sm text-neutral-500">Deductible met</p>
              <p className="text-2xl font-semibold">{money(Number(benefit.deductibleMetCents ?? 0))}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <h3 className="text-xl font-semibold">Procedure coverage</h3>
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
            {["Diagnostic 50-100%", "Preventive 100%", "Restorative 50-100%", "Endodontics 50-70%", "Periodontics 70-100%"].map((row) => (
              <div key={row} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
                <span className="font-semibold">{row}</span>
                <span>⌄</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function FormsPanel({ conversation, patient, forms }: { conversation: ConversationRow | null; patient: PatientContext; forms: Record<string, unknown>[] }) {
  return (
    <div className="space-y-5">
      <ActionCard title="Open forms" empty="No open form packets.">
        {forms.map((form, index) => <RecordLine key={index} title={String(form.templateName ?? "Form packet")} meta={`${clean(form.status)} · due ${formatDate(form.dueAt)}`} />)}
      </ActionCard>
      <form action={stagePatientMessageAction} className="rounded-2xl border border-neutral-200 bg-white p-6">
        <input type="hidden" name="conversationId" value={conversation?.id ?? ""} />
        <input type="hidden" name="patientId" value={patient.id ?? ""} />
        <input type="hidden" name="recipientNumber" value={patient.phone ?? conversation?.callerNumber ?? ""} />
        <input type="hidden" name="consentStatus" value={patient.smsConsent} />
        <input type="hidden" name="messageType" value="FORM_PACKET_REQUEST" />
        <input type="hidden" name="linkType" value="FORM_PACKET_LINK" />
        <input type="hidden" name="linkLabel" value="Forms" />
        <h3 className="text-2xl font-semibold">Send form packet</h3>
        <textarea name="body" required rows={5} className="mt-4 w-full rounded-2xl border border-neutral-200 p-4 text-sm leading-6" defaultValue={`Hi ${patient.firstName || "there"}, please complete your secure forms before your visit: {{form_link}}`} />
        <div className="mt-5 flex justify-end">
          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Stage form request</button>
        </div>
      </form>
    </div>
  );
}

function SelectLike({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <button className="mt-2 flex h-12 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold">
        {value}
        <span>⌄</span>
      </button>
    </div>
  );
}

function TwoColumnRecords({ leftTitle, leftRows, rightTitle, rightRows }: { leftTitle: string; leftRows: Record<string, unknown>[]; rightTitle: string; rightRows: Record<string, unknown>[] }) {
  return (
    <section className="grid gap-5 md:grid-cols-2">
      <ActionCard title={leftTitle} empty={`No ${leftTitle.toLowerCase()} found.`}>
        {leftRows.map((row, index) => <RecordLine key={index} title={String(row.appointmentType ?? row.name ?? "Appointment")} meta={`${formatDate(row.startsAt)} · ${clean(row.status)}`} />)}
      </ActionCard>
      <ActionCard title={rightTitle} empty={`No ${rightTitle.toLowerCase()} found.`}>
        {rightRows.map((row, index) => <RecordLine key={index} title={String(row.name ?? row.description ?? row.code ?? "Procedure")} meta={`${money(Number(row.totalFeeCents ?? row.patientEstimateCents ?? 0))} · ${clean(row.status)}`} />)}
      </ActionCard>
    </section>
  );
}

function PatientIntelligence({
  patient,
  conversation,
  nextAppointments,
  family,
  forms,
  insurancePlans,
  benefits,
  procedures,
  tasks,
  callAi,
}: {
  patient: PatientContext;
  conversation: ConversationRow | null;
  nextAppointments: Record<string, unknown>[];
  family: Record<string, unknown>[];
  forms: Record<string, unknown>[];
  insurancePlans: Record<string, unknown>[];
  benefits: Record<string, unknown>[];
  procedures: Record<string, unknown>[];
  tasks: TaskRow[];
  callAi: Record<string, unknown>[];
}) {
  return (
    <div className="space-y-5 p-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Patient</p>
            <h3 className="mt-2 text-2xl font-semibold">{patient.name}</h3>
            <p className="mt-1 text-sm text-neutral-500">Chart {patient.chartNumber || "not assigned"} · {patient.phone || "no phone"}</p>
          </div>
          <Link href={patient.pmsHref} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold">Open PMS</Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Fact label="Balance" value={money(patient.openBalanceCents)} tone={patient.openBalanceCents > 0 ? "amber" : "green"} />
          <Fact label="Consent" value={clean(patient.smsConsent)} tone={patient.smsConsent === "VERIFIED" ? "green" : "amber"} />
        </div>
      </section>

      <ActionCard title="Call intelligence" empty="No call intelligence yet. Live calls add summary, transcript, sentiment, scheduling outcome, and service tags here.">
        {callAi.map((event) => (
          <div key={String(event.id)} className="rounded-xl bg-neutral-50 p-3 text-sm">
            <p className="font-semibold">{String(event.title)}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">{String(event.body)}</p>
          </div>
        ))}
      </ActionCard>

      <ActionCard title="Appointments" action={<Link href="/app/pms/schedule" className="text-sm font-semibold text-blue-700">Schedule</Link>} empty="No upcoming appointments found.">
        {nextAppointments.map((appt, index) => (
          <RecordLine key={index} title={String(appt.appointmentType ?? appt.name ?? "Appointment")} meta={`${formatDate(appt.startsAt)} · ${clean(appt.status)}`} />
        ))}
      </ActionCard>

      <ActionCard title="Insurance" action={<Link href="/app/pms/insurance" className="text-sm font-semibold text-blue-700">Verify</Link>} empty="No insurance plan in this snapshot.">
        {insurancePlans.map((plan, index) => (
          <div key={index} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{String(plan.payerName ?? "Payer required")}</p>
              <StateBadge tone={String(plan.eligibilityStatus) === "ACTIVE" ? "green" : "amber"}>{clean(plan.eligibilityStatus ?? "unverified")}</StateBadge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Info label="Member ID" value={String(plan.memberNumber ?? plan.subscriberId ?? "Required")} />
              <Info label="Network" value={clean(plan.networkStatus ?? "unknown")} />
              <Info label="Effective" value={formatDate(plan.effectiveDate)} />
              <Info label="Last verified" value={formatDate(plan.lastVerifiedAt)} />
            </div>
          </div>
        ))}
        {benefits.map((benefit, index) => (
          <div key={`benefit-${index}`} className="rounded-xl bg-blue-50 p-4 text-sm">
            <p className="font-semibold">Dental care maximum</p>
            <p className="mt-1 text-neutral-600">Remaining {money(Number(benefit.annualMaxCents ?? 0) - Number(benefit.annualUsedCents ?? 0))} / {money(Number(benefit.annualMaxCents ?? 0))}</p>
            <p className="mt-1 text-neutral-600">Deductible {money(Number(benefit.deductibleMetCents ?? 0))} met / {money(Number(benefit.deductibleCents ?? 0))}</p>
          </div>
        ))}
      </ActionCard>

      <ActionCard title="Payments" empty="No open balance found.">
        {patient.openBalanceCents > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">Ready to collect</p>
            <p className="mt-1 text-3xl font-semibold">{money(patient.openBalanceCents)}</p>
            <QuickMessage conversation={conversation} patient={patient} label="Create text-to-pay request" messageType="PAYMENT_REQUEST" linkType="PAYMENT_LINK" body={`Hi ${patient.firstName || "there"}, this is your dental office. You have a balance due. Please use this secure payment link: {{payment_link}}`} />
          </div>
        ) : null}
      </ActionCard>

      <ActionCard title="Forms" empty="No open forms.">
        {forms.map((form, index) => (
          <RecordLine key={index} title={String(form.templateName ?? "Form packet")} meta={`${clean(form.status)} · due ${formatDate(form.dueAt)}`} />
        ))}
      </ActionCard>

      <ActionCard title="Household" empty="No household members linked.">
        {family.map((member, index) => (
          <RecordLine key={index} title={`${String(member.firstName ?? "")} ${String(member.lastName ?? "")}`} meta={clean(member.relationship ?? member.status ?? "family member")} />
        ))}
      </ActionCard>

      <ActionCard title="Tasks" empty="No open tasks for this patient.">
        {tasks.map((task) => <RecordLine key={task.id} title={task.nextAction || task.taskType || "Task"} meta={`${clean(task.priority)} · ${clean(task.ownerRoleKey)}`} />)}
      </ActionCard>

      <ActionCard title="Treatment and procedures" empty="No open treatment or procedure context.">
        {procedures.map((procedure, index) => (
          <RecordLine key={index} title={String(procedure.name ?? procedure.description ?? procedure.code ?? "Procedure")} meta={`${money(Number(procedure.totalFeeCents ?? procedure.patientEstimateCents ?? 0))} · ${clean(procedure.status)}`} />
        ))}
      </ActionCard>
    </div>
  );
}

function ActionCard({ title, action, children, empty }: { title: string; action?: React.ReactNode; children: React.ReactNode; empty: string }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      <div className="space-y-3 p-5">
        {rows.length ? children : <p className="text-sm leading-6 text-neutral-500">{empty}</p>}
      </div>
    </section>
  );
}

function RecordLine({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{meta}</p>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" }) {
  return (
    <div className={`rounded-xl p-3 ${tone === "green" ? "bg-emerald-50" : "bg-amber-50"}`}>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-500">{body}</p>
    </div>
  );
}

function DatePill({ label }: { label: string }) {
  return <div className="mx-auto w-fit rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-500">{label}</div>;
}

function Avatar({ label, tone = "peach", size = "md" }: { label: string; tone?: "peach" | "blue" | "green"; size?: "md" | "lg" }) {
  const toneClass = tone === "blue" ? "bg-blue-100 text-blue-900" : tone === "green" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-neutral-950";
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl" : "h-12 w-12 text-base";
  return <span className={`grid shrink-0 place-items-center rounded-full font-bold ${toneClass} ${sizeClass}`}>{label}</span>;
}

function SmallTag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "amber" | "red" | "blue" | "green" }) {
  const toneClass = {
    neutral: "bg-neutral-100 text-neutral-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
  }[tone];
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function statusTone(value: unknown): "neutral" | "amber" | "red" | "blue" | "green" {
  const status = String(value ?? "").toUpperCase();
  if (status.includes("ACTIVE") || status.includes("READY") || status.includes("VERIFIED") || status.includes("APPROVED") || status.includes("SENT") || status.includes("ACCEPTED") || status.includes("COMPLETED")) return "green";
  if (status.includes("BLOCK") || status.includes("ERROR") || status.includes("FAILED") || status.includes("MISSING")) return "red";
  if (status.includes("REVIEW") || status.includes("DRAFT") || status.includes("REQUIRED") || status.includes("SETUP") || status.includes("UNKNOWN")) return "amber";
  if (status.includes("OPEN") || status.includes("NEW")) return "blue";
  return "neutral";
}

function buildPatientContext(conversation: ConversationRow | null, screenPop: ScreenPopRow | undefined, snapshot: Record<string, unknown>): PatientContext {
  const snapshotPatient = objectValue(snapshot.patient);
  const firstName = String(conversation?.firstName ?? snapshotPatient.firstName ?? "");
  const lastName = String(conversation?.lastName ?? snapshotPatient.lastName ?? "");
  const name = [firstName, lastName].filter(Boolean).join(" ") || String(conversation?.callerName ?? screenPop?.callerNumber ?? "Unknown patient");
  const family = arrayValue(snapshot.familyMembers);
  const preferences = [
    ...arrayValue(conversation?.communicationPreferences),
    ...arrayValue(snapshot.communicationPreferences),
  ];
  const sms = preferences.find((pref) => String(pref.channel).toUpperCase().includes("SMS"));
  return {
    id: conversation?.patientId ?? screenPop?.patientId ?? String(snapshotPatient.id ?? ""),
    firstName,
    name,
    initials: initials(firstName, lastName, name),
    chartNumber: String(conversation?.chartNumber ?? snapshotPatient.chartNumber ?? ""),
    phone: String(conversation?.phone ?? snapshotPatient.phone ?? conversation?.callerNumber ?? screenPop?.callerNumber ?? ""),
    email: String(conversation?.email ?? snapshotPatient.email ?? ""),
    sex: String(snapshotPatient.sex ?? ""),
    age: ageFromDob(snapshotPatient.dateOfBirth),
    status: String(snapshotPatient.status ?? "Active"),
    familyCount: family.length,
    openBalanceCents: Number(conversation?.openBalanceCents ?? objectValue(snapshot.financial).openBalanceCents ?? 0),
    smsConsent: String(sms?.consentStatus ?? "UNKNOWN"),
    conversationId: conversation?.id ?? "",
    pmsHref: conversation?.patientId || screenPop?.patientId ? `/app/pms/patients/${conversation?.patientId ?? screenPop?.patientId}` : "/app/pms/patients",
  };
}

function displayName(conversation: ConversationRow) {
  return [conversation.firstName, conversation.lastName].filter(Boolean).join(" ") || conversation.callerName || conversation.callerNumber || "Unknown patient";
}

function initials(first?: string | null, last?: string | null, fallback?: string | null) {
  const pieces = [first, last].filter((part): part is string => Boolean(part));
  const source = pieces.length ? pieces : String(fallback ?? "WV").split(/\s+/);
  return source.map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase() || "WV";
}

function ageFromDob(value: unknown) {
  if (!value) return "";
  const dob = new Date(String(value));
  if (Number.isNaN(dob.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age -= 1;
  return `${age}`;
}

function formatDate(value: unknown) {
  if (!value) return "not set";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function formatTime(value: unknown) {
  if (!value) return "00:00";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "00:00";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function panelHref(panel: string, conversationId?: string | null) {
  const params = new URLSearchParams();
  if (conversationId) params.set("conversationId", conversationId);
  params.set("panel", panel);
  return `/patient-engagement?${params.toString()}`;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Record<string, unknown>[] : [];
}

type ConversationRow = {
  id: string;
  patientId: string | null;
  appointmentId: string | null;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  phone: string | null;
  email: string | null;
  callerName: string | null;
  callerNumber: string | null;
  practiceNumber: string | null;
  direction: string;
  aiIntent: string | null;
  transcriptSummary: string | null;
  followUpStatus: string;
  outcome: string | null;
  startedAt: string;
  openBalanceCents: number;
  nextAppointments?: unknown;
  openTreatmentPlans?: unknown;
  openForms?: unknown;
  communicationPreferences?: unknown;
};

type MessageRow = {
  id: string;
  conversationId: string | null;
  patientId: string | null;
  body: string;
  messageType: string;
  approvalStatus: string;
  deliveryStatus: string;
  blockedReason?: string | null;
  providerError?: string | null;
};

type TaskRow = {
  id: string;
  patientId: string | null;
  taskType: string;
  priority: string;
  status: string;
  ownerRoleKey: string;
  nextAction: string | null;
};

type ScreenPopRow = {
  id: string;
  conversationId: string;
  activeCallId?: string | null;
  patientId: string | null;
  callerNumber: string | null;
  matchStatus: string;
  snapshotJson: unknown;
};

type PatientContext = {
  id: string;
  firstName: string;
  name: string;
  initials: string;
  chartNumber: string;
  phone: string;
  email: string;
  sex: string;
  age: string;
  status: string;
  familyCount: number;
  openBalanceCents: number;
  smsConsent: string;
  conversationId: string;
  pmsHref: string;
};
