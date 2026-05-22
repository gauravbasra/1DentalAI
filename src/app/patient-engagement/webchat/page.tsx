import Link from "next/link";
import { revalidatePath } from "next/cache";
import { StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";
import {
  crawlKnowledgePage,
  createWebchatAppointmentHandoff,
  getConversationTranscript,
  postStaffWebchatEntry,
  updateKnowledgeSourceReview,
  updateWebchatChannelSetting,
  upsertWebchatLeadForm,
  upsertWebchatSchedulingRule,
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

export default async function PatientEngagementWebchatPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string; view?: string; q?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const view = ["inbox", "knowledge", "forms", "install"].includes(params.view ?? "") ? String(params.view) : "inbox";
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
  const messages = (transcript?.messages ?? []) as WebChatMessageRow[];
  const events = (transcript?.events ?? []) as WebChatEventRow[];
  const knowledge = (center.knowledgeSources ?? []) as KnowledgeRow[];
  const forms = (center.leadForms ?? []) as LeadFormRow[];
  const schedulingRules = (center.schedulingRules ?? []) as SchedulingRuleRow[];
  const channel = ((center.channelSettings ?? []) as ChannelRow[]).find((row) => row.channel === "WEB_CHAT");
  const installScript = `<script async src="https://app.1dentalai.com/api/webchat/widget.js?tenant=tenant_1dentalai_production"></script>`;

  return (
    <PatientEngagementShell active="/patient-engagement/webchat">
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["inbox", "Inbox"],
          ["knowledge", "Knowledge base"],
          ["forms", "Lead forms and scheduling"],
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
                        <p className="mt-1 truncate text-sm text-neutral-500">{chat.nextBestAction || clean(chat.nlpIntent ?? "new conversation")}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-neutral-500">{chat.sourceChannel === "SMS" ? "Two-way SMS" : "Website chat"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-500">now</p>
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

                  <footer className="border-t border-neutral-200 bg-white px-6 py-4">
                    <form action={appointmentHandoffAction} className="mb-3 grid gap-2 rounded-2xl bg-neutral-50 p-3 lg:grid-cols-[1fr_140px_170px_1fr_auto]">
                      <input type="hidden" name="conversationId" value={selectedConversation.id} />
                      <Input name="requestedWindow" label="Requested window" placeholder="Tomorrow morning" />
                      <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} />
                      <Select name="ownerRoleKey" label="Owner" options={["front_desk", "treatment_coordinator", "practice_manager"]} />
                      <Input name="note" label="Note" placeholder="Verify insurance first" />
                      <button className="self-end rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Handoff</button>
                    </form>
                    <form action={staffEntryAction} className="flex items-end gap-3">
                      <input type="hidden" name="conversationId" value={selectedConversation.id} />
                      <input type="hidden" name="entryType" value={(selectedConversation.automationMode || "AI_AUTO") === "AI_AUTO" ? "STAFF_NOTE" : "STAFF_REPLY"} />
                      <input type="hidden" name="status" value="OPEN" />
                      <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-neutral-100 px-4">
                        <span className="text-xl text-neutral-500">+</span>
                        <textarea name="body" required className="min-h-12 flex-1 resize-none bg-transparent py-4 text-sm outline-none" placeholder={(selectedConversation.automationMode || "AI_AUTO") === "AI_AUTO" ? "Add internal staff note" : "Write live staff reply"} />
                        <span className="text-xl text-neutral-500">mic</span>
                      </div>
                      <button className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-lg font-semibold text-white shadow-sm">Send</button>
                    </form>
                    <p className="mt-2 text-xs text-neutral-500">{(selectedConversation.automationMode || "AI_AUTO") === "AI_AUTO" ? "AI is still responding automatically. Staff notes stay internal." : "Staff reply is staged and remains connector-gated until live delivery is approved."}</p>
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
  nextBestAction: string | null;
  blockedReason: string | null;
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

type WebChatEventRow = { eventType: string; payload?: unknown };
type KnowledgeRow = { id: string; title: string; status: string; ownerRoleKey: string; contentSummary: string };
type LeadFormRow = { id: string; name: string; serviceLine: string; status: string; connectorStatus: string };
type SchedulingRuleRow = { id: string; name: string; status: string; bookingWindowDays: number; pmsWritebackStatus: string };
type ChannelRow = { channel: string; displayName: string; theme: unknown; nlpMode: string; connectorStatus: string; knowledgeBaseStatus: string; schedulingStatus: string; formsStatus: string; nextAction: string };

function MessageBubble({ message, visitorLabel }: { message: WebChatMessageRow; visitorLabel: string }) {
  const isIncoming = message.senderType === "VISITOR";
  const isNote = message.senderType === "STAFF_NOTE";
  return (
    <div className={`flex items-end gap-3 ${isIncoming ? "justify-start" : "justify-end"}`}>
      {isIncoming ? <Avatar label={visitorLabel} tone="rose" /> : null}
      <div className={`max-w-[68%] rounded-2xl px-4 py-3 ${isIncoming ? "rounded-bl-md bg-neutral-100 text-neutral-950" : isNote ? "rounded-br-md bg-amber-50 text-neutral-900" : "rounded-br-md bg-blue-600 text-white"}`}>
        <p className={`mb-1 text-sm font-semibold ${isIncoming ? "text-neutral-950" : isNote ? "text-neutral-950" : "text-white"}`}>
          {isIncoming ? visitorLabel : isNote ? "Internal note" : "1DentalAI"}
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

function Input({ name, label, placeholder, defaultValue, required }: { name: string; label: string; placeholder?: string; defaultValue?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <input name={name} placeholder={placeholder} defaultValue={defaultValue} required={required} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" />
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
