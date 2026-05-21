import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { listLedger } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type LedgerRow = {
  id: string;
  description: string;
  lastName: string;
  firstName: string;
  postedAt: string;
  entryType: string;
  amountCents: number;
  balanceCents: number;
};

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const rows = await listLedger();
  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS ledger" title="Patient ledger" body="Charges, adjustments, insurance payments, patient payments, balances, and revenue integrity checks attach to the patient record." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/ledger" />
      <PmsSectionNav active="/app/pms/ledger" roleKey={role.key} />
      <PmsCard title="Ledger activity" eyebrow="Revenue operations">
        {rows.length ? (rows as LedgerRow[]).map((row) => (
          <div key={row.id} className="mb-3 rounded-3xl bg-neutral-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-950">{row.description}</p>
                <p className="mt-1 text-sm text-neutral-600">{row.lastName}, {row.firstName} · {new Date(row.postedAt).toLocaleDateString()}</p>
              </div>
              <StatusFor value={row.entryType} />
            </div>
            <p className="mt-3 text-sm text-neutral-700">Amount <Money cents={row.amountCents} /> · balance <Money cents={row.balanceCents} /></p>
          </div>
        )) : <EmptyPmsState title="No ledger entries yet" body="Completed procedures, claims, payments, adjustments, and patient balances will post here from PMS workflows." />}
      </PmsCard>
    </FoundationShell>
  );
}
