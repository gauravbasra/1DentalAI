import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { listInsurance } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type InsuranceRow = {
  id: string;
  payerName: string;
  planName: string;
  lastName: string;
  firstName: string;
  subscriberId: string;
  eligibilityStatus: string;
  annualMaxCents: number | null;
  annualUsedCents: number | null;
};

export default async function InsurancePage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const rows = await listInsurance();
  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS insurance" title="Insurance and benefits" body="Eligibility, benefits, plan limits, patient estimates, claims readiness, EOB review, and payer follow-up work from the patient record." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/insurance" />
      <PmsSectionNav active="/app/pms/insurance" roleKey={role.key} />
      <PmsCard title="Insurance worklist" eyebrow="Payer readiness">
        {rows.length ? (rows as InsuranceRow[]).map((row) => (
          <div key={row.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-950">{row.payerName} · {row.planName}</p>
                <p className="mt-1 text-sm text-neutral-600">{row.lastName}, {row.firstName} · subscriber {row.subscriberId}</p>
              </div>
              <StatusFor value={row.eligibilityStatus} />
            </div>
            <p className="mt-3 text-sm text-neutral-700">Annual max <Money cents={row.annualMaxCents ?? 0} /> · used <Money cents={row.annualUsedCents ?? 0} /></p>
          </div>
        )) : <EmptyPmsState title="No insurance plans connected to patients yet" body="Insurance records will hold payer identity, plan, subscriber relationship, eligibility status, benefits, limitations, and claim readiness." />}
      </PmsCard>
    </FoundationShell>
  );
}
