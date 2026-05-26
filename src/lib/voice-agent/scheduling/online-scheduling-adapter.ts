import { query } from "@/lib/db";
import { defaultTenantId, getOnlineSchedulingAvailability, submitOnlineBooking } from "@/lib/pms-repository";
import type { SchedulingAdapter, SlotCriteria, HeldSlot } from "./adapters";
import type { Slot } from "../types";

function normalizeDay(value: string) {
  return value.trim().toLowerCase();
}

const PRACTICE_TZ = process.env.ONE_DENTAL_PRACTICE_TIMEZONE || process.env.TZ || "America/Denver";

function weekdayLong(iso: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: PRACTICE_TZ }).format(new Date(iso));
}

function hourInTz(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: PRACTICE_TZ }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value;
  return Number(hour || 0);
}

function slotMatchesCriteria(slot: Slot, criteria: SlotCriteria) {
  if (criteria.preferredDays?.length) {
    const slotDay = normalizeDay(weekdayLong(slot.slotStart));
    const wanted = new Set(criteria.preferredDays.map((d) => normalizeDay(d)));
    if (!wanted.has(slotDay)) return false;
  }
  if (criteria.preferredTimeWindows?.length) {
    const hour = hourInTz(slot.slotStart);
    const window = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const wanted = new Set(criteria.preferredTimeWindows.map((w) => normalizeDay(w)));
    if (!wanted.has(window)) return false;
  }
  return true;
}

async function pickActiveSlug(tenantId: string, practiceId: string | null): Promise<string | null> {
  // practiceId mapping is optional for now; prefer any ACTIVE scheduling link.
  const result = await query<{ slug: string }>(
    `select "slug"
     from "PmsOnlineSchedulingLink"
     where "tenantId" = $1 and "status" = 'ACTIVE'
     order by "updatedAt" desc
     limit 1`,
    [tenantId],
  );
  return result.rows[0]?.slug ?? null;
}

export class OnlineSchedulingAdapter implements SchedulingAdapter {
  sourceSystem = "PMS_ONLINE_SCHEDULING";

  constructor(private readonly tenantId: string = defaultTenantId) {}

  async fetchAvailableSlots(practiceId: string | null, criteria: SlotCriteria): Promise<Slot[]> {
    const slug = await pickActiveSlug(this.tenantId, practiceId);
    if (!slug) return [];
    const slots = await getOnlineSchedulingAvailability(slug, this.tenantId);
    const normalized: Slot[] = slots.map((slot) => ({
      slotId: `${slot.startsAt}|${slot.providerId}|${slot.operatoryId}`,
      providerId: slot.providerId,
      providerName: slot.providerName,
      slotStart: slot.startsAt,
      slotEnd: slot.endsAt,
      serviceType: criteria.serviceType,
      sourceSystem: this.sourceSystem,
    }));
    const filtered = normalized.filter((slot) => slotMatchesCriteria(slot, criteria));
    return (filtered.length ? filtered : normalized).slice(0, 6);
  }

  async holdSlot(practiceId: string | null, slotId: string, _patient: Record<string, unknown>): Promise<HeldSlot> {
    const [startsAt, providerId, operatoryId] = slotId.split("|");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return {
      heldSlotId: slotId,
      expiresAt,
      slot: {
        slotId,
        providerId: providerId || null,
        providerName: null,
        slotStart: startsAt,
        slotEnd: new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString(),
        serviceType: "visit",
        sourceSystem: this.sourceSystem,
      },
    };
  }

  async confirmAppointment(practiceId: string | null, heldSlotId: string, payload: Record<string, unknown>) {
    const slug = await pickActiveSlug(this.tenantId, practiceId);
    if (!slug) throw new Error("Online scheduling is not configured for this tenant.");
    const [startsAt, providerId, operatoryId] = heldSlotId.split("|");
    const patient = (payload.patient || {}) as Record<string, unknown>;
    const appointment = (payload.appointment || {}) as Record<string, unknown>;
    const booking = await submitOnlineBooking({
      tenantId: this.tenantId,
      slug,
      startsAt,
      providerId,
      operatoryId,
      firstName: String(patient.first_name || "").trim() || "Patient",
      lastName: String(patient.last_name || "").trim() || "Unknown",
      phone: String(patient.phone || "").trim() || undefined,
      email: String(patient.email || "").trim() || undefined,
      insurancePayerName: undefined,
      subscriberId: undefined,
      patientNote: `Booked by Voice AI. Reason: ${String(appointment.reason || "visit")}`,
      utmSource: "voice_ai_twilio",
    });
    return { externalAppointmentId: booking.appointmentId };
  }

  async releaseHold(_practiceId: string | null, _heldSlotId: string) {}
}
