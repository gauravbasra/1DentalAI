import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { chairs, getLocationName, getRole, locations, statusLabel, type ChairStatus, type RoleKey } from "@/lib/foundation-data";

const chairTone: Record<ChairStatus, "green" | "cyan" | "amber" | "red"> = {
  occupied: "cyan",
  ready: "green",
  turnover: "amber",
  blocked: "red",
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; location?: string; status?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const activeLocation = params.location ?? "all";
  const activeStatus = params.status ?? "all";
  const filtered = chairs
    .filter((chair) => activeLocation === "all" || chair.locationId === activeLocation)
    .filter((chair) => activeStatus === "all" || chair.status === activeStatus);

  return (
    <FoundationShell active="/app/rooms" roleKey={role.key}>
      <PageHeader
        eyebrow="Rooms, operatories, chairs"
        title="Capacity is clinical, operational, and financial."
        body="Chair time drives access, production, patient experience, and staffing. This view tracks occupancy, turnover, provider and RDH assignment, blocked rooms, and emergency openings before live scheduling is connected."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/rooms" />

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <FilterGroup
          label="Location"
          items={[{ id: "all", label: "All locations" }, ...locations.map((location) => ({ id: location.id, label: location.name }))]}
          active={activeLocation}
          makeHref={(id) => `/app/rooms?role=${role.key}&location=${id}&status=${activeStatus}`}
        />
        <FilterGroup
          label="Chair status"
          items={["all", "occupied", "ready", "turnover", "blocked"].map((id) => ({ id, label: statusLabel(id as ChairStatus) }))}
          active={activeStatus}
          makeHref={(id) => `/app/rooms?role=${role.key}&location=${activeLocation}&status=${id}`}
        />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {filtered.map((chair) => (
          <div key={chair.id} className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-700">{getLocationName(chair.locationId)}</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-950">
                  {chair.room} · {chair.operatory}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">{chair.chair}</p>
              </div>
              <StatusPill tone={chairTone[chair.status]}>{statusLabel(chair.status)}</StatusPill>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Detail label="Provider/RDH" value={chair.assignedProvider} />
              <Detail label="Assigned staff" value={chair.assignedStaff.join(", ") || "None assigned"} />
              <Detail label="Appointment type" value={chair.appointmentType} />
              <Detail label="Access class" value={chair.accessClass.map((item) => item.replaceAll("_", " ")).join(", ")} />
            </div>
            <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-950">Next action</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{chair.nextAction}</p>
            </div>
          </div>
        ))}
      </section>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No chairs match this filter. Adjust location or status.
        </div>
      ) : null}
    </FoundationShell>
  );
}

function FilterGroup({
  label,
  items,
  active,
  makeHref,
}: {
  label: string;
  items: Array<{ id: string; label: string }>;
  active: string;
  makeHref: (id: string) => string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {items.map((item) => (
          <Link
            key={item.id}
            href={makeHref(item.id)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold capitalize transition ${
              active === item.id ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
