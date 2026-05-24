import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { addTreatmentPlanItem, createTreatmentPlan, listPatients, listProcedureCodes, listProviders, listTreatmentPlans, updateTreatmentPlanStatus } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type TreatmentPlanRow = {
  id: string;
  name: string;
  chartNumber: string;
  lastName: string;
  firstName: string;
  providerName: string | null;
  status: string;
  totalFeeCents: number;
  insuranceEstimateCents: number;
  patientEstimateCents: number;
  itemCount: number;
  acceptedItemCount: number;
};

async function createPlanAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createTreatmentPlan({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? ""),
    providerId: String(formData.get("providerId") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    presentationNote: String(formData.get("presentationNote") ?? ""),
  });
  revalidatePath("/app/pms/treatment-plans");
}

async function addItemAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await addTreatmentPlanItem({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    treatmentPlanId: String(formData.get("treatmentPlanId") ?? ""),
    procedureCodeId: String(formData.get("procedureCodeId") ?? ""),
    phase: Number(formData.get("phase") ?? 1),
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
  });
  revalidatePath("/app/pms/treatment-plans");
}

async function acceptPlanAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await updateTreatmentPlanStatus(String(formData.get("treatmentPlanId") ?? ""), "ACCEPTED", session.roleKey, session.tenantId);
  revalidatePath("/app/pms/treatment-plans");
  revalidatePath("/app/pms/tasks");
}

export default async function TreatmentPlansPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [plans, patients, procedureCodes, providers] = await Promise.all([listTreatmentPlans(session.tenantId), listPatients(session.tenantId), listProcedureCodes(session.tenantId), listProviders(session.tenantId)]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS treatment planning" title="Treatment plan builder" body="Create phased treatment plans from real procedure codes, estimate insurance and patient portions, accept cases, and hand off accepted treatment to scheduling." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/treatment-plans" />
      <PmsSectionNav active="/app/pms/treatment-plans" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="grid gap-6">
          <PmsCard title="Create treatment plan" eyebrow="Case presentation">
            <form action={createPlanAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Patient<select name="patientId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Provider<select name="providerId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName} · {provider.providerType}</option>)}</select></label>
              <Input name="name" label="Plan name" required />
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Presentation note<textarea name="presentationNote" rows={4} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>
              <button disabled={!providers.length} className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">Create plan</button>
            </form>
          </PmsCard>

          <PmsCard title="Add procedure to plan" eyebrow="Phased sequencing">
            <form action={addItemAction} className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Plan<select name="treatmentPlanId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{(plans as TreatmentPlanRow[]).map((plan) => <option key={plan.id} value={plan.id}>{plan.lastName}, {plan.firstName} · {plan.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-semibold text-neutral-700">Procedure<select name="procedureCodeId" required className="rounded-2xl border border-neutral-300 px-4 py-3">{procedureCodes.map((code) => <option key={code.id} value={code.id}>{code.code} · {code.description}</option>)}</select></label>
              <div className="grid grid-cols-3 gap-3">
                <Input name="phase" label="Phase" type="number" />
                <Input name="tooth" label="Tooth" />
                <Input name="surface" label="Surface" />
              </div>
              <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Add procedure</button>
            </form>
          </PmsCard>
        </div>

        <PmsCard title="Treatment plan pipeline" eyebrow="Acceptance and scheduling handoff">
          {plans.length ? (
            <div className="space-y-3">
              {(plans as TreatmentPlanRow[]).map((plan) => (
                <div key={plan.id} className="rounded-3xl bg-neutral-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-neutral-950">{plan.name}</p>
                      <p className="mt-1 text-sm text-neutral-600">{plan.lastName}, {plan.firstName} · {plan.chartNumber} · {plan.providerName ?? "provider unassigned"}</p>
                    </div>
                    <StatusFor value={plan.status} />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Metric label="Total" value={<Money cents={plan.totalFeeCents} />} />
                    <Metric label="Insurance est." value={<Money cents={plan.insuranceEstimateCents ?? 0} />} />
                    <Metric label="Patient est." value={<Money cents={plan.patientEstimateCents} />} />
                    <Metric label="Procedures" value={`${plan.itemCount} (${plan.acceptedItemCount} accepted)`} />
                  </div>
                  <form action={acceptPlanAction} className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                    <input type="hidden" name="treatmentPlanId" value={plan.id} />
                    <StatusPill tone={plan.status === "ACCEPTED" ? "green" : "amber"}>{plan.status === "ACCEPTED" ? "scheduling handoff created" : "ready for acceptance"}</StatusPill>
                    <button disabled={plan.status === "ACCEPTED"} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300">Accept plan</button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No treatment plans yet" body="Create a plan, add procedure-code items, then accept it. Accepted plans create a scheduling task and carry patient/insurance estimates." />
          )}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}
