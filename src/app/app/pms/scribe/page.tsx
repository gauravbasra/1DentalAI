import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { PmsScribeWorkspace } from "@/components/pms-scribe-workspace";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { listPatients, listProcedureCodes } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export default async function PmsScribePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [patients, procedureCodes] = await Promise.all([listPatients(session.tenantId), listProcedureCodes(session.tenantId)]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="Clinical AI"
        title="Scribing and notes"
        body="Ambient documentation for provider-reviewed notes, CDT-coded treatment plans, and team task handoff inside the PMS. Perio charting can inform this workflow, but the scribe stands on its own."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/scribe" />
      <PmsSectionNav active="/app/pms/scribe" roleKey={role.key} />

      <section className="mb-4 grid gap-4 xl:grid-cols-3">
        <PmsCard title="Scribe workflow" eyebrow="Capture to chart">
          <ol className="grid gap-2 text-sm leading-6 text-neutral-700">
            <li><span className="font-semibold text-neutral-950">1.</span> Select patient and template.</li>
            <li><span className="font-semibold text-neutral-950">2.</span> Capture or paste the appointment conversation.</li>
            <li><span className="font-semibold text-neutral-950">3.</span> Review note, CDT rows, and tasks before save.</li>
          </ol>
        </PmsCard>
        <PmsCard title="Practice controls" eyebrow="Editable by design">
          <p className="text-sm leading-6 text-neutral-700">Templates, note body, CDT codes, tooth, surface, phase, and task ownership are editable before anything writes to the chart.</p>
        </PmsCard>
        <PmsCard title="Clinical governance" eyebrow="Draft until approved">
          <p className="text-sm leading-6 text-neutral-700">Generated output stays proposed. Saving creates a draft clinical note, draft treatment plan items, and open tasks for staff review.</p>
        </PmsCard>
      </section>

      <PmsScribeWorkspace patients={patients} procedureCodes={procedureCodes} />
    </FoundationShell>
  );
}
