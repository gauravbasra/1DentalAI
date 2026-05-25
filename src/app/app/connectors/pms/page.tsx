import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { PmsCard, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getPmsConnectorReadiness } from "@/lib/pms-connectors/capability-map";
import { runOpenDentalReadSmokeTest } from "@/lib/pms-connectors/smoke-tests";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ role?: string; smoke?: string }>;

async function runOpenDentalSmokeTestAction() {
  "use server";
  const session = await requireAuth();
  await runOpenDentalReadSmokeTest({ tenantId: session.tenantId, actorRole: session.roleKey });
  revalidatePath("/app/connectors/pms");
}

function fmt(value: unknown) {
  if (!value) return "Not set";
  return String(value);
}

function formatDate(value: unknown) {
  if (!value) return "Not run";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(String(value)));
}

export default async function PmsConnectorPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role) ?? getRole(session.roleKey) ?? getRole("owner_dentist");
  const readiness = await getPmsConnectorReadiness(session.tenantId);
  const installation = readiness.installation;

  return (
    <FoundationShell active="/app/connectors" roleKey={role.key}>
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/connectors/pms" />
      <PageHeader
        eyebrow="PMS connector"
        title="OpenDental source, writeback, and audit gate"
        body="This is the production gate for PMS reads and external writes. The internal PMS workspace can save staged work, but no workflow may claim OpenDental success without a connector response, evidence, and audit trail."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PmsCard title="Connector readiness" eyebrow="OpenDental direct">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadinessRow label="Installation" value={fmt(installation?.definitionName)} />
            <ReadinessRow label="Status" value={<StatusFor value={fmt(installation?.status)} />} />
            <ReadinessRow label="Credentials" value={<StatusFor value={fmt(installation?.credentialStatus)} />} />
            <ReadinessRow label="Tenant approval" value={<StatusFor value={fmt(installation?.approvalStatus)} />} />
            <ReadinessRow label="Health" value={<StatusFor value={fmt(installation?.healthStatus)} />} />
            <ReadinessRow label="Fallback" value={fmt(installation?.fallbackMode)} />
          </div>
          {readiness.blockers.length ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Blocked before live PMS writes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {readiness.blockers.map((blocker) => <li key={String(blocker)}>{String(blocker)}</li>)}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Connector is ready for live read/write execution gates.</div>
          )}
          <form action={runOpenDentalSmokeTestAction} className="mt-4">
            <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800" type="submit">
              Run OpenDental read smoke test
            </button>
          </form>
        </PmsCard>

        <PmsCard title="Capability map" eyebrow="Read, write, evidence, approval">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">Capability</th>
                  <th className="py-2 pr-4">Operation</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Evidence</th>
                  <th className="py-2">Last smoke test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {readiness.capabilities.map((capability) => (
                  <tr key={String(capability.id)}>
                    <td className="py-3 pr-4 font-semibold text-neutral-950">{String(capability.capabilityKey)}</td>
                    <td className="py-3 pr-4 text-neutral-700">{String(capability.operation)}</td>
                    <td className="py-3 pr-4"><StatusFor value={String(capability.status)} /></td>
                    <td className="py-3 pr-4 text-neutral-600">{Array.isArray(capability.requiredEvidence) ? capability.requiredEvidence.join(", ") || "None" : "Mapped"}</td>
                    <td className="py-3 text-neutral-600">
                      <span className="font-semibold">{fmt(capability.lastSmokeTestStatus)}</span>
                      <span className="block text-xs">{formatDate(capability.lastSmokeTestAt)}</span>
                      <span className="block max-w-[22rem] text-xs">{fmt(capability.lastSmokeTestSummary)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>
      </div>

      <div className="mt-4">
        <PmsCard title="Recent writeback jobs" eyebrow="Approval and external response evidence">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">Capability</th>
                  <th className="py-2 pr-4">Local record</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2">Blocker / response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {readiness.recentJobs.length ? readiness.recentJobs.map((job) => (
                  <tr key={String(job.id)}>
                    <td className="py-3 pr-4 font-semibold text-neutral-950">{String(job.capabilityKey)}</td>
                    <td className="py-3 pr-4 text-neutral-700">{String(job.localType)} / {String(job.localId)}</td>
                    <td className="py-3 pr-4"><StatusFor value={String(job.status)} /></td>
                    <td className="py-3 pr-4 text-neutral-600">{formatDate(job.createdAt)}</td>
                    <td className="py-3 text-neutral-600">{fmt(job.blockedReason)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-neutral-500">
                      No writeback jobs yet. Scribe, perio, phone, RCM, and document modules should create jobs here instead of writing directly to OpenDental.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PmsCard>
      </div>
    </FoundationShell>
  );
}

function ReadinessRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-neutral-950">{value}</div>
    </div>
  );
}
