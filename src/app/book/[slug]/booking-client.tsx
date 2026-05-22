"use client";

import { useMemo, useState } from "react";
import type { PmsOnlineSchedulingLinkRow, PmsOnlineSlot } from "@/lib/pms-repository";

type Props = {
  initialSlug: string;
  appointmentTypes: PmsOnlineSchedulingLinkRow[];
  slotsBySlug: Record<string, PmsOnlineSlot[]>;
  booked: boolean;
  utmSource?: string;
};

type Intake = {
  schedulingFor: string;
  patientType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirthMonth: string;
  dateOfBirthDay: string;
  dateOfBirthYear: string;
  referralSource: string;
  insuranceStatus: string;
  insurancePayerName: string;
  subscriberId: string;
  patientNote: string;
};

const blankIntake: Intake = {
  schedulingFor: "self",
  patientType: "new",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirthMonth: "",
  dateOfBirthDay: "",
  dateOfBirthYear: "",
  referralSource: "",
  insuranceStatus: "",
  insurancePayerName: "",
  subscriberId: "",
  patientNote: "",
};

const referralSources = ["Google search", "Google Maps", "Friend or family", "Insurance directory", "Social media", "Existing patient", "Other"];

export function BookingClient({ initialSlug, appointmentTypes, slotsBySlug, booked, utmSource }: Props) {
  const [step, setStep] = useState(booked ? 5 : 0);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [intake, setIntake] = useState<Intake>(blankIntake);
  const [showForModal, setShowForModal] = useState(!booked);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingSummary, setBookingSummary] = useState("");

  const selectedType = appointmentTypes.find((item) => item.slug === selectedSlug) ?? appointmentTypes[0];
  const slots = useMemo(() => slotsBySlug[selectedSlug] ?? [], [slotsBySlug, selectedSlug]);
  const dates = useMemo(() => uniqueDates(slots), [slots]);
  const activeDate = selectedDate || dates[0] || "";
  const daySlots = slots.filter((slot) => dateKey(slot.startsAt) === activeDate).slice(0, 12);
  const selectedSlotObject = slots.find((slot) => `${slot.startsAt}|${slot.providerId}|${slot.operatoryId}` === selectedSlot);
  const completion = Math.min(100, Math.round(((step + 1) / 5) * 100));
  const brand = String(selectedType?.brandingJson?.brandName ?? "1DentalAI Practice");

  function update(field: keyof Intake, value: string) {
    setIntake((current) => ({ ...current, [field]: value }));
  }

  async function submitBooking() {
    setError("");
    const missing = requiredMissing(intake, selectedSlot);
    if (missing.length) {
      setError(`Please complete: ${missing.join(", ")}.`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/public-booking/${selectedSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...intake, slot: selectedSlot, utmSource }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "The selected time is no longer available.");
      setBookingSummary(selectedSlotObject ? formatSlotLong(selectedSlotObject) : "your selected appointment time");
      setStep(5);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Booking failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selectedType) {
    return (
      <main className="min-h-screen bg-[#eef4ff] p-4 text-neutral-950 md:p-8">
        <section className="mx-auto max-w-2xl rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Online scheduling</p>
          <h1 className="mt-3 text-3xl font-semibold">This booking link is not active</h1>
          <p className="mt-3 text-neutral-600">Please contact the practice for available appointment times.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#8fb2f4] p-4 text-neutral-950 md:p-8">
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-neutral-200 bg-neutral-50 p-5 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{brand}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Book an appointment</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Choose a visit type, pick a real open chair time, and reserve it directly on the practice calendar.</p>
          <div className="mt-6 h-2 rounded-full bg-neutral-200">
            <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} />
          </div>
          <nav className="mt-6 grid gap-2 text-sm">
            {["Patient", "Visit", "Date & time", "Details", "Review"].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => index < step ? setStep(index) : undefined}
                className={`rounded-2xl px-3 py-3 text-left font-semibold ${step === index ? "bg-blue-600 text-white" : index < step ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-h-[720px] p-5 md:p-8">
          {step === 0 ? (
            <Panel eyebrow="Patient type" title="Are you a new or returning patient?">
              <div className="grid gap-3 md:grid-cols-2">
                <Choice selected={intake.patientType === "new"} title="New patient" body="First visit, consultation, emergency, or second opinion." onClick={() => update("patientType", "new")} />
                <Choice selected={intake.patientType === "returning"} title="Returning patient" body="Existing patient booking hygiene, treatment, or follow-up." onClick={() => update("patientType", "returning")} />
              </div>
              <FooterAction onNext={() => setStep(1)} />
            </Panel>
          ) : null}

          {step === 1 ? (
            <Panel eyebrow="Appointment type" title="What would you like to schedule?">
              <div className="grid gap-3 md:grid-cols-2">
                {appointmentTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlug(type.slug);
                      setSelectedSlot("");
                      setSelectedDate(dateKey((slotsBySlug[type.slug] ?? [])[0]?.startsAt));
                    }}
                    className={`rounded-3xl border p-4 text-left transition ${selectedSlug === type.slug ? "border-blue-600 bg-blue-50 shadow-sm" : "border-neutral-200 bg-white hover:border-neutral-300"}`}
                  >
                    <p className="text-lg font-semibold">{type.categoryName ?? type.title}</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{type.defaultMinutes ?? 60} minutes · {type.providerName ?? "First available provider"}</p>
                    <p className="mt-4 text-sm font-semibold text-blue-700">{(slotsBySlug[type.slug] ?? []).length} available openings</p>
                  </button>
                ))}
              </div>
              <FooterAction onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!selectedSlug} />
            </Panel>
          ) : null}

          {step === 2 ? (
            <Panel eyebrow="Calendar" title="Pick a date and time">
              <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
                <div className="rounded-3xl border border-neutral-200 p-4">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {calendarCells(dates).map((cell) => (
                      <button
                        key={cell.key}
                        type="button"
                        disabled={!cell.enabled}
                        onClick={() => {
                          setSelectedDate(cell.key);
                          setSelectedSlot("");
                        }}
                        className={`aspect-square rounded-2xl border text-sm font-semibold ${activeDate === cell.key ? "border-blue-600 bg-blue-600 text-white" : cell.enabled ? "border-neutral-200 bg-white hover:border-blue-400" : "border-neutral-100 bg-neutral-50 text-neutral-300"}`}
                      >
                        {cell.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-neutral-200 p-4">
                  <p className="font-semibold">{activeDate ? formatDateTitle(activeDate) : "No date selected"}</p>
                  <div className="mt-3 grid gap-2">
                    {daySlots.length ? daySlots.map((slot) => {
                      const value = `${slot.startsAt}|${slot.providerId}|${slot.operatoryId}`;
                      return (
                        <button key={value} type="button" onClick={() => setSelectedSlot(value)} className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold ${selectedSlot === value ? "border-blue-600 bg-blue-50 text-blue-800" : "border-neutral-200 bg-white"}`}>
                          {formatTime(slot.startsAt)}
                          <span className="mt-1 block text-xs font-normal text-neutral-500">{slot.providerName} · {slot.operatoryName}</span>
                        </button>
                      );
                    }) : <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">No online slots for this day.</p>}
                  </div>
                </div>
              </div>
              <FooterAction onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!selectedSlot} />
            </Panel>
          ) : null}

          {step === 3 ? (
            <Panel eyebrow="Patient details" title="Tell us who is coming in">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="First name" value={intake.firstName} onChange={(value) => update("firstName", value)} required />
                <Field label="Last name" value={intake.lastName} onChange={(value) => update("lastName", value)} required />
                <Field label="Email" type="email" value={intake.email} onChange={(value) => update("email", value)} required />
                <Field label="Mobile number" type="tel" value={intake.phone} onChange={(value) => update("phone", value)} required />
                <Field label="DOB month" value={intake.dateOfBirthMonth} onChange={(value) => update("dateOfBirthMonth", value)} placeholder="MM" />
                <Field label="DOB day" value={intake.dateOfBirthDay} onChange={(value) => update("dateOfBirthDay", value)} placeholder="DD" />
                <Field label="DOB year" value={intake.dateOfBirthYear} onChange={(value) => update("dateOfBirthYear", value)} placeholder="YYYY" />
                <SelectField label="How did you hear about us?" value={intake.referralSource} onChange={(value) => update("referralSource", value)} options={referralSources} required />
                <SelectField label="Do you have dental insurance?" value={intake.insuranceStatus} onChange={(value) => update("insuranceStatus", value)} options={["Yes", "No", "Not sure"]} required />
                {intake.insuranceStatus === "Yes" ? (
                  <>
                    <Field label="Insurance payer" value={intake.insurancePayerName} onChange={(value) => update("insurancePayerName", value)} />
                    <Field label="Subscriber ID" value={intake.subscriberId} onChange={(value) => update("subscriberId", value)} />
                  </>
                ) : null}
              </div>
              <textarea value={intake.patientNote} onChange={(event) => update("patientNote", event.target.value)} placeholder="Anything the dental team should know?" rows={4} className="mt-3 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-blue-600" />
              <FooterAction onBack={() => setStep(2)} onNext={() => setStep(4)} />
            </Panel>
          ) : null}

          {step === 4 ? (
            <Panel eyebrow="Review" title="Confirm the appointment request">
              <div className="grid gap-3 rounded-3xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
                <Summary label="Visit" value={selectedType.categoryName ?? selectedType.title} />
                <Summary label="Time" value={selectedSlotObject ? formatSlotLong(selectedSlotObject) : "No time selected"} />
                <Summary label="Patient" value={`${intake.firstName} ${intake.lastName}`.trim() || "Missing patient name"} />
                <Summary label="Contact" value={`${intake.phone} · ${intake.email}`} />
                <Summary label="Insurance" value={intake.insuranceStatus === "Yes" ? intake.insurancePayerName || "Insurance payer not entered" : intake.insuranceStatus || "Not answered"} />
              </div>
              {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
              <FooterAction onBack={() => setStep(3)} onNext={submitBooking} nextLabel={submitting ? "Booking..." : "Schedule appointment"} nextDisabled={submitting} />
            </Panel>
          ) : null}

          {step === 5 ? (
            <Panel eyebrow="Confirmed" title="You are on the schedule">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-lg font-semibold text-emerald-950">{bookingSummary || "Your appointment has been reserved."}</p>
                <p className="mt-2 text-sm leading-6 text-emerald-800">The booking was written to the practice calendar. If SMS or email connectors are configured, confirmation delivery is handled through the approved communication workflow.</p>
              </div>
            </Panel>
          ) : null}
        </section>
      </section>

      {showForModal ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Who are you scheduling for?</h2>
            <p className="mt-2 text-sm text-neutral-600">This helps the practice collect the right patient details.</p>
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={() => { update("schedulingFor", "self"); setShowForModal(false); }} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">Myself</button>
              <button type="button" onClick={() => { update("schedulingFor", "someone_else"); setShowForModal(false); }} className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-semibold">Someone else</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2><div className="mt-6">{children}</div></div>;
}

function Choice({ selected, title, body, onClick }: { selected: boolean; title: string; body: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-3xl border p-5 text-left ${selected ? "border-blue-600 bg-blue-50" : "border-neutral-200 bg-white"}`}><p className="text-lg font-semibold">{title}</p><p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p></button>;
}

function FooterAction({ onBack, onNext, nextLabel = "Continue", nextDisabled = false }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
  return <div className="mt-8 flex flex-wrap items-center justify-between gap-3">{onBack ? <button type="button" onClick={onBack} className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-semibold">Back</button> : <span />}<button type="button" disabled={nextDisabled} onClick={onNext} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:bg-neutral-300">{nextLabel}</button></div>;
}

function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}{required ? " *" : ""}<input value={value} onChange={(event) => onChange(event.target.value)} type={type} placeholder={placeholder} className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-blue-600" /></label>;
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}{required ? " *" : ""}<select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-blue-600"><option value="">Select</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4"><span className="font-semibold text-neutral-500">{label}</span><span className="text-right font-semibold text-neutral-950">{value}</span></div>;
}

function uniqueDates(slots: PmsOnlineSlot[]) {
  return Array.from(new Set(slots.map((slot) => dateKey(slot.startsAt)))).filter(Boolean).slice(0, 21);
}

function dateKey(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function calendarCells(enabledDates: string[]) {
  const enabled = new Set(enabledDates);
  const first = enabledDates[0] ? new Date(`${enabledDates[0]}T00:00:00`) : new Date();
  const start = new Date(first);
  start.setDate(1);
  const cells: Array<{ key: string; label: number; enabled: boolean }> = [];
  const leading = start.getDay();
  start.setDate(start.getDate() - leading);
  for (let index = 0; index < 35; index++) {
    const cell = new Date(start);
    cell.setDate(start.getDate() + index);
    const key = cell.toISOString().slice(0, 10);
    cells.push({ key, label: cell.getDate(), enabled: enabled.has(key) });
  }
  return cells;
}

function formatDateTitle(key: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${key}T12:00:00`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatSlotLong(slot: PmsOnlineSlot) {
  return `${new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(slot.startsAt))} with ${slot.providerName}`;
}

function requiredMissing(intake: Intake, slot: string) {
  return [
    !slot ? "appointment time" : "",
    !intake.firstName ? "first name" : "",
    !intake.lastName ? "last name" : "",
    !intake.email ? "email" : "",
    !intake.phone ? "mobile number" : "",
    !intake.referralSource ? "how you heard about us" : "",
    !intake.insuranceStatus ? "insurance answer" : "",
  ].filter(Boolean);
}
