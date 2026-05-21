import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createAppointmentHold, listOperatories, listPatients, listProviders, listSchedule } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

async function holdAction(formData: FormData) {
  "use server";
  await createAppointmentHold({
    patientId: String(formData.get("patientId") ?? "") || undefined,
    providerId: String(formData.get("providerId") ?? "") || undefined,
    operatoryId: String(formData.get("operatoryId") ?? "") || undefined,
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    appointmentType: String(formData.get("appointmentType") ?? "Treatment"),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/app/pms");
  revalidatePath("/app/pms/schedule");
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ role?: string; date?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const [schedule, patients, providers, operatories] = await Promise.all([
    listSchedule(undefined, params.date),
    listPatients(),
    listProviders(),
    listOperatories(),
  ]);

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS schedule" title="Schedule and chair flow" body="Book chair time, assign provider and operatory, track readiness, and move patients through arrival, seating, treatment, and completion." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/schedule" />
      <PmsSectionNav active="/app/pms/schedule" roleKey={role.key} />

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Reserve appointment" eyebrow="Scheduling">
          <form action={holdAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Patient
              <select name="patientId" className="rounded-2xl border border-neutral-300 px-4 py-3">
                <option value="">Unassigned hold</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="providerId" label="Provider" items={providers.map((p) => [p.id, `${p.displayName} · ${p.providerType}`])} />
              <Select name="operatoryId" label="Operatory" items={operatories.map((o) => [o.id, `${o.code} · ${o.name}`])} />
              <Input name="startsAt" label="Start" type="datetime-local" required />
              <Input name="endsAt" label="End" type="datetime-local" required />
            </div>
            <Input name="appointmentType" label="Appointment type" required />
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Notes
              <textarea name="notes" rows={3} className="rounded-2xl border border-neutral-300 px-4 py-3" />
            </label>
            <button className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Reserve chair time</button>
          </form>
        </PmsCard>

        <PmsCard title="Today board" eyebrow="Operatories">
          {schedule.length ? (
            <div className="space-y-3">
              {schedule.map((appt) => (
                <div key={appt.id} className="rounded-3xl bg-neutral-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-neutral-950">{appt.patientName ?? "Held appointment"}</p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {time(appt.startsAt)}-{time(appt.endsAt)} · {appt.appointmentType} · {appt.providerName ?? "provider unassigned"} · {appt.operatoryName ?? "room unassigned"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">Production <Money cents={appt.productionCents} /> · {appt.readinessStatus.replaceAll("_", " ").toLowerCase()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={appt.status === "COMPLETED" ? "green" : appt.status === "BROKEN" ? "red" : "amber"}>{appt.status.toLowerCase()}</StatusPill>
                      {appt.patientId ? <Link href={`/app/pms/patients/${appt.patientId}?role=${role.key}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-cyan-700">patient</Link> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPmsState title="No appointments on the board" body="Use the reserve appointment panel to create a real schedule hold in Postgres. Once patient intake starts, this board becomes the front desk and chairside operating surface." />
          )}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} className="rounded-2xl border border-neutral-300 px-4 py-3" /></label>;
}

function Select({ label, name, items }: { label: string; name: string; items: string[][] }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<select name={name} className="rounded-2xl border border-neutral-300 px-4 py-3"><option value="">Unassigned</option>{items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
