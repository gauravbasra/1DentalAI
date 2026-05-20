import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import {
  appointmentMetrics,
  formatCurrency,
  foundationPractice,
  getRole,
  getVisibleModules,
  getLocationName,
  locationPerformance,
  locations,
  providerRevenue,
  roles,
  serviceRevenue,
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
  const totalBookedRevenue = serviceRevenue.reduce((sum, item) => sum + item.bookedRevenue, 0);
  const totalAppointments = appointmentMetrics.reduce((sum, item) => sum + item.count, 0);
  const maxServiceRevenue = Math.max(...serviceRevenue.map((item) => item.bookedRevenue));
  const maxProviderRevenue = Math.max(...providerRevenue.map((item) => item.bookedRevenue));

  return (
    <FoundationShell active="/app" roleKey={role.key}>
      <PageHeader
        eyebrow="Practice command center"
        title="Run the day from production, schedule, rooms, and revenue."
        body="This demo shows the first operating view for 1DentalAI: practice performance, location capacity, chair flow, team access, configured work rules, and audit history. No live patient data is connected yet."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app" />

      <section className="mt-6 grid gap-4 lg:grid-cols-4">
        {[
          ["Practice", foundationPractice.name, foundationPractice.mode],
          ["Locations", String(locations.length), "multi-site"],
          ["Team roles", String(roles.length), "role-based access"],
          ["Booked revenue", formatCurrency(totalBookedRevenue), "demo data"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-neutral-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
            <p className="mt-2 text-sm text-neutral-600">{detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Viewing as</p>
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
                  Allowed for this role in the demo access model.
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

        <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Practice performance</p>
              <h2 className="mt-2 text-2xl font-semibold text-neutral-950">Revenue, schedule, and production mix.</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Demo analytics for the owner and manager view. Live PMS, payment, and RCM feeds will replace this sample data in the connector phase.
              </p>
            </div>
            <StatusPill tone="cyan">{totalAppointments} visits</StatusPill>
          </div>
          <div className="mt-5 space-y-4">
            {serviceRevenue.map((item) => (
              <BarMetric
                key={item.service}
                label={item.service}
                value={`${formatCurrency(item.bookedRevenue)} · ${item.appointments} appts`}
                percent={(item.bookedRevenue / maxServiceRevenue) * 100}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <AnalyticsPanel title="Provider production">
          {providerRevenue.map((item) => (
            <BarMetric
              key={item.provider}
              label={`${item.provider} · ${item.role}`}
              value={`${formatCurrency(item.bookedRevenue)} · ${item.completedAppointments} visits`}
              percent={(item.bookedRevenue / maxProviderRevenue) * 100}
            />
          ))}
        </AnalyticsPanel>
        <AnalyticsPanel title="Schedule status">
          {appointmentMetrics.map((item) => (
            <div key={item.label} className="rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-950">{item.label}</p>
                <p className="text-sm font-semibold text-cyan-700">{item.count}</p>
              </div>
              <p className="mt-2 text-xs text-neutral-500">{formatCurrency(item.production)} production tied to this status</p>
            </div>
          ))}
        </AnalyticsPanel>
        <AnalyticsPanel title="Location performance">
          {locationPerformance.map((item) => (
            <div key={item.locationId} className="rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-950">{getLocationName(item.locationId)}</p>
                <p className="text-sm font-semibold text-cyan-700">{item.chairUtilization}%</p>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {formatCurrency(item.bookedRevenue)} booked · {formatCurrency(item.unscheduledTreatment)} unscheduled
              </p>
            </div>
          ))}
        </AnalyticsPanel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <FoundationLink href={`/app/rooms?role=${role.key}`} title="Room and chair view" body="Inspect operatory status, provider assignment, turnover, emergency capacity, and blocked-chair reasons." />
        <FoundationLink href={`/app/workflows?role=${role.key}`} title="Work rules" body={`${workflows.length} practice workflows show what each location can adjust and what requires approval.`} />
        <FoundationLink href={`/app/modules?role=${role.key}`} title="Product areas" body={`${visibleModules.length} areas visible to ${role.title}; ${blockedModules.length} hidden by access controls.`} />
      </section>
    </FoundationShell>
  );
}

function BarMetric({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-950">{label}</p>
        <p className="text-xs font-semibold text-neutral-500">{value}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-cyan-700" style={{ width: `${Math.max(8, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

function AnalyticsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-lg font-semibold text-neutral-950">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
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
