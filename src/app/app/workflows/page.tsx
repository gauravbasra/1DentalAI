import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { getRole, workflows, type RoleKey } from "@/lib/foundation-data";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; domain?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const domain = params.domain ?? "all";
  const domains = Array.from(new Set(workflows.map((workflow) => workflow.domain)));
  const filtered = workflows.filter((workflow) => domain === "all" || workflow.domain === domain);

  return (
    <FoundationShell active="/app/workflows" roleKey={role.key}>
      <PageHeader
        eyebrow="Work rules"
        title="Standard dental workflows that each practice can adapt."
        body="These production work rules show how 1DentalAI will manage real handoffs: who owns the work, what each location can adjust, and which actions require approval before they affect patients, claims, or clinical records."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/workflows" />

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Workflow area</p>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[{ id: "all", label: "All domains" }, ...domains.map((item) => ({ id: item, label: item }))].map((item) => (
            <Link
              key={item.id}
              href={`/app/workflows?role=${role.key}&domain=${encodeURIComponent(item.id)}`}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                domain === item.id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-6 grid gap-4">
        {filtered.map((workflow) => (
          <article key={workflow.id} className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-cyan-700">{workflow.domain}</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-950">{workflow.name}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="cyan">{workflow.version}</StatusPill>
                <StatusPill tone="neutral">{workflow.inheritedFrom}</StatusPill>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <WorkflowList title="Practice settings" items={workflow.configurable} />
              <WorkflowList title="Requires approval" items={workflow.lockedControls} />
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">Needed before this goes live</p>
                <p className="mt-2 text-sm leading-6 text-amber-900">{workflow.nextPhaseDependency}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </FoundationShell>
  );
}

function WorkflowList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-5 text-neutral-600">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
