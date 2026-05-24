import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getMorningHuddle } from "@/lib/patient-intelligence-repository";

export const dynamic = "force-dynamic";

type SnapshotRow = { id: string; tab: string; label: string; valueText: string; detailText: string | null; sourceModule: string; drilldownRoute: string | null; ownerRoleKey: string | null };
type DayMetrics = Record<string, string>;
type OpeningRow = { day: string; openings: string; scheduledProductionCents: string };
type ProviderGoalRow = { id: string; displayName: string; providerType: string; dailyGoalCents: number; todayScheduledCents: number; scheduled30Cents: number; yesterdayProductionCents: number; last30RevenueCents: number; clinicalHours: number; readinessBlocks: number };
type ServiceLineRow = { serviceLine: string; yesterdayCents: number; todayScheduledCents: number; tomorrowScheduledCents: number; readinessBlocks: number };
type WorkQueueRow = { day: string; workType: string; patientId: string | null; firstName: string | null; lastName: string | null; eventAt: string | null; signal: string; opportunityCents: number; nextAction: string; route: string; ownerRoleKey: string };
type SuggestedPatientRow = { id: string; firstName: string; lastName: string; chartNumber: string; phone: string | null; email: string | null; suggestionType: string; reason: string; opportunityCents: number; nextAction: string };
type HuddleAnalytics = {
  hygieneRecall: { dueCount: number; overdueCount: number; unscheduledDueCount: number; recallOpportunityCents: number; hygieneVisits30: number; hygieneReappointed30: number; reappointmentRate: number };
  brokenImpact: { brokenCount: number; noShowCount: number; cancelCount: number; lostProductionCents: number; unscheduledPatientCount: number; recoveredCount: number; recoveredProductionCents: number };
  roomProviderProduction: Array<{ roomName: string; providerName: string; scheduledCents: number; bookedMinutes: number; appointmentCount: number }>;
};

export default async function HuddlePage({ searchParams }: { searchParams: Promise<{ role?: string; period?: string; startDate?: string; endDate?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const huddle = await getMorningHuddle(undefined, { period: params.period, startDate: params.startDate, endDate: params.endDate });
  const reportingWindow = huddle.reportingWindow;
  const snapshots = huddle.snapshots as SnapshotRow[];
  const openings = huddle.openings as OpeningRow[];
  const providerGoals = huddle.providerGoals as ProviderGoalRow[];
  const serviceLines = huddle.serviceLines as ServiceLineRow[];
  const workQueue = huddle.workQueue as WorkQueueRow[];
  const suggestedPatients = huddle.suggestedPatients as SuggestedPatientRow[];
  const analytics = huddle.analytics as HuddleAnalytics;

  return (
    <FoundationShell active="/app/huddle" roleKey={role.key}>
      <PageHeader
        eyebrow="Morning huddle"
        title="Yesterday, today, and tomorrow operating plan"
        body="A Dental Intelligence-style huddle should not be a poster of numbers. It connects yesterday's outcomes, today's readiness, tomorrow's openings, Patient Finder opportunities, RCM blockers, and follow-up ownership into work the team can execute."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/huddle" />

      <ReportingFilters
        basePath="/app/huddle"
        roleKey={role.key}
        period={reportingWindow.period}
        startDate={reportingWindow.startDate}
        endDate={reportingWindow.endDate}
        label="Huddle reporting window"
      />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Today scheduled" value={huddle.today.scheduledAppointments} detail={<Money cents={Number(huddle.today.scheduledProductionCents)} />} />
        <Metric label="Readiness blockers" value={huddle.today.readinessBlocks} detail={`${huddle.today.formsDue} forms due`} />
        <Metric label="Open follow-ups" value={huddle.followUps.openFollowUps} detail={`${huddle.followUps.highPriority} high priority`} />
        <Metric label="Opportunity" value={<Money cents={Number(huddle.followUps.opportunityCents)} />} detail="Patient Finder open dollars" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <HuddleColumn title="Yesterday" rows={snapshots.filter((row) => row.tab === "YESTERDAY")} metrics={huddle.yesterday} />
        <HuddleColumn title="Today" rows={snapshots.filter((row) => row.tab === "TODAY")} metrics={huddle.today} />
        <HuddleColumn title="Tomorrow" rows={snapshots.filter((row) => row.tab === "TOMORROW")} metrics={huddle.tomorrow} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PmsCard title="Provider goals and clinical hours" eyebrow="Live schedule and ledger pacing">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Goal pace</th><th className="px-3 py-2">Today</th><th className="px-3 py-2">30-day actual</th><th className="px-3 py-2">30-day booked</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Blocks</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {providerGoals.map((row) => {
                  const pace = percent(row.todayScheduledCents, row.dailyGoalCents);
                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-3 py-3"><p className="font-semibold text-neutral-950">{row.displayName}</p><p className="mt-1 text-xs text-neutral-500">{row.providerType}</p></td>
                      <td className="px-3 py-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-neutral-200"><div className="h-full bg-cyan-600" style={{ width: `${Math.min(100, pace)}%` }} /></div>
                        <p className="mt-1 text-xs text-neutral-500">{pace}% of <Money cents={row.dailyGoalCents} /></p>
                      </td>
                      <td className="px-3 py-3 font-semibold text-neutral-950"><Money cents={row.todayScheduledCents} /></td>
                      <td className="px-3 py-3 font-semibold text-neutral-950"><Money cents={row.last30RevenueCents} /></td>
                      <td className="px-3 py-3 text-neutral-700"><Money cents={row.scheduled30Cents} /></td>
                      <td className="px-3 py-3 text-neutral-700">{row.clinicalHours.toFixed(1)}</td>
                      <td className="px-3 py-3 text-neutral-700">{row.readinessBlocks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PmsCard>
        <PmsCard title="Service-line production" eyebrow="Yesterday actual, today/tomorrow scheduled">
          <div className="grid gap-2">
            {serviceLines.map((row) => (
              <div key={row.serviceLine} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-neutral-950">{row.serviceLine}</p>
                  <p className="text-xs text-neutral-500">{row.readinessBlocks} blocker(s)</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <MiniMoney label="Yesterday" cents={row.yesterdayCents} />
                  <MiniMoney label="Today" cents={row.todayScheduledCents} />
                  <MiniMoney label="Tomorrow" cents={row.tomorrowScheduledCents} />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <PmsCard title="Hygiene and recall" eyebrow="Reappointment and recare gap">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Due" value={analytics.hygieneRecall.dueCount} detail={`${analytics.hygieneRecall.overdueCount} overdue`} />
            <MiniMetric label="Unscheduled" value={analytics.hygieneRecall.unscheduledDueCount} detail={<Money cents={analytics.hygieneRecall.recallOpportunityCents} />} />
            <MiniMetric label="Reappointment" value={`${analytics.hygieneRecall.reappointmentRate}%`} detail={`${analytics.hygieneRecall.hygieneReappointed30}/${analytics.hygieneRecall.hygieneVisits30} hygiene visits`} />
            <MiniMetric label="Next action" value="Fill" detail="Use tomorrow openings before broad outreach." />
          </div>
        </PmsCard>
        <PmsCard title="No-show/cancel impact" eyebrow="Last 30 days">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Broken" value={analytics.brokenImpact.brokenCount} detail={`${analytics.brokenImpact.noShowCount} no-show · ${analytics.brokenImpact.cancelCount} cancel`} />
            <MiniMetric label="Lost prod." value={<Money cents={analytics.brokenImpact.lostProductionCents} />} detail="scheduled value" />
            <MiniMetric label="Recovered" value={analytics.brokenImpact.recoveredCount} detail={<Money cents={analytics.brokenImpact.recoveredProductionCents} />} />
            <MiniMetric label="Still unscheduled" value={analytics.brokenImpact.unscheduledPatientCount} detail="patients" />
          </div>
        </PmsCard>
        <PmsCard title="Room/provider production" eyebrow="Next 30 days">
          <div className="grid gap-2">
            {analytics.roomProviderProduction.map((row) => (
              <div key={`${row.roomName}-${row.providerName}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{row.roomName}</p>
                    <p className="mt-1 text-xs text-neutral-500">{row.providerName} · {row.appointmentCount} visits · {Math.round(row.bookedMinutes / 60)}h</p>
                  </div>
                  <p className="text-sm font-semibold text-neutral-950"><Money cents={row.scheduledCents} /></p>
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <PmsCard title="Huddle work queue" eyebrow="Today priorities and tomorrow fill">
          <div className="grid gap-2">
            {workQueue.map((item) => (
              <div key={`${item.day}-${item.workType}-${item.patientId}-${item.signal}`} className="grid gap-3 rounded-md border border-neutral-200 bg-white p-3 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">{item.day}</span>
                    <p className="text-sm font-semibold text-neutral-950">{item.workType}</p>
                    <p className="text-xs text-neutral-500">{item.ownerRoleKey.replaceAll("_", " ")}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">
                    {item.firstName ? `${item.lastName}, ${item.firstName}: ` : null}{item.signal}. {item.nextAction}
                  </p>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <p className="text-sm font-semibold text-neutral-950"><Money cents={item.opportunityCents} /></p>
                  <Link href={item.route} className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-500">Open</Link>
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Suggested patients" eyebrow="Unscheduled active-patient analysis">
          <div className="grid gap-2">
            {suggestedPatients.map((patient) => (
              <div key={`${patient.id}-${patient.suggestionType}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{patient.lastName}, {patient.firstName}</p>
                    <p className="mt-1 text-xs text-neutral-500">{patient.chartNumber} · {patient.phone ?? patient.email ?? "no contact"}</p>
                  </div>
                  <p className="text-sm font-semibold text-neutral-950"><Money cents={patient.opportunityCents} /></p>
                </div>
                <p className="mt-2 text-xs font-semibold text-neutral-700">{patient.suggestionType}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{patient.reason}. {patient.nextAction}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <PmsCard title="Perfect Time Slot opening map" eyebrow="Schedule fill intelligence">
          <div className="grid gap-3">
            {openings.map((row) => (
              <div key={row.day} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <p className="font-semibold text-neutral-950">{new Date(`${row.day}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
                <p className="text-neutral-600">{row.openings} openings</p>
                <p className="font-semibold text-neutral-950"><Money cents={Number(row.scheduledProductionCents)} /></p>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Daily handoff routes" eyebrow="Where the team works">
          <div className="grid gap-2 md:grid-cols-2">
            <RouteCard title="Patient Finder" href="/app/patient-finder" body="Build recare, treatment, AR, broken appointment, and high-intent phone follow-ups." />
            <RouteCard title="Online Booking" href="/app/pms/online-scheduling" body="Review public booking links, open slots, and PMS writeback audit." />
            <RouteCard title="RCM" href="/app/rcm" body="Clear eligibility, payer, attachment, denial, credentialing, and leakage blockers." />
            <RouteCard title="Reputation" href="/app/reputation" body="Approve review asks, inspect surveys, and block poor-experience requests." />
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function HuddleColumn({ title, rows, metrics }: { title: string; rows: SnapshotRow[]; metrics: DayMetrics }) {
  return (
    <PmsCard title={title} eyebrow="Huddle tab">
      <div className="grid gap-3">
        <div className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span>{key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}</span>
              <span className="font-semibold text-neutral-950">{String(value)}</span>
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-950">{row.label}</p>
              <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-cyan-800">{row.sourceModule}</span>
            </div>
            <p className="mt-1 text-xl font-semibold text-neutral-950">{row.valueText}</p>
            {row.detailText ? <p className="mt-1 text-xs leading-5 text-neutral-600">{row.detailText}</p> : null}
            {row.drilldownRoute ? <Link href={row.drilldownRoute} className="mt-3 inline-flex rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700">Open work</Link> : null}
          </div>
        ))}
      </div>
    </PmsCard>
  );
}

function RouteCard({ title, href, body }: { title: string; href: string; body: string }) {
  return <Link href={href} className="rounded-md border border-neutral-200 bg-neutral-50 p-3 transition hover:border-neutral-400"><p className="text-sm font-semibold text-neutral-950">{title}</p><p className="mt-1 text-xs leading-5 text-neutral-600">{body}</p></Link>;
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>;
}

function MiniMetric({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p><p className="mt-2 text-xl font-semibold text-neutral-950">{value}</p><p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p></div>;
}

function MiniMoney({ label, cents }: { label: string; cents: number }) {
  return <div><p className="text-neutral-500">{label}</p><p className="mt-1 font-semibold text-neutral-950"><Money cents={cents} /></p></div>;
}

function ReportingFilters({ basePath, roleKey, period, startDate, endDate, label }: { basePath: string; roleKey: string; period: string; startDate: string; endDate: string; label: string }) {
  return (
    <section className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Reporting filters</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">{label}</h2>
          <p className="mt-1 text-sm text-neutral-600">Showing {period} metrics from {new Date(`${startDate}T00:00:00`).toLocaleDateString()} to {new Date(`${endDate}T00:00:00`).toLocaleDateString()}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["daily", "Daily"],
            ["weekly", "Weekly"],
            ["monthly", "Monthly"],
          ].map(([value, text]) => (
            <Link key={value} href={`${basePath}?role=${roleKey}&period=${value}`} className={`rounded-md border px-3 py-2 text-sm font-semibold ${period === value ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>
              {text}
            </Link>
          ))}
        </div>
      </div>
      <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" action={basePath}>
        <input type="hidden" name="role" value={roleKey} />
        <input type="hidden" name="period" value="custom" />
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">Start date<input name="startDate" type="date" defaultValue={startDate} className="rounded-md border border-neutral-300 px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">End date<input name="endDate" type="date" defaultValue={endDate} className="rounded-md border border-neutral-300 px-3 py-2" /></label>
        <button className="self-end rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Apply calendar range</button>
      </form>
    </section>
  );
}

function percent(value: number, goal: number) {
  if (!goal) return 0;
  return Math.round((value / goal) * 100);
}
