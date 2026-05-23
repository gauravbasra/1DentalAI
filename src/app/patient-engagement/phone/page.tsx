import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PatientEngagementPhonePage() {
  const center = await getPhoneOperatingCenter();
  const activeCalls = (center.activeCalls ?? []) as Record<string, unknown>[];
  const screenPops = (center.screenPops ?? []) as Record<string, unknown>[];
  const transcriptEvents = (center.transcriptEvents ?? []) as Record<string, unknown>[];
  const aiAssistEvents = (center.aiAssistEvents ?? []) as Record<string, unknown>[];
  const aiReceptionPolicies = (center.aiReceptionPolicies ?? []) as Record<string, unknown>[];
  const voicemails = (center.voicemails ?? []) as Record<string, unknown>[];
  const numbers = (center.numbers ?? []) as Record<string, unknown>[];
  const extensions = (center.extensions ?? []) as Record<string, unknown>[];
  const primaryPop = screenPops[0];
  const snapshot = objectValue(primaryPop?.snapshotJson);
  const patient = objectValue(snapshot.patient);
  const actionLinks = objectValue(primaryPop?.actionLinks);
  const recommendedActions = arrayValue(primaryPop?.recommendedActions);
  const activeCallId = String(primaryPop?.activeCallId ?? activeCalls[0]?.id ?? "");
  const conversationId = String(primaryPop?.conversationId ?? activeCalls[0]?.conversationId ?? "");

  return (
    <PatientEngagementShell active="/patient-engagement/phone">
      <ProductPageTitle
        eyebrow="Phone, AI voice, call pop"
        title="Front desk call cockpit with PMS context at ring time."
        body="Inbound calls create a patient match, live call state, PMS screen-pop snapshot, transcript stream, AI assist events, and audited call controls. Carrier execution remains connector-gated until Twilio/PBX smoke tests pass."
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <WorkSurface title="Smart call pop" eyebrow="Caller match, PMS record, actions">
          {primaryPop ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-lg font-black text-emerald-900">
                      {patient.firstName ? String(patient.firstName).slice(0, 1) : "?"}
                    </div>
                    <div>
                      <p className="text-xl font-bold text-neutral-950">
                        {patient.firstName ? `${patient.firstName} ${patient.lastName ?? ""}` : String(primaryPop.callerNumber ?? "Unknown caller")}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {patient.chartNumber ? `Chart ${patient.chartNumber}` : clean(primaryPop.matchStatus)} · {String(primaryPop.callerNumber ?? "")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StateBadge tone={String(primaryPop.matchStatus) === "MATCHED" ? "green" : "amber"}>{clean(primaryPop.matchStatus)}</StateBadge>
                    <StateBadge tone="cyan">{String(primaryPop.matchConfidence ?? 0)}% match</StateBadge>
                    <StateBadge tone={String(primaryPop.callState) === "RINGING" ? "amber" : "green"}>{clean(primaryPop.callState ?? "call state")}</StateBadge>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(actionLinks).map(([label, href]) => (
                    <Link key={label} href={String(href)} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-800 hover:bg-white">
                      {clean(label)}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <ContextPanel title="Appointments" rows={[...arrayValue(objectValue(snapshot.scheduling).nextAppointments), ...arrayValue(objectValue(snapshot.scheduling).recentAppointments)].slice(0, 5)} fields={["appointmentType", "status", "startsAt"]} empty="No appointments in snapshot." />
                <ContextPanel title="Insurance" rows={arrayValue(objectValue(snapshot.insurance).plans)} fields={["payerName", "planName", "eligibilityStatus"]} empty="No insurance record in snapshot." />
                <ContextPanel title="Payments" rows={arrayValue(objectValue(snapshot.financial).recentPayments)} fields={["paymentType", "amountCents", "status"]} empty={`Open balance ${money(Number(objectValue(snapshot.financial).openBalanceCents ?? 0))}`} />
                <ContextPanel title="Case history" rows={arrayValue(objectValue(objectValue(snapshot.clinical)).procedures)} fields={["code", "description", "status"]} empty="No procedure history in snapshot." />
                <ContextPanel title="Lab cases" rows={arrayValue(objectValue(snapshot.operations).labCases)} fields={["labName", "caseType", "status"]} empty="No open lab cases." />
                <ContextPanel title="Family" rows={arrayValue(snapshot.familyMembers)} fields={["firstName", "lastName", "status"]} empty="No family members linked." />
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-bold text-neutral-950">Recommended actions</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {recommendedActions.map((action, index) => (
                    <div key={index} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                      <p className="font-bold text-neutral-950">{String(action.label ?? "Action")}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">{String(action.detail ?? "")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Empty title="No call pop yet" body="A Twilio inbound call will create a matched PMS snapshot here at ring time. Use the test API with a known patient number to smoke-test it." />
          )}
        </WorkSurface>

        <WorkSurface title="Call controls" eyebrow="Hold, transfer, park, AI voice">
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-950">Active call</p>
              <p className="mt-1 text-xs leading-5 text-neutral-600">
                {activeCallId ? `Call ${activeCallId}` : "No active call selected"} · {conversationId ? `conversation ${conversationId}` : "waiting for ring event"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["ANSWER", "Answer"],
                  ["HOLD", "Hold"],
                  ["RESUME", "Resume"],
                  ["CALL_PARK", "Park"],
                  ["WARM_TRANSFER", "Warm transfer"],
                  ["SEND_TO_VOICEMAIL", "Voicemail"],
                  ["AI_VOICE_TAKEOVER", "AI takeover"],
                  ["END_CALL", "End"],
                ].map(([actionType, label]) => (
                  <form key={actionType} action="/api/phone/call-control" method="post">
                    <input type="hidden" name="activeCallId" value={activeCallId} />
                    <input type="hidden" name="conversationId" value={conversationId} />
                    <input type="hidden" name="actionType" value={actionType} />
                    <button className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-950 hover:text-white">
                      {label}
                    </button>
                  </form>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-neutral-600">Each click writes an audited control request. Provider success is only shown after Twilio/PBX execution returns success.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-bold text-neutral-950">AI backup receptionist</p>
              {aiReceptionPolicies.slice(0, 1).map((policy) => (
                <div key={String(policy.id)} className="mt-2 text-xs leading-5 text-neutral-600">
                  <p>Mode: <strong>{clean(policy.mode)}</strong></p>
                  <p>Interject after: <strong>{String(policy.ringThreshold)} rings</strong></p>
                  <p>Pricing: <strong>{clean(policy.pricingPolicy)}</strong></p>
                </div>
              ))}
            </div>
          </div>
        </WorkSurface>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <WorkSurface title="Live transcript and AI assist" eyebrow="Transcription, translation, service intent">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-950">Transcript stream</p>
              <div className="mt-3 max-h-72 space-y-3 overflow-auto pr-1">
                {transcriptEvents.length ? transcriptEvents.slice(0, 12).map((event) => (
                  <div key={String(event.id)} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">{clean(event.speaker)} · {String(event.languageCode ?? "en-US")}</p>
                    <p className="mt-1 text-neutral-800">{String(event.transcriptText)}</p>
                  </div>
                )) : <p className="text-sm text-neutral-600">Live Twilio transcription events will appear here during calls.</p>}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-bold text-neutral-950">AI assist</p>
              <div className="mt-3 max-h-72 space-y-3 overflow-auto pr-1">
                {aiAssistEvents.length ? aiAssistEvents.slice(0, 12).map((event) => (
                  <div key={String(event.id)} className="rounded-lg bg-white p-3 text-sm shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-neutral-950">{String(event.title)}</p>
                      <StateBadge tone={String(event.severity) === "WARNING" ? "amber" : "cyan"}>{clean(event.severity)}</StateBadge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{String(event.body)}</p>
                  </div>
                )) : <p className="text-sm text-neutral-600">Service tags, revenue opportunity, and human-required pricing flags will appear here.</p>}
              </div>
            </div>
          </div>
        </WorkSurface>

        <WorkSurface title="Voicemail recovery" eyebrow="Transcription, summary, PMS task">
          <div className="space-y-3">
            {voicemails.length ? voicemails.slice(0, 5).map((vm) => (
              <div key={String(vm.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(vm.callerName ?? vm.callerNumber ?? "Voicemail")}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(vm.status)} · ext {String(vm.extensionNumber ?? "n/a")}</p>
                  </div>
                  <StateBadge tone={String(vm.status).includes("TRIAGE") ? "red" : "amber"}>{clean(vm.status)}</StateBadge>
                </div>
              </div>
            )) : <Empty title="No voicemail items" body="Voicemail records need provider recording/transcription webhooks before this queue becomes live." />}
          </div>
        </WorkSurface>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <WorkSurface title="Practice numbers" eyebrow="DIDs, SMS, E911, routing">
          <div className="space-y-3">
            {numbers.map((number) => (
              <div key={String(number.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(number.label)} · {String(number.phoneNumber)}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(number.numberType)} · route {String(number.routeName ?? "not mapped")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StateBadge tone={String(number.voiceStatus) === "ACTIVE" ? "green" : "amber"}>voice {clean(number.voiceStatus)}</StateBadge>
                    <StateBadge tone={String(number.smsStatus) === "ACTIVE" ? "green" : "amber"}>sms {clean(number.smsStatus)}</StateBadge>
                    <StateBadge tone={String(number.e911Status).includes("VALID") ? "green" : "amber"}>e911 {clean(number.e911Status)}</StateBadge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </WorkSurface>

        <WorkSurface title="Extensions and staff devices" eyebrow="Desk phones, webphone, voicemail">
          <div className="space-y-3">
            {extensions.map((extension) => (
              <div key={String(extension.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">Ext {String(extension.extensionNumber)} · {String(extension.displayName)}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(extension.ownerRoleKey)} · voicemail {extension.voicemailEnabled ? "on" : "off"}</p>
                  </div>
                  <StateBadge tone={String(extension.status) === "ACTIVE" ? "green" : "amber"}>{clean(extension.status)}</StateBadge>
                </div>
              </div>
            ))}
          </div>
        </WorkSurface>
      </section>
    </PatientEngagementShell>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p>
    </div>
  );
}

function ContextPanel({ title, rows, fields, empty }: { title: string; rows: Array<Record<string, unknown>>; fields: string[]; empty: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-bold text-neutral-950">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length ? rows.map((row, index) => (
          <div key={index} className="rounded-lg bg-white p-3 text-xs leading-5 shadow-sm">
            {fields.map((field) => (
              <p key={field} className={field === fields[0] ? "font-bold text-neutral-950" : "text-neutral-600"}>
                {formatValue(row[field])}
              </p>
            ))}
          </div>
        )) : <p className="text-xs leading-5 text-neutral-600">{empty}</p>}
      </div>
    </div>
  );
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>> : [];
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "number" && Math.abs(value) > 999) return money(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}
