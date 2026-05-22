import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { LivePanelRefresh } from "@/components/products/live-panel-refresh";
import { SpeechComposer } from "@/components/products/speech-composer";
import { getOpenAiModelCatalog, getOpenAiWebchatConfig, type OpenAiModelCatalog } from "@/lib/connector-control-repository";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";
import {
  crawlKnowledgePage,
  createWebchatTeamTask,
  createWebchatAppointmentHandoff,
  getConversationTranscript,
  getWebchatTeamPresence,
  getWebchatAiRuntimeSettings,
  postStaffWebchatEntry,
  transferWebchatConversation,
  updateWebchatAiRuntimeSettings,
  updateKnowledgeSourceReview,
  updateWebchatChannelSetting,
  upsertWebchatLeadForm,
  upsertWebchatSchedulingRule,
  type WebchatAiRuntimeSettings,
  type WebchatTeamMember,
} from "@/lib/webchat/repository";

export const dynamic = "force-dynamic";

async function staffEntryAction(formData: FormData) {
  "use server";
  await postStaffWebchatEntry({
    conversationId: String(formData.get("conversationId") ?? ""),
    body: String(formData.get("body") ?? ""),
    senderName: String(formData.get("senderName") ?? "Front desk"),
    entryType: String(formData.get("entryType") ?? "STAFF_NOTE") === "STAFF_REPLY" ? "STAFF_REPLY" : "STAFF_NOTE",
    status: String(formData.get("status") ?? "OPEN"),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function appointmentHandoffAction(formData: FormData) {
  "use server";
  await createWebchatAppointmentHandoff({
    conversationId: String(formData.get("conversationId") ?? ""),
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? "front_desk"),
    priority: String(formData.get("priority") ?? "HIGH"),
    requestedWindow: String(formData.get("requestedWindow") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function transferConversationAction(formData: FormData) {
  "use server";
  await transferWebchatConversation({
    conversationId: String(formData.get("conversationId") ?? ""),
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? "front_desk"),
    assignedStaffId: String(formData.get("assignedStaffId") ?? ""),
    priority: String(formData.get("priority") ?? "NORMAL"),
    dueMinutes: Number(formData.get("dueMinutes") ?? 30),
    note: String(formData.get("note") ?? ""),
    createTask: String(formData.get("createTask") ?? "true") === "true",
  });
  revalidatePath("/patient-engagement/webchat");
}

async function teamTaskAction(formData: FormData) {
  "use server";
  await createWebchatTeamTask({
    conversationId: String(formData.get("conversationId") ?? ""),
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? "front_desk"),
    assignedStaffId: String(formData.get("assignedStaffId") ?? ""),
    taskType: String(formData.get("taskType") ?? "WEBCHAT_FOLLOW_UP"),
    title: String(formData.get("title") ?? ""),
    priority: String(formData.get("priority") ?? "NORMAL"),
    dueMinutes: Number(formData.get("dueMinutes") ?? 30),
    note: String(formData.get("note") ?? ""),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function crawlAction(formData: FormData) {
  "use server";
  const url = String(formData.get("url") ?? "");
  const parsed = new URL(url);
  const firstPartyHost = parsed.hostname === "1dentalai.com" || parsed.hostname.endsWith(".1dentalai.com");
  if (!firstPartyHost && !process.env.WEBCHAT_CRAWL_TOKEN) throw new Error("External knowledge crawling requires WEBCHAT_CRAWL_TOKEN.");
  await crawlKnowledgePage({ url });
  revalidatePath("/patient-engagement/webchat");
}

async function knowledgeReviewAction(formData: FormData) {
  "use server";
  await updateKnowledgeSourceReview({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? "READY_FOR_RETRIEVAL"),
    actorRole: String(formData.get("actorRole") ?? "practice_manager"),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function leadFormAction(formData: FormData) {
  "use server";
  await upsertWebchatLeadForm({
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    serviceLine: String(formData.get("serviceLine") ?? ""),
    fields: String(formData.get("fields") ?? ""),
    routingRule: String(formData.get("routingRule") ?? ""),
    status: String(formData.get("status") ?? "READY_FOR_REVIEW"),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function schedulingRuleAction(formData: FormData) {
  "use server";
  await upsertWebchatSchedulingRule({
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    bookingWindowDays: Number(formData.get("bookingWindowDays") ?? 30),
    allowReschedule: String(formData.get("allowReschedule") ?? "true") === "true",
    requireHumanApproval: String(formData.get("requireHumanApproval") ?? "true") === "true",
    status: String(formData.get("status") ?? "READY_FOR_REVIEW"),
    nextAction: String(formData.get("nextAction") ?? ""),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function channelSettingAction(formData: FormData) {
  "use server";
  await updateWebchatChannelSetting({
    displayName: String(formData.get("displayName") ?? "1DentalAI Web Chat"),
    primaryColor: String(formData.get("primaryColor") ?? "#0891b2"),
    launcherText: String(formData.get("launcherText") ?? "Need help?"),
    nlpMode: String(formData.get("nlpMode") ?? "RULES_AND_AI_DRAFT"),
    nextAction: String(formData.get("nextAction") ?? ""),
  });
  revalidatePath("/patient-engagement/webchat");
}

async function aiRuntimeSettingsAction(formData: FormData) {
  "use server";
  const textModel = normalizeTextModel(String(formData.get("textModel") ?? "gpt-4.1").trim());
  const parseNumber = (name: string, fallback: number) => {
    const value = Number(formData.get(name) ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  };
  const parseBoolean = (name: string, fallback: boolean) => {
    const value = String(formData.get(name) ?? String(fallback));
    return value === "true";
  };
  const parseCsv = (name: string, fallback: string[]) => {
    const value = String(formData.get(name) ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    return value.length ? value : fallback;
  };
  try {
    await updateWebchatAiRuntimeSettings({
      actorRole: "practice_manager",
      llmSettings: {
        textModel,
        reasoningEffort: String(formData.get("reasoningEffort") ?? "none").trim(),
        temperature: parseNumber("temperature", 0.25),
        maxOutputTokens: Math.round(parseNumber("maxOutputTokens", 280)),
        responseStyle: String(formData.get("responseStyle") ?? "concise_front_desk").trim(),
        allowModelKnowledge: parseBoolean("allowModelKnowledge", false),
        allowWebSearch: parseBoolean("allowWebSearch", false),
      },
      voiceSettings: {
        realtimeModel: String(formData.get("realtimeModel") ?? "gpt-realtime-mini").trim(),
        transcriptionModel: String(formData.get("transcriptionModel") ?? "gpt-realtime-whisper").trim(),
        voice: String(formData.get("voice") ?? "alloy").trim(),
        speed: parseNumber("speed", 1),
        turnDetection: String(formData.get("turnDetection") ?? "server_vad").trim(),
        silenceTimeoutMs: Math.round(parseNumber("silenceTimeoutMs", 900)),
        bargeIn: parseBoolean("bargeIn", true),
        recordingPolicy: String(formData.get("recordingPolicy") ?? "consent_required").trim(),
      },
      promptPolicy: {
        systemPrompt: String(formData.get("systemPrompt") ?? "").trim(),
        chatPrompt: String(formData.get("chatPrompt") ?? "").trim(),
        voicePrompt: String(formData.get("voicePrompt") ?? "").trim(),
        handoffPrompt: String(formData.get("handoffPrompt") ?? "").trim(),
      },
      ragPolicy: {
        retrievalMode: String(formData.get("retrievalMode") ?? "APPROVED_LOCAL_KB_ONLY").trim(),
        minimumChunks: Math.round(parseNumber("minimumChunks", 1)),
        maxChunks: Math.round(parseNumber("maxChunks", 5)),
        requireKnowledgeForGeneralAnswers: parseBoolean("requireKnowledgeForGeneralAnswers", true),
        blockedWhenNoKnowledge: String(formData.get("blockedWhenNoKnowledge") ?? "").trim(),
        allowedSourceStatuses: parseCsv("allowedSourceStatuses", ["READY_FOR_RETRIEVAL"]),
        internetKnowledge: "DISABLED",
        externalSearch: "DISABLED",
      },
    });
    revalidatePath("/patient-engagement/webchat");
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI runtime settings could not be saved.";
    redirect(`/patient-engagement/webchat?view=ai-settings&aiError=${encodeURIComponent(message)}`);
  }
  redirect("/patient-engagement/webchat?view=ai-settings&aiSaved=1");
}

function normalizeTextModel(model: string) {
  const value = model.trim() || "gpt-4.1";
  if (/realtime|transcribe|whisper|tts|audio/i.test(value)) return "gpt-4.1";
  return value;
}

export default async function PatientEngagementWebchatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string; view?: string; q?: string; channel?: string; aiSaved?: string; aiError?: string }>;
}) {
  const params = await searchParams;
  const view = ["inbox", "knowledge", "forms", "install", "ai-settings"].includes(params.view ?? "") ? String(params.view) : "inbox";
  const center = await getPhoneOperatingCenter();
  const allChats = (center.webChats ?? []) as WebChatRow[];
  const query = String(params.q ?? "").trim().toLowerCase();
  const channelFilter = ["WEB_CHAT", "SMS"].includes(params.channel ?? "") ? String(params.channel) : "ALL";
  const chats = allChats.filter((chat) => {
    const channelMatches = channelFilter === "ALL" || chat.sourceChannel === channelFilter;
    if (!channelMatches) return false;
    if (!query) return true;
    return [chat.visitorName, chat.visitorPhone, chat.visitorEmail, chat.sourcePage, chat.campaignSource, chat.nlpIntent]
      .some((value) => String(value ?? "").toLowerCase().includes(query));
  });
  const selectedConversation = chats.find((chat) => chat.id === params.conversationId) ?? chats[0] ?? null;
  const transcript = selectedConversation ? await getConversationTranscript(selectedConversation.id) : null;
  const teamPresence = view === "inbox" ? await getWebchatTeamPresence() : [];
  const messages = (transcript?.messages ?? []) as WebChatMessageRow[];
  const knowledge = (center.knowledgeSources ?? []) as KnowledgeRow[];
  const forms = (center.leadForms ?? []) as LeadFormRow[];
  const schedulingRules = (center.schedulingRules ?? []) as SchedulingRuleRow[];
  const channel = ((center.channelSettings ?? []) as ChannelRow[]).find((row) => row.channel === "WEB_CHAT");
  const aiSettings = await getWebchatAiRuntimeSettings();
  const [openAiModels, openAiRuntime] = view === "ai-settings"
    ? await Promise.all([getOpenAiModelCatalog(), getOpenAiWebchatConfig()])
    : [null, null] as const;
  const installScript = `<script async src="https://app.1dentalai.com/api/webchat/widget.js?tenant=tenant_1dentalai_production&v=20260522-patient-chat-clean"></script>`;

  return (
    <PatientEngagementShell active="/patient-engagement/webchat">
      {view === "inbox" ? <LivePanelRefresh intervalMs={2500} /> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["inbox", "Inbox"],
          ["knowledge", "Knowledge base"],
          ["forms", "Lead forms and scheduling"],
          ["ai-settings", "AI runtime"],
          ["install", "Widget install"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={`/patient-engagement/webchat?view=${key}${selectedConversation ? `&conversationId=${selectedConversation.id}` : ""}`}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${view === key ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-700"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {view === "inbox" ? (
        <section className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
          <div className="grid min-h-[760px] xl:grid-cols-[82px_380px_minmax(0,1fr)]">
            <aside className="hidden border-r border-neutral-200 bg-white xl:flex xl:flex-col xl:items-center xl:justify-between xl:py-6">
              <div className="space-y-6">
                <Avatar label="FD" size="lg" tone="green" />
                {[
                  ["ALL", "All", "C"],
                  ["WEB_CHAT", "Web", "W"],
                  ["SMS", "SMS", "S"],
                ].map(([key, label, icon]) => (
                  <Link key={key} href={`/patient-engagement/webchat?channel=${key}`} className={`flex flex-col items-center gap-2 text-xs font-semibold ${channelFilter === key ? "text-blue-600" : "text-neutral-400 hover:text-neutral-700"}`}>
                    <span className={`grid h-10 w-10 place-items-center rounded-2xl ${channelFilter === key ? "bg-blue-50 text-blue-600" : "bg-neutral-100"}`}>{icon}</span>
                    {label}
                  </Link>
                ))}
              </div>
              <Link href="/patient-engagement/settings" className="flex flex-col items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-neutral-700">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-neutral-100">S</span>
                Settings
              </Link>
            </aside>

            <aside className="border-r border-neutral-200 bg-white">
              <form className="border-b border-neutral-200 p-4" action="/patient-engagement/webchat">
                <input type="hidden" name="view" value="inbox" />
                <input type="hidden" name="channel" value={channelFilter} />
                <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3">
                  <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" name="q" placeholder="Search..." defaultValue={params.q ?? ""} />
                  <button className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-neutral-700 shadow-sm">Go</button>
                </div>
              </form>
              <div className="max-h-[690px] overflow-y-auto">
                {chats.length ? chats.map((chat) => {
                  const isSelected = selectedConversation?.id === chat.id;
                  return (
                    <Link
                      key={chat.id}
                      href={`/patient-engagement/webchat?conversationId=${chat.id}&q=${encodeURIComponent(params.q ?? "")}&channel=${channelFilter}`}
                      className={`grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 border-b border-neutral-200 px-5 py-4 transition ${isSelected ? "bg-neutral-100" : "bg-white hover:bg-neutral-50"}`}
                    >
                      <Avatar label={personLabel(chat)} tone={chat.sourceChannel === "SMS" ? "blue" : "dark"} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-950">{personLabel(chat)}</p>
                        <p className="mt-1 truncate text-sm text-neutral-500">{chat.lastMessageBody || chat.nextBestAction || clean(chat.nlpIntent ?? "new conversation")}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-neutral-500">{chat.sourceChannel === "SMS" ? "Two-way SMS" : "Website chat"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">{relativeTime(chat.updatedAt || chat.createdAt)}</p>
                        <span className={`mt-4 inline-grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-semibold ${chat.leadScore >= 80 ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-700"}`}>
                          {chat.leadScore}
                        </span>
                      </div>
                    </Link>
                  );
                }) : <div className="p-5"><Empty title="No conversations match" body="Clear the search or switch channels." /></div>}
              </div>
            </aside>

            <main className="flex min-w-0 flex-col bg-white">
              {selectedConversation ? (
                <>
                  <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-neutral-950">{personLabel(selectedConversation)}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
                        <span>{clean(selectedConversation.qualificationStage)}</span>
                        <span>{selectedConversation.sourceChannel === "SMS" ? "SMS thread" : "Website visitor"}</span>
                        <span>{selectedConversation.visitorPhone || selectedConversation.visitorEmail || "contact not captured"}</span>
                        <span>{selectedConversation.leadScore} lead score</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StateBadge tone={(selectedConversation.automationMode || "AI_AUTO") === "AI_AUTO" ? "green" : "amber"}>{clean(selectedConversation.automationMode || "AI_AUTO")}</StateBadge>
                      <Link href={`/patient-engagement/webchat?view=knowledge&conversationId=${selectedConversation.id}`} className="grid h-10 w-10 place-items-center rounded-full border border-neutral-200 text-sm font-semibold text-neutral-700">K</Link>
                      <Link href="/patient-engagement/settings" className="grid h-10 w-10 place-items-center rounded-full border border-neutral-200 text-sm font-semibold text-neutral-700">S</Link>
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
                    <div className="mx-auto mb-6 w-fit rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-500">Today</div>
                    <div className="space-y-5">
                      {messages.length ? messages.map((message) => (
                        <MessageBubble key={message.id} message={message} visitorLabel={personLabel(selectedConversation)} />
                      )) : (
                        <Empty title="No messages yet" body="The transcript appears here as soon as the widget or SMS thread receives a message." />
                      )}
                    </div>
                  </div>

                  <footer className="border-t border-neutral-200 bg-white px-6 py-5">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                      <div className="space-y-4">
                        <form action={staffEntryAction} className="flex items-end gap-3">
                          <input type="hidden" name="conversationId" value={selectedConversation.id} />
                          <input type="hidden" name="entryType" value="STAFF_REPLY" />
                          <input type="hidden" name="status" value="OPEN" />
                          <SpeechComposer name="body" required placeholder="Reply to the website visitor" />
                          <button className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-sm font-semibold text-white shadow-sm">Send</button>
                        </form>
                        <form action={staffEntryAction} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <input type="hidden" name="conversationId" value={selectedConversation.id} />
                          <input type="hidden" name="entryType" value="STAFF_NOTE" />
                          <input type="hidden" name="status" value="OPEN" />
                          <div className="flex items-end gap-3">
                            <Textarea name="body" label="Internal team note" rows={2} />
                            <button className="rounded-xl bg-amber-900 px-4 py-3 text-sm font-semibold text-white">Add note</button>
                          </div>
                        </form>
                      </div>
                      <TeamCollaborationPanel conversation={selectedConversation} team={teamPresence} />
                    </div>
                  </footer>
                </>
              ) : <div className="p-6"><Empty title="No conversation selected" body="Select a chat from the inbox." /></div>}
            </main>

          </div>
        </section>
      ) : null}

      {view === "knowledge" ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <WorkSurface title="Add knowledge source" eyebrow="Crawler and review">
            <form action={crawlAction} className="space-y-3">
              <Input name="url" label="Page URL" placeholder="https://1dentalai.com/product" required />
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Crawl page</button>
              <p className="text-xs leading-5 text-neutral-500">First-party pages can be crawled directly. External websites require the crawl token so we do not silently scrape random sites.</p>
            </form>
          </WorkSurface>
          <WorkSurface title="Knowledge review queue" eyebrow="Only reviewed content can answer patients">
            <div className="space-y-3">
              {knowledge.length ? knowledge.map((source) => (
                <div key={source.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{source.title}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">{source.contentSummary}</p>
                    </div>
                    <StateBadge tone={source.status.includes("READY") || source.status.includes("APPROVED") ? "green" : "amber"}>{clean(source.status)}</StateBadge>
                  </div>
                  <form action={knowledgeReviewAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={source.id} />
                    <input type="hidden" name="actorRole" value={source.ownerRoleKey || "practice_manager"} />
                    <button name="status" value="READY_FOR_RETRIEVAL" className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">Approve for retrieval</button>
                    <button name="status" value="NEEDS_REVIEW" className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Needs review</button>
                  </form>
                </div>
              )) : <Empty title="No knowledge sources" body="Crawl pages and approve source summaries before webchat can use them in patient-facing answers." />}
            </div>
          </WorkSurface>
        </section>
      ) : null}

      {view === "forms" ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <WorkSurface title="Lead form builder" eyebrow="Service-line capture">
            <form action={leadFormAction} className="grid gap-3">
              <Input name="name" label="Form name" placeholder="Implant consult lead form" required />
              <Input name="serviceLine" label="Service line" placeholder="Implants" required />
              <Input name="fields" label="Fields" placeholder="name, phone, email, service_line, preferred_time, consent" />
              <Input name="routingRule" label="Routing rule" placeholder="Front desk verifies contact, then treatment coordinator calls." />
              <Select name="status" label="Status" options={["READY_FOR_REVIEW", "READY", "DRAFT"]} />
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save lead form</button>
            </form>
            <div className="mt-5 space-y-3">
              {forms.map((form) => (
                <div key={form.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-sm font-semibold text-neutral-950">{form.name}</p>
                  <p className="mt-1 text-xs text-neutral-600">{form.serviceLine} · {clean(form.status)} · {clean(form.connectorStatus)}</p>
                </div>
              ))}
            </div>
          </WorkSurface>

          <WorkSurface title="Appointment handoff rules" eyebrow="Scheduling and PMS writeback">
            <form action={schedulingRuleAction} className="grid gap-3">
              <Input name="name" label="Rule name" placeholder="Webchat appointment request" required />
              <Input name="bookingWindowDays" label="Booking window days" placeholder="30" />
              <Select name="allowReschedule" label="Allow reschedule" options={["true", "false"]} />
              <Select name="requireHumanApproval" label="Human approval" options={["true", "false"]} />
              <Select name="status" label="Status" options={["READY_FOR_REVIEW", "ACTIVE", "SETUP_REQUIRED"]} />
              <Input name="nextAction" label="Next action" placeholder="Approve connector route or keep manual handoff." />
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save scheduling rule</button>
            </form>
            <div className="mt-5 space-y-3">
              {schedulingRules.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{rule.name}</p>
                      <p className="mt-1 text-xs text-neutral-600">{clean(rule.status)} · window {rule.bookingWindowDays} days · {clean(rule.pmsWritebackStatus)}</p>
                    </div>
                    <StateBadge tone={rule.pmsWritebackStatus === "READY" ? "green" : "amber"}>{clean(rule.pmsWritebackStatus)}</StateBadge>
                  </div>
                </div>
              ))}
            </div>
          </WorkSurface>
        </section>
      ) : null}

      {view === "install" ? (
        <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <WorkSurface title="Widget configuration" eyebrow="Theme, NLP mode, approvals">
            <form action={channelSettingAction} className="grid gap-3">
              <Input name="displayName" label="Display name" defaultValue={channel?.displayName || "1DentalAI Web Chat"} />
              <Input name="primaryColor" label="Primary color" defaultValue={themeValue(channel?.theme, "primaryColor", "#0891b2")} />
              <Input name="launcherText" label="Launcher text" defaultValue={themeValue(channel?.theme, "launcherText", "Need help?")} />
              <Select name="nlpMode" label="NLP mode" options={["RULES_AND_AI_DRAFT", "STAFF_ONLY", "AI_DRAFT_REVIEW_REQUIRED"]} defaultValue={channel?.nlpMode || "RULES_AND_AI_DRAFT"} />
              <Input name="nextAction" label="Next action" defaultValue={channel?.nextAction || "Install widget script, approve knowledge base, approve lead forms, and verify scheduling handoff."} />
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save widget settings</button>
            </form>
          </WorkSurface>

          <WorkSurface title="Install script and readiness" eyebrow="Website deployment">
            <div className="rounded-lg border border-neutral-200 bg-neutral-950 p-4 text-sm text-white">
              <code className="break-all">{installScript}</code>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Context label="Connector" value={clean(channel?.connectorStatus ?? "connector required")} detail="Public delivery and operator replies require a live connector." />
              <Context label="Knowledge" value={clean(channel?.knowledgeBaseStatus ?? "needs review")} detail="Only reviewed sources should be used in answers." />
              <Context label="Scheduling" value={clean(channel?.schedulingStatus ?? "pms connector required")} detail="Bookings stay as staff handoff until PMS route is approved." />
              <Context label="Forms" value={clean(channel?.formsStatus ?? "pms forms required")} detail="Form writeback requires mapped PMS form workflow." />
            </div>
          </WorkSurface>
        </section>
      ) : null}

      {view === "ai-settings" ? (
        <AiRuntimePanel settings={aiSettings} modelCatalog={openAiModels} openAiRuntime={openAiRuntime} saved={params.aiSaved === "1"} error={params.aiError} />
      ) : null}
    </PatientEngagementShell>
  );
}

type WebChatRow = {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  sourcePage: string | null;
  sourceChannel: string;
  campaignSource: string | null;
  landingPageSlug: string | null;
  nlpIntent: string | null;
  automationMode: string;
  handoffReason: string | null;
  leadScore: number;
  qualificationStage: string;
  schedulingOutcome: string;
  pmsWritebackStatus: string;
  ownerRoleKey: string;
  assignedStaffId: string | null;
  staffOwnerDueAt: string | null;
  nextBestAction: string | null;
  blockedReason: string | null;
  lastMessageBody?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type WebChatMessageRow = {
  id: string;
  senderType: string;
  body: string;
  intent: string | null;
  actionType: string | null;
  actionStatus: string;
  deliveryStatus: string;
};

function relativeTime(value?: string | null) {
  if (!value) return "now";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "now";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type KnowledgeRow = { id: string; title: string; status: string; ownerRoleKey: string; contentSummary: string };
type LeadFormRow = { id: string; name: string; serviceLine: string; status: string; connectorStatus: string };
type SchedulingRuleRow = { id: string; name: string; status: string; bookingWindowDays: number; pmsWritebackStatus: string };
type ChannelRow = { channel: string; displayName: string; theme: unknown; nlpMode: string; connectorStatus: string; knowledgeBaseStatus: string; schedulingStatus: string; formsStatus: string; nextAction: string };

function TeamCollaborationPanel({ conversation, team }: { conversation: WebChatRow; team: WebchatTeamMember[] }) {
  const ownerOptions = ["front_desk", "treatment_coordinator", "practice_manager", "billing_team", "provider"];
  const assigned = team.find((member) => member.id === conversation.assignedStaffId);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-950">Team handoff</p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">
            Owner: {clean(conversation.ownerRoleKey)}{assigned ? ` · ${assigned.displayName}` : ""}{conversation.staffOwnerDueAt ? ` · due ${relativeTime(conversation.staffOwnerDueAt)}` : ""}
          </p>
        </div>
        <StateBadge tone={conversation.assignedStaffId ? "green" : "amber"}>{conversation.assignedStaffId ? "Assigned" : "Unassigned"}</StateBadge>
      </div>

      <div className="mt-4 grid gap-2">
        {team.length ? team.slice(0, 6).map((member) => (
          <div key={member.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${member.id === conversation.assignedStaffId ? "border-blue-200 bg-blue-50" : "border-neutral-200 bg-white"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <PresenceDot status={member.presenceStatus} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">{member.displayName}</p>
                <p className="truncate text-xs text-neutral-500">{clean(member.roleKey)} · {member.openChats} chats · {member.openTasks} tasks</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-neutral-500">{clean(member.presenceStatus)}</span>
          </div>
        )) : (
          <Empty title="No active team users" body="Invite users or have staff sign in so ownership, workload, and presence can be tracked." />
        )}
      </div>

      <form action={transferConversationAction} className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-white p-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select name="ownerRoleKey" label="Transfer to team" options={ownerOptions} defaultValue={conversation.ownerRoleKey || "front_desk"} />
          <StaffSelect name="assignedStaffId" label="Staff member" team={team} defaultValue={conversation.assignedStaffId ?? ""} />
          <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} defaultValue={conversation.leadScore >= 80 ? "HIGH" : "NORMAL"} />
          <Select name="dueMinutes" label="Due in" options={["10", "30", "60", "240", "1440"]} defaultValue="30" />
        </div>
        <Textarea name="note" label="Transfer note" rows={2} />
        <input type="hidden" name="createTask" value="true" />
        <button className="w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Transfer and create task</button>
      </form>

      <form action={teamTaskAction} className="mt-3 space-y-3 rounded-xl border border-neutral-200 bg-white p-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <Input name="title" label="Task title" placeholder="Call visitor about appointment options" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select name="taskType" label="Task type" options={["WEBCHAT_FOLLOW_UP", "CALL_VISITOR", "SCHEDULE_APPOINTMENT", "VERIFY_INSURANCE", "SERVICE_RECOVERY"]} />
          <Select name="ownerRoleKey" label="Owner" options={ownerOptions} defaultValue={conversation.ownerRoleKey || "front_desk"} />
          <StaffSelect name="assignedStaffId" label="Staff" team={team} defaultValue={conversation.assignedStaffId ?? ""} />
          <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} defaultValue="NORMAL" />
        </div>
        <Textarea name="note" label="Task note" rows={2} />
        <input type="hidden" name="dueMinutes" value="30" />
        <button className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-950">Create internal task</button>
      </form>

      <form action={appointmentHandoffAction} className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <Input name="requestedWindow" label="Appointment window" placeholder="Tomorrow morning" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} defaultValue="HIGH" />
          <Select name="ownerRoleKey" label="Owner" options={["front_desk", "treatment_coordinator", "practice_manager"]} defaultValue="front_desk" />
        </div>
        <Input name="note" label="Scheduling note" placeholder="Verify insurance first" />
        <button className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white">Create scheduling handoff</button>
      </form>
    </div>
  );
}

function PresenceDot({ status }: { status: WebchatTeamMember["presenceStatus"] }) {
  const color = status === "ONLINE" ? "bg-emerald-500" : status === "RECENT" ? "bg-amber-400" : "bg-neutral-300";
  return <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />;
}

function StaffSelect({ name, label, team, defaultValue }: { name: string; label: string; team: WebchatTeamMember[]; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
        <option value="">Role queue</option>
        {team.map((member) => (
          <option key={member.id} value={member.id}>{member.displayName} · {clean(member.roleKey)} · {clean(member.presenceStatus)}</option>
        ))}
      </select>
    </label>
  );
}

function AiRuntimePanel({
  settings,
  modelCatalog,
  openAiRuntime,
  saved,
  error,
}: {
  settings: WebchatAiRuntimeSettings;
  modelCatalog: OpenAiModelCatalog | null;
  openAiRuntime: Awaited<ReturnType<typeof getOpenAiWebchatConfig>> | null;
  saved: boolean;
  error?: string;
}) {
  const models = modelCatalog?.models ?? [];
  const effectiveTextModel = normalizeTextModel(settings.llmSettings.textModel);
  return (
    <form action={aiRuntimeSettingsAction} className="mt-5 space-y-5">
      <WorkSurface title="AI runtime settings" eyebrow="OpenAI, prompt policy, and response behavior">
        {saved ? (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            AI runtime settings saved. The next webchat AI response will use these model, prompt, voice, and RAG settings.
          </div>
        ) : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
            AI runtime settings failed to save: {error}
          </div>
        ) : null}
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">Responses are locked to approved local knowledge.</p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Web search is disabled. General model knowledge is disabled by default. If the approved knowledge base does not contain an answer, the assistant must ask a clarifying question or hand the conversation to staff.
          </p>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Context label="OpenAI model catalog" value={clean(modelCatalog?.status ?? "not loaded")} detail={`${models.length} models available from ${clean(modelCatalog?.source ?? "unknown")}. Manual model IDs are accepted for newly released models.`} />
          <Context label="Catalog fetched" value={modelCatalog?.fetchedAt ? new Date(modelCatalog.fetchedAt).toLocaleString("en-US") : "Not fetched"} detail={modelCatalog?.error ?? "Live model list loaded from OpenAI with the stored API key."} />
          <Context label="Current text model" value={effectiveTextModel} detail="Realtime, transcription, TTS, and audio model IDs are rejected for webchat text replies." />
          <Context label="API key source" value={clean(openAiRuntime?.source ?? "not checked")} detail={openAiRuntime?.ready ? "OpenAI is available to webchat runtime." : "Keys are managed only in Integrations - API keys."} />
        </div>
        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-950">API keys are not edited on this page.</p>
              <p className="mt-1 text-sm leading-6 text-sky-900">
                This screen controls model, prompt, voice, and knowledge behavior. Store or rotate OpenAI, Twilio, Zoom, NexHealth, Stedi, and other provider keys in the shared encrypted vault.
              </p>
            </div>
            <Link href="/app/connectors?view=credentials" className="rounded-md bg-sky-700 px-3 py-2 text-xs font-semibold text-white">
              Open integration keys
            </Link>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <Input name="textModel" label="Text model" defaultValue={effectiveTextModel} list="openai-text-models" />
          <Select name="reasoningEffort" label="Reasoning effort" options={["none", "minimal", "low", "medium", "high"]} defaultValue={settings.llmSettings.reasoningEffort} />
          <Input name="temperature" label="Temperature" type="number" step="0.05" min="0" max="2" defaultValue={String(settings.llmSettings.temperature)} />
          <Input name="maxOutputTokens" label="Max output tokens" type="number" min="80" max="2000" defaultValue={String(settings.llmSettings.maxOutputTokens)} />
        </div>
        <datalist id="openai-text-models">
          {models.filter((model) => normalizeTextModel(model) === model).map((model) => <option key={model} value={model} />)}
        </datalist>
        <datalist id="openai-models">
          {models.map((model) => <option key={model} value={model} />)}
        </datalist>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Input name="responseStyle" label="Response style" defaultValue={settings.llmSettings.responseStyle} />
          <Select name="allowModelKnowledge" label="General model knowledge" options={["false", "true"]} defaultValue={String(settings.llmSettings.allowModelKnowledge)} />
          <Select name="allowWebSearch" label="Web search" options={["false", "true"]} defaultValue={String(settings.llmSettings.allowWebSearch)} />
        </div>
      </WorkSurface>

      <section className="grid gap-5 xl:grid-cols-2">
        <WorkSurface title="Prompt policy" eyebrow="Chat and voice instructions">
          <div className="grid gap-4">
            <Textarea name="systemPrompt" label="System prompt" defaultValue={settings.promptPolicy.systemPrompt} rows={5} />
            <Textarea name="chatPrompt" label="Webchat prompt" defaultValue={settings.promptPolicy.chatPrompt} rows={4} />
            <Textarea name="voicePrompt" label="Voice prompt" defaultValue={settings.promptPolicy.voicePrompt} rows={4} />
            <Textarea name="handoffPrompt" label="Staff handoff policy" defaultValue={settings.promptPolicy.handoffPrompt} rows={4} />
          </div>
        </WorkSurface>

        <WorkSurface title="Knowledge base policy" eyebrow="Local RAG only">
          <div className="grid gap-4">
            <Input name="retrievalMode" label="Retrieval mode" defaultValue={settings.ragPolicy.retrievalMode} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="minimumChunks" label="Minimum chunks" type="number" min="0" max="10" defaultValue={String(settings.ragPolicy.minimumChunks)} />
              <Input name="maxChunks" label="Max chunks" type="number" min="1" max="12" defaultValue={String(settings.ragPolicy.maxChunks)} />
            </div>
            <Select name="requireKnowledgeForGeneralAnswers" label="Require knowledge for answers" options={["true", "false"]} defaultValue={String(settings.ragPolicy.requireKnowledgeForGeneralAnswers)} />
            <Input name="allowedSourceStatuses" label="Allowed source statuses" defaultValue={settings.ragPolicy.allowedSourceStatuses.join(", ")} />
            <Textarea name="blockedWhenNoKnowledge" label="No-knowledge response" defaultValue={settings.ragPolicy.blockedWhenNoKnowledge} rows={4} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Context label="Internet knowledge" value={settings.ragPolicy.internetKnowledge} detail="Hard-coded disabled in the save action." />
              <Context label="External search" value={settings.ragPolicy.externalSearch} detail="No web search tool is sent to the model." />
            </div>
          </div>
        </WorkSurface>
      </section>

      <WorkSurface title="Voice settings" eyebrow="Realtime assistant behavior">
        <div className="grid gap-4 lg:grid-cols-4">
          <Input name="realtimeModel" label="Realtime model" defaultValue={settings.voiceSettings.realtimeModel} list="openai-models" />
          <Input name="transcriptionModel" label="Transcription model" defaultValue={settings.voiceSettings.transcriptionModel} list="openai-models" />
          <Input name="voice" label="Voice" defaultValue={settings.voiceSettings.voice} />
          <Input name="speed" label="Speed" type="number" step="0.05" min="0.6" max="1.4" defaultValue={String(settings.voiceSettings.speed)} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <Select name="turnDetection" label="Turn detection" options={["server_vad", "semantic_vad"]} defaultValue={settings.voiceSettings.turnDetection} />
          <Input name="silenceTimeoutMs" label="Silence timeout ms" type="number" min="300" max="3000" defaultValue={String(settings.voiceSettings.silenceTimeoutMs)} />
          <Select name="bargeIn" label="Barge in" options={["true", "false"]} defaultValue={String(settings.voiceSettings.bargeIn)} />
          <Select name="recordingPolicy" label="Recording policy" options={["consent_required", "disabled", "practice_policy"]} defaultValue={settings.voiceSettings.recordingPolicy} />
        </div>
      </WorkSurface>

      <div className="sticky bottom-4 flex justify-end">
        <button className="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-lg">Save AI runtime settings</button>
      </div>
    </form>
  );
}

function MessageBubble({ message, visitorLabel }: { message: WebChatMessageRow; visitorLabel: string }) {
  const isIncoming = message.senderType === "VISITOR";
  const isNote = message.senderType === "STAFF_NOTE";
  return (
    <div className={`flex items-end gap-3 ${isIncoming ? "justify-start" : "justify-end"}`}>
      {isIncoming ? <Avatar label={visitorLabel} tone="rose" /> : null}
      <div className={`max-w-[68%] rounded-2xl px-4 py-3 ${isIncoming ? "rounded-bl-md bg-neutral-100 text-neutral-950" : isNote ? "rounded-br-md bg-amber-50 text-neutral-900" : "rounded-br-md bg-blue-600 text-white"}`}>
        <p className={`mb-1 text-sm font-semibold ${isIncoming ? "text-neutral-950" : isNote ? "text-neutral-950" : "text-white"}`}>
          {isIncoming ? visitorLabel : isNote ? "Internal note" : message.senderType === "STAFF" ? "Front desk" : "1DentalAI"}
        </p>
        <p className="text-sm leading-6">{message.body}</p>
        <p className={`mt-2 text-right text-[11px] ${isIncoming || isNote ? "text-neutral-500" : "text-blue-100"}`}>
          {clean(message.actionStatus || message.deliveryStatus || message.intent || "message")}
        </p>
      </div>
      {!isIncoming ? <Avatar label="AI" tone="green" /> : null}
    </div>
  );
}

function Avatar({ label, tone = "dark", size = "md" }: { label: string; tone?: "dark" | "blue" | "green" | "rose"; size?: "md" | "lg" | "xl" }) {
  const sizeClass = size === "xl" ? "h-20 w-20 text-xl" : size === "lg" ? "h-12 w-12 text-base" : "h-12 w-12 text-sm";
  const toneClass = {
    dark: "bg-neutral-950 text-white",
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-100 text-emerald-900",
    rose: "bg-rose-100 text-rose-900",
  }[tone];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-semibold ${sizeClass} ${toneClass}`}>
      {initials(label)}
    </span>
  );
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "V";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function personLabel(chat: WebChatRow) {
  return chat.visitorName || chat.visitorPhone || chat.visitorEmail || (chat.sourceChannel === "SMS" ? "SMS patient" : "Website visitor");
}

function Context({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-950 break-words">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}

function Input({ name, label, placeholder, defaultValue, required, type = "text", step, min, max, list }: { name: string; label: string; placeholder?: string; defaultValue?: string; required?: boolean; type?: string; step?: string; min?: string; max?: string; list?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <input type={type} step={step} min={min} max={max} list={list} name={name} placeholder={placeholder} defaultValue={defaultValue} required={required} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function Textarea({ name, label, defaultValue, rows = 4 }: { name: string; label: string; defaultValue?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <textarea name={name} rows={rows} defaultValue={defaultValue} className="mt-1 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
    </label>
  );
}

function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100">
        {options.map((option) => <option key={option} value={option}>{clean(option)}</option>)}
      </select>
    </label>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p>
    </div>
  );
}

function themeValue(theme: unknown, key: string, fallback: string) {
  if (!theme || typeof theme !== "object" || Array.isArray(theme)) return fallback;
  const value = (theme as Record<string, unknown>)[key];
  return typeof value === "string" ? value : fallback;
}
