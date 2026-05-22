import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export default async function PatientEngagementPhonePage() {
  const center = await getPhoneOperatingCenter();
  const activeCalls = (center.activeCalls ?? []) as Record<string, unknown>[];
  const voicemails = (center.voicemails ?? []) as Record<string, unknown>[];
  const numbers = (center.numbers ?? []) as Record<string, unknown>[];
  const extensions = (center.extensions ?? []) as Record<string, unknown>[];

  return (
    <PatientEngagementShell active="/patient-engagement/phone">
      <ProductPageTitle
        eyebrow="Phone console"
        title="Calls, voicemail, numbers, extensions, and device readiness."
        body="This is the phone product surface. Live provider actions stay truthful: call controls are shown as blocked or connector-gated unless a carrier/PBX provider response exists."
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkSurface title="Live call area" eyebrow="Answer, hold, transfer, park, disposition">
          <div className="space-y-3">
            {activeCalls.length ? activeCalls.map((call) => (
              <div key={String(call.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(call.callerName ?? "Unknown caller")}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(call.callState)} · ext {String(call.extensionNumber ?? "unassigned")} · {clean(call.aiIntent)}</p>
                  </div>
                  <StateBadge tone="amber">{clean(call.providerStatus ?? "connector required")}</StateBadge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Answer", "Hold", "Warm transfer", "Park", "Voicemail", "Disposition"].map((action) => (
                    <button key={action} className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700" type="button">
                      {action}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-neutral-500">Buttons must execute through the live PBX/carrier connector before they can be marked complete.</p>
              </div>
            )) : (
              <Empty title="No active calls" body="Inbound Twilio/PBX events will populate this area when the live call bridge is active." />
            )}
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
