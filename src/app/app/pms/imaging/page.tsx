import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createImagingStudy, listImagingStudies, listPatients, listProviders } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type ImagingRow = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  providerName: string | null;
  studyType: string;
  acquisitionStatus: string;
  tooth: string | null;
  region: string | null;
  dicomStudyUid: string | null;
  storageUri: string | null;
  findings: string | null;
  aiReviewStatus: string;
  takenAt: string | null;
};

async function createImagingAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createImagingStudy({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    providerId: String(formData.get("providerId") ?? ""),
    studyType: String(formData.get("studyType") ?? ""),
    acquisitionStatus: String(formData.get("acquisitionStatus") ?? "ORDERED"),
    tooth: String(formData.get("tooth") ?? ""),
    region: String(formData.get("region") ?? ""),
    dicomStudyUid: String(formData.get("dicomStudyUid") ?? ""),
    storageUri: String(formData.get("storageUri") ?? ""),
    findings: String(formData.get("findings") ?? ""),
    aiReviewStatus: String(formData.get("aiReviewStatus") ?? "NOT_REQUESTED"),
    takenAt: String(formData.get("takenAt") ?? ""),
  });
  revalidatePath("/app/pms/imaging");
}

export default async function ImagingPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [studies, patients, providers] = await Promise.all([listImagingStudies(session.tenantId), listPatients(session.tenantId), listProviders(session.tenantId)]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS imaging" title="Imaging orders and clinical image record" body="Track x-rays, CBCT, intraoral photos, DICOM study IDs, findings, and provider review status from the patient chart." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/imaging" />
      <PmsSectionNav active="/app/pms/imaging" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Add imaging study" eyebrow="Clinical acquisition">
          <form action={createImagingAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Provider<select name="providerId" className="rounded-2xl border border-neutral-300 px-4 py-3"><option value="">Unassigned</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="studyType" label="Study type" options={["BITEWING", "PERIAPICAL", "PANORAMIC", "CBCT", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO"]} />
              <Select name="acquisitionStatus" label="Status" options={["ORDERED", "ACQUIRED", "REVIEWED", "NEEDS_RETAKE"]} />
              <Input name="tooth" label="Tooth" />
              <Input name="region" label="Region" />
              <Input name="takenAt" label="Taken at" type="datetime-local" />
              <Select name="aiReviewStatus" label="AI review" options={["NOT_REQUESTED", "REQUESTED", "REVIEWED", "PROVIDER_ACCEPTED", "PROVIDER_REJECTED"]} />
            </div>
            <Input name="dicomStudyUid" label="DICOM study UID" />
            <Input name="storageUri" label="Storage URI" />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">Findings<textarea name="findings" rows={4} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
            <button disabled={!patients.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Save imaging study</button>
          </form>
        </PmsCard>

        <PmsCard title="Imaging worklist" eyebrow="Chart-linked imaging">
          {studies.length ? (studies as ImagingRow[]).map((study) => (
            <div key={study.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{study.studyType.replaceAll("_", " ")} · {study.lastName}, {study.firstName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{study.chartNumber} · {study.providerName ?? "provider unassigned"} · {study.tooth ? `tooth ${study.tooth}` : study.region ?? "region not recorded"}</p>
                </div>
                <StatusFor value={study.acquisitionStatus} />
              </div>
              <p className="mt-3 text-sm text-neutral-700">AI review: {study.aiReviewStatus.replaceAll("_", " ").toLowerCase()} · DICOM: {study.dicomStudyUid ?? "not recorded"}</p>
              {study.findings ? <p className="mt-2 text-sm leading-6 text-neutral-600">{study.findings}</p> : null}
            </div>
          )) : <EmptyPmsState title="No imaging studies recorded" body="Add ordered or acquired images from the patient chart. DICOM IDs, findings, AI review status, and storage links persist here." />}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>;
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<select name={name} className="rounded-2xl border border-neutral-300 px-4 py-3">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}
