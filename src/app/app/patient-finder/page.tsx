import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createFollowUpFromRecipe,
  createPatientFinderFilter,
  getPatientFinderCenter,
  updatePatientFinderFollowUp,
} from "@/lib/patient-intelligence-repository";

export const dynamic = "force-dynamic";

type FilterRow = { id: string; name: string; description: string | null; goal: string; status: string; defaultOwnerRoleKey: string; lastResultCount: number };
type FollowUpRow = {
  id: string;
  firstName: string;
  lastName: string;
  chartNumber: string;
  phone: string | null;
  email: string | null;
  filterName: string | null;
  reason: string;
  sourceModule: string;
  priority: string;
  ownerRoleKey: string;
  status: string;
  recommendedChannel: string;
  dueAt: Date | string | null;
  attemptCount: number;
  lastAttemptOutcome: string | null;
  nextAction: string;
  opportunityCents: number;
};
type RecipeRow = { key: string; label: string; reason: string; priority: string; channel: string; patients: Array<{ id: string; firstName: string; lastName: string; chartNumber: string; phone: string | null; email: string | null; opportunityCents: string }> };

async function filterAction(formData: FormData) {
  "use server";
  await createPatientFinderFilter({
    name: String(formData.get("name") ?? ""),
    goal: String(formData.get("goal") ?? "SCHEDULE_RECOVERY"),
    description: String(formData.get("description") ?? ""),
    criteriaText: String(formData.get("criteriaText") ?? ""),
    defaultOwnerRoleKey: String(formData.get("defaultOwnerRoleKey") ?? "front_desk"),
  });
  revalidatePath("/app/patient-finder");
}

async function recipeAction(formData: FormData) {
  "use server";
  await createFollowUpFromRecipe({
    recipeKey: String(formData.get("recipeKey") ?? "unscheduled_hygiene"),
    patientId: String(formData.get("patientId") ?? ""),
    ownerRoleKey: String(formData.get("ownerRoleKey") ?? "front_desk"),
    nextAction: String(formData.get("nextAction") ?? "Contact patient and offer the best available scheduling option."),
  });
  revalidatePath("/app/patient-finder");
}

async function attemptAction(formData: FormData) {
  "use server";
  await updatePatientFinderFollowUp({
    id: String(formData.get("id") ?? ""),
    status: String(formData.get("status") ?? "OPEN"),
    outcome: String(formData.get("outcome") ?? "Attempt recorded"),
    actorRole: String(formData.get("actorRole") ?? "front_desk"),
  });
  revalidatePath("/app/patient-finder");
}

export default async function PatientFinderPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getPatientFinderCenter();
  const filters = center.filters as FilterRow[];
  const followUps = center.followUps as FollowUpRow[];
  const recipes = center.recipes as unknown as RecipeRow[];
  const open = followUps.filter((item) => item.status === "OPEN");
  const opportunity = open.reduce((sum, item) => sum + Number(item.opportunityCents ?? 0), 0);

  return (
    <FoundationShell active="/app/patient-finder" roleKey={role.key}>
      <PageHeader
        eyebrow="Patient Finder"
        title="Saved lists, perfect-fit follow-ups, and bulk scheduling work"
        body="This is the DI-style list engine: recare, unscheduled treatment, AR, broken appointments, and high-intent phone opportunities are derived from PMS records and converted into owner-assigned follow-ups with attempt history."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/patient-finder" />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Saved filters" value={filters.length} />
        <Metric label="Open follow-ups" value={open.length} />
        <Metric label="High priority" value={open.filter((item) => item.priority === "HIGH").length} />
        <Metric label="Open opportunity" value={<Money cents={opportunity} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <PmsCard title="Create saved filter" eyebrow="Tenant-editable criteria">
          <form action={filterAction} className="grid gap-3">
            <Input name="name" label="Filter name" required />
            <Select name="goal" label="Goal" options={["RECARE", "TREATMENT_ACCEPTANCE", "AR_COLLECTIONS", "SCHEDULE_RECOVERY", "PHONE_CONVERSION", "REPUTATION_RECOVERY"]} />
            <Select name="defaultOwnerRoleKey" label="Owner role" options={["front_desk", "treatment_coordinator", "billing_rcm", "marketing_growth", "practice_manager"]} />
            <Textarea name="description" label="Description" />
            <Textarea name="criteriaText" label="Criteria" required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Save filter</button>
          </form>
        </PmsCard>
        <PmsCard title="Saved filters" eyebrow="List library">
          <div className="grid gap-2 md:grid-cols-2">
            {filters.map((filter) => (
              <div key={filter.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{filter.name}</p>
                  <StatusFor value={filter.status} />
                </div>
                <p className="mt-1 text-xs text-neutral-600">{filter.goal.replaceAll("_", " ")} · owner {filter.defaultOwnerRoleKey.replaceAll("_", " ")}</p>
                {filter.description ? <p className="mt-2 text-xs leading-5 text-neutral-600">{filter.description}</p> : null}
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4">
        <PmsCard title="Opportunity recipes" eyebrow="Generate owner-assigned work from PMS criteria">
          <div className="grid gap-3 xl:grid-cols-5">
            {recipes.map((recipe) => (
              <div key={recipe.key} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-neutral-950">{recipe.label}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{recipe.reason}</p>
                <p className="mt-2 text-xs font-semibold text-neutral-500">{recipe.patients.length} candidates · {recipe.channel}</p>
                {recipe.patients[0] ? (
                  <form action={recipeAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="recipeKey" value={recipe.key} />
                    <input type="hidden" name="patientId" value={recipe.patients[0].id} />
                    <input type="hidden" name="ownerRoleKey" value={recipe.key === "ar_followup" ? "billing_rcm" : recipe.key === "unscheduled_treatment" ? "treatment_coordinator" : "front_desk"} />
                    <input type="hidden" name="nextAction" value={`Contact ${recipe.patients[0].firstName} ${recipe.patients[0].lastName}: ${recipe.reason}`} />
                    <button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-500">Create first follow-up</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4">
        <PmsCard title="Follow-up work queue" eyebrow="Attempt tracking and handoff">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Opportunity</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Attempt</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {followUps.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-neutral-950">{item.lastName}, {item.firstName}</p>
                      <p className="mt-1 text-xs text-neutral-500">{item.chartNumber} · {item.phone ?? item.email ?? "no contact"}</p>
                    </td>
                    <td className="max-w-xl px-3 py-3 text-xs leading-5 text-neutral-600">
                      <p className="font-semibold text-neutral-800">{item.filterName ?? item.sourceModule.replaceAll("_", " ")}</p>
                      <p className="mt-1">{item.reason}</p>
                      <p className="mt-1">{item.nextAction}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-neutral-600">{item.ownerRoleKey.replaceAll("_", " ")} · {item.recommendedChannel}</td>
                    <td className="px-3 py-3 font-semibold text-neutral-950"><Money cents={Number(item.opportunityCents ?? 0)} /></td>
                    <td className="px-3 py-3"><StatusFor value={item.status} /><p className="mt-2 text-xs text-neutral-500">{item.attemptCount} attempts</p></td>
                    <td className="px-3 py-3">
                      <div className="grid min-w-44 gap-2">
                        <AttemptButton id={item.id} actorRole={item.ownerRoleKey} status="OPEN" outcome="Left voicemail or staged approved message." label="Attempted" />
                        <AttemptButton id={item.id} actorRole={item.ownerRoleKey} status="SCHEDULED" outcome="Patient scheduled or booking link accepted." label="Scheduled" />
                        <AttemptButton id={item.id} actorRole={item.ownerRoleKey} status="CLOSED" outcome="No further follow-up needed." label="Close" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function AttemptButton({ id, actorRole, status, outcome, label }: { id: string; actorRole: string; status: string; outcome: string; label: string }) {
  return <form action={attemptAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="actorRole" value={actorRole} /><input type="hidden" name="status" value={status} /><input type="hidden" name="outcome" value={outcome} /><button className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{label}</button></form>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} required={required} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={3} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}
