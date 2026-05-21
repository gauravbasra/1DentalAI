import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import {
  foundationPractice,
  getDailyDashboard,
  getRole,
  getVisibleModules,
  locations,
  workflows,
  type DailyDashboardItem,
  type RoleKey,
} from "@/lib/foundation-data";

export default async function AppOverview({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const dashboard = getDailyDashboard(role.key);
  const visibleModules = getVisibleModules(role.key).filter((module) => module.visible);
  const blockedModules = getVisibleModules(role.key).filter((module) => !module.visible);
  const setupRequired = visibleModules.filter((module) => module.status === "setup_required").length;
  const approvalLocked = visibleModules.filter((module) => module.status === "locked_by_policy").length;
  const modeLabel = foundationPractice.mode === "PRODUCTION_SETUP" ? "Production setup" : "Live";

  return (
    <FoundationShell active="/app" roleKey={role.key}>
      <PageHeader
        eyebrow={role.title}
        title={dashboard.title}
        body={dashboard.summary}
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app" />

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        {[
          ["Practice", foundationPractice.name, modeLabel],
          ["Locations", String(locations.length), "multi-site"],
          ["Product areas", String(visibleModules.length), `${setupRequired} need setup`],
          ["Approval locked", String(approvalLocked), "clinical and prescribing controls"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
            <p className="mt-2 text-sm text-neutral-600">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-700">Daily operating view</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Role command areas</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-600">
              Start in the PMS, clinical, RCM, communications, marketing, and operations areas owned by {role.title.toLowerCase()}, then use the queue and metrics below to decide what needs attention first.
            </p>
          </div>
          <StatusPill tone="green">job-specific view</StatusPill>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.workAreas.map((area) => (
            <Link
              key={area.title}
              href={area.route}
              className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{area.system}</p>
                  <h3 className="mt-2 text-lg font-semibold text-neutral-950">{area.title}</h3>
                </div>
                <StatusPill tone={workAreaTone(area.status)}>{area.status}</StatusPill>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">{area.primaryWork}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{area.nextAction}</p>
            </Link>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-cyan-50 p-4">
          <p className="text-sm font-semibold text-cyan-950">Morning huddle focus</p>
          <p className="mt-2 text-sm leading-6 text-cyan-900">{dashboard.huddleFocus}</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-neutral-500">{kpi.label}</p>
                <StatusPill tone={kpi.tone}>{kpi.tone === "red" ? "risk" : kpi.tone === "amber" ? "watch" : "ok"}</StatusPill>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{kpi.value}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{kpi.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_0.8fr]">
        {dashboard.workQueues.map((queue) => (
          <DailyQueue key={queue.title} title={queue.title} items={queue.items} />
        ))}
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-semibold text-neutral-950">Decisions to make</p>
          <div className="mt-4 space-y-3">
            {dashboard.decisions.map((decision) => (
              <div key={decision} className="rounded-2xl bg-neutral-50 p-4 text-sm font-semibold text-neutral-800">
                {decision}
              </div>
            ))}
          </div>
          <p className="mt-6 text-lg font-semibold text-neutral-950">Modules in focus</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dashboard.modulesInFocus.map((module) => (
              <span key={module} className="rounded-full bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800">
                {module}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <FoundationLink href={`/app/rooms?role=${role.key}`} title="Room and chair view" body="Inspect operatory status, provider assignment, turnover, emergency capacity, and blocked-chair reasons." />
        <FoundationLink href={`/app/workflows?role=${role.key}`} title="Work rules" body={`${workflows.length} practice workflows show what each location can adjust and what requires approval.`} />
        <FoundationLink href={`/app/modules?role=${role.key}`} title="Product map" body={`${visibleModules.length} areas visible to ${role.title}; ${blockedModules.length} hidden by access controls.`} />
      </section>
    </FoundationShell>
  );
}

function DailyQueue({ title, items }: { title: string; items: DailyDashboardItem[] }) {
  return (
    <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-lg font-semibold text-neutral-950">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-neutral-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-950">{item.label}</p>
              <StatusPill tone={priorityTone(item.priority)}>{item.priority}</StatusPill>
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{item.detail}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{item.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityTone(priority: DailyDashboardItem["priority"]) {
  if (priority === "Today") return "red";
  if (priority === "Blocked") return "amber";
  if (priority === "Watch") return "cyan";
  return "neutral";
}

function workAreaTone(status: "Open" | "Setup required" | "Approval locked") {
  if (status === "Open") return "green";
  if (status === "Approval locked") return "red";
  return "amber";
}

function FoundationLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md">
      <p className="text-lg font-semibold text-neutral-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
      <p className="mt-4 text-sm font-semibold text-cyan-700">Open view</p>
    </Link>
  );
}
