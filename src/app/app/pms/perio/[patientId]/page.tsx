import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { addPerioMeasure, getPerio } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type PerioMeasure = {
  id: string;
  tooth: string;
  site: string;
  probingDepth: number;
  bleeding: boolean;
  recession: number | null;
};

async function addMeasureAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await addPerioMeasure(patientId, {
    actorRole: session.roleKey,
    tooth: String(formData.get("tooth") ?? ""),
    site: String(formData.get("site") ?? ""),
    probingDepth: Number(formData.get("probingDepth") ?? 0),
    bleeding: formData.get("bleeding") === "on",
    recession: formData.get("recession") ? Number(formData.get("recession")) : undefined,
  }, session.tenantId);
  revalidatePath(`/app/pms/perio/${patientId}`);
}

export default async function PerioPage({ params, searchParams }: { params: Promise<{ patientId: string }>; searchParams: Promise<{ role?: string }> }) {
  const [{ patientId }, query] = await Promise.all([params, searchParams]);
  const session = await requireAuth();
  const role = getRole(query.role);
  const perio = await getPerio(patientId, session.tenantId);
  const patient = perio.patient;

  if (!patient) {
    return <FoundationShell active="/app/pms" roleKey={role.key}><PageHeader eyebrow="Perio" title="Patient not found" body="The requested perio chart is not available." /></FoundationShell>;
  }

  const measures = perio.measures as PerioMeasure[];
  const bleeding = measures.filter((m) => m.bleeding).length;

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow={patient.chartNumber} title={`${patient.firstName} ${patient.lastName} perio`} body="Hygiene and periodontal workspace for pocket depths, bleeding, recession, mobility, furcation, diagnosis, and recall planning." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={`/app/pms/perio/${patient.id}`} />
      <PmsSectionNav active="/app/pms/patients" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <PmsCard title="Record measurement" eyebrow="Six-point charting">
          <form action={addMeasureAction} className="grid gap-3">
            <input type="hidden" name="patientId" value={patient.id} />
            <div className="grid grid-cols-2 gap-3">
              <Input name="tooth" label="Tooth" placeholder="3" required />
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">
                Site
                <select name="site" className="rounded-2xl border border-neutral-300 px-4 py-3">
                  {["MB", "B", "DB", "ML", "L", "DL"].map((site) => <option key={site}>{site}</option>)}
                </select>
              </label>
              <Input name="probingDepth" label="Depth" type="number" required />
              <Input name="recession" label="Recession" type="number" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <input name="bleeding" type="checkbox" className="h-4 w-4" />
              Bleeding on probing
            </label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Save measurement</button>
          </form>
        </PmsCard>

        <PmsCard
          title="Perio chart"
          eyebrow={perio.exam ? `Exam ${new Date(perio.exam.examDate).toLocaleDateString()}` : "No active exam"}
          action={<StatusPill tone={bleeding > 0 ? "amber" : "green"}>{bleeding} bleeding sites</StatusPill>}
        >
          {measures.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {measures.map((m) => (
                <div key={m.id} className="rounded-2xl bg-neutral-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-neutral-950">Tooth {m.tooth} · {m.site}</p>
                    <StatusPill tone={m.probingDepth >= 5 ? "red" : m.probingDepth >= 4 ? "amber" : "green"}>{m.probingDepth} mm</StatusPill>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">{m.bleeding ? "Bleeding" : "No bleeding"} · recession {m.recession ?? 0} mm</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No perio measurements yet" body="Start the exam by entering the first tooth and site. Measurements are stored per active perio exam and can be updated site by site." />
          )}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text", required = false, placeholder = "" }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} required={required} placeholder={placeholder} className="rounded-2xl border border-neutral-300 px-4 py-3" />
    </label>
  );
}
