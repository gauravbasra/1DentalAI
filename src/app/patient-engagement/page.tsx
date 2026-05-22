import Link from "next/link";
import { ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";
import { PatientEngagementShell, clean, money } from "@/components/products/patient-engagement-shell";
import { getPhoneOperatingCenter } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

export default async function PatientEngagementHome() {
  const center = await getPhoneOperatingCenter();
  const metrics = center.metrics ?? {};
  const conversations = (center.conversations ?? []).slice(0, 5) as Record<string, unknown>[];
  const tasks = (center.tasks ?? []).slice(0, 6) as Record<string, unknown>[];
  const messages = (center.messages ?? []).slice(0, 5) as Record<string, unknown>[];
  const webChats = (center.webChats ?? []).slice(0, 5) as Record<string, unknown>[];
  const setupReadiness = center.setupReadiness as { blocked?: number } | undefined;
  const setupBlocked = Number(setupReadiness?.blocked ?? 0);

  return (
    <PatientEngagementShell active="/patient-engagement">
      <ProductPageTitle
        eyebrow="Front desk daily console"
        title="Calls, texts, missed-call recovery, webchat, and appointment handoff."
        body="This is the first rebuilt product surface. It is intentionally focused on what the front desk works today, while setup and connector details are moved to onboarding/settings."
      />

      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Open calls" value={metrics.openCalls ?? "0"} tone="cyan" />
        <Metric label="Missed calls" value={metrics.missedCalls ?? "0"} tone="red" />
        <Metric label="Open webchats" value={metrics.openWebChats ?? "0"} tone="cyan" />
        <Metric label="Staged texts" value={metrics.stagedMessages ?? "0"} tone="amber" />
        <Metric label="Revenue opportunity" value={money(metrics.opportunityCents as string)} tone="green" />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkSurface
          title="Work now"
          eyebrow="Unified patient communication queue"
          action={<Link href="/patient-engagement/settings" className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700">Settings</Link>}
        >
          <div className="space-y-3">
            {tasks.length ? tasks.map((task) => (
              <div key={String(task.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(task.nextAction ?? task.taskType ?? "Patient follow-up")}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">
                      {String(task.firstName ?? "")} {String(task.lastName ?? "")} {task.chartNumber ? `· chart ${task.chartNumber}` : ""} · owner {clean(task.ownerRoleKey)}
                    </p>
                  </div>
                  <StateBadge tone={String(task.priority) === "HIGH" ? "red" : "amber"}>{clean(task.priority)}</StateBadge>
                </div>
              </div>
            )) : (
              <EmptyLine title="No open engagement tasks" body="Missed calls, chat handoffs, SMS approvals, and appointment requests land here when they need human work." />
            )}
          </div>
        </WorkSurface>

        <WorkSurface title="Setup blocks" eyebrow="Hidden from daily work unless blocking">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-neutral-950">{setupBlocked}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">carrier, SMS, AI voice, webchat, device, or PMS handoff checks need attention before every external action can run live.</p>
            </div>
            <StateBadge tone={setupBlocked ? "amber" : "green"}>{setupBlocked ? "action needed" : "ready"}</StateBadge>
          </div>
          <Link href="/patient-engagement/onboarding" className="mt-5 inline-flex rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
            Open onboarding
          </Link>
        </WorkSurface>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-3">
        <Queue title="Recent calls" href="/patient-engagement/phone" rows={conversations} empty="No calls logged yet" render={(row) => (
          <>
            <p className="text-sm font-semibold text-neutral-950">{String(row.callerName ?? "Unknown caller")}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">{String(row.callerNumber ?? "No number")} · {clean(row.aiIntent)} · {clean(row.outcome)}</p>
          </>
        )} />
        <Queue title="Text approvals" href="/patient-engagement/phone" rows={messages} empty="No staged texts" render={(row) => (
          <>
            <p className="text-sm font-semibold text-neutral-950">{String(row.messageType ?? "Message")}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(row.approvalStatus)} · {clean(row.deliveryStatus)} · {String(row.firstName ?? "")} {String(row.lastName ?? "")}</p>
          </>
        )} />
        <Queue title="Webchat leads" href="/patient-engagement/webchat" rows={webChats} empty="No webchats yet" render={(row) => (
          <>
            <p className="text-sm font-semibold text-neutral-950">{String(row.visitorName ?? "Website visitor")}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">{clean(row.qualificationStage)} · score {String(row.leadScore ?? 0)} · {String(row.sourcePage ?? "website")}</p>
          </>
        )} />
      </section>
    </PatientEngagementShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone: "green" | "amber" | "red" | "cyan" }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <StateBadge tone={tone}>{tone === "red" ? "urgent" : tone === "amber" ? "review" : "live"}</StateBadge>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
    </div>
  );
}

function Queue({ title, href, rows, empty, render }: { title: string; href: string; rows: Record<string, unknown>[]; empty: string; render: (row: Record<string, unknown>) => React.ReactNode }) {
  return (
    <WorkSurface title={title} action={<Link href={href} className="text-sm font-semibold text-cyan-700">Open</Link>}>
      <div className="space-y-3">
        {rows.length ? rows.map((row) => (
          <div key={String(row.id)} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">{render(row)}</div>
        )) : <EmptyLine title={empty} body="This queue is empty because no matching records exist yet." />}
      </div>
    </WorkSurface>
  );
}

function EmptyLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p>
    </div>
  );
}
