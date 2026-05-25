import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createAppointmentHold, getScheduleBoard, listPatients, type PmsAppointmentRow, type PmsScheduleBoard } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

async function holdAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createAppointmentHold({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    patientId: String(formData.get("patientId") ?? "") || undefined,
    providerId: String(formData.get("providerId") ?? "") || undefined,
    operatoryId: String(formData.get("operatoryId") ?? "") || undefined,
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    appointmentType: String(formData.get("appointmentType") ?? "Treatment"),
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/app/pms");
  revalidatePath("/app/pms/schedule");
}

const timeSlots = Array.from({ length: 21 }, (_, index) => 7 * 60 + index * 30);

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ role?: string; date?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const [board, patients] = await Promise.all([getScheduleBoard(session.tenantId, params.date), listPatients(session.tenantId)]);

  return (
    <FoundationShell active="/app/pms/schedule" roleKey={role.key}>
      <PageHeader
        eyebrow="PMS appointment book"
        title="Schedule, pinboard, and chair flow"
        body="A production-grade appointment book needs operatory columns, blockouts, appointment categories, provider assignment, production totals, recall, ASAP, unscheduled treatment, and lab-case risk in one working surface."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/schedule" />
      <PmsSectionNav active="/app/pms/schedule" roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Scheduled production" value={<Money cents={board.production.scheduledCents} />} />
        <Metric label="Completed production" value={<Money cents={board.production.completedCents} />} />
        <Metric label="ASAP / requests" value={board.production.unscheduledRequests} />
        <Metric label="Due recalls" value={board.production.dueRecalls} />
        <Metric label="Lab risks" value={board.production.labCaseRisks} />
      </section>

      <section className="mt-4 grid gap-4 2xl:grid-cols-[320px_1fr_310px]">
        <PmsCard title="Pinboard appointment" eyebrow="Scheduling">
          <form action={holdAction} className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Category
              <select name="categoryId" className="rounded-xl border border-neutral-300 px-3 py-2 text-sm">
                <option value="">Custom appointment</option>
                {board.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name} · {category.defaultMinutes} min · {category.defaultProcedureCodes.join(", ")}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Patient
              <select name="patientId" className="rounded-xl border border-neutral-300 px-3 py-2 text-sm">
                <option value="">Unassigned hold</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} · {patient.chartNumber}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Select name="providerId" label="Provider" items={board.providers.map((p) => [p.id, `${p.displayName} · ${p.providerType}`])} />
              <Select name="operatoryId" label="Operatory" items={board.operatories.map((o) => [o.id, `${o.code} · ${o.name}`])} />
              <Input name="startsAt" label="Start" type="datetime-local" required />
              <Input name="endsAt" label="End" type="datetime-local" required />
            </div>
            <Input name="appointmentType" label="Custom type" />
            <textarea name="notes" rows={3} placeholder="Reason, medical alert, lab dependency, confirmation note" className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Place on appointment book</button>
          </form>
        </PmsCard>

        <PmsCard title="Operatory day sheet" eyebrow={new Date(`${board.date}T00:00:00`).toLocaleDateString()}>
          <ScheduleGrid board={board} roleKey={role.key} />
        </PmsCard>

        <aside className="grid gap-6">
          <Queue title="ASAP and appointment requests" empty="No open appointment requests" rows={board.requests.map((item) => ({
            id: item.id,
            title: `${item.requestType} · ${item.urgency}`,
            detail: `${item.patientName ?? "No patient linked"} · ${item.source}${item.preferredWindow ? ` · ${item.preferredWindow}` : ""}`,
            tone: item.urgency === "HIGH" ? "red" : "amber",
          }))} />
          <Queue title="Recall due" empty="No due recalls" rows={board.recalls.map((item) => ({
            id: item.id,
            title: `${item.patientName} · ${item.recallType}`,
            detail: `${new Date(item.dueDate).toLocaleDateString()} · ${item.procedureCodes.join(", ")}`,
            tone: new Date(item.dueDate) < new Date() ? "red" : "cyan",
          }))} />
          <Queue title="Lab case tracking" empty="No active lab cases" rows={board.labCases.map((item) => ({
            id: item.id,
            title: `${item.caseType} · ${item.status}`,
            detail: `${item.patientName ?? "No patient linked"} · ${item.labName}${item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleDateString()}` : ""}`,
            tone: item.status === "RECEIVED" ? "green" : "amber",
          }))} />
        </aside>
      </section>
    </FoundationShell>
  );
}

function ScheduleGrid({ board, roleKey }: { board: PmsScheduleBoard; roleKey: string }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px] rounded-lg border border-neutral-200">
        <div className="grid border-b border-neutral-200" style={{ gridTemplateColumns: `72px repeat(${board.operatories.length}, minmax(220px, 1fr))` }}>
          <div className="bg-neutral-50 p-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Time</div>
          {board.operatories.map((op) => (
            <div key={op.id} className="border-l border-neutral-200 bg-neutral-50 p-3">
              <p className="font-semibold text-neutral-950">{op.code}</p>
              <p className="text-xs text-neutral-500">{op.name} · {op.status.toLowerCase()}</p>
            </div>
          ))}
        </div>
        {timeSlots.map((slot) => (
          <div key={slot} className="grid min-h-20 border-b border-neutral-200" style={{ gridTemplateColumns: `72px repeat(${board.operatories.length}, minmax(220px, 1fr))` }}>
            <div className="bg-white p-3 text-xs font-semibold text-neutral-500">{slotLabel(slot)}</div>
            {board.operatories.map((op) => {
              const appts = board.appointments.filter((appt) => appt.operatoryName === op.name && minutes(appt.startsAt) >= slot && minutes(appt.startsAt) < slot + 30);
              const blocks = board.blockouts.filter((block) => block.operatoryId === op.id && minutes(block.startsAt) <= slot && minutes(block.endsAt) > slot);
              return (
                <div key={`${op.id}-${slot}`} className="border-l border-neutral-200 bg-white p-2">
                  {blocks.map((block) => <Blockout key={block.id} reason={block.reason} />)}
                  {appts.map((appt) => <AppointmentTile key={appt.id} appt={appt} roleKey={roleKey} />)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentTile({ appt, roleKey }: { appt: PmsAppointmentRow; roleKey: string }) {
  return (
    <Link href={`/app/pms/appointments/${appt.id}?role=${roleKey}`} className="mb-2 block rounded-md border-l-4 border-cyan-500 bg-cyan-50 p-2 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-neutral-950">{appt.patientName ?? "Held appointment"}</p>
        <StatusPill tone={appt.status === "COMPLETED" ? "green" : appt.status === "BROKEN" ? "red" : "amber"}>{appt.status.toLowerCase()}</StatusPill>
      </div>
      <p className="mt-1 text-xs text-neutral-600">{time(appt.startsAt)}-{time(appt.endsAt)} · {appt.appointmentType}</p>
      <p className="mt-1 text-xs text-neutral-600">{appt.providerName ?? "provider unassigned"} · <Money cents={appt.productionCents} /></p>
    </Link>
  );
}

function Blockout({ reason }: { reason: string }) {
  return <div className="mb-2 rounded-md border border-neutral-200 bg-neutral-100 p-2 text-xs font-semibold text-neutral-600">{reason}</div>;
}

function Queue({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; title: string; detail: string; tone: "green" | "cyan" | "amber" | "red" }> }) {
  return (
    <PmsCard title={title}>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-950">{row.title}</p>
                <StatusPill tone={row.tone}>work</StatusPill>
              </div>
              <p className="mt-1 text-xs leading-5 text-neutral-600">{row.detail}</p>
            </div>
          ))}
        </div>
      ) : <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-500">{empty}</p>}
    </PmsCard>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ label, name, items }: { label: string; name: string; items: string[][] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"><option value="">Unassigned</option>{items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function minutes(value: string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function slotLabel(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
