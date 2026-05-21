import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { listTreatmentPlans } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type TreatmentPlanRow = {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  providerName: string | null;
  status: string;
  totalFeeCents: number;
  patientEstimateCents: number;
};

export default async function TreatmentPlansPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const plans = await listTreatmentPlans();
  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS treatment" title="Treatment plans" body="Present, sequence, estimate, accept, and track treatment from diagnosis through scheduling, completion, claims, and patient balance." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/treatment-plans" />
      <PmsSectionNav active="/app/pms/treatment-plans" roleKey={role.key} />
      <PmsCard title="Treatment plan pipeline" eyebrow="Case acceptance">
        {plans.length ? (plans as TreatmentPlanRow[]).map((plan) => (
          <div key={plan.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-950">{plan.name}</p>
                <p className="mt-1 text-sm text-neutral-600">{plan.lastName}, {plan.firstName} · {plan.providerName ?? "provider unassigned"}</p>
              </div>
              <StatusFor value={plan.status} />
            </div>
            <p className="mt-3 text-sm text-neutral-700">Total <Money cents={plan.totalFeeCents} /> · patient estimate <Money cents={plan.patientEstimateCents} /></p>
          </div>
        )) : <EmptyPmsState title="No treatment plans yet" body="Plans will be created from charted findings and procedure codes, then flow to scheduling, insurance estimates, financing, and ledger." />}
      </PmsCard>
    </FoundationShell>
  );
}
