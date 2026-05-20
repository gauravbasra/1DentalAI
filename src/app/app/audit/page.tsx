import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { auditEvents, getRole, roles, type RoleKey } from "@/lib/foundation-data";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; outcome?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const outcome = params.outcome ?? "all";
  const filtered = auditEvents.filter((event) => outcome === "all" || event.outcome === outcome);

  return (
    <FoundationShell active="/app/audit" roleKey={role.key}>
      <PageHeader
        eyebrow="Access and audit"
        title="Access outcomes must be visible from day one."
        body="This audit trail shows who viewed or attempted work, what they touched, and whether the action was allowed, blocked, or read-only. Live support access, PHI access, clinical signoff, payer actions, and writebacks will use the same accountability model."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/audit" />

      <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Outcome filter</p>
        <div className="mt-3 flex gap-2">
          {["all", "allowed", "blocked", "read_only"].map((item) => (
            <Link
              key={item}
              href={`/app/audit?role=${role.key}&outcome=${item}`}
              className={`rounded-full px-3 py-2 text-xs font-semibold capitalize transition ${
                outcome === item ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {item.replaceAll("_", " ")}
            </Link>
          ))}
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr] gap-4 border-b border-neutral-200 bg-neutral-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 max-lg:hidden">
          <span>Actor</span>
          <span>Action</span>
          <span>Target</span>
          <span>Outcome</span>
        </div>
        {filtered.map((event) => {
          const eventRole = roles.find((item) => item.key === event.role);
          return (
            <div key={event.id} className="grid gap-3 border-b border-neutral-100 px-5 py-4 last:border-b-0 lg:grid-cols-[1fr_1fr_1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-neutral-950">{event.actor}</p>
                <p className="mt-1 text-xs text-neutral-500">{eventRole?.title} · {event.at}</p>
              </div>
              <p className="text-sm text-neutral-700">{event.action}</p>
              <p className="text-sm text-neutral-700">{event.target}</p>
              <div>
                <StatusPill tone={event.outcome === "allowed" ? "green" : event.outcome === "blocked" ? "red" : "amber"}>
                  {event.outcome.replaceAll("_", " ")}
                </StatusPill>
                <p className="mt-2 text-xs capitalize text-neutral-500">{event.dataClass.replaceAll("_", " ")}</p>
              </div>
            </div>
          );
        })}
      </section>
    </FoundationShell>
  );
}
