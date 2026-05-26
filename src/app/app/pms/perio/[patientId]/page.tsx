import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { PerioChartGrid } from "@/components/perio/perio-chart-grid";
import { PerioSignoffPanel } from "@/components/perio/perio-signoff-panel";
import { PerioVoiceCapture } from "@/components/perio/perio-voice-capture";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { addPerioMeasure, completePerioExam, getPerio } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type PerioMeasure = {
  id: string;
  tooth: string;
  site: string;
  probingDepth: number;
  bleeding: boolean;
  recession: number | null;
  mobility: string | null;
  furcation: string | null;
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
    mobility: String(formData.get("mobility") ?? ""),
    furcation: String(formData.get("furcation") ?? ""),
  }, session.tenantId);
  revalidatePath(`/app/pms/perio/${patientId}`);
}

async function completeExamAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const patientId = String(formData.get("patientId"));
  await completePerioExam(patientId, {
    actorRole: session.roleKey,
    providerId: session.userId,
    diagnosis: String(formData.get("diagnosis") ?? ""),
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
    return <FoundationShell active="/app/pms/patients" roleKey={role.key}><PageHeader eyebrow="Perio" title="Patient not found" body="The requested perio chart is not available." /></FoundationShell>;
  }

  const measures = perio.measures as PerioMeasure[];
  const bleeding = measures.filter((m) => m.bleeding).length;
  const deepSites = measures.filter((m) => m.probingDepth >= 5).length;
  const completed = String(perio.exam?.status ?? "") === "COMPLETED";

  return (
    <FoundationShell active="/app/pms/patients" roleKey={role.key}>
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
              <Input name="mobility" label="Mobility" placeholder="0, I, II, III" />
              <Input name="furcation" label="Furcation" placeholder="None, I, II, III" />
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
          action={<StatusPill tone={completed ? "green" : bleeding > 0 ? "amber" : "green"}>{completed ? "completed" : `${bleeding} bleeding sites`}</StatusPill>}
        >
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Metric label="Sites charted" value={measures.length} detail="six-point entries" />
            <Metric label="Bleeding" value={bleeding} detail="BOP sites" />
            <Metric label="5mm+" value={deepSites} detail="deep pockets" />
            <Metric label="Status" value={String(perio.exam?.status ?? "not started").replaceAll("_", " ").toLowerCase()} detail={perio.exam?.diagnosis ?? "diagnosis pending"} />
          </div>
          {measures.length ? <PerioChartGrid measures={measures} /> : <EmptyPmsState title="No perio measurements yet" body="Start the exam by entering the first tooth and site. Measurements are stored per active perio exam and can be updated site by site." />}
          <form action={completeExamAction} className="mt-4 grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <input type="hidden" name="patientId" value={patient.id} />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Diagnosis / RDH assessment
              <textarea name="diagnosis" rows={3} defaultValue={perio.exam?.diagnosis ?? ""} className="rounded-2xl border border-neutral-300 px-4 py-3" placeholder="Localized Stage II periodontitis, bleeding controlled, maintenance interval reviewed." />
            </label>
            <button disabled={completed} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">
              {completed ? "Exam completed" : "Complete perio exam"}
            </button>
          </form>
        </PmsCard>

        <PmsCard title="Voice perio capture" eyebrow="Hands-free workflow">
          <PerioVoiceCapture patientId={patient.id} />
        </PmsCard>

        <PerioSignoffPanel
          patientId={patient.id}
          roleKey={role.key}
          defaultApprovalRole={role.key}
          signoffId={`PERIO-${patient.chartNumber || patient.id.slice(0, 8)}`}
        />
      </section>
    </FoundationShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-600">{detail}</p>
    </div>
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
