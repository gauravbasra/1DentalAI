import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { chairs, getLocationName, getRole, locations, teamMembers, type RoleKey } from "@/lib/foundation-data";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; location?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const activeLocationId = params.location ?? locations[0].id;
  const activeLocation = locations.find((location) => location.id === activeLocationId) ?? locations[0];
  const locationChairs = chairs.filter((chair) => chair.locationId === activeLocation.id);
  const locationTeam = teamMembers.filter((member) => member.locationIds.includes(activeLocation.id));

  return (
    <FoundationShell active="/app/locations" roleKey={role.key}>
      <PageHeader
        eyebrow="Locations"
        title="Every practice location has capacity, people, and permissions."
        body="Each location needs its own chairs, providers, staff coverage, schedules, access controls, production targets, and patient flow. This product view keeps those records separated by practice site."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/locations" />

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {locations.map((location) => (
          <Link
            key={location.id}
            href={`/app/locations?role=${role.key}&location=${location.id}`}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeLocation.id === location.id
                ? "bg-neutral-950 text-white"
                : "bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {location.name}
          </Link>
        ))}
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-700">{activeLocation.city}</p>
              <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{activeLocation.name}</h2>
            </div>
            <StatusPill tone={activeLocation.status === "active" ? "green" : "amber"}>
              {activeLocation.status}
            </StatusPill>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Operatories" value={activeLocation.operatories} />
            <Metric label="Providers today" value={activeLocation.providersToday} />
            <Metric label="Chair use" value={`${activeLocation.chairUtilization}%`} />
          </div>
          <div className="mt-6 rounded-2xl bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-950">Access for this location</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {role.title} is viewing the current location setup. Live access will be limited by assigned location, job role, and the type of patient or financial information needed for that job.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-neutral-950">Location detail</h2>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-950">Chairs at this location</p>
              <p className="mt-2 text-sm text-neutral-600">{locationChairs.length} chairs in this setup: {locationChairs.map((chair) => chair.chair).join(", ") || "none yet"}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-950">Assigned staff</p>
              <p className="mt-2 text-sm text-neutral-600">{locationTeam.map((member) => member.name).join(", ")}</p>
            </div>
            <Link
              href={`/app/rooms?role=${role.key}&location=${activeLocation.id}`}
              className="rounded-2xl bg-cyan-700 p-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Open chair and room view for {getLocationName(activeLocation.id)}
            </Link>
          </div>
        </div>
      </section>
    </FoundationShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
