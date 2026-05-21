import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getPmsReports } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type ProviderReportRow = {
  providerName: string;
  appointmentCount: number;
  productionCents: number;
};

type AgingRow = {
  bucket: string;
  claimCount: number;
  exposureCents: number;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const reports = await getPmsReports();
  const collectionRate = reports.collections.chargesCents ? Math.round((reports.collections.paymentsCents / reports.collections.chargesCents) * 100) : 0;
  const showRate = reports.schedule.scheduled ? Math.round((reports.schedule.completed / reports.schedule.scheduled) * 100) : 0;

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS reports" title="Practice performance reports" body="Production, collections, schedule conversion, provider productivity, insurance receivables, and aging reports generated from PMS operational tables." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/reports" />
      <PmsSectionNav active="/app/pms/reports" roleKey={role.key} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="30-day scheduled production" value={<Money cents={reports.production.productionCents} />} detail="appointment production on the book" />
        <Metric label="Posted collections" value={<Money cents={reports.collections.paymentsCents} />} detail={`${collectionRate}% of posted charges`} />
        <Metric label="Schedule completion" value={`${showRate}%`} detail={`${reports.schedule.completed} of ${reports.schedule.scheduled} visits completed`} />
        <Metric label="Open insurance AR" value={<Money cents={reports.insurance.billedCents - reports.insurance.paidCents} />} detail={`${reports.insurance.openClaims} open claims`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <PmsCard title="Provider production" eyebrow="Last 30 days">
          {(reports.providers as ProviderReportRow[]).length ? (reports.providers as ProviderReportRow[]).map((row) => (
            <div key={row.providerName} className="mb-3 rounded-3xl bg-neutral-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{row.providerName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{row.appointmentCount} appointment(s)</p>
                </div>
                <p className="text-sm font-semibold text-neutral-950"><Money cents={row.productionCents} /></p>
              </div>
            </div>
          )) : <p className="text-sm leading-6 text-neutral-600">No provider production yet. Scheduled appointments will populate this report.</p>}
        </PmsCard>

        <PmsCard title="Claim aging" eyebrow="Open payer exposure">
          {(reports.aging as AgingRow[]).length ? (reports.aging as AgingRow[]).map((row) => (
            <div key={row.bucket} className="mb-3 rounded-3xl bg-neutral-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-950">{row.bucket} days</p>
                  <p className="mt-1 text-sm text-neutral-600">{row.claimCount} open claim(s)</p>
                </div>
                <p className="text-sm font-semibold text-neutral-950"><Money cents={row.exposureCents} /></p>
              </div>
            </div>
          )) : <p className="text-sm leading-6 text-neutral-600">No open insurance claim aging yet. Claims created from procedures will populate this report.</p>}
        </PmsCard>

        <PmsCard title="Collections summary" eyebrow="Ledger">
          <div className="grid gap-3 md:grid-cols-3">
            <SmallMetric label="Charges" value={<Money cents={reports.collections.chargesCents} />} />
            <SmallMetric label="Payments" value={<Money cents={reports.collections.paymentsCents} />} />
            <SmallMetric label="Balance" value={<Money cents={reports.collections.balanceCents} />} />
          </div>
        </PmsCard>

        <PmsCard title="Schedule reliability" eyebrow="Visit outcomes">
          <div className="grid gap-3 md:grid-cols-3">
            <SmallMetric label="Scheduled" value={reports.schedule.scheduled} />
            <SmallMetric label="Completed" value={reports.schedule.completed} />
            <SmallMetric label="Broken/no-show" value={reports.schedule.broken} />
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-neutral-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p><p className="mt-2 text-sm text-neutral-600">{detail}</p></div>;
}

function SmallMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-2 text-lg font-semibold text-neutral-950">{value}</p></div>;
}
