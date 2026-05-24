import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher, StatusPill } from "@/components/foundation-shell";
import { Money, PmsCard, PmsSectionNav } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createOnlineSchedulingLink, getOnlineSchedulingWorkbench, type PmsOnlineSchedulingLinkRow, type PmsOnlineSlot } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  linkTitle: string;
  firstName: string;
  lastName: string;
  chartNumber: string | null;
  startsAt: Date | string;
  status: string;
  isReturningPatient: boolean;
  insurancePayerName: string | null;
  eligibilityStatus: string;
  reservationPaymentStatus: string;
};

type CampaignRow = {
  id: string;
  name: string;
  linkTitle: string;
  audienceFilter: string;
  channel: string;
  status: string;
  earliestBookingDate: Date | string | null;
  recipients: number;
  clicked: number;
  booked: number;
};

async function linkAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createOnlineSchedulingLink({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    audience: String(formData.get("audience") ?? "ALL_PATIENTS"),
    sourceChannel: String(formData.get("sourceChannel") ?? "WEBSITE"),
    appointmentCategoryId: String(formData.get("appointmentCategoryId") ?? "") || undefined,
    providerId: String(formData.get("providerId") ?? "") || undefined,
    earliestBookingDays: Number(formData.get("earliestBookingDays") ?? 1),
    maxBookingDays: Number(formData.get("maxBookingDays") ?? 21),
    slotIntervalMinutes: Number(formData.get("slotIntervalMinutes") ?? 30),
    reservationFeeCents: Math.round(Number(formData.get("reservationFeeDollars") ?? 0) * 100),
    requiresInsurance: formData.get("requiresInsurance") === "on",
    acceptedPayerNames: String(formData.get("acceptedPayerNames") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/app/pms/online-scheduling");
}

export default async function OnlineSchedulingPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const workbench = await getOnlineSchedulingWorkbench(session.tenantId);
  const links = workbench.links as PmsOnlineSchedulingLinkRow[];
  const bookings = workbench.bookings as BookingRow[];
  const campaigns = workbench.campaigns as CampaignRow[];
  const totalBookings = links.reduce((sum, link) => sum + Number(link.bookingCount), 0);
  const totalClicks = links.reduce((sum, link) => sum + Number(link.clickCount), 0);
  const conversion = totalClicks ? Math.round((totalBookings / totalClicks) * 100) : 0;

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader
        eyebrow="PMS online scheduling"
        title="Booking links, availability, and PMS writeback"
        body="Control which services, providers, booking windows, insurance policies, and reservation fee rules are exposed online. Patient bookings reserve real appointment slots and write back into the PMS appointment book."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/online-scheduling" />
      <PmsSectionNav active="/app/pms/online-scheduling" roleKey={role.key} />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active booking links" value={links.filter((link) => link.status === "ACTIVE").length} />
        <Metric label="Online bookings" value={totalBookings} />
        <Metric label="Link conversion" value={`${conversion}%`} />
        <Metric label="Unscheduled treatment" value={<Money cents={workbench.patientFinder.unscheduledTreatmentCents} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Create or update booking link" eyebrow="Controlled public availability">
          <form action={linkAction} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="title" label="Link title" required />
              <Input name="slug" label="Public slug" required />
              <Select name="audience" label="Audience" items={[["ALL_PATIENTS", "All patients"], ["NEW_PATIENTS", "New patients"], ["EXISTING_PATIENTS", "Existing patients"], ["UNSCHEDULED_TREATMENT", "Unscheduled treatment"], ["RECARE", "Recare"]]} />
              <Select name="sourceChannel" label="Source channel" items={[["WEBSITE", "Website"], ["GOOGLE", "Google / Maps"], ["SOCIAL", "Social"], ["RECALL", "Recall"], ["TREATMENT_LINK", "Treatment link"], ["QR", "QR code"]]} />
              <Select name="appointmentCategoryId" label="Service" items={workbench.categories.map((item) => [item.id, `${item.name} · ${item.defaultMinutes} min`])} />
              <Select name="providerId" label="Provider rule" items={workbench.providers.map((item) => [item.id, `${item.displayName} · ${item.providerType}`])} blank="Any active provider" />
              <Input name="earliestBookingDays" label="Earliest booking days" type="number" defaultValue="1" />
              <Input name="maxBookingDays" label="Max booking days" type="number" defaultValue="21" />
              <Input name="slotIntervalMinutes" label="Slot interval minutes" type="number" defaultValue="30" />
              <Input name="reservationFeeDollars" label="Reservation fee dollars" type="number" defaultValue="0" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
              <input name="requiresInsurance" type="checkbox" className="size-4 rounded border-neutral-300" />
              Require accepted insurance policy before booking
            </label>
            <Input name="acceptedPayerNames" label="Accepted payer names" placeholder="Delta Dental, Aetna Dental, Cigna Dental" />
            <textarea name="notes" rows={3} placeholder="Placement, SOP, patient instructions, channel policy" className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Save booking link</button>
          </form>
        </PmsCard>

        <PmsCard title="Online scheduling dashboard" eyebrow="Booking link performance">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-[0.08em] text-neutral-500">
                <tr>
                  <th className="px-3 py-2">Link</th>
                  <th className="px-3 py-2">Rules</th>
                  <th className="px-3 py-2">Policy</th>
                  <th className="px-3 py-2">Open slots</th>
                  <th className="px-3 py-2">Book</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {links.map((link) => {
                  const slots = (workbench.slotsByLink[link.id] ?? []) as PmsOnlineSlot[];
                  return (
                    <tr key={link.id} className="align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-neutral-950">{link.title}</p>
                        <p className="mt-1 text-xs text-neutral-500">/{link.slug} · {link.sourceChannel.replaceAll("_", " ").toLowerCase()}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-neutral-700">
                        <p>{link.categoryName ?? "Any service"}</p>
                        <p>{link.providerName ?? "Any active provider"}</p>
                        <p>{link.earliestBookingDays}-{link.maxBookingDays} days out</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-neutral-700">
                        <p>{link.requiresInsurance ? "Insurance policy enforced" : "Insurance optional"}</p>
                        <p>{link.reservationFeeCents ? <><Money cents={link.reservationFeeCents} /> reservation fee due</> : "No reservation fee"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={slots.length ? "green" : "red"}>{slots.length} slots</StatusPill>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/book/${link.slug}`} className="rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">Open link</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <PmsCard title="Patient Finder targets" eyebrow="Scheduling lists">
          <div className="grid gap-3">
            <SmallMetric label="Unscheduled hygiene" value={workbench.patientFinder.unscheduledHygiene} />
            <SmallMetric label="Broken appointment recovery" value={workbench.patientFinder.brokenAppointments} />
            <SmallMetric label="ASAP requests" value={workbench.patientFinder.asapRequests} />
            <SmallMetric label="Unscheduled treatment" value={<Money cents={workbench.patientFinder.unscheduledTreatmentCents} />} />
          </div>
        </PmsCard>

        <PmsCard title="Staged bulk requests" eyebrow="No external send until connector is live">
          {campaigns.length ? (
            <div className="grid gap-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{campaign.name}</p>
                      <p className="mt-1 text-xs text-neutral-600">{campaign.linkTitle} · {campaign.channel.replaceAll("_", " ").toLowerCase()}</p>
                    </div>
                    <StatusPill tone={campaign.status === "ACTIVE" ? "green" : "amber"}>{campaign.status.toLowerCase()}</StatusPill>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <SmallMetric label="Recipients" value={campaign.recipients} />
                    <SmallMetric label="Clicked" value={campaign.clicked} />
                    <SmallMetric label="Booked" value={campaign.booked} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-600">No staged scheduling request lists.</p>}
        </PmsCard>

        <PmsCard title="Recent online bookings" eyebrow="PMS writeback audit">
          {bookings.length ? (
            <div className="grid gap-2">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{booking.lastName}, {booking.firstName}</p>
                      <p className="mt-1 text-xs text-neutral-600">{booking.linkTitle} · {new Date(booking.startsAt).toLocaleString()}</p>
                    </div>
                    <StatusPill tone={booking.isReturningPatient ? "green" : "cyan"}>{booking.isReturningPatient ? "matched" : "new chart"}</StatusPill>
                  </div>
                  <p className="mt-2 text-xs text-neutral-600">{booking.insurancePayerName ?? "No payer entered"} · {booking.eligibilityStatus.replaceAll("_", " ").toLowerCase()} · {booking.reservationPaymentStatus.replaceAll("_", " ").toLowerCase()}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-600">No online bookings recorded yet.</p>}
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-xl font-semibold text-neutral-950">{value}</p></div>;
}

function SmallMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-white px-3 py-2 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ label, name, type = "text", required = false, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ label, name, items, blank = "Select" }: { label: string; name: string; items: string[][]; blank?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"><option value="">{blank}</option>{items.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
}
