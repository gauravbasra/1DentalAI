import Link from "next/link";
import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export default async function PatientEngagementSettingsPage() {
  const center = await getPhoneOperatingCenter();
  const providers = (center.providers ?? []) as Record<string, unknown>[];
  const channelSettings = (center.channelSettings ?? []) as Record<string, unknown>[];
  const schedulingRules = (center.schedulingRules ?? []) as Record<string, unknown>[];
  const leadForms = (center.leadForms ?? []) as Record<string, unknown>[];

  return (
    <PatientEngagementShell active="/patient-engagement/settings">
      <ProductPageTitle
        eyebrow="Patient Engagement settings"
        title="Credentials, channels, webchat theme, consent, scheduling, and PMS handoff."
        body="This is where practice admins configure the product. Daily users should not have to stare at connector plumbing unless a workflow is blocked."
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-2">
        <WorkSurface title="Provider credentials" eyebrow="Twilio, SIP/PBX, AI voice, SMS">
          <div className="space-y-3">
            {providers.map((provider) => (
              <div key={String(provider.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(provider.name)}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(provider.providerType)} · webhook {clean(provider.webhookStatus)} · credentials {clean(provider.credentialStatus)}</p>
                  </div>
                  <StateBadge tone={String(provider.status) === "ACTIVE" ? "green" : "amber"}>{clean(provider.status)}</StateBadge>
                </div>
              </div>
            ))}
            <Link href="/app/connectors?view=credentials" className="inline-flex rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
              Open credential vault
            </Link>
          </div>
        </WorkSurface>

        <WorkSurface title="Channel configuration" eyebrow="Phone, SMS, webchat, forms">
          <div className="space-y-3">
            {channelSettings.map((channel) => (
              <div key={String(channel.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{clean(channel.channel)}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{String(channel.nextAction ?? "No next action recorded")}</p>
                  </div>
                  <StateBadge tone={String(channel.connectorStatus) === "READY" ? "green" : "amber"}>{clean(channel.connectorStatus)}</StateBadge>
                </div>
              </div>
            ))}
          </div>
        </WorkSurface>

        <WorkSurface title="Webchat lead forms" eyebrow="Fields, service lines, routing">
          <div className="space-y-3">
            {leadForms.length ? leadForms.map((form) => (
              <div key={String(form.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-950">{String(form.name)}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{String(form.serviceLine)} · connector {clean(form.connectorStatus)}</p>
              </div>
            )) : <Empty title="No lead forms configured" body="Webchat cannot capture structured leads until at least one service-line form exists." />}
          </div>
        </WorkSurface>

        <WorkSurface title="Scheduling and PMS handoff" eyebrow="Booking request, reschedule, cancellation">
          <div className="space-y-3">
            {schedulingRules.length ? schedulingRules.map((rule) => (
              <div key={String(rule.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(rule.name)}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(rule.sourceChannel)} · {String(rule.appointmentCategoryName ?? "appointment category not mapped")}</p>
                  </div>
                  <StateBadge tone={String(rule.pmsWritebackStatus) === "READY" ? "green" : "amber"}>{clean(rule.pmsWritebackStatus)}</StateBadge>
                </div>
              </div>
            )) : <Empty title="No scheduling rules configured" body="Online booking and webchat handoff need scheduling rules before PMS writeback can be live." />}
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
