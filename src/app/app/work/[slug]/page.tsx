import Link from "next/link";
import { notFound } from "next/navigation";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { WorkbenchActionButton } from "@/components/workbench-action-button";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  canRoleAccessWorkbench,
  getWorkbench,
  type WorkbenchActionKind,
  type WorkbenchPriority,
  type WorkbenchStatus,
} from "@/lib/workbench-data";

export default async function WorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const area = getWorkbench(slug);
  if (!area) notFound();

  const role = getRole(query.role);
  const canAccess = canRoleAccessWorkbench(role.key as RoleKey, area);

  return (
    <FoundationShell active="/app" roleKey={role.key}>
      <PageHeader eyebrow={`${role.title} workbench`} title={area.title} body={area.summary} />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={`/app/work/${area.slug}`} />

      {!canAccess ? (
        <section className="mt-6 rounded-[2rem] border border-rose-200 bg-rose-50 p-6">
          <StatusPill tone="red">access blocked</StatusPill>
          <h2 className="mt-4 text-2xl font-semibold text-rose-950">This role does not own this workbench.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-rose-900">
            {role.title} is blocked from {area.title}. This is intentional role-based access control, not a hidden placeholder.
          </p>
          <Link href={`/app?role=${role.key}`} className="mt-5 inline-flex rounded-full bg-rose-900 px-4 py-2 text-sm font-semibold text-white">
            Return to owned work
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <MetricCard label="Workbench status" value={statusLabel(area.status)} detail={area.liveCapability ? "Local production path enabled" : "Live external execution gated"} tone={statusTone(area.status)} />
            <MetricCard label="Primary work" value={area.primaryMetric} detail={area.secondaryMetric} tone="cyan" />
            <MetricCard label="Queue items" value={String(area.queue.length)} detail={`${area.domain} owned work`} tone="neutral" />
            <MetricCard label="Connector checks" value={String(area.connectors.length)} detail={area.connectors.length ? "Capability map required" : "No external connector needed for local state"} tone={area.connectors.length ? "amber" : "green"} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.55fr]">
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-cyan-700">Owned queue</p>
                  <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{workSurfaceTitle(area.layout)}</h2>
                </div>
                <StatusPill tone={area.liveCapability ? "green" : "amber"}>{area.primarySystem}</StatusPill>
              </div>

              {area.layout === "perio" ? <PerioGrid /> : null}

              <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
                <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr] bg-neutral-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  <span>Work item</span>
                  <span>Status</span>
                  <span>Due</span>
                  <span>Source</span>
                </div>
                {area.queue.map((item) => (
                  <div key={item.id} className="border-t border-neutral-200 bg-white p-4">
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill tone={priorityTone(item.priority)}>{item.priority}</StatusPill>
                          {item.amount ? <span className="text-xs font-semibold text-emerald-700">{item.amount}</span> : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-neutral-950">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">{item.detail}</p>
                        {item.patientRef ? <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{item.patientRef}</p> : null}
                      </div>
                      <p className="text-sm font-semibold text-neutral-800">{item.status}</p>
                      <p className="text-sm text-neutral-600">{item.due}</p>
                      <p className="text-sm text-neutral-600">{item.sourceSystem}<br /><span className="text-xs text-neutral-400">{item.sourceObjectType} {item.sourceObjectId}</span></p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {item.actions.map((action) => (
                        <WorkbenchActionButton
                          key={action.id}
                          slug={area.slug}
                          role={role.key}
                          actionId={action.id}
                          label={action.label}
                          blocked={action.kind === "EXTERNAL_EXECUTION_BLOCKED"}
                        />
                      ))}
                    </div>
                    <ActionMatrix kindList={item.actions.map((action) => action.kind)} />
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold text-neutral-950">Production gates</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  {area.setupReason ?? area.approvalReason ?? "Local workbench state is enabled. External systems remain governed by connector policy."}
                </p>
              </section>

              <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold text-neutral-950">Connector readiness</p>
                <div className="mt-4 space-y-3">
                  {area.connectors.length ? area.connectors.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-neutral-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-neutral-950">{item.connectorCategory}</p>
                        <StatusPill tone={item.status === "READY" ? "green" : item.status === "BLOCKED" ? "red" : "amber"}>{item.status.replaceAll("_", " ")}</StatusPill>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">{item.capability}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{item.policyGate}</p>
                      <p className="mt-2 text-sm text-cyan-800">{item.nextAction}</p>
                    </div>
                  )) : (
                    <p className="text-sm leading-6 text-neutral-600">This workbench can update local operational state without an external connector.</p>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold text-neutral-950">Database contract</p>
                <div className="mt-4 space-y-2 text-sm leading-6 text-neutral-600">
                  <p>Tables: WorkbenchArea, WorkbenchQueueItem, WorkbenchAction, ConnectorReadinessItem, WorkbenchAuditEvent.</p>
                  <p>Migration: prisma/migrations/202605200001_phase2_workbenches.</p>
                  <p>API: GET /api/workbenches/{area.slug}; POST /api/workbenches/{area.slug}/actions.</p>
                </div>
              </section>
            </aside>
          </section>
        </>
      )}
    </FoundationShell>
  );
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "cyan" | "amber" | "red" | "neutral" }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <StatusPill tone={tone}>{tone === "amber" ? "gate" : tone === "red" ? "risk" : "ok"}</StatusPill>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{detail}</p>
    </div>
  );
}

function PerioGrid() {
  const teeth = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16"];
  return (
    <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
      <p className="text-sm font-semibold text-cyan-950">Tooth-aware perio capture surface</p>
      <div className="mt-3 grid grid-cols-8 gap-2 md:grid-cols-16">
        {teeth.map((tooth, index) => (
          <div key={tooth} className="rounded-xl bg-white p-2 text-center shadow-sm">
            <p className="text-xs font-semibold text-neutral-500">T{tooth}</p>
            <p className={`mt-1 text-sm font-semibold ${index % 5 === 0 ? "text-rose-700" : "text-neutral-950"}`}>{index % 5 === 0 ? "5 4 5" : "3 2 3"}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">BOP {index % 4 === 0 ? "Y" : "N"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionMatrix({ kindList }: { kindList: WorkbenchActionKind[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {kindList.map((kind) => (
        <span key={kind} className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
          {kind.replaceAll("_", " ")}
        </span>
      ))}
    </div>
  );
}

function workSurfaceTitle(layout: string) {
  const labels: Record<string, string> = {
    schedule: "Schedule and operatory work surface",
    chart: "Patient chart work surface",
    perio: "Perio charting work surface",
    queue: "Operational queue",
    inbox: "Phone and message inbox",
    studio: "AI Studio production queue",
    seo: "Local and AI search work surface",
    rooms: "Room and chair board",
    connectors: "Connector readiness board",
  };
  return labels[layout] ?? "Workbench queue";
}

function statusLabel(status: WorkbenchStatus) {
  return status.replaceAll("_", " ").toLowerCase();
}

function statusTone(status: WorkbenchStatus) {
  if (status === "OPEN") return "green";
  if (status === "APPROVAL_LOCKED" || status === "BLOCKED") return "red";
  return "amber";
}

function priorityTone(priority: WorkbenchPriority) {
  if (priority === "STAT" || priority === "TODAY") return "red";
  if (priority === "BLOCKED") return "amber";
  if (priority === "WATCH") return "cyan";
  return "neutral";
}
