import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
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

type DailyAppointmentRow = {
  day: string;
  scheduled: number;
  completed: number;
  broken: number;
};

type DailyProductionRow = {
  day: string;
  scheduledCents: number;
  completedCents: number;
  restorativeCents: number;
  hygieneCents: number;
  otherCents: number;
};

type Reports = Awaited<ReturnType<typeof getPmsReports>>;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const reports = await getPmsReports(session.tenantId);
  const collectionRate = ratio(reports.collections.paymentsCents, reports.collections.chargesCents);
  const showRate = ratio(reports.schedule.completed, reports.schedule.scheduled);
  const restorativeAcceptance = ratio(reports.restorativeCase.acceptedCents, reports.restorativeCase.presentedCents);
  const hygieneAcceptance = ratio(reports.hygieneCase.acceptedCents, reports.hygieneCase.presentedCents);
  const hygieneReappointmentRate = ratio(reports.hygieneReappointment.reappointed, reports.hygieneReappointment.visits);
  const cancellationRate = ratio(reports.cancellations.cancelled, reports.cancellations.scheduled);
  const noShowRate = ratio(reports.noShows.noShows, reports.noShows.scheduled);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="PMS performance intelligence"
        title="Practice performance dashboard"
        body="Production, schedule reliability, unscheduled patients, case acceptance, hygiene reappointment, new-patient flow, provider productivity, and insurance aging generated from PMS records."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/reports" />
      <PmsSectionNav active="/app/pms/reports" roleKey={role.key} />

      <section className="grid gap-3 lg:grid-cols-3">
        <TopMetric label="Prior day production" value={<Money cents={reports.productionTiles.priorDayProductionCents} />} trend={reports.productionTiles.priorDayProductionCents >= 0 ? "up" : "down"} />
        <TopMetric label="Today's scheduled production" value={<Money cents={reports.productionTiles.todayScheduledProductionCents} />} trend={reports.productionTiles.todayScheduledProductionCents > 0 ? "up" : "flat"} />
        <TopMetric label="Tomorrow's scheduled production" value={<Money cents={reports.productionTiles.tomorrowScheduledProductionCents} />} trend={reports.productionTiles.tomorrowScheduledProductionCents > 0 ? "up" : "down"} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <PerformanceCard
          eyebrow="Appointments"
          title="Scheduled vs completed"
          status={showRate >= 85 ? "up" : showRate >= 70 ? "flat" : "down"}
          footer={[
            ["Goal", reports.schedule.scheduled],
            ["Scheduled", reports.schedule.scheduled],
            ["Completed", reports.schedule.completed],
            ["Broken", reports.schedule.broken],
          ]}
        >
          <StackedBarChart rows={reports.dailyAppointments as DailyAppointmentRow[]} valueA="completed" valueB="scheduled" />
        </PerformanceCard>

        <PerformanceCard
          eyebrow="Production"
          title="Scheduled vs completed production"
          status={reports.production.completedCents >= reports.production.productionCents * 0.75 ? "up" : "flat"}
          footer={[
            ["Gross", <Money key="gross" cents={reports.production.completedCents} />],
            ["Scheduled", <Money key="scheduled" cents={reports.production.productionCents} />],
            ["Adjustment", <Money key="adjustment" cents={reports.collections.chargesCents - reports.collections.paymentsCents} />],
            ["Net", <Money key="net" cents={reports.collections.paymentsCents} />],
          ]}
        >
          <ProductionBarChart rows={reports.dailyProduction as DailyProductionRow[]} />
        </PerformanceCard>

        <PerformanceCard
          eyebrow="Unscheduled patients"
          title="Active-patient opportunity"
          status={reports.unscheduled.unscheduledActivePatients ? "up" : "flat"}
          footer={[
            ["Unscheduled active", reports.unscheduled.unscheduledActivePatients],
            ["Opportunity", <Money key="opp" cents={reports.unscheduled.unscheduledOpportunityCents} />],
            ["Annual opportunity", <Money key="annual" cents={reports.unscheduled.annualOpportunityCents} />],
            ["Rescheduled", reports.unscheduled.rescheduledPatients],
          ]}
        >
          <OpportunityDonut reports={reports} />
        </PerformanceCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <CaseCard
          title="Restorative / elective case"
          averageLabel="Avg / exam"
          averageValue={reports.restorativeCase.examCount ? Math.round(reports.restorativeCase.presentedCents / reports.restorativeCase.examCount) : 0}
          diagnosticRate={ratio(reports.restorativeCase.caseCount, Math.max(reports.restorativeCase.examCount, 1))}
          acceptanceRate={restorativeAcceptance}
          presentedCents={reports.restorativeCase.presentedCents}
          acceptedCents={reports.restorativeCase.acceptedCents}
        />
        <CaseCard
          title="Hygiene case"
          averageLabel="Avg / visit"
          averageValue={reports.hygieneCase.visitCount ? Math.round(reports.hygieneCase.presentedCents / reports.hygieneCase.visitCount) : 0}
          diagnosticRate={ratio(reports.hygieneCase.caseCount, Math.max(reports.hygieneCase.visitCount, 1))}
          acceptanceRate={hygieneAcceptance}
          presentedCents={reports.hygieneCase.presentedCents}
          acceptedCents={reports.hygieneCase.acceptedCents}
        />
        <PerformanceCard
          eyebrow="New patients"
          title="Net patient growth"
          status={reports.newPatients.growth >= 0 ? "up" : "down"}
          footer={[
            ["New", reports.newPatients.newCount],
            ["Recaptured", reports.newPatients.recapturedCount],
            ["Lost", reports.newPatients.lostCount],
            ["Growth", reports.newPatients.growth],
          ]}
        >
          <Gauge value={reports.newPatients.newCount} goal={9} label={String(reports.newPatients.newCount)} />
        </PerformanceCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <PerformanceCard
          eyebrow="Hygiene reappointment"
          title="Reappointed before leaving"
          status={hygieneReappointmentRate >= reports.hygieneReappointment.goalPercent ? "up" : "flat"}
          footer={[
            ["Visits", reports.hygieneReappointment.visits],
            ["Reappointed", reports.hygieneReappointment.reappointed],
            ["Unscheduled", reports.hygieneReappointment.unscheduled],
          ]}
        >
          <Gauge value={hygieneReappointmentRate} goal={reports.hygieneReappointment.goalPercent} label={`${hygieneReappointmentRate}%`} />
        </PerformanceCard>
        <PerformanceCard
          eyebrow="Cancellations"
          title="Cancellation control"
          status={cancellationRate <= 5 ? "up" : cancellationRate <= 10 ? "flat" : "down"}
          footer={[
            ["Scheduled", reports.cancellations.scheduled],
            ["Cancelled", reports.cancellations.cancelled],
            ["Unscheduled", reports.cancellations.unscheduled],
          ]}
        >
          <Gauge value={cancellationRate} goal={5} label={`${cancellationRate}%`} inverse />
        </PerformanceCard>
        <PerformanceCard
          eyebrow="No-shows"
          title="No-show control"
          status={noShowRate <= 5 ? "up" : noShowRate <= 10 ? "flat" : "down"}
          footer={[
            ["Scheduled", reports.noShows.scheduled],
            ["No-shows", reports.noShows.noShows],
            ["Unscheduled", reports.noShows.unscheduled],
          ]}
        >
          <Gauge value={noShowRate} goal={5} label={`${noShowRate}%`} inverse />
        </PerformanceCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <PmsCard title="Provider production" eyebrow="Last 30 days">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Appointments</th>
                  <th className="px-3 py-2">Scheduled production</th>
                  <th className="px-3 py-2">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(reports.providers as ProviderReportRow[]).map((row) => {
                  const share = ratio(row.productionCents, reports.production.productionCents);
                  return (
                    <tr key={row.providerName}>
                      <td className="px-3 py-3 font-semibold text-neutral-950">{row.providerName}</td>
                      <td className="px-3 py-3 text-neutral-700">{row.appointmentCount}</td>
                      <td className="px-3 py-3 text-neutral-700"><Money cents={row.productionCents} /></td>
                      <td className="px-3 py-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-neutral-200">
                          <div className="h-full bg-cyan-600" style={{ width: `${Math.min(100, share)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PmsCard>

        <PmsCard title="Insurance aging" eyebrow="Open payer exposure">
          {(reports.aging as AgingRow[]).length ? (
            <div className="grid gap-3">
              {(reports.aging as AgingRow[]).map((row) => (
                <div key={row.bucket} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">{row.bucket} days</p>
                      <p className="mt-1 text-xs text-neutral-600">{row.claimCount} open claim(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-neutral-950"><Money cents={row.exposureCents} /></p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm leading-6 text-neutral-600">No open insurance claim aging.</p>}
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-4">
        <SmallMetric label="Posted charges" value={<Money cents={reports.collections.chargesCents} />} />
        <SmallMetric label="Posted payments" value={<Money cents={reports.collections.paymentsCents} />} />
        <SmallMetric label="Collection rate" value={`${collectionRate}%`} />
        <SmallMetric label="Open insurance AR" value={<Money cents={reports.insurance.billedCents - reports.insurance.paidCents} />} />
      </section>
    </FoundationShell>
  );
}

function TopMetric({ label, value, trend }: { label: string; value: React.ReactNode; trend: "up" | "down" | "flat" }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-neutral-600">{label}</p>
        <TrendDot trend={trend} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
    </div>
  );
}

function PerformanceCard({ eyebrow, title, status, children, footer }: { eyebrow: string; title: string; status: "up" | "down" | "flat"; children: React.ReactNode; footer: Array<[string, React.ReactNode]> }) {
  return (
    <section className="min-w-0 rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{eyebrow}</p>
          <h2 className="mt-1 text-sm font-semibold text-neutral-950">{title}</h2>
        </div>
        <TrendDot trend={status} />
      </div>
      <div className="p-4">{children}</div>
      <div className="grid grid-cols-2 border-t border-neutral-100 text-center text-xs md:grid-cols-4">
        {footer.map(([label, value]) => (
          <div key={label} className="border-r border-neutral-100 px-2 py-3 last:border-r-0">
            <p className="text-neutral-500">{label}</p>
            <p className="mt-1 font-semibold text-neutral-950">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CaseCard({ title, averageLabel, averageValue, diagnosticRate, acceptanceRate, presentedCents, acceptedCents }: { title: string; averageLabel: string; averageValue: number; diagnosticRate: number; acceptanceRate: number; presentedCents: number; acceptedCents: number }) {
  return (
    <PerformanceCard
      eyebrow="Case acceptance"
      title={title}
      status={acceptanceRate >= 65 ? "up" : acceptanceRate >= 40 ? "flat" : "down"}
      footer={[
        ["Presented", <Money key="presented" cents={presentedCents} />],
        ["Accepted", <Money key="accepted" cents={acceptedCents} />],
        ["Accepted", `${acceptanceRate}%`],
      ]}
    >
      <div className="grid gap-4">
        <Gauge value={Math.max(diagnosticRate, acceptanceRate)} goal={80} label={<><span className="block text-[11px] font-medium text-neutral-500">{averageLabel}</span><Money cents={averageValue} /></>} />
        <div className="grid gap-3 text-xs">
          <Progress label="Diagnostic" value={diagnosticRate} />
          <Progress label="Acceptance" value={acceptanceRate} />
        </div>
      </div>
    </PerformanceCard>
  );
}

function StackedBarChart({ rows, valueA, valueB }: { rows: DailyAppointmentRow[]; valueA: "completed"; valueB: "scheduled" }) {
  const max = Math.max(1, ...rows.map((row) => row[valueB]));
  return (
    <div className="flex h-44 items-end gap-2 border-b border-neutral-200 px-1">
      {rows.map((row) => {
        const scheduledHeight = Math.max(4, Math.round((row[valueB] / max) * 132));
        const completedHeight = Math.max(0, Math.round((row[valueA] / max) * 132));
        return (
          <div key={row.day} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div className="relative flex w-full max-w-10 items-end justify-center">
              <div className="w-full rounded-t-sm bg-cyan-100" style={{ height: scheduledHeight }} />
              <div className="absolute bottom-0 w-full rounded-t-sm bg-cyan-700" style={{ height: completedHeight }} />
            </div>
            <p className="text-[10px] text-neutral-500">{shortDay(row.day)}</p>
          </div>
        );
      })}
    </div>
  );
}

function ProductionBarChart({ rows }: { rows: DailyProductionRow[] }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.scheduledCents, row.completedCents)));
  return (
    <div className="flex h-44 items-end gap-2 border-b border-neutral-200 px-1">
      {rows.map((row) => {
        const scheduledHeight = Math.max(4, Math.round((row.scheduledCents / max) * 132));
        const completedHeight = Math.max(0, Math.round((row.completedCents / max) * 132));
        return (
          <div key={row.day} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div className="relative flex w-full max-w-10 items-end justify-center">
              <div className="w-full rounded-t-sm bg-sky-100" style={{ height: scheduledHeight }} />
              <div className="absolute bottom-0 w-full rounded-t-sm bg-blue-700" style={{ height: completedHeight }} />
            </div>
            <p className="text-[10px] text-neutral-500">{shortDay(row.day)}</p>
          </div>
        );
      })}
    </div>
  );
}

function OpportunityDonut({ reports }: { reports: Reports }) {
  const buckets = ["0-6", "6-9", "9-12", "12-18", "18-24"];
  const total = Math.max(1, reports.unscheduled.buckets.reduce((sum, row) => sum + row.patientCount, 0));
  let offset = 0;
  const colors = ["#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985"];
  const gradient = buckets.map((bucket, index) => {
    const row = reports.unscheduled.buckets.find((item) => item.bucket === bucket);
    const span = ((row?.patientCount ?? 0) / total) * 100;
    const segment = `${colors[index]} ${offset}% ${offset + span}%`;
    offset += span;
    return segment;
  }).join(", ");
  return (
    <div className="grid gap-4">
      <div className="mx-auto grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient || "#e5e7eb 0 100%"})` }}>
        <div className="grid size-20 place-items-center rounded-full bg-white text-center">
          <p className="text-[10px] leading-3 text-neutral-500">Months since<br />last visit</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-neutral-600">
        {buckets.map((bucket) => <p key={bucket}>{bucket}</p>)}
      </div>
    </div>
  );
}

function Gauge({ value, goal, label, inverse = false }: { value: number; goal: number; label: React.ReactNode; inverse?: boolean }) {
  const percent = inverse ? Math.max(0, 100 - Math.min(100, value)) : Math.min(100, goal ? (value / goal) * 100 : value);
  return (
    <div className="mx-auto grid size-36 place-items-center rounded-full bg-neutral-100" style={{ background: `conic-gradient(#0077c8 0 ${percent}%, #e6eef2 ${percent}% 100%)` }}>
      <div className="grid size-24 place-items-center rounded-full bg-white text-center">
        <p className="text-lg font-semibold text-neutral-950">{label}</p>
        <p className="text-[10px] text-emerald-700">Goal {goal}%</p>
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-2">
        <span className="text-neutral-600">{label}</span>
        <span className="font-semibold text-neutral-950">{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-cyan-600" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function TrendDot({ trend }: { trend: "up" | "down" | "flat" }) {
  const classes = trend === "up" ? "bg-emerald-600" : trend === "down" ? "bg-red-700" : "bg-neutral-400";
  const symbol = trend === "up" ? "↑" : trend === "down" ? "↓" : "•";
  return <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${classes}`}>{symbol}</span>;
}

function SmallMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-2 text-lg font-semibold text-neutral-950">{value}</p></div>;
}

function ratio(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function shortDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
