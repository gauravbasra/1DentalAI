import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { getRole, getVisibleModules, statusLabel, type ModuleStatus, type RoleKey } from "@/lib/foundation-data";

const moduleTone: Record<ModuleStatus, "green" | "amber" | "red"> = {
  foundation_ready: "green",
  setup_required: "amber",
  locked_by_policy: "red",
};

export default async function ModulesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; visibility?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const visibility = params.visibility ?? "visible";
  const modules = getVisibleModules(role.key);
  const filtered = modules.filter((module) => visibility === "all" || (visibility === "visible" ? module.visible : !module.visible));

  return (
    <FoundationShell active="/app/modules" roleKey={role.key}>
      <PageHeader
        eyebrow="Module readiness"
        title="Global product map, truthful states only."
        body="Telephony, reputation, AI SEO, Local SEO, AI Studio, RCM, clinical AI, imaging, eRx, labs, memberships, and revenue integrity have platform places now, but no fake runtime."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/modules" />

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Visibility filter</p>
        <div className="mt-3 flex gap-2">
          {[
            ["visible", "Visible to role"],
            ["hidden", "Hidden by access"],
            ["all", "All modules"],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={`/app/modules?role=${role.key}&visibility=${id}`}
              className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                visibility === id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((module) => (
          <article
            key={module.id}
            id={module.id}
            className={`rounded-[2rem] border p-6 shadow-sm ${
              module.visible ? "border-neutral-200 bg-white" : "border-neutral-200 bg-neutral-100"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-700">{module.suite}</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-950">{module.name}</h2>
              </div>
              <StatusPill tone={module.visible ? moduleTone[module.status] : "neutral"}>
                {module.visible ? statusLabel(module.status) : "hidden"}
              </StatusPill>
            </div>
            <div className="mt-5 space-y-3">
              <Readiness label="Foundation ready" body={module.foundationReady} />
              <Readiness label="Setup required" body={module.setupRequired} />
              <Readiness label="Future phase" body={module.futurePhase} />
            </div>
          </article>
        ))}
      </section>
    </FoundationShell>
  );
}

function Readiness({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-700">{body}</p>
    </div>
  );
}
