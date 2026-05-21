import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getPmsDashboard, listPatients, listSchedule, listTasks } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export default async function PmsCommandPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const [dashboard, schedule, patients, tasks] = await Promise.all([
    getPmsDashboard(),
    listSchedule(),
    listPatients(),
    listTasks(undefined, role.key),
  ]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="Cloud PMS"
        title="Practice management command center"
        body="Run the patient day from one clinical and administrative system: schedule, patient records, chart, perio, treatment, insurance, ledger, documents, and role-owned tasks."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms" />
      <PmsSectionNav active="/app/pms" roleKey={role.key} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active patients" value={String(dashboard.activePatients)} detail="searchable PMS records" />
        <Metric label="Today appointments" value={String(dashboard.todayAppointments)} detail={<Money cents={dashboard.todayProductionCents} />} />
        <Metric label="Open role tasks" value={String(tasks.length)} detail="work assigned to this role" />
        <Metric label="Revenue exposure" value={<Money cents={dashboard.claimExposureCents + dashboard.patientBalanceCents} />} detail={`${dashboard.openClaimCount} open claims`} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_0.8fr]">
        <PmsCard
          eyebrow="Front desk and providers"
          title="Today schedule"
          action={<Link href={`/app/pms/schedule?role=${role.key}`} className="text-sm font-semibold text-cyan-700">Open schedule</Link>}
        >
          {schedule.length ? (
            <div className="space-y-3">
              {schedule.slice(0, 6).map((appt) => (
                <Link key={appt.id} href={appt.patientId ? `/app/pms/patients/${appt.patientId}?role=${role.key}` : `/app/pms/schedule?role=${role.key}`} className="block rounded-2xl bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">{appt.patientName ?? "Held appointment"}</p>
                      <p className="mt-1 text-sm text-neutral-600">{appt.appointmentType} · {appt.providerName ?? "provider unassigned"} · {appt.operatoryName ?? "room unassigned"}</p>
                    </div>
                    <StatusPill tone={appt.readinessStatus === "READY" ? "green" : "amber"}>{appt.status.toLowerCase()}</StatusPill>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No appointments scheduled today" body="Schedule is connected to the PMS database. Add a patient, then reserve chair time from the schedule work area." href={`/app/pms/schedule?role=${role.key}`} action="Open schedule" />
          )}
        </PmsCard>

        <PmsCard
          eyebrow="Patient records"
          title="Recent patient chart access"
          action={<Link href={`/app/pms/patients?role=${role.key}`} className="text-sm font-semibold text-cyan-700">Find patient</Link>}
        >
          {patients.length ? (
            <div className="space-y-3">
              {patients.slice(0, 6).map((patient) => (
                <Link key={patient.id} href={`/app/pms/patients/${patient.id}?role=${role.key}`} className="block rounded-2xl bg-neutral-50 p-4">
                  <p className="font-semibold text-neutral-950">{patient.lastName}, {patient.firstName}</p>
                  <p className="mt-1 text-sm text-neutral-600">{patient.chartNumber} · balance <Money cents={patient.balanceCents} /> · {patient.openTasks} tasks</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No patient records yet" body="The PMS is ready for first-client onboarding. Patient records created here are persisted to PostgreSQL and become available in chart, perio, insurance, ledger, documents, and task workflows." href={`/app/pms/patients?role=${role.key}`} action="Create patient" />
          )}
        </PmsCard>

        <PmsCard
          eyebrow="Role work"
          title={`${role.title} task list`}
          action={<Link href={`/app/pms/tasks?role=${role.key}`} className="text-sm font-semibold text-cyan-700">Open tasks</Link>}
        >
          {tasks.length ? (
            <div className="space-y-3">
              {tasks.slice(0, 6).map((task) => (
                <div key={task.id} className="rounded-2xl bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-neutral-950">{task.title}</p>
                    <StatusPill tone={task.priority === "HIGH" ? "red" : "amber"}>{task.priority.toLowerCase()}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{task.taskType.replaceAll("_", " ").toLowerCase()}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No open tasks for this role" body="Role queues are database-backed. Tasks created from schedule, chart, insurance, documents, and billing will land here for the correct role instead of every user seeing the same dashboard." href={`/app/pms/tasks?role=${role.key}`} action="Create task" />
          )}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">{value}</p>
      <p className="mt-2 text-sm text-neutral-600">{detail}</p>
    </div>
  );
}
