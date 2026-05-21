import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import {
  createConnectorRouteDecision,
  getConnectorControlCenter,
  updateConnectorInstallation,
} from "@/lib/connector-control-repository";
import { getRole, type RoleKey } from "@/lib/foundation-data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ role?: string }>;

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function updateInstallationAction(formData: FormData) {
  "use server";
  await updateConnectorInstallation({
    id: value(formData, "id"),
    status: value(formData, "status"),
    credentialStatus: value(formData, "credentialStatus"),
    webhookStatus: value(formData, "webhookStatus"),
    approvalStatus: value(formData, "approvalStatus"),
    healthStatus: value(formData, "healthStatus"),
    nextAction: value(formData, "nextAction"),
    actorRole: value(formData, "actorRole") || "support_admin",
  });
  revalidatePath("/app/connectors");
}

async function createRouteDecisionAction(formData: FormData) {
  "use server";
  await createConnectorRouteDecision({
    definitionId: value(formData, "definitionId"),
    installationId: value(formData, "installationId"),
    workflowArea: value(formData, "workflowArea"),
    sourceObjectType: value(formData, "sourceObjectType"),
    sourceObjectId: value(formData, "sourceObjectId"),
    requestedCapability: value(formData, "requestedCapability"),
    estimatedCostCents: Number(value(formData, "estimatedCostCents") || 0),
    actorRole: value(formData, "actorRole") || "support_admin",
  });
  revalidatePath("/app/connectors");
}

function textList(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  return "";
}

function jsonLine(value: unknown) {
  if (!value || typeof value !== "object") return "";
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(" | ");
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Not run";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ConnectorControlPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const role = getRole(params.role) ?? getRole("owner_dentist");
  const data = await getConnectorControlCenter();
  const metrics = data.metrics ?? {
    definitions: "0",
    installations: "0",
    blockedRoutes: "0",
    monthlyEstimatedCents: "0",
    healthBlocked: "0",
  };

  return (
    <FoundationShell active="/app/connectors" roleKey={role.key}>
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/connectors" />
      <PageHeader
        eyebrow="Integration control plane"
        title="Owned routing, capability maps, readiness, and cost telemetry"
        body="This page controls how PMS, payer, phone, reputation, marketing, and engagement workflows decide whether to call a live connector, stage work for approval, or block external success until setup is real."
      />

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        {[
          ["Connector definitions", metrics.definitions],
          ["Installations", metrics.installations],
          ["Blocked route decisions", metrics.blockedRoutes],
          ["Estimated connector cost", <Money key="cost" cents={Number(metrics.monthlyEstimatedCents ?? 0)} />],
          ["Health checks blocked", metrics.healthBlocked],
        ].map(([label, figure]) => (
          <div key={String(label)} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{figure}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <PmsCard title="Connector readiness by location" eyebrow="Setup gates">
          <div className="space-y-3">
            {data.installations.map((installation) => (
              <form
                key={installation.id}
                action={updateInstallationAction}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
              >
                <input type="hidden" name="id" value={installation.id} />
                <input type="hidden" name="actorRole" value={role.key} />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{installation.definitionName}</p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {installation.category} | {installation.locationName ?? "Enterprise"} | fallback {installation.fallbackMode}
                    </p>
                  </div>
                  <StatusFor value={installation.status} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {[
                    ["status", ["SETUP_REQUIRED", "READY_FOR_SMOKE_TEST", "ACTIVE", "BLOCKED_READINESS"]],
                    ["credentialStatus", ["MISSING", "PENDING", "VALIDATED"]],
                    ["webhookStatus", ["NOT_CONFIGURED", "PENDING", "VERIFIED"]],
                    ["approvalStatus", ["NEEDS_APPROVAL", "APPROVED", "REJECTED"]],
                    ["healthStatus", ["NOT_TESTED", "PASS", "FAIL"]],
                  ].map(([name, options]) => (
                    <label key={String(name)} className="text-xs font-semibold text-neutral-600">
                      {String(name).replace(/([A-Z])/g, " $1")}
                      <select
                        name={String(name)}
                        defaultValue={String(installation[name as keyof typeof installation] ?? "")}
                        className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs font-semibold text-neutral-950"
                      >
                        {(options as string[]).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <label className="mt-3 block text-xs font-semibold text-neutral-600">
                  Next action
                  <textarea
                    name="nextAction"
                    defaultValue={installation.nextAction}
                    rows={2}
                    className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950"
                  />
                </label>
                <button className="mt-3 rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
                  Update readiness
                </button>
              </form>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Create route decision" eyebrow="No fake execution">
          <form action={createRouteDecisionAction} className="space-y-3">
            <input type="hidden" name="actorRole" value={role.key} />
            <label className="block text-xs font-semibold text-neutral-600">
              Connector
              <select name="definitionId" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                {data.definitions.map((definition) => (
                  <option key={definition.id} value={definition.id}>{definition.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-neutral-600">
              Installation
              <select name="installationId" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                {data.installations.map((installation) => (
                  <option key={installation.id} value={installation.id}>{installation.definitionName} - {installation.locationName ?? "Enterprise"}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-semibold text-neutral-600">
                Workflow
                <select name="workflowArea" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {["PMS", "RCM", "PHONE", "REPUTATION", "MARKETING", "ENGAGEMENT"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Capability
                <select name="requestedCapability" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {data.capabilities.map((capability) => (
                    <option key={capability.id} value={capability.capabilityKey}>{capability.capabilityKey}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs font-semibold text-neutral-600">
                Source object
                <input name="sourceObjectType" defaultValue="PmsAppointment" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Source ID
                <input name="sourceObjectId" defaultValue="appt_sample_001" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Estimated cents
                <input name="estimatedCostCents" type="number" defaultValue="15" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <button className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
              Create route decision
            </button>
          </form>
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            This records routing readiness and audit evidence only. It cannot mark a payer check, call, SMS, review response, PMS writeback, or claim as externally completed without a validated connector response.
          </p>
        </PmsCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Capability map" eyebrow="Workflow coverage">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Capability</th>
                  <th className="px-3 py-2">Workflow</th>
                  <th className="px-3 py-2">Direction</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Missing fields</th>
                  <th className="px-3 py-2">Fallback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.capabilities.map((capability) => (
                  <tr key={capability.id}>
                    <td className="px-3 py-3 font-semibold text-neutral-950">{capability.capabilityKey}</td>
                    <td className="px-3 py-3 text-neutral-700">{capability.workflowArea}</td>
                    <td className="px-3 py-3 text-neutral-700">{capability.direction}</td>
                    <td className="px-3 py-3"><StatusFor value={capability.status} /></td>
                    <td className="px-3 py-3 text-neutral-700">{textList(capability.missingFields) || "None"}</td>
                    <td className="px-3 py-3 text-xs text-neutral-600">{jsonLine(capability.fallbackPolicy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>

        <PmsCard title="Route decisions" eyebrow="Audit-safe routing">
          <div className="space-y-3">
            {data.routes.map((route) => (
              <div key={route.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{route.requestedCapability}</p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {route.workflowArea} | {route.sourceObjectType} {route.sourceObjectId ?? ""} | {formatDate(route.createdAt)}
                    </p>
                  </div>
                  <StatusFor value={route.routeStatus} />
                </div>
                {route.blockedReason ? (
                  <p className="mt-2 rounded-md bg-rose-50 p-2 text-xs leading-5 text-rose-800">{route.blockedReason}</p>
                ) : (
                  <p className="mt-2 rounded-md bg-emerald-50 p-2 text-xs leading-5 text-emerald-800">
                    Ready for connector execution after workflow-level approval and provider call response.
                  </p>
                )}
                <p className="mt-2 text-xs text-neutral-600">
                  Fallback: {route.fallbackRoute} | Estimated cost: <Money cents={route.estimatedCostCents} />
                </p>
              </div>
            ))}
          </div>
        </PmsCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Health checks" eyebrow="Connector smoke tests">
          <div className="space-y-3">
            {data.healthChecks.map((check) => (
              <div key={check.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-950">{check.definitionName} - {check.checkType}</p>
                  <StatusFor value={check.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{check.resultSummary}</p>
                <p className="mt-1 text-xs text-neutral-500">Checked {formatDate(check.checkedAt)} | latency {check.latencyMs ?? "n/a"} ms</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Cost telemetry" eyebrow="Avoid uncontrolled vendor spend">
          <div className="space-y-3">
            {data.costs.map((cost) => (
              <div key={cost.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{cost.capabilityKey}</p>
                    <p className="mt-1 text-xs text-neutral-600">{cost.workflowArea} | {cost.definitionName ?? "Manual route"} | {cost.pricingUnit}</p>
                  </div>
                  <p className="text-sm font-semibold text-neutral-950"><Money cents={cost.costCents} /></p>
                </div>
                <p className="mt-2 text-xs text-neutral-600">{jsonLine(cost.metadata)}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </div>
    </FoundationShell>
  );
}
