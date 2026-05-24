"use client";

import { useMemo, useState } from "react";
import type { PayerPortalDirectoryRow } from "@/lib/payer-network-repository";

type PortalSettingsAction = (formData: FormData) => void | Promise<void>;

const taskOptions = [
  { key: "ELIGIBILITY", label: "Eligibility", family: "ELIGIBILITY_270_271" },
  { key: "CLAIM_STATUS", label: "Claim status", family: "CLAIM_STATUS_276_277" },
  { key: "ERA", label: "ERA / EOB", family: "ERA_835" },
  { key: "PRIOR_AUTH", label: "Prior auth", family: "PRIOR_AUTH" },
  { key: "ATTACHMENTS", label: "Attachments", family: "ATTACHMENT_275" },
];

function defaultTaskKeys(row: PayerPortalDirectoryRow) {
  const families = new Set(row.supportedTasks ?? []);
  return taskOptions.filter((task) => families.has(task.family)).map((task) => task.key);
}

function portalReadiness(row: PayerPortalDirectoryRow) {
  if (!row.portalUrl) return "URL_MISSING";
  if (row.credentialStatus !== "VALIDATED") return "CREDENTIAL_REQUIRED";
  if (!row.activeLayoutCount) return "LAYOUT_REQUIRED";
  return "READY_FOR_RPA";
}

function StatusFor({ value }: { value: string }) {
  const tone =
    value.includes("READY") || value.includes("ACTIVE") || value.includes("COMPLETED") || value.includes("VALIDATED")
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : value.includes("DENIED") || value.includes("BROKEN") || value.includes("REJECTED") || value.includes("EXPIRED") || value.includes("BLOCKED")
        ? "bg-red-50 text-red-800 ring-red-200"
        : value.includes("MISSING") || value.includes("REQUIRED") || value.includes("PENDING")
          ? "bg-amber-50 text-amber-800 ring-amber-200"
          : "bg-neutral-100 text-neutral-700 ring-neutral-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize leading-4 ring-1 ${tone}`}>
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not verified";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function PayerPortalSettingsClient({
  rows,
  action,
}: {
  rows: PayerPortalDirectoryRow[];
  action: PortalSettingsAction;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [task, setTask] = useState("ALL");
  const [editing, setEditing] = useState<PayerPortalDirectoryRow | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !normalized || `${row.payerName} ${row.primaryPayerId} ${row.portalHost ?? ""}`.toLowerCase().includes(normalized);
      const readiness = portalReadiness(row);
      const matchesStatus = status === "ALL" || readiness === status || row.credentialStatus === status;
      const matchesTask = task === "ALL" || row.supportedTasks?.includes(taskOptions.find((option) => option.key === task)?.family ?? task);
      return matchesQuery && matchesStatus && matchesTask;
    });
  }, [query, rows, status, task]);

  const configuredCount = rows.filter((row) => row.portalUrl).length;
  const validatedCount = rows.filter((row) => row.credentialStatus === "VALIDATED").length;
  const layoutCount = rows.filter((row) => row.activeLayoutCount > 0).length;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Payer RPA operations</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">Portal URL directory</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">
              Real payer hosts, login paths, credential references, layout counts, and route policies. No usernames or passwords are stored in this directory.
            </p>
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-neutral-200 text-center text-xs">
            <Metric value={configuredCount} label="URLs" />
            <Metric value={validatedCount} label="credentials" />
            <Metric value={layoutCount} label="layouts" />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 lg:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by payer, payer ID, or host"
            className="min-h-10 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-950"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
            <option value="ALL">All readiness</option>
            <option value="URL_MISSING">URL missing</option>
            <option value="CREDENTIAL_REQUIRED">Credential required</option>
            <option value="LAYOUT_REQUIRED">Layout required</option>
            <option value="READY_FOR_RPA">Ready for RPA</option>
            <option value="VALIDATED">Credential validated</option>
            <option value="MISSING">Credential missing</option>
          </select>
          <select value={task} onChange={(event) => setTask(event.target.value)} className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold">
            <option value="ALL">All tasks</option>
            {taskOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-[0.08em] text-neutral-500">
            <tr>
              <th className="px-4 py-3">Payer</th>
              <th className="px-4 py-3">Portal</th>
              <th className="px-4 py-3">RPA tasks</th>
              <th className="px-4 py-3">Credential</th>
              <th className="px-4 py-3">Layout</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => (
              <tr key={row.payerRegistryEntryId} className="hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-neutral-950">{row.payerName}</p>
                  <p className="mt-1 text-xs text-neutral-500">ID {row.primaryPayerId} · {row.coverageType ?? "DENTAL"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-[260px] truncate font-semibold text-neutral-900">{row.portalHost ?? "Not configured"}</p>
                  <p className="mt-1 max-w-[260px] truncate text-xs text-neutral-500">{row.portalUrl ?? "Add the real payer login URL"}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex max-w-[260px] flex-wrap gap-1">
                    {row.supportedTasks?.length ? row.supportedTasks.map((item) => (
                      <span key={item} className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-700">{item.replaceAll("_", " ")}</span>
                    )) : <span className="text-xs text-neutral-500">None mapped</span>}
                  </div>
                </td>
                <td className="px-4 py-3"><StatusFor value={row.credentialStatus ?? "MISSING"} /></td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-neutral-900">{row.activeLayoutCount} active / {row.layoutCount} total</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatDate(row.lastLayoutVerifiedAt)}</p>
                </td>
                <td className="px-4 py-3"><StatusFor value={portalReadiness(row)} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="min-h-9 rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 hover:border-neutral-950"
                  >
                    Configure
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-500">No payers match the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <PortalSettingsModal
          row={editing}
          action={action}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function PortalSettingsModal({
  row,
  action,
  onClose,
}: {
  row: PayerPortalDirectoryRow;
  action: PortalSettingsAction;
  onClose: () => void;
}) {
  const selectedTasks = new Set(defaultTaskKeys(row));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="payer-portal-dialog-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Payer portal settings</p>
            <h3 id="payer-portal-dialog-title" className="mt-1 text-lg font-semibold text-neutral-950">{row.payerName}</h3>
            <p className="mt-1 text-xs text-neutral-500">Payer ID {row.primaryPayerId}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-md border border-neutral-300 text-lg leading-none hover:border-neutral-950">x</button>
        </div>

        <form action={action} className="grid gap-4 px-5 py-5">
          <input type="hidden" name="payerRegistryEntryId" value={row.payerRegistryEntryId} />
          <div className="grid gap-3 md:grid-cols-[1fr_0.7fr]">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Portal login URL
              <input name="portalUrl" type="url" required defaultValue={row.portalUrl ?? ""} placeholder="https://provider.payer.com/login" className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Credential status
              <select name="credentialStatus" defaultValue={row.credentialStatus ?? "MISSING"} className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {["MISSING", "PENDING", "VALIDATED", "EXPIRED", "BLOCKED"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Login path
              <input name="loginPath" defaultValue={row.loginPath ?? ""} placeholder="/login" className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Eligibility path
              <input name="eligibilityPath" defaultValue={row.eligibilityPath ?? ""} placeholder="/eligibility" className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Credential vault ref
              <input name="credentialVaultId" defaultValue={row.credentialVaultId ?? ""} placeholder="cvault_..." className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal" />
            </label>
          </div>
          <fieldset className="rounded-lg border border-neutral-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">Portal RPA tasks</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {taskOptions.map((option) => (
                <label key={option.key} className="flex min-h-10 items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800">
                  <input name="supportedTasks" type="checkbox" value={option.key} defaultChecked={selectedTasks.has(option.key)} className="size-4" />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 md:grid-cols-[0.4fr_1fr]">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Owner role
              <select name="ownerRoleKey" defaultValue={row.credentialOwnerRole ?? "billing_rcm"} className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm">
                {["billing_rcm", "office_manager", "support_admin", "owner_dentist"].map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Operational notes
              <input name="notes" defaultValue={row.credentialNotes ?? ""} placeholder="MFA owner, enrollment blocker, portal caveat" className="min-h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal" />
            </label>
          </div>
          <div className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            Saving this updates the production route policy, but the payer bot still cannot run live until a validated credential reference and active layout exist.
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900">Cancel</button>
            <button className="min-h-10 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save portal settings</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-24 border-r border-neutral-200 px-3 py-2 last:border-r-0">
      <p className="text-lg font-semibold text-neutral-950">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p>
    </div>
  );
}
