import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { getLocationName, getRole, roles, teamMembers, type RoleKey } from "@/lib/foundation-data";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; selected?: string }>;
}) {
  const params = await searchParams;
  const role = getRole(params.role);
  const selectedRole = getRole(params.selected ?? role.key);
  const matchingTeam = teamMembers.filter((member) => member.role === selectedRole.key);

  return (
    <FoundationShell active="/app/team" roleKey={role.key}>
      <PageHeader
        eyebrow="Team and access"
        title="One person does not need to see everything."
        body="A dental office needs different views for owners, providers, hygienists, assistants, front desk, treatment coordinators, billers, managers, and support. This demo shows who can see what before live patient data is connected."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/team" />

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Role catalog</p>
          <div className="mt-4 space-y-2">
            {roles.map((item) => (
              <Link
                key={item.key}
                href={`/app/team?role=${role.key}&selected=${item.key}`}
                className={`block rounded-2xl p-4 transition ${
                  selectedRole.key === item.key
                    ? "bg-neutral-950 text-white"
                    : "bg-neutral-50 text-neutral-800 hover:bg-neutral-100"
                }`}
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className={`mt-1 text-xs leading-5 ${selectedRole.key === item.key ? "text-neutral-300" : "text-neutral-500"}`}>
                  {item.sampleUser}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Selected role</p>
              <h2 className="mt-2 text-3xl font-semibold text-neutral-950">{selectedRole.title}</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{selectedRole.description}</p>
            </div>
            <StatusPill tone={selectedRole.key === "support_admin" ? "red" : "green"}>
              {selectedRole.key === "support_admin" ? "audited support" : "practice role"}
            </StatusPill>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {selectedRole.scopes.map((scope) => (
              <div key={scope} className="rounded-2xl bg-neutral-50 p-4">
                <p className="text-sm font-semibold capitalize text-neutral-950">{scope.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-neutral-500">Allowed for this role in the demo access model.</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Hidden or blocked by default</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {selectedRole.hiddenByDefault.length ? selectedRole.hiddenByDefault.join(", ") : "Nothing hidden by default for the demo owner role."}
            </p>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-neutral-950">Demo team members</p>
            <div className="mt-3 space-y-3">
              {matchingTeam.length ? matchingTeam.map((member) => (
                <div key={member.id} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-sm font-semibold text-neutral-950">{member.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {member.locationIds.map(getLocationName).join(", ")} · {member.currentFocus}
                  </p>
                </div>
              )) : (
                <div className="rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-600">
                  No demo team member uses this role yet. The role still exists for access planning and future practice setup.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </FoundationShell>
  );
}
