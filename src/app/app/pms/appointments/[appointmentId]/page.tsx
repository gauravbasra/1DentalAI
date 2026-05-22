import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { addAppointmentProcedure, completeAppointmentCheckout, getAppointmentControl, listProcedureCodes } from "@/lib/pms-repository";
import { createZoomMeetingForAppointment, listVirtualVisitsForAppointment } from "@/lib/zoom-repository";

export const dynamic = "force-dynamic";

function moneyToCents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(/[^0-9.-]/g, "");
  return Math.round(Number(normalized || "0") * 100);
}

async function addProcedureAction(appointmentId: string, formData: FormData) {
  "use server";
  const feeValue = String(formData.get("fee") ?? "").trim();
  await addAppointmentProcedure({
    appointmentId,
    procedureCodeId: String(formData.get("procedureCodeId") ?? ""),
    tooth: String(formData.get("tooth") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    feeCents: feeValue ? moneyToCents(feeValue) : undefined,
  });
  revalidatePath(`/app/pms/appointments/${appointmentId}`);
  revalidatePath("/app/pms/schedule");
}

async function checkoutAction(appointmentId: string, formData: FormData) {
  "use server";
  await completeAppointmentCheckout({
    appointmentId,
    procedureIds: formData.getAll("procedureIds").map(String),
    paymentCents: moneyToCents(formData.get("paymentAmount")),
    paymentType: String(formData.get("paymentType") ?? "CARD"),
    paymentReference: String(formData.get("paymentReference") ?? ""),
    createClaimDraft: formData.get("createClaimDraft") === "on",
    overrideBlockers: formData.get("overrideBlockers") === "on",
    checkoutNote: String(formData.get("checkoutNote") ?? ""),
  });
  revalidatePath(`/app/pms/appointments/${appointmentId}`);
  revalidatePath("/app/pms");
  revalidatePath("/app/pms/schedule");
  revalidatePath("/app/pms/ledger");
  revalidatePath("/app/pms/insurance");
}

async function createZoomMeetingAction(appointmentId: string, formData: FormData) {
  "use server";
  await createZoomMeetingForAppointment({
    appointmentId,
    actorRole: String(formData.get("actorRole") ?? "front_desk"),
    agenda: String(formData.get("agenda") ?? ""),
  });
  revalidatePath(`/app/pms/appointments/${appointmentId}`);
  revalidatePath("/app/pms/schedule");
}

export default async function AppointmentControlPage({
  params,
  searchParams,
}: {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const [{ appointmentId }, query] = await Promise.all([params, searchParams]);
  const role = getRole(query.role);
  const [control, procedureCodes, virtualVisits] = await Promise.all([getAppointmentControl(appointmentId), listProcedureCodes(), listVirtualVisitsForAppointment(appointmentId)]);

  if (!control) {
    return (
      <FoundationShell active="/app/pms" roleKey={role.key}>
        <PageHeader eyebrow="PMS appointment" title="Appointment not found" body="The requested appointment is not available in this tenant." />
      </FoundationShell>
    );
  }

  const appointment = control.appointment;
  const addProcedure = addProcedureAction.bind(null, appointment.id);
  const checkout = checkoutAction.bind(null, appointment.id);
  const createZoom = createZoomMeetingAction.bind(null, appointment.id);
  const hardBlockers = control.readinessBlockers.filter((item) => item.severity === "HARD");

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="Appointment control"
        title={`${appointment.patientName ?? "Held appointment"} · ${appointment.appointmentType}`}
        body="Arrival-to-checkout control for the visit: procedures, forms, benefits, labs, imaging, payments, claim draft, status history, and audit-backed override."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath={`/app/pms/appointments/${appointment.id}`} />
      <PmsSectionNav active="/app/pms/schedule" roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Visit status" value={<StatusFor value={appointment.status} />} />
        <Metric label="Scheduled" value={`${time(appointment.startsAt)}-${time(appointment.endsAt)}`} />
        <Metric label="Procedures" value={<Money cents={control.totals.procedureFeeCents} />} />
        <Metric label="Open balance" value={<Money cents={control.totals.openBalanceCents} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.35fr_0.85fr]">
        <div className="grid gap-4">
          <PmsCard title="Patient and benefits" eyebrow={appointment.chartNumber ?? "No chart"}>
            <div className="space-y-2 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-950">{appointment.patientName ?? "No patient attached"}</p>
              <p>{appointment.phone ?? "No phone"} · {appointment.email ?? "No email"}</p>
              <p>{appointment.providerName ?? "Provider unassigned"} · {appointment.operatoryName ?? "Room unassigned"}</p>
              <p>{appointment.payerName ? `${appointment.payerName} · ${appointment.planName}` : "No primary insurance"}</p>
              {appointment.eligibilityStatus ? <StatusFor value={appointment.eligibilityStatus} /> : null}
            </div>
          </PmsCard>

          <PmsCard title="Readiness blockers" eyebrow={hardBlockers.length ? "Checkout gated" : "Review"}>
            {control.readinessBlockers.length ? (
              <div className="grid gap-2">
                {control.readinessBlockers.map((blocker) => (
                  <div key={`${blocker.area}-${blocker.message}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-950">{blocker.area}</p>
                      <StatusPill tone={blocker.severity === "HARD" ? "red" : "amber"}>{blocker.severity.toLowerCase()}</StatusPill>
                    </div>
                    <p className="mt-1 text-sm text-neutral-700">{blocker.message}</p>
                    <p className="mt-1 text-xs text-neutral-500">{blocker.action}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-900">Ready for standard checkout.</div>
            )}
          </PmsCard>

          <PmsCard title="Virtual visit" eyebrow="Zoom">
            {virtualVisits.length ? (
              <div className="grid gap-3">
                {virtualVisits.map((visit) => (
                  <div key={visit.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{visit.topic}</p>
                        <p className="mt-1 text-xs text-neutral-500">Meeting {visit.providerMeetingId} · created {new Date(visit.createdAt).toLocaleString()}</p>
                      </div>
                      <StatusFor value={visit.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={visit.joinUrl} target="_blank" rel="noreferrer" className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white">Open patient join link</a>
                      {visit.startUrl ? <a href={visit.startUrl} target="_blank" rel="noreferrer" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800">Start as host</a> : null}
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">Participant: {visit.participantStatus} · Last event: {visit.lastEventAt ? new Date(visit.lastEventAt).toLocaleString() : "none yet"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <form action={createZoom} className="grid gap-3">
                <input type="hidden" name="actorRole" value={role.key} />
                <textarea name="agenda" rows={3} placeholder="Virtual consult agenda shown in Zoom meeting metadata" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Create Zoom meeting</button>
                <p className="text-xs leading-5 text-neutral-500">Creates a real Zoom meeting, saves join/start URLs to this appointment, and records webhook status when Zoom sends events.</p>
              </form>
            )}
          </PmsCard>

          <PmsCard title="Linked work" eyebrow="Forms, labs, imaging">
            <LinkedRows
              rows={[
                ...control.forms.map((row) => ({ id: row.id, title: row.templateName, detail: "Form packet", status: row.status })),
                ...control.labCases.map((row) => ({ id: row.id, title: `${row.caseType} · ${row.labName}`, detail: row.dueDate ? `Due ${new Date(row.dueDate).toLocaleDateString()}` : "Lab case", status: row.status })),
                ...control.imaging.map((row) => ({ id: row.id, title: `${row.studyType}${row.tooth ? ` · tooth ${row.tooth}` : ""}`, detail: row.region ?? "Imaging study", status: row.acquisitionStatus })),
              ]}
            />
          </PmsCard>
        </div>

        <div className="grid gap-4">
          <PmsCard title="Visit procedures" eyebrow="Complete, charge, and claim">
            {control.procedures.length ? (
              <form action={checkout} className="grid gap-4">
                <div className="overflow-hidden rounded-md border border-neutral-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">Done</th>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Tooth/surface</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {control.procedures.map((procedure) => (
                        <tr key={procedure.id}>
                          <td className="px-3 py-2">
                            <input name="procedureIds" value={procedure.id} type="checkbox" defaultChecked={procedure.status !== "COMPLETED"} disabled={procedure.status === "COMPLETED"} className="h-4 w-4" />
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-neutral-950">{procedure.code}</p>
                            <p className="text-xs text-neutral-500">{procedure.description}</p>
                          </td>
                          <td className="px-3 py-2 text-neutral-600">{[procedure.tooth, procedure.surface].filter(Boolean).join(" / ") || "n/a"}</td>
                          <td className="px-3 py-2"><StatusFor value={procedure.status} /></td>
                          <td className="px-3 py-2 text-right font-semibold"><Money cents={procedure.feeCents} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 md:grid-cols-2">
                  <Select name="paymentType" label="Payment type" options={["CARD", "ACH", "CASH", "CHECK", "HSA_FSA", "FINANCING"]} />
                  <Input name="paymentAmount" label="Collect now" placeholder="0.00" />
                  <Input name="paymentReference" label="Reference" placeholder="Auth, check, or note" />
                  <label className="flex items-center gap-2 pt-6 text-sm font-semibold text-neutral-700">
                    <input name="createClaimDraft" type="checkbox" disabled={!appointment.primaryInsuranceId} defaultChecked={Boolean(appointment.primaryInsuranceId)} className="h-4 w-4" />
                    Create internal claim draft
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 md:col-span-2">
                    <input name="overrideBlockers" type="checkbox" className="h-4 w-4" />
                    Override hard blockers with audit note
                  </label>
                  <textarea name="checkoutNote" rows={3} placeholder="Checkout note, blocker override reason, next visit instruction" className="rounded-md border border-neutral-300 px-3 py-2 text-sm md:col-span-2" />
                </div>

                <button disabled={appointment.status === "COMPLETED"} className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300">
                  Complete checkout
                </button>
              </form>
            ) : (
              <EmptyPmsState title="No procedures staged" body="Add billable or clinical procedures before checkout. The checkout action will not create charges or claim drafts from an empty visit." />
            )}
          </PmsCard>

          <PmsCard title="Add procedure" eyebrow="Appointment procedure">
            <form action={addProcedure} className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-sm font-semibold text-neutral-700 md:col-span-2">
                Procedure
                <select name="procedureCodeId" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                  {procedureCodes.map((code) => (
                    <option key={code.id} value={code.id}>{code.code} · {code.description}</option>
                  ))}
                </select>
              </label>
              <Input name="tooth" label="Tooth" />
              <Input name="surface" label="Surface" />
              <Input name="fee" label="Fee override" placeholder="Use default" />
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white md:col-span-3">Add to visit</button>
            </form>
          </PmsCard>
        </div>

        <aside className="grid gap-4">
          <PmsCard title="Claim drafts" eyebrow="No external submission">
            <LinkedRows rows={control.claims.map((claim) => ({
              id: claim.id,
              title: claim.claimNumber ?? claim.id,
              detail: `${money(claim.billedCents)} billed · ${money(claim.patientDueCents)} patient due`,
              status: claim.status,
            }))} emptyTitle="No claim draft" emptyBody="Checkout can create an internal READY claim. It will not submit to a clearinghouse." />
          </PmsCard>

          <PmsCard title="Checkout history" eyebrow="Audit trail">
            <LinkedRows rows={control.checkoutSessions.map((session) => ({
              id: session.id,
              title: `${money(session.chargeCents)} charge · ${money(session.patientPaymentCents)} paid`,
              detail: `${new Date(session.createdAt).toLocaleString()}${session.claimId ? " · claim draft" : ""}`,
              status: session.status,
            }))} emptyTitle="No checkout session" emptyBody="Completed checkout sessions persist with charges, payments, claim draft linkage, blockers, and override status." />
          </PmsCard>

          {appointment.patientId ? (
            <Link href={`/app/pms/patients/${appointment.patientId}?role=${role.key}`} className="rounded-md border border-neutral-300 px-4 py-3 text-center text-sm font-semibold text-neutral-800 hover:bg-neutral-50">
              Open patient record
            </Link>
          ) : null}
        </aside>
      </section>
    </FoundationShell>
  );
}

function LinkedRows({
  rows,
  emptyTitle = "Nothing linked",
  emptyBody = "No linked records for this appointment yet.",
}: {
  rows: Array<{ id: string; title: string; detail: string; status: string }>;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  return rows.length ? (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-950">{row.title}</p>
            <StatusFor value={row.status} />
          </div>
          <p className="mt-1 text-xs text-neutral-500">{row.detail}</p>
        </div>
      ))}
    </div>
  ) : (
    <EmptyPmsState title={emptyTitle} body={emptyBody} />
  );
}

function Input({ label, name, placeholder = "", type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<input name={name} type={type} placeholder={placeholder} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="grid gap-1 text-sm font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><div className="mt-1 text-lg font-semibold text-neutral-950">{value}</div></div>;
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}
