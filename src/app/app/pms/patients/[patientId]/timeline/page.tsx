import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getPatient } from "@/lib/pms-repository";
import { getPatientTimeline, patientTimelineSources } from "@/lib/patient-timeline-repository";

export const dynamic = "force-dynamic";

type TimelineSearchParams = {
  role?: string;
  source?: string;
  status?: string;
  from?: string;
  to?: string;
};

export default async function PatientTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ patientId: string }>;
  searchParams: Promise<TimelineSearchParams>;
}) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const session = await requireAuth();
  const role = getRole(query.role);
  const [patient, timeline] = await Promise.all([
    getPatient(patientId, session.tenantId),
    getPatientTimeline({
      tenantId: session.tenantId,
      patientId,
      filters: {
        source: query.source,
        status: query.status,
        from: query.from,
        to: query.to,
      },
    }),
  ]);

  if (!patient) {
    return (
      <FoundationShell active="/app/pms/patients" roleKey={role.key}>
        <PageHeader eyebrow="Patient timeline" title="Patient not found" body="The requested timeline is not available in this tenant." />
      </FoundationShell>
    );
  }

  const basePath = `/app/pms/patients/${patient.id}/timeline`;
  const activeSource = query.source ?? "ALL";
  const activeStatus = query.status ?? "ALL";
  const patientName = `${patient.firstName} ${patient.lastName}`;
  const openItems = timeline.filter((event) => ["OPEN", "DRAFT", "NEEDS_REVIEW", "PENDING_APPROVAL", "BLOCKED", "READY", "SUBMITTED"].includes(event.status)).length;
  const writebackRisks = timeline.filter((event) => event.writebackStatus === "BLOCKED" || event.writebackStatus === "PENDING_APPROVAL").length;

  return (
    <FoundationShell active="/app/pms/patients" roleKey={role.key}>
      <PageHeader eyebrow={patient.chartNumber} title={`${patientName} timeline`} body="One patient thread across appointments, phone calls, clinical notes, perio, treatment, claims, ledger, documents, tasks, and PMS writeback evidence." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={basePath} />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

      <section className="grid gap-4 lg:grid-cols-4">
        <PmsCard title="Events" eyebrow="Loaded">
          <p className="text-3xl font-semibold text-neutral-950">{timeline.length}</p>
          <p className="mt-1 text-sm text-neutral-600">cross-module records</p>
        </PmsCard>
        <PmsCard title="Open work" eyebrow="Needs follow-up">
          <p className="text-3xl font-semibold text-neutral-950">{openItems}</p>
          <p className="mt-1 text-sm text-neutral-600">active statuses</p>
        </PmsCard>
        <PmsCard title="Writeback risk" eyebrow="Connector gates">
          <p className="text-3xl font-semibold text-neutral-950">{writebackRisks}</p>
          <p className="mt-1 text-sm text-neutral-600">blocked or pending</p>
        </PmsCard>
        <PmsCard title="Balance" eyebrow="Ledger">
          <p className="text-3xl font-semibold text-neutral-950"><Money cents={patient.balanceCents} /></p>
          <p className="mt-1 text-sm text-neutral-600">current patient balance</p>
        </PmsCard>
      </section>

      <PmsCard title="Timeline filters" eyebrow="Drill down">
        <form action={basePath} className="grid gap-3 md:grid-cols-5">
          <input type="hidden" name="role" value={role.key} />
          <label className="grid gap-1 text-sm font-semibold text-neutral-700">
            Source
            <select name="source" defaultValue={activeSource} className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950">
              {patientTimelineSources.map((source) => (
                <option key={source.value} value={source.value}>{source.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-neutral-700">
            Status
            <select name="status" defaultValue={activeStatus} className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950">
              {["ALL", "OPEN", "DRAFT", "READY", "ACTIVE", "COMPLETED", "SIGNED", "SUBMITTED", "DENIED", "BLOCKED", "PENDING_APPROVAL"].map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ").toLowerCase()}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-neutral-700">
            From
            <input name="from" type="date" defaultValue={query.from ?? ""} className="min-h-11 rounded-md border border-neutral-300 px-3 text-sm text-neutral-950" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-neutral-700">
            To
            <input name="to" type="date" defaultValue={query.to ?? ""} className="min-h-11 rounded-md border border-neutral-300 px-3 text-sm text-neutral-950" />
          </label>
          <div className="flex items-end gap-2">
            <button className="min-h-11 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white" type="submit">Apply</button>
            <Link href={`${basePath}?role=${role.key}`} className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-4 text-sm font-semibold text-neutral-800">Clear</Link>
          </div>
        </form>
      </PmsCard>

      <PmsCard title="Patient activity" eyebrow="Source of truth">
        {timeline.length === 0 ? (
          <EmptyPmsState title="No timeline records match these filters" body="This patient has no matching appointments, calls, notes, perio, treatment, claims, ledger entries, documents, or tasks in the selected window." />
        ) : (
          <div className="divide-y divide-neutral-100">
            {timeline.map((event) => (
              <article key={event.id} className="grid gap-3 py-4 lg:grid-cols-[12rem_1fr_auto]">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{new Date(event.occurredAt).toLocaleString()}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">{event.source.replaceAll("_", " ")}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-neutral-950">{event.title}</h2>
                    <StatusFor value={event.status} />
                    {event.writebackStatus ? <StatusFor value={event.writebackStatus} /> : null}
                  </div>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">{event.summary || "No detail recorded."}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-neutral-500">
                    {event.actor ? <span className="rounded-md bg-neutral-100 px-2 py-1">{event.actor}</span> : null}
                    {event.amountCents !== null ? <span className="rounded-md bg-neutral-100 px-2 py-1"><Money cents={event.amountCents} /></span> : null}
                    <span className="rounded-md bg-neutral-100 px-2 py-1">{event.evidenceCount} evidence item{event.evidenceCount === 1 ? "" : "s"}</span>
                    {event.writebackBlockedReason ? <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">{event.writebackBlockedReason}</span> : null}
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  {event.routeHref ? (
                    <Link href={`${event.routeHref}?role=${role.key}`} className="inline-flex min-h-10 items-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50">
                      Open
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </PmsCard>
    </FoundationShell>
  );
}
