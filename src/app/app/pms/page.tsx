import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getInsuranceBoard, getLedgerBoard, getPmsDashboard, listLabCases, listPatients, listSchedule, listTasks } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export default async function PmsCommandPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const [dashboard, schedule, patients, tasks, insurance, ledger, labs] = await Promise.all([
    getPmsDashboard(),
    listSchedule(),
    listPatients(),
    listTasks(undefined, role.key),
    getInsuranceBoard(),
    getLedgerBoard(),
    listLabCases(),
  ]);

  const readinessItems = [
    { label: "Patients not ready", value: schedule.filter((item) => item.readinessStatus !== "READY").length },
    { label: "Coverage review", value: insurance.coverage.filter((item) => String(item.eligibilityStatus) !== "ACTIVE").length },
    { label: "Open lab cases", value: labs.filter((item) => !["DELIVERED", "CANCELED"].includes(String(item.status))).length },
    { label: "Claim queue", value: ledger.claims.length },
  ];

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="Cloud PMS"
        title="Daily practice console"
        body="A dense operating view for the front desk, providers, assistants, billing, and management: today’s schedule, patient movement, readiness blockers, account risk, and assigned work."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms" />
      <PmsSectionNav active="/app/pms" roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Patients" value={dashboard.activePatients} detail="active charts" />
        <Metric label="Today" value={dashboard.todayAppointments} detail={<Money cents={dashboard.todayProductionCents} />} />
        <Metric label="Role tasks" value={tasks.length} detail={role.title} />
        <Metric label="Claims" value={dashboard.openClaimCount} detail={<Money cents={dashboard.claimExposureCents} />} />
        <Metric label="Balances" value={<Money cents={dashboard.patientBalanceCents} />} detail={`${ledger.patientCountWithBalance} patients`} />
        <Metric label="Codes" value={dashboard.procedureCodeCount} detail="fee schedule" />
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
    </FoundationShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-0.5 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
