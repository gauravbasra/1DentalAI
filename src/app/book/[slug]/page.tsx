import Link from "next/link";
import { redirect } from "next/navigation";
import { Money } from "@/components/pms-ui";
import { getOnlineSchedulingAvailability, getOnlineSchedulingLink, submitOnlineBooking } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

async function bookingAction(formData: FormData) {
  "use server";
  const slug = String(formData.get("slug") ?? "");
  await submitOnlineBooking({
    slug,
    startsAt: String(formData.get("slot") ?? "").split("|")[0] ?? "",
    providerId: String(formData.get("slot") ?? "").split("|")[1] ?? "",
    operatoryId: String(formData.get("slot") ?? "").split("|")[2] ?? "",
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    dateOfBirth: String(formData.get("dateOfBirth") ?? "") || undefined,
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    insurancePayerName: String(formData.get("insurancePayerName") ?? "") || undefined,
    subscriberId: String(formData.get("subscriberId") ?? "") || undefined,
    patientNote: String(formData.get("patientNote") ?? "") || undefined,
    utmSource: String(formData.get("utmSource") ?? "") || undefined,
  });
  redirect(`/book/${slug}?booked=1`);
}

export default async function PublicBookingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ booked?: string; utm_source?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const [link, slots] = await Promise.all([getOnlineSchedulingLink(slug), getOnlineSchedulingAvailability(slug)]);

  if (!link) {
    return (
      <main className="min-h-screen bg-neutral-50 p-6">
        <section className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-700">1DentalAI scheduling</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">This booking link is not active</h1>
          <p className="mt-3 text-neutral-600">Please contact the practice for available appointment times.</p>
        </section>
      </main>
    );
  }

  if (query.booked === "1") {
    return (
      <main className="min-h-screen bg-neutral-50 p-6">
        <section className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Appointment reserved</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">You are on the schedule</h1>
          <p className="mt-3 text-neutral-600">Your appointment was written to the practice schedule. The team will review any insurance or reservation-fee items tied to this booking.</p>
          <Link href="/" className="mt-6 inline-flex rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Return home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <section className="mx-auto max-w-6xl rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">1DentalAI online scheduling</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">{link.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            Pick an available appointment time. Returning patients are matched to the PMS record before booking; new patients get a PMS chart created when the appointment is reserved.
          </p>
        </div>

        <form action={bookingAction} className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
          <input type="hidden" name="slug" value={link.slug} />
          <input type="hidden" name="utmSource" value={query.utm_source ?? ""} />
          <section>
            <h2 className="text-base font-semibold text-neutral-950">Available times</h2>
            <div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
              {slots.length ? slots.slice(0, 24).map((slot, index) => (
                <label key={`${slot.startsAt}-${slot.providerId}-${slot.operatoryId}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm has-[:checked]:border-cyan-700 has-[:checked]:bg-cyan-50">
                  <div className="flex items-start gap-2">
                  <input type="radio" name="slot" value={`${slot.startsAt}|${slot.providerId}|${slot.operatoryId}`} required defaultChecked={index === 0} className="mt-1" />
                    <span>
                      <span className="block font-semibold text-neutral-950">{new Date(slot.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      <span className="mt-1 block text-xs text-neutral-600">{slot.providerName} · {slot.operatoryName}</span>
                    </span>
                  </div>
                </label>
              )) : <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">No available online slots under this booking link. Please call the practice.</p>}
            </div>
          </section>

          <section className="grid gap-3">
            <h2 className="text-base font-semibold text-neutral-950">Patient details</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="firstName" label="First name" required />
              <Input name="lastName" label="Last name" required />
              <Input name="dateOfBirth" label="Date of birth" type="date" />
              <Input name="phone" label="Mobile phone" type="tel" />
              <Input name="email" label="Email" type="email" />
              <Input name="insurancePayerName" label="Insurance payer" placeholder="Delta Dental" />
              <Input name="subscriberId" label="Subscriber ID" />
            </div>
            <textarea name="patientNote" rows={4} placeholder="Reason for visit, symptoms, timing needs, or accessibility requests" className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" />
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
              <p><span className="font-semibold text-neutral-950">Service:</span> {link.categoryName ?? link.title}</p>
              <p><span className="font-semibold text-neutral-950">Provider rule:</span> {link.providerName ?? "Any available provider"}</p>
              <p><span className="font-semibold text-neutral-950">Insurance:</span> {link.requiresInsurance ? "accepted payer policy checked before booking" : "captured for staff review"}</p>
              <p><span className="font-semibold text-neutral-950">Reservation fee:</span> {link.reservationFeeCents ? <><Money cents={link.reservationFeeCents} /> due after booking review</> : "not required"}</p>
            </div>
            <button disabled={!slots.length} className="rounded-md bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300">Reserve appointment</button>
          </section>
        </form>
      </section>
    </main>
  );
}

function Input({ label, name, type = "text", required = false, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} type={type} required={required} placeholder={placeholder} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm" /></label>;
}
