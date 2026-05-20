import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import {
  auditEvents,
  chairs,
  foundationPractice,
  getRole,
  getVisibleModules,
  locations,
  roles,
  workflows,
  type RoleKey,
} from "@/lib/foundation-data";

export default async function AppOverview({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const visibleModules = getVisibleModules(role.key).filter((module) => module.visible);
  const blockedModules = getVisibleModules(role.key).filter((module) => !module.visible);

  return (
    <FoundationShell active="/app" roleKey={role.key}>
      <PageHeader
        eyebrow="Phase 1 foundation"
        title="The operating base for every dental workflow."
        body="This demo foundation shows the global platform view and the minute practice details: locations, rooms, chairs, staff roles, permissions, workflow templates, module readiness, and audit activity."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app" />

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        {[
          ["Practice", foundationPractice.name, foundationPractice.mode],
          ["Locations", String(locations.length), "multi-site"],
          ["Team roles", String(roles.length), "RBAC"],
          ["Chairs tracked", String(chairs.length), "capacity"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
            <p className="mt-2 text-sm text-neutral-600">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Current role lens</p>
              <h2 className="mt-2 text-2xl font-semibold text-neutral-950">{role.title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{role.description}</p>
            </div>
            <StatusPill tone="green">minimum necessary</StatusPill>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {role.scopes.map((scope) => (
              <div key={scope} className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm font-semibold capitalize text-neutral-950">
                  {scope.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">
                  Allowed for this role in the synthetic foundation model.
                </p>
              </div>
            ))}
          </div>
          {role.hiddenByDefault.length > 0 ? (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Hidden by default</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {role.hiddenByDefault.join(", ")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-[2rem] border border-neutral-200 bg-neutral-950 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold text-cyan-200">Global readiness</p>
          <h2 className="mt-2 text-2xl font-semibold">Modules are registered, not faked.</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            {visibleModules.length} modules are visible to {role.title}. {blockedModules.length} are hidden by access policy.
          </p>
          <div className="mt-5 space-y-3">
            {visibleModules.slice(0, 5).map((module) => (
              <Link
                key={module.id}
                href={`/app/modules?role=${role.key}#${module.id}`}
                className="block rounded-2xl bg-white/10 p-4 transition hover:bg-white/15"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{module.name}</p>
                  <span className="text-xs text-cyan-100">{module.suite}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-300">{module.futurePhase}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <FoundationLink href={`/app/rooms?role=${role.key}`} title="Minute view" body="Inspect room, operatory, chair status, provider assignment, turnover, and blocked-chair reasons." />
        <FoundationLink href={`/app/workflows?role=${role.key}`} title="Workflow view" body={`${workflows.length} versioned workflow definitions show what can be customized and what is locked.`} />
        <FoundationLink href={`/app/audit?role=${role.key}`} title="Audit view" body={`${auditEvents.length} synthetic audit events prove access outcomes are modeled from day one.`} />
      </section>
    </FoundationShell>
  );
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
