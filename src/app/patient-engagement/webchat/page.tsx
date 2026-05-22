import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export default async function PatientEngagementWebchatPage() {
  const center = await getPhoneOperatingCenter();
  const chats = (center.webChats ?? []) as Record<string, unknown>[];
  const messages = (center.webChatMessages ?? []) as Record<string, unknown>[];
  const knowledge = (center.knowledgeSources ?? []) as Record<string, unknown>[];
  const forms = (center.leadForms ?? []) as Record<string, unknown>[];

  return (
    <PatientEngagementShell active="/patient-engagement/webchat">
      <ProductPageTitle
        eyebrow="Webchat console"
        title="Inbox, visitor context, knowledge base, lead form, and appointment handoff."
        body="Webchat is not a tile inside phone. It is a working chat product with install script, widget configuration, transcript, staff replies, and connector-gated scheduling handoff."
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-[360px_1fr_320px]">
        <WorkSurface title="Inbox" eyebrow="Open website conversations">
          <div className="space-y-3">
            {chats.length ? chats.map((chat) => (
              <div key={String(chat.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(chat.visitorName ?? "Website visitor")}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{String(chat.visitorPhone ?? chat.visitorEmail ?? "no contact captured")} · score {String(chat.leadScore ?? 0)}</p>
                  </div>
                  <StateBadge tone={String(chat.qualificationStage).includes("READY") ? "green" : "amber"}>{clean(chat.qualificationStage)}</StateBadge>
                </div>
              </div>
            )) : <Empty title="No open chats" body="Install the widget and start a website conversation to populate the inbox." />}
          </div>
        </WorkSurface>

        <WorkSurface title="Conversation workspace" eyebrow="Transcript, staff reply, safe handoff">
          <div className="min-h-[420px] rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div className="space-y-3">
              {messages.length ? messages.slice(0, 8).map((message) => (
                <div key={String(message.id)} className={`max-w-[85%] rounded-lg p-3 ${String(message.senderType) === "VISITOR" ? "bg-white" : "ml-auto bg-cyan-50"}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{clean(message.senderType)} · {clean(message.intent)}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-800">{String(message.body ?? "")}</p>
                </div>
              )) : <Empty title="No transcript selected" body="Conversation messages, AI classification, staff replies, and scheduling handoff appear here." />}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea className="min-h-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" placeholder="Staff reply area. Delivery must be connector-gated." />
            <div className="flex flex-col gap-2">
              <button type="button" className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Stage reply</button>
              <button type="button" className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700">Create handoff</button>
            </div>
          </div>
        </WorkSurface>

        <WorkSurface title="Visitor context" eyebrow="Lead capture and PMS handoff">
          <div className="space-y-4">
            <Context label="Lead forms" value={String(forms.length)} detail="service line, fields, connector status" />
            <Context label="Knowledge sources" value={String(knowledge.length)} detail="reviewed content only" />
            <Context label="Scheduling writeback" value="connector-gated" detail="appointment cannot be created without PMS route" />
            <Context label="Widget install" value="/api/webchat/widget.js" detail="script endpoint for website install" />
          </div>
        </WorkSurface>
      </section>
    </PatientEngagementShell>
  );
}

function Context({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
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
