import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
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
  const events = (transcript?.events ?? []) as Record<string, unknown>[];
  const knowledge = (center.knowledgeSources ?? []) as KnowledgeRow[];
  const forms = (center.leadForms ?? []) as LeadFormRow[];
  const schedulingRules = (center.schedulingRules ?? []) as SchedulingRuleRow[];
  const channel = ((center.channelSettings ?? []) as ChannelRow[]).find((row) => row.channel === "WEB_CHAT");
  const installScript = `<script async src="https://app.1dentalai.com/api/webchat/widget.js" data-tenant-id="tenant_1dentalai_production"></script>`;

  return (
    <PatientEngagementShell active="/patient-engagement/webchat">
      <ProductPageTitle
        eyebrow="Unified messaging product"
        title="Inbox for website chat and two-way SMS."
        body="Website visitors and SMS patients land in one work queue. NLP answers routine questions automatically, escalates live-person requests to staff, and keeps appointment booking gated until scheduling handoff is approved."
      />

      <div className="mt-6 flex flex-wrap gap-2">
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
        <section className="mt-5 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <WorkSurface title="Inbox" eyebrow="Website chat and SMS">
            <form className="mb-3 space-y-3" action="/patient-engagement/webchat">
              <input type="hidden" name="view" value="inbox" />
              <input className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" name="q" placeholder="Search visitor, phone, intent, source" defaultValue={params.q ?? ""} />
              <div className="grid grid-cols-3 gap-2">
                {["ALL", "WEB_CHAT", "SMS"].map((key) => (
                  <button
                    key={key}
                    name="channel"
                    value={key}
                    className={`rounded-md px-2 py-2 text-xs font-semibold ${channelFilter === key ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-700"}`}
                  >
                    {key === "WEB_CHAT" ? "Web" : clean(key)}
                  </button>
                ))}
              </div>
            </form>
            <div className="space-y-2">
              {chats.length ? chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/patient-engagement/webchat?conversationId=${chat.id}&q=${encodeURIComponent(params.q ?? "")}&channel=${channelFilter}`}
                  className={`block rounded-lg border p-3 ${selectedConversation?.id === chat.id ? "border-cyan-300 bg-cyan-50" : "border-neutral-200 bg-neutral-50 hover:bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-950">{chat.visitorName || "Website visitor"}</p>
                      <p className="mt-1 truncate text-xs text-neutral-600">{chat.visitorPhone || chat.visitorEmail || chat.sourcePage || "contact not captured"}</p>
                    </div>
                    <StateBadge tone={chat.leadScore >= 80 ? "green" : "amber"}>{chat.leadScore}</StateBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600">{chat.sourceChannel === "SMS" ? "SMS" : "Web"}</span>
                    <span className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600">{clean(chat.automationMode || "AI_AUTO")}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">{clean(chat.qualificationStage)} · {clean(chat.nlpIntent ?? "new")}</p>
                </Link>
              )) : <Empty title="No conversations match this view" body="Clear the search or switch channel filters. New website chat and SMS conversations appear here." />}
            </div>
          </WorkSurface>

          <WorkSurface title="Conversation" eyebrow="Auto NLP reply with staff takeover when needed">
            {selectedConversation ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{selectedConversation.visitorName || "Website visitor"}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{selectedConversation.sourceChannel === "SMS" ? "Two-way SMS thread" : "Website chat session"} · {selectedConversation.nextBestAction || "AI answers routine messages until takeover is required."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StateBadge tone={(selectedConversation.automationMode || "AI_AUTO") === "AI_AUTO" ? "green" : "amber"}>{clean(selectedConversation.automationMode || "AI_AUTO")}</StateBadge>
                    <StateBadge tone={selectedConversation.pmsWritebackStatus === "READY" ? "green" : "amber"}>{clean(selectedConversation.pmsWritebackStatus)}</StateBadge>
                  </div>
                </div>

                <div className="h-[430px] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <div className="space-y-3">
                    {messages.length ? messages.map((message) => (
                      <div key={message.id} className={`max-w-[86%] rounded-lg p-3 shadow-sm ${message.senderType === "VISITOR" ? "bg-white" : message.senderType === "STAFF_NOTE" ? "bg-amber-50" : "ml-auto bg-cyan-50"}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{clean(message.senderType)} · {clean(message.intent ?? message.actionType ?? "message")}</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-800">{message.body}</p>
                        <p className="mt-2 text-xs text-neutral-500">{clean(message.actionStatus)} · {clean(message.deliveryStatus || "sent")}</p>
                      </div>
                    )) : <Empty title="No messages in this conversation" body="Visitor and assistant messages will appear here after the widget session starts." />}
                  </div>
                </div>

                <section className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1fr]">
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                    <p className="text-sm font-semibold text-neutral-950">NLP auto-response</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Context label="Engine" value={process.env.OPENAI_API_KEY ? "OpenAI enabled" : "Rules fallback"} detail={process.env.OPENAI_API_KEY ? "Assistant response is generated server-side and logged." : "No OpenAI token is present, so the rule engine answers and marks the provider fallback."} />
                      <Context label="Takeover" value={selectedConversation.handoffReason ? clean(selectedConversation.handoffReason) : "Not required"} detail={selectedConversation.handoffReason || "AI auto-response remains active for routine visitor messages."} />
                    </div>
                  </div>
                  <form action={appointmentHandoffAction} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <input type="hidden" name="conversationId" value={selectedConversation.id} />
                    <p className="text-sm font-semibold text-neutral-950">Appointment handoff</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input name="requestedWindow" label="Requested window" placeholder="Tomorrow morning" />
                      <Select name="priority" label="Priority" options={["HIGH", "NORMAL", "LOW"]} />
                      <Select name="ownerRoleKey" label="Owner" options={["front_desk", "treatment_coordinator", "practice_manager"]} />
                      <Input name="note" label="Handoff note" placeholder="Verify insurance first" />
                    </div>
                    <button className="mt-3 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Create handoff</button>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">Creates a PMS task and blocks direct appointment writeback until PMS scheduling connector/manual proof is approved.</p>
                  </form>
                </section>

                {(selectedConversation.automationMode || "AI_AUTO") !== "AI_AUTO" ? (
                  <form action={staffEntryAction} className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <input type="hidden" name="conversationId" value={selectedConversation.id} />
                    <input type="hidden" name="entryType" value="STAFF_REPLY" />
                    <input type="hidden" name="status" value="OPEN" />
                    <p className="text-sm font-semibold text-neutral-950">Live staff takeover</p>
                    <textarea name="body" required className="mt-3 min-h-24 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Write the staff response. Delivery remains connector-gated and audited." />
                    <button className="mt-3 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Stage staff reply</button>
                    <p className="mt-2 text-xs leading-5 text-neutral-600">This appears only when NLP escalates the thread for a human.</p>
                  </form>
                ) : null}
              </>
            ) : <Empty title="No conversation selected" body="Select a conversation from the inbox to work transcript, reply, and appointment handoff." />}
          </WorkSurface>

          <WorkSurface title="Visitor context" eyebrow="Lead, source, consent, handoff">
            {selectedConversation ? (
              <div className="space-y-3">
                <Context label="Contact" value={selectedConversation.visitorPhone || selectedConversation.visitorEmail || "not captured"} detail={selectedConversation.visitorName || "name not captured"} />
                <Context label="Lead stage" value={clean(selectedConversation.qualificationStage)} detail={`score ${selectedConversation.leadScore}; owner ${clean(selectedConversation.ownerRoleKey)}`} />
                <Context label="Automation" value={clean(selectedConversation.automationMode || "AI_AUTO")} detail={selectedConversation.handoffReason || "AI auto response is active."} />
                <Context label="Source" value={selectedConversation.campaignSource || selectedConversation.sourceChannel || "website"} detail={selectedConversation.landingPageSlug || selectedConversation.sourcePage || "page not captured"} />
                <Context label="Scheduling" value={clean(selectedConversation.schedulingOutcome)} detail={selectedConversation.blockedReason || "No scheduling blocker recorded."} />
                <Context label="Events" value={String(events.length)} detail="session, lead capture, message, and handoff audit trail" />
              </div>
            ) : <Empty title="No visitor selected" body="Visitor source, lead score, contact fields, and handoff state appear after selecting a chat." />}
          </WorkSurface>
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

type KnowledgeRow = { id: string; title: string; status: string; ownerRoleKey: string; contentSummary: string };
type LeadFormRow = { id: string; name: string; serviceLine: string; status: string; connectorStatus: string };
type SchedulingRuleRow = { id: string; name: string; status: string; bookingWindowDays: number; pmsWritebackStatus: string };
type ChannelRow = { channel: string; displayName: string; theme: unknown; nlpMode: string; connectorStatus: string; knowledgeBaseStatus: string; schedulingStatus: string; formsStatus: string; nextAction: string };

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
