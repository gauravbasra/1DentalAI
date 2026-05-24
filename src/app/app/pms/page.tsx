import Link from "next/link";
import type { ReactNode } from "react";
import { StatusPill } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole } from "@/lib/foundation-data";
import { getInsuranceBoard, getLedgerBoard, getPmsDashboard, getPmsDataSourceStatus, getPracticeIntelligence, listLabCases, listPatients, listSchedule, listTasks } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export default async function PmsCommandPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [dashboard, dataSource, intelligence, schedule, patients, tasks, insurance, ledger, labs] = await Promise.all([
    getPmsDashboard(session.tenantId),
    getPmsDataSourceStatus(session.tenantId),
    getPracticeIntelligence(session.tenantId),
    listSchedule(session.tenantId),
    listPatients(session.tenantId),
    listTasks(session.tenantId, role.key),
    getInsuranceBoard(session.tenantId),
    getLedgerBoard(session.tenantId),
    listLabCases(session.tenantId),
  ]);

  const readinessItems = [
    { label: "Patients not ready", value: schedule.filter((item) => item.readinessStatus !== "READY").length },
    { label: "Coverage review", value: insurance.coverage.filter((item) => String(item.eligibilityStatus) !== "ACTIVE").length },
    { label: "Open lab cases", value: labs.filter((item) => !["DELIVERED", "CANCELED"].includes(String(item.status))).length },
    { label: "Claim queue", value: ledger.claims.length },
  ];

  return (
    <main className="pe-shell min-h-screen bg-[#f4f6f7] text-neutral-950">
      <div className="flex min-h-screen">
        <PmsGlobalRail roleKey={role.key} />
        <PmsProductRail roleKey={role.key} dashboard={dashboard} readinessItems={readinessItems} />

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-5 border-b border-neutral-200 bg-white px-6">
            <Link href="/wrapper" className="text-2xl font-black tracking-tight">1DentalAI</Link>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Cloud PMS</p>
              <h1 className="truncate text-xl font-black tracking-tight text-neutral-950">Practice command center</h1>
            </div>
            <div className="hidden max-w-xl flex-1 lg:block">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">⌕</span>
                <input className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100" placeholder="Search patients, schedule, CDT codes, claims, balances, labs" />
              </div>
            </div>
            <Link href={`/app/pms/schedule?role=${role.key}`} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">Schedule</Link>
            <Link href="/logout" className="rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white">Sign out</Link>
          </header>
          <MobilePmsDock roleKey={role.key} />

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-[1800px]">
              <PmsSourceBanner dataSource={dataSource} />
              <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Operating flow</p>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-700">
                    Same console pattern as the Phone app: work queues on the left, patient and chair flow in the center, financial and clinical risk on the right. This is not a marketing wrapper.
                  </p>
                </section>
                <section className="grid gap-3 sm:grid-cols-4">
                  {readinessItems.map((item) => (
                    <Link key={item.label} href={item.label.includes("Coverage") ? `/app/pms/insurance?role=${role.key}` : item.label.includes("lab") ? `/app/pms/labs?role=${role.key}` : `/app/pms/schedule?role=${role.key}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-cyan-300 hover:bg-cyan-50">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-black text-neutral-950">{item.value}</p>
                    </Link>
                  ))}
                </section>
              </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Patients" value={dashboard.activePatients} detail="active charts" />
        <Metric label="Today" value={dashboard.todayAppointments} detail={<Money cents={dashboard.todayProductionCents} />} />
        <Metric label="Role tasks" value={tasks.length} detail={role.title} />
        <Metric label="Claims" value={dashboard.openClaimCount} detail={<Money cents={dashboard.claimExposureCents} />} />
        <Metric label="Balances" value={<Money cents={dashboard.patientBalanceCents} />} detail={`${ledger.patientCountWithBalance} patients`} />
        <Metric label="Codes" value={dashboard.procedureCodeCount} detail="fee schedule" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <PmsCard title="Practice intelligence" eyebrow="Revenue, schedule capacity, provider pace">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {intelligence.insights.map((insight) => (
              <InsightCard key={insight.label} insight={insight} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <ChartCard title="14-day production" rows={intelligence.productionTrend} valueKey="scheduledCents" labelKey="day" format="money" secondaryKey="completedCents" />
            <ChartCard title="8-week booked production" rows={intelligence.calendarForecast} valueKey="scheduledCents" labelKey="weekStart" format="money" detailKey="appointmentCount" detailSuffix="visits" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {intelligence.bookedProductionHorizon.map((row) => (
              <div key={row.horizon} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{row.horizon}</p>
                <p className="mt-2 text-xl font-semibold text-neutral-950"><Money cents={row.scheduledCents} /></p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{row.appointmentCount} visits · {Math.round(row.bookedMinutes / 60)} chair hours · {row.providerCount} providers · {row.roomCount} rooms</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Booked capacity" eyebrow="Rooms and calendar time">
          <div className="space-y-3">
            {intelligence.roomUtilization.map((room) => (
              <div key={room.operatoryId ?? room.roomName} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{room.roomName}</p>
                    <p className="mt-1 text-xs text-neutral-600">{room.appointmentCount} visits · {Math.round(room.bookedMinutes / 60)} booked hours · booked until {shortDate(room.bookedUntil)}</p>
                  </div>
                  <p className="text-sm font-semibold text-neutral-950">{room.utilizationPercent}%</p>
                </div>
                <Bar value={room.utilizationPercent} max={100} tone={room.utilizationPercent > 85 ? "amber" : "cyan"} />
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <PmsCard title="Service revenue and calendar share" eyebrow="What earns, what consumes chair time">
          <RankedBars
            rows={intelligence.serviceMix}
            label={(row) => row.serviceLine}
            value={(row) => row.last90RevenueCents || row.scheduledCents}
            detail={(row) => `${moneyText(row.last90RevenueCents)} actual · ${moneyText(row.scheduledCents)} booked · ${Math.round(row.bookedMinutes / 60)}h`}
          />
        </PmsCard>

        <PmsCard title="Provider production pace" eyebrow="Next 30 days">
          <RankedBars
            rows={intelligence.providerProduction}
            label={(row) => row.providerName}
            value={(row) => row.scheduledCents || row.last30RevenueCents}
            detail={(row) => `${moneyText(row.last30RevenueCents)} actual · ${moneyText(row.scheduledCents)} booked · ${row.completedProcedureCount} procedures`}
          />
        </PmsCard>

        <PmsCard title="Payer mix and denial drag" eyebrow="Claims and collections signal">
          <RankedBars
            rows={intelligence.payerMix}
            label={(row) => row.payerName}
            value={(row) => row.billedCents}
            detail={(row) => `${row.collectionRate}% collected · ${moneyText(row.openCents)} open · ${moneyText(row.patientDueCents)} patient due · ${row.denialCount} denials`}
          />
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_0.8fr_1.2fr]">
        <PmsCard title="Hygiene and recall health" eyebrow="Due, overdue, reappointed">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="Due recall" value={intelligence.hygieneRecall.dueCount} detail={`${intelligence.hygieneRecall.overdueCount} overdue`} />
            <MiniStat label="Unscheduled due" value={intelligence.hygieneRecall.unscheduledDueCount} detail={<Money cents={intelligence.hygieneRecall.recallOpportunityCents} />} />
            <MiniStat label="Future recall booked" value={intelligence.hygieneRecall.futureRecallBookedCount} detail="active patients" />
            <MiniStat label="Reappointment" value={`${intelligence.hygieneRecall.reappointmentRate}%`} detail={`${intelligence.hygieneRecall.hygieneReappointed30}/${intelligence.hygieneRecall.hygieneVisits30} visits`} />
          </div>
        </PmsCard>

        <PmsCard title="No-show/cancel impact" eyebrow="Last 30 days">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="Broken visits" value={intelligence.noShowCancelImpact.brokenCount} detail={`${intelligence.noShowCancelImpact.noShowCount} no-show · ${intelligence.noShowCancelImpact.cancelCount} cancel`} />
            <MiniStat label="Lost production" value={<Money cents={intelligence.noShowCancelImpact.lostProductionCents} />} detail="scheduled value" />
            <MiniStat label="Recovered" value={intelligence.noShowCancelImpact.recoveredCount} detail={<Money cents={intelligence.noShowCancelImpact.recoveredProductionCents} />} />
            <MiniStat label="Still unscheduled" value={intelligence.noShowCancelImpact.unscheduledPatientCount} detail="patients" />
          </div>
        </PmsCard>

        <PmsCard title="Rooms/provider production chart" eyebrow="Next 30 days">
          <RankedBars
            rows={intelligence.roomProviderProduction}
            label={(row) => `${row.roomName} / ${row.providerName}`}
            value={(row) => row.scheduledCents}
            detail={(row) => `${row.appointmentCount} visits · ${Math.round(row.bookedMinutes / 60)}h · ${moneyText(row.completedCents)} completed`}
          />
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr_0.9fr]">
        <PmsCard title="Today’s chair flow" eyebrow="Schedule">
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Visit</th>
                  <th className="px-3 py-2">Provider / room</th>
                  <th className="px-3 py-2">Readiness</th>
                  <th className="px-3 py-2 text-right">Prod.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {schedule.slice(0, 10).map((appt) => (
                  <tr key={appt.id} className="hover:bg-cyan-50/50">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-700">{time(appt.startsAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/app/pms/appointments/${appt.id}?role=${role.key}`} className="font-semibold text-neutral-950 hover:text-cyan-700">
                        {appt.patientName ?? "Held appointment"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{appt.appointmentType}</td>
                    <td className="px-3 py-2 text-neutral-600">{appt.providerName ?? "unassigned"} / {appt.operatoryName ?? "room"}</td>
                    <td className="px-3 py-2"><StatusFor value={appt.readinessStatus} /></td>
                    <td className="px-3 py-2 text-right font-semibold"><Money cents={appt.productionCents} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>

        <PmsCard title="Readiness blockers" eyebrow="Work before patients arrive">
          <div className="grid gap-2">
            {readinessItems.map((item) => (
              <Link key={item.label} href={item.label.includes("Coverage") ? `/app/pms/insurance?role=${role.key}` : item.label.includes("lab") ? `/app/pms/labs?role=${role.key}` : `/app/pms/schedule?role=${role.key}`} className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 hover:bg-cyan-50">
                <span className="text-sm font-medium text-neutral-700">{item.label}</span>
                <span className="text-lg font-semibold text-neutral-950">{item.value}</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Insurance queue</p>
            <div className="mt-2 grid gap-2">
              {insurance.claims.slice(0, 4).map((claim) => (
                <div key={String(claim.id)} className="rounded-md bg-neutral-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-neutral-900">{String(claim.claimNumber ?? claim.id)}</p>
                    <StatusFor value={String(claim.status)} />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{String(claim.payerName)} · <Money cents={Number(claim.billedCents ?? 0)} /></p>
                </div>
              ))}
            </div>
          </div>
        </PmsCard>

        <PmsCard title={`${role.title} work`} eyebrow="Assigned queue">
          {tasks.length ? (
            <div className="grid gap-2">
              {tasks.slice(0, 8).map((task) => (
                <Link key={task.id} href={`/app/pms/tasks?role=${role.key}`} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 hover:bg-cyan-50">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-950">{task.title}</p>
                    <StatusPill tone={task.priority === "HIGH" ? "red" : "amber"}>{task.priority}</StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{task.taskType.replaceAll("_", " ").toLowerCase()}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">No open tasks for this role.</div>
          )}
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <PmsCard title="Patient accounts" eyebrow="Balances and follow-up">
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                <tr><th className="px-3 py-2">Patient</th><th className="px-3 py-2">Chart</th><th className="px-3 py-2">Tasks</th><th className="px-3 py-2 text-right">Balance</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {patients.slice(0, 8).map((patient) => (
                  <tr key={patient.id} className="hover:bg-cyan-50/50">
                    <td className="px-3 py-2"><Link href={`/app/pms/patients/${patient.id}?role=${role.key}`} className="font-semibold text-neutral-950 hover:text-cyan-700">{patient.lastName}, {patient.firstName}</Link></td>
                    <td className="px-3 py-2 text-neutral-600">{patient.chartNumber}</td>
                    <td className="px-3 py-2 text-neutral-600">{patient.openTasks}</td>
                    <td className="px-3 py-2 text-right font-semibold"><Money cents={patient.balanceCents} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PmsCard>

        <PmsCard title="Lab and documentation risk" eyebrow="Assistant and billing handoff">
          <div className="grid gap-2">
            {labs.slice(0, 6).map((lab) => (
              <Link key={String(lab.id)} href={`/app/pms/labs?role=${role.key}`} className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 hover:bg-cyan-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{String(lab.caseType).replaceAll("_", " ")} · {String(lab.labName)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{lab.lastName ? `${String(lab.lastName)}, ${String(lab.firstName)}` : "practice case"} · due {lab.dueDate ? new Date(String(lab.dueDate)).toLocaleDateString() : "not set"}</p>
                  </div>
                  <StatusFor value={String(lab.status)} />
                </div>
              </Link>
            ))}
          </div>
        </PmsCard>
      </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PmsGlobalRail({ roleKey }: { roleKey: string }) {
  const items = [
    ["Command", "⌂", `/app/pms?role=${roleKey}`],
    ["Schedule", "◷", `/app/pms/schedule?role=${roleKey}`],
    ["Patients", "♙", `/app/pms/patients?role=${roleKey}`],
    ["Forms", "▤", `/app/pms/forms?role=${roleKey}`],
    ["Imaging", "▧", `/app/pms/imaging?role=${roleKey}`],
    ["Scribe", "✎", `/app/pms/scribe?role=${roleKey}`],
    ["Treat", "◇", `/app/pms/treatment-plans?role=${roleKey}`],
    ["Ledger", "$", `/app/pms/ledger?role=${roleKey}`],
    ["Insure", "▣", `/app/pms/insurance?role=${roleKey}`],
    ["Labs", "□", `/app/pms/labs?role=${roleKey}`],
    ["Reports", "▥", `/app/pms/reports?role=${roleKey}`],
  ];

  return (
    <aside className="hidden w-[92px] shrink-0 border-r border-neutral-200 bg-[#e9eef2] py-4 xl:block">
      <nav className="flex h-full flex-col items-center gap-2">
        {items.map(([label, icon, href]) => (
          <Link key={label} href={href} className="flex w-full flex-col items-center gap-1 px-2 py-2 text-center text-[11px] font-semibold text-neutral-600 hover:bg-white hover:text-cyan-700">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg shadow-sm">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function PmsProductRail({
  roleKey,
  dashboard,
  readinessItems,
}: {
  roleKey: string;
  dashboard: { activePatients: ReactNode; todayAppointments: ReactNode; openClaimCount: ReactNode };
  readinessItems: Array<{ label: string; value: ReactNode }>;
}) {
  const nav = [
    ["Command", "Live operating view", `/app/pms?role=${roleKey}`],
    ["Schedule", "Chair flow and holds", `/app/pms/schedule?role=${roleKey}`],
    ["Patients", "Chart and family record", `/app/pms/patients?role=${roleKey}`],
    ["Treatment", "Plans, CDT, case acceptance", `/app/pms/treatment-plans?role=${roleKey}`],
    ["Insurance", "Eligibility and claims", `/app/pms/insurance?role=${roleKey}`],
    ["Ledger", "Balances and payments", `/app/pms/ledger?role=${roleKey}`],
    ["Documents", "Forms, EOBs, referrals", `/app/pms/documents?role=${roleKey}`],
    ["Reports", "Production analytics", `/app/pms/reports?role=${roleKey}`],
  ];

  return (
    <aside className="hidden w-[286px] shrink-0 border-r border-neutral-200 bg-white lg:block">
      <div className="border-b border-neutral-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">PMS</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">Dental ops</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Patient record, schedule, chart, treatment, insurance, ledger, and reports in one work surface.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b border-neutral-200 p-4">
        <MiniRailMetric label="Patients" value={dashboard.activePatients} />
        <MiniRailMetric label="Today" value={dashboard.todayAppointments} />
        <MiniRailMetric label="Claims" value={dashboard.openClaimCount} />
      </div>
      <nav className="space-y-1 p-3">
        {nav.map(([label, description, href]) => (
          <Link key={label} href={href} className="block rounded-xl px-3 py-3 hover:bg-cyan-50">
            <p className="text-sm font-bold text-neutral-950">{label}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
          </Link>
        ))}
      </nav>
      <div className="mx-3 mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Readiness</p>
        <div className="mt-2 space-y-2">
          {readinessItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-amber-900">{item.label}</span>
              <span className="font-black text-amber-950">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MobilePmsDock({ roleKey }: { roleKey: string }) {
  const items = [
    ["Command", `/app/pms?role=${roleKey}`],
    ["Schedule", `/app/pms/schedule?role=${roleKey}`],
    ["Patients", `/app/pms/patients?role=${roleKey}`],
    ["Treat", `/app/pms/treatment-plans?role=${roleKey}`],
    ["Insurance", `/app/pms/insurance?role=${roleKey}`],
    ["Ledger", `/app/pms/ledger?role=${roleKey}`],
    ["Reports", `/app/pms/reports?role=${roleKey}`],
  ];

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
      {items.map(([label, href]) => (
        <Link key={label} href={href} className="shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-700">
          {label}
        </Link>
      ))}
    </nav>
  );
}

function PmsSourceBanner({
  dataSource,
}: {
  dataSource: {
    mode: string;
    samplePatientCount: number;
    lastSync: { source: string | null; importedPatients: string | null; importedAppointments: string | null; createdAt: string } | null;
    hasNexHealthCredential: boolean;
    hasOpenDentalCredential: boolean;
    nextAction: string;
  };
}) {
  const live = dataSource.mode === "LIVE_SYNCED";
  return (
    <section className={`mb-5 rounded-lg border px-4 py-3 shadow-sm ${live ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${live ? "text-emerald-800" : "text-amber-900"}`}>PMS data source</p>
          <h2 className={`mt-1 text-base font-black tracking-tight ${live ? "text-emerald-950" : "text-amber-950"}`}>
            {live
              ? `${dataSource.lastSync?.source ?? "Live PMS"} sync active`
              : dataSource.samplePatientCount > 0
                ? "Seeded PMS data is still visible"
                : "No live PMS records imported yet"}
          </h2>
          <p className={`mt-1 max-w-5xl text-sm leading-6 ${live ? "text-emerald-900" : "text-amber-950"}`}>{dataSource.nextAction}</p>
        </div>
        <div className="grid gap-2 text-right text-xs font-semibold sm:grid-cols-3">
          <span className="rounded-md bg-white/70 px-3 py-2">NexHealth {dataSource.hasNexHealthCredential ? "vaulted" : "missing"}</span>
          <span className="rounded-md bg-white/70 px-3 py-2">Open Dental {dataSource.hasOpenDentalCredential ? "vaulted" : "missing"}</span>
          <span className="rounded-md bg-white/70 px-3 py-2">{live ? `${dataSource.lastSync?.importedPatients ?? 0} patients` : `${dataSource.samplePatientCount} seeded patients`}</span>
        </div>
      </div>
    </section>
  );
}

function MiniRailMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-2 text-center">
      <p className="text-lg font-black text-neutral-950">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: { label: string; value: string; detail: string; tone: "green" | "amber" | "red" | "neutral" } }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-rose-200 bg-rose-50 text-rose-900",
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-900",
  };
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${tones[insight.tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-70">{insight.label}</p>
      <p className="mt-2 truncate text-base font-semibold">{insight.value}</p>
      <p className="mt-1 text-xs leading-5 opacity-80">{insight.detail}</p>
    </div>
  );
}

function ChartCard<T extends Record<string, unknown>>({
  title,
  rows,
  valueKey,
  labelKey,
  secondaryKey,
  detailKey,
  detailSuffix,
  format,
}: {
  title: string;
  rows: T[];
  valueKey: keyof T;
  labelKey: keyof T;
  secondaryKey?: keyof T;
  detailKey?: keyof T;
  detailSuffix?: string;
  format: "money" | "number";
}) {
  const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] ?? 0)));
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{title}</p>
      <div className="mt-3 flex h-40 items-end gap-1.5">
        {rows.map((row) => {
          const value = Number(row[valueKey] ?? 0);
          const secondary = secondaryKey ? Number(row[secondaryKey] ?? 0) : 0;
          return (
            <div key={String(row[labelKey])} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-28 w-full items-end rounded-sm bg-white ring-1 ring-neutral-200">
                <div
                  className="w-full rounded-sm bg-cyan-600"
                  style={{ height: `${Math.max(4, Math.round((value / max) * 100))}%` }}
                  title={`${String(row[labelKey])}: ${formatValue(value, format)}`}
                />
                {secondaryKey ? (
                  <div
                    className="-ml-full w-full rounded-sm bg-emerald-500/70"
                    style={{ height: `${Math.max(4, Math.round((secondary / max) * 100))}%` }}
                    title={`Completed ${formatValue(secondary, format)}`}
                  />
                ) : null}
              </div>
              <p className="w-full truncate text-center text-[10px] font-semibold text-neutral-500">{String(row[labelKey])}</p>
              {detailKey ? <p className="text-[10px] text-neutral-500">{String(row[detailKey] ?? 0)} {detailSuffix}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankedBars<T>({
  rows,
  label,
  value,
  detail,
}: {
  rows: T[];
  label: (row: T) => string;
  value: (row: T) => number;
  detail: (row: T) => ReactNode;
}) {
  const max = Math.max(1, ...rows.map((row) => value(row)));
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const amount = value(row);
        return (
          <div key={label(row)} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">{label(row)}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{detail(row)}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-neutral-950">{moneyText(amount)}</p>
            </div>
            <Bar value={amount} max={max} tone="cyan" />
          </div>
        );
      })}
    </div>
  );
}

function Bar({ value, max, tone }: { value: number; max: number; tone: "cyan" | "amber" }) {
  const color = tone === "amber" ? "bg-amber-500" : "bg-cyan-600";
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-neutral-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, Math.min(100, Math.round((value / Math.max(1, max)) * 100)))}%` }} />
    </div>
  );
}

function formatValue(value: number, format: "money" | "number") {
  return format === "money" ? moneyText(value) : String(value);
}

function moneyText(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(cents ?? 0) / 100);
}

function shortDate(value: string | null) {
  if (!value) return "not booked";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
