import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import {
  createConnectorRouteDecision,
  getConnectorControlCenter,
  getOpenAiWebchatConfig,
  recordConnectorHealthCheck,
  updateConnectorInstallation,
} from "@/lib/connector-control-repository";
import { getRole, type RoleKey } from "@/lib/foundation-data";

export const dynamic = "force-dynamic";

type ConnectorView = "overview" | "credentials" | "installations" | "capabilities" | "tests" | "routes";
type SearchParams = Promise<{ role?: string; view?: string; saved?: string; error?: string; validated?: string; feedback?: string }>;

const connectorViews: Array<{ key: ConnectorView; label: string; description: string }> = [
  { key: "overview", label: "Overview", description: "Readiness, blockers, and spend." },
  { key: "credentials", label: "API keys", description: "Store and rotate encrypted provider keys." },
  { key: "installations", label: "Installations", description: "Edit tenant/location connector gates." },
  { key: "capabilities", label: "Capabilities", description: "Map workflows to connector abilities." },
  { key: "tests", label: "Smoke tests", description: "Record webhook and credential evidence." },
  { key: "routes", label: "Routing", description: "Create route decisions and fallback work." },
];

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

async function recordHealthCheckAction(formData: FormData) {
  "use server";
  await recordConnectorHealthCheck({
    definitionId: value(formData, "definitionId"),
    installationId: value(formData, "installationId"),
    checkType: value(formData, "checkType"),
    status: value(formData, "status"),
    resultSummary: value(formData, "resultSummary"),
    latencyMs: Number(value(formData, "latencyMs") || 0) || undefined,
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
  const activeView = connectorViews.some((view) => view.key === params.view) ? params.view as ConnectorView : "overview";
  const [data, openAiConfig] = await Promise.all([getConnectorControlCenter(), getOpenAiWebchatConfig()]);
  const openAiInstallation = data.installations.find((installation) => installation.category === "AI_LLM" || /openai/i.test(String(installation.definitionName)));
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
        eyebrow="Integration settings"
        title="Connectors, API keys, readiness, and routing"
        body="Configure provider credentials, webhook checks, capability maps, routing policy, and manual fallback. Nothing here claims a real call, SMS, claim, payment, review post, or PMS writeback until the connector evidence passes."
      />

      <ConnectorViewNav activeView={activeView} roleKey={role.key as RoleKey} />

      {params.saved ? (
        <div id="credential-feedback" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm">
          Credential saved: encrypted {params.saved}. The raw secret is no longer displayed.
        </div>
      ) : null}
      {params.validated ? (
        <div id="credential-feedback" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 shadow-sm">
          {params.validated} credential smoke test passed. You can now configure model, prompt, voice, and local RAG policy in Patient Engagement → Webchat → AI runtime.
        </div>
      ) : null}
      {params.error ? (
        <div id="credential-feedback" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900 shadow-sm">
          Credential action failed: {params.error}
        </div>
      ) : null}

      {activeView === "overview" ? (
      <>
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

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.domainReadiness.map((domain) => (
          <div key={domain.category} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{domain.category}</p>
                <p className="mt-1 text-lg font-semibold text-neutral-950">{domain.capabilities} capabilities</p>
              </div>
              <StatusFor value={domain.readinessStatus} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-600">
              <MiniMetric label="Blocked caps" value={domain.blockedCapabilities} />
              <MiniMetric label="Blocked routes" value={domain.blockedRoutes} />
              <MiniMetric label="Est. cost" value={<Money cents={domain.estimatedCents} />} />
            </div>
            {domain.blockers.length ? (
              <p className="mt-3 text-xs leading-5 text-amber-800">{domain.blockers.slice(0, 2).join(" | ")}</p>
            ) : (
              <p className="mt-3 text-xs leading-5 text-emerald-800">Ready for connector routing only; provider response still must be recorded by workflow code.</p>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <CostTelemetry data={data} />
        <FallbackQueue data={data} />
      </div>
      </>
      ) : null}

      {activeView === "credentials" ? (
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
        <OpenAiCredentialCard config={openAiConfig} installation={openAiInstallation} roleKey={role.key as RoleKey} />
        <PmsCard title="Shared credential vault" eyebrow="All provider secrets live here">
          <LatestCredentialActivity credentials={data.credentialVault} />
          <form action="/app/connectors/credentials" method="post" className="mt-3 grid gap-3">
            <input type="hidden" name="actorRole" value={role.key} />
            <label className="block text-xs font-semibold text-neutral-600">
              Connector installation
              <select name="installationId" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                {data.installations.map((installation) => (
                  <option key={installation.id} value={installation.id}>{installation.definitionName} - {installation.locationName ?? "Enterprise"}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs font-semibold text-neutral-600">
                Provider
                <select name="providerKey" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {["OPENAI", "TWILIO", "NEXHEALTH", "STEDI", "FREESWITCH", "SIGNALWIRE", "OTHER"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Credential label
                <select name="credentialLabel" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {["api_key", "account_sid", "auth_token", "api_secret", "webhook_signing_secret", "location_id", "subdomain", "trading_partner_id", "submitter_id", "messaging_service_sid"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Type
                <select name="credentialType" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {["SECRET", "API_KEY", "ACCOUNT_ID", "WEBHOOK_SECRET", "LOCATION_ID", "SUBMITTER_ID"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-neutral-600">
              Secret value
              <input name="secretValue" type="password" autoComplete="off" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <button className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
              Store encrypted credential
            </button>
            <p className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Secrets are encrypted at rest and never displayed after saving. Editing a secret means rotating it here. Runtime screens only choose behavior like model, prompt, voice, and workflow policy; they do not store API keys.
            </p>
          </form>
        </PmsCard>
        </div>

        <PmsCard title="Stored credential fingerprints" eyebrow="No raw secrets displayed">
          <div className="space-y-3">
            {data.credentialVault.map((credential) => (
              <div key={credential.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{credential.providerKey} · {credential.credentialLabel}</p>
                    <p className="mt-1 text-xs text-neutral-600">{credential.definitionName ?? "Connector"} · {credential.credentialType} · rotated {formatDate(credential.rotatedAt)}</p>
                  </div>
                  <StatusFor value={credential.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Fingerprint {String(credential.fingerprint).slice(0, 16)}... · ending {credential.lastFour ?? "n/a"} · stored by {credential.createdByRole}</p>
              </div>
            ))}
            {!data.credentialVault.length ? <p className="text-sm text-neutral-600">No connector credentials have been stored yet.</p> : null}
          </div>
        </PmsCard>
      </div>
      ) : null}

      {activeView === "installations" ? (
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
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
                    ["webhookStatus", ["NOT_CONFIGURED", "PENDING", "VERIFIED", "NOT_REQUIRED"]],
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
                  {["PMS", "RCM", "PHONE", "SMS", "REPUTATION", "LISTINGS", "PAYMENTS", "EMAIL", "AI_LLM", "MARKETING", "ENGAGEMENT"].map((option) => (
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
      ) : null}

      {activeView === "capabilities" ? (
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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

        <PmsCard title="Capability discipline" eyebrow="No connector shortcut">
          <div className="space-y-3">
            {data.domainReadiness.map((domain) => (
              <div key={`${domain.category}-capability`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{domain.category}</p>
                    <p className="mt-1 text-xs text-neutral-600">{domain.capabilities} capabilities · {domain.blockedCapabilities} blocked</p>
                  </div>
                  <StatusFor value={domain.readinessStatus} />
                </div>
                {domain.blockers.length ? <p className="mt-2 text-xs leading-5 text-amber-800">{domain.blockers.join(" | ")}</p> : null}
              </div>
            ))}
          </div>
        </PmsCard>
      </div>
      ) : null}

      {activeView === "tests" ? (
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <PmsCard title="Record smoke-test evidence" eyebrow="Credential and webhook checks">
          <form action={recordHealthCheckAction} className="space-y-3">
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
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs font-semibold text-neutral-600">
                Check type
                <select name="checkType" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {["CREDENTIAL_VAULT", "WEBHOOK_SIGNATURE", "READ_ONLY_SMOKE_TEST", "WRITEBACK_DRY_RUN", "COST_POLICY", "BAA_POLICY"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Status
                <select name="status" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  {["NOT_RUN", "PASS", "FAIL", "BLOCKED_CONNECTOR_REQUIRED"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Latency ms
                <input name="latencyMs" type="number" min="0" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="block text-xs font-semibold text-neutral-600">
              Evidence summary
              <textarea name="resultSummary" required rows={3} placeholder="Credential vault ref present, webhook signature verified, smoke-test transaction ID, or blocker." className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <button className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
              Record check
            </button>
          </form>
          <p className="mt-3 rounded-md bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
            This stores readiness evidence. It does not call a PMS, payer, carrier, listing network, payment gateway, email provider, or AI model.
          </p>
        </PmsCard>
        <HealthChecks data={data} />
      </div>
      ) : null}

      {activeView === "routes" ? (
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
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

        <FallbackQueue data={data} />
      </div>
      ) : null}

    </FoundationShell>
  );
}

function ConnectorViewNav({ activeView, roleKey }: { activeView: ConnectorView; roleKey: RoleKey }) {
  return (
    <nav aria-label="Connector settings" className="mb-5 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
      {connectorViews.map((view) => (
        <a
          key={view.key}
          href={`/app/connectors?role=${roleKey}&view=${view.key}`}
          className={`rounded-lg border p-3 text-left transition ${
            activeView === view.key
              ? "border-neutral-950 bg-neutral-950 text-white shadow-sm"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:text-neutral-950"
          }`}
        >
          <span className="block text-sm font-semibold">{view.label}</span>
          <span className={`mt-1 block text-xs leading-5 ${activeView === view.key ? "text-neutral-300" : "text-neutral-500"}`}>
            {view.description}
          </span>
        </a>
      ))}
    </nav>
  );
}

function OpenAiCredentialCard({
  config,
  installation,
  roleKey,
}: {
  config: Awaited<ReturnType<typeof getOpenAiWebchatConfig>>;
  installation: Awaited<ReturnType<typeof getConnectorControlCenter>>["installations"][number] | undefined;
  roleKey: RoleKey;
}) {
  const canStore = Boolean(installation?.id);
  const readiness = config.ready ? "READY" : config.hasVaultKey || config.hasEnvironmentKey ? "SETUP_REQUIRED" : "MISSING";
  return (
    <PmsCard title="OpenAI BAA runtime key" eyebrow="Webchat, voice, and AI assistant connector">
      <div className="grid gap-3 md:grid-cols-3">
        <ContextCard label="Runtime source" value={config.source} detail={config.ready ? "The app can use OpenAI for webchat responses." : config.blockedReason ?? "OpenAI is not ready."} />
        <ContextCard label="Vault key" value={config.hasVaultKey ? "stored" : "missing"} detail={config.hasVaultKey ? "Stored encrypted in the connector vault. Raw key is never displayed." : "Store or rotate the API key below."} />
        <ContextCard label="Environment key" value={config.hasEnvironmentKey ? "present" : "not set"} detail="Production can also read OPENAI_API_KEY from deployment secrets, but the editable path is this vault." />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <StatusTile label="Credential" value={config.credentialStatus} />
        <StatusTile label="Approval" value={config.approvalStatus} />
        <StatusTile label="Health" value={config.healthStatus} />
        <StatusTile label="Runtime" value={readiness} />
      </div>
      {config.secretError ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-xs leading-5 text-red-900">{config.secretError}</p>
      ) : null}
      {!canStore ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-xs leading-5 text-red-900">
          AI_LLM connector installation is missing. Run the connector seed/migration before storing the OpenAI key.
        </p>
      ) : null}
      <form action="/app/connectors/credentials" method="post" className="mt-4 grid gap-3">
        <input type="hidden" name="actorRole" value={roleKey} />
        <input type="hidden" name="installationId" value={installation?.id ?? ""} />
        <input type="hidden" name="providerKey" value="OPENAI" />
        <input type="hidden" name="credentialLabel" value="api_key" />
        <input type="hidden" name="credentialType" value="API_KEY" />
        <label className="block text-xs font-semibold text-neutral-600">
          Rotate OpenAI API key
          <input name="secretValue" type="password" autoComplete="off" required disabled={!canStore} placeholder="Paste OpenAI API key" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button disabled={!canStore} className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300">
            Store/rotate OpenAI key
          </button>
        </div>
      </form>
      <form action="/app/connectors/credentials/validate-openai" method="post" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
        <input type="hidden" name="actorRole" value={roleKey} />
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-800">OpenAI smoke test</p>
        <p className="mt-1 text-xs leading-5 text-sky-900">
          Runs a non-PHI Responses API check against the stored OPENAI api_key. This validates the key; model, prompt, voice, and RAG behavior stay in Patient Engagement - Webchat - AI runtime.
        </p>
        <button disabled={!canStore} className="mt-3 rounded-md bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300">
          Validate OpenAI key
        </button>
      </form>
    </PmsCard>
  );
}

function ContextCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <div className="mt-2">
        <StatusFor value={value} />
      </div>
    </div>
  );
}

function FallbackQueue({ data }: { data: Awaited<ReturnType<typeof getConnectorControlCenter>> }) {
  return (
    <PmsCard title="Manual fallback queue" eyebrow="Blocked connector routes">
      <div className="space-y-3">
        {data.fallbackSummary.map((row) => (
          <div key={`${row.workflowArea}-${row.fallbackRoute}`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-950">{row.workflowArea}</p>
                <p className="mt-1 text-xs text-neutral-600">{row.fallbackRoute}</p>
              </div>
              <StatusFor value={Number(row.blockedCount ?? 0) ? "BLOCKED_CONNECTOR_REQUIRED" : "READY_FOR_CONNECTOR"} />
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              {row.blockedCount} blocked of {row.routeCount} route decisions | last decision {formatDate(row.lastDecisionAt)}
            </p>
          </div>
        ))}
      </div>
    </PmsCard>
  );
}

function LatestCredentialActivity({ credentials }: { credentials: Awaited<ReturnType<typeof getConnectorControlCenter>>["credentialVault"] }) {
  const latest = [...credentials].sort((a, b) => new Date(String(b.rotatedAt ?? b.createdAt ?? 0)).getTime() - new Date(String(a.rotatedAt ?? a.createdAt ?? 0)).getTime())[0];
  if (!latest) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Vault status</p>
        <p className="mt-1 text-sm font-semibold text-neutral-950">No credentials stored yet</p>
        <p className="mt-1 text-xs leading-5 text-neutral-600">After saving, the latest stored credential fingerprint will appear here and in the list on the right.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-800">Latest vault activity</p>
          <p className="mt-1 text-sm font-semibold text-emerald-950">{latest.providerKey} · {latest.credentialLabel}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            Stored {formatDate(latest.rotatedAt ?? latest.createdAt)} · status {latest.status} · ending {latest.lastFour ?? "n/a"}
          </p>
        </div>
        <StatusFor value={latest.status} />
      </div>
    </div>
  );
}

function HealthChecks({ data }: { data: Awaited<ReturnType<typeof getConnectorControlCenter>> }) {
  return (
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
  );
}

function CostTelemetry({ data }: { data: Awaited<ReturnType<typeof getConnectorControlCenter>> }) {
  return (
    <PmsCard title="Cost telemetry" eyebrow="Avoid uncontrolled vendor spend">
      <div className="mb-4 overflow-hidden rounded-md border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-500">
            <tr><th className="px-3 py-2">Workflow</th><th className="px-3 py-2">Capability</th><th className="px-3 py-2 text-right">Estimated</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.costSummary.map((row) => (
              <tr key={`${row.workflowArea}-${row.capabilityKey}`}>
                <td className="px-3 py-2 font-semibold text-neutral-950">{row.workflowArea}</td>
                <td className="px-3 py-2 text-neutral-600">{row.capabilityKey}</td>
                <td className="px-3 py-2 text-right font-semibold"><Money cents={row.estimatedCents} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-neutral-50 p-2"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p><p className="mt-1 font-semibold text-neutral-950">{value}</p></div>;
}
