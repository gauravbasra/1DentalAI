import Link from "next/link";
import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export default async function PatientEngagementOnboardingPage() {
  const center = await getPhoneOperatingCenter();
  const setupReadiness = center.setupReadiness as { checks?: Record<string, unknown>[] } | undefined;
  const readiness = setupReadiness?.checks ?? [];
  const architecture = (center.architectureCandidates ?? []) as Record<string, unknown>[];

  return (
    <PatientEngagementShell active="/patient-engagement/onboarding">
      <ProductPageTitle
        eyebrow="Patient Engagement onboarding"
        title="Turn on phone, SMS, AI voice, webchat, scheduling handoff, and forms safely."
        body="This page exists so setup does not contaminate the daily front desk console. Each item needs credentials, webhooks, smoke tests, and blocked-state handling before live external actions."
      />

      <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <WorkSurface title="Launch checklist" eyebrow="Provider and workflow readiness">
          <div className="space-y-3">
            {readiness.map((item) => (
              <div key={String(item.label)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(item.label)}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{String(item.nextAction)}</p>
                  </div>
                  <StateBadge tone={badgeTone(String(item.status))}>{clean(item.status)}</StateBadge>
                </div>
              </div>
            ))}
          </div>
        </WorkSurface>

        <WorkSurface title="Architecture decision" eyebrow="Carrier, PBX, and web app">
          <div className="space-y-3">
            {architecture.length ? architecture.map((candidate) => (
              <div key={String(candidate.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(candidate.name)}</p>
                    <p className="mt-2 text-xs leading-5 text-neutral-600">{String(candidate.role)}</p>
                  </div>
                  <StateBadge tone={badgeTone(String(candidate.status))}>{clean(candidate.status)}</StateBadge>
                </div>
              </div>
            )) : (
              <p className="text-sm leading-6 text-neutral-600">No PBX/media architecture candidate has been recorded yet.</p>
            )}
          </div>
          <Link href="/patient-engagement/settings" className="mt-5 inline-flex rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
            Open settings
          </Link>
        </WorkSurface>
      </section>
    </PatientEngagementShell>
  );
}

function badgeTone(status: string) {
  if (status.includes("READY") || status.includes("ACTIVE")) return "green";
  if (status.includes("BLOCKED")) return "red";
  return "amber";
}
