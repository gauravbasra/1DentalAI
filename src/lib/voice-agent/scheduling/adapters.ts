import type { Slot } from "../types";

export type SlotCriteria = {
  serviceType: string;
  preferredDays: string[];
  preferredTimeWindows: string[];
  preferredProvider?: string | null;
  patientType: "new" | "existing" | "unknown";
};

export type HeldSlot = {
  heldSlotId: string;
  slot: Slot;
  expiresAt: string;
};

export type SchedulingAdapter = {
  sourceSystem: string;
  fetchAvailableSlots(practiceId: string | null, criteria: SlotCriteria): Promise<Slot[]>;
  holdSlot(practiceId: string | null, slotId: string, patient: Record<string, unknown>): Promise<HeldSlot>;
  confirmAppointment(practiceId: string | null, heldSlotId: string, payload: Record<string, unknown>): Promise<{ externalAppointmentId: string }>;
  releaseHold(practiceId: string | null, heldSlotId: string): Promise<void>;
};

export { OnlineSchedulingAdapter } from "./online-scheduling-adapter";

export class MockSchedulingAdapter implements SchedulingAdapter {
  sourceSystem = "MOCK";

  async fetchAvailableSlots(_practiceId: string | null, criteria: SlotCriteria): Promise<Slot[]> {
    const now = new Date();
    const base = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const slots: Slot[] = [];
    const service = criteria.serviceType || "cleaning";
    for (let i = 0; i < 6; i++) {
      const start = new Date(base.getTime() + i * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      slots.push({
        slotId: `mock_slot_${i + 1}`,
        providerId: "mock_provider_1",
        providerName: "Dr. Rivera",
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
        serviceType: service,
        sourceSystem: this.sourceSystem,
      });
    }
    return slots.slice(0, 3);
  }

  async holdSlot(_practiceId: string | null, slotId: string, patient: Record<string, unknown>): Promise<HeldSlot> {
    const slot = (await this.fetchAvailableSlots(null, { serviceType: String(patient.serviceType || "cleaning"), preferredDays: [], preferredTimeWindows: [], patientType: "unknown" }))
      .find((s) => s.slotId === slotId) || (await this.fetchAvailableSlots(null, { serviceType: "cleaning", preferredDays: [], preferredTimeWindows: [], patientType: "unknown" }))[0];
    return {
      heldSlotId: `mock_hold_${slotId}`,
      slot,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async confirmAppointment(_practiceId: string | null, heldSlotId: string, payload: Record<string, unknown>) {
    void payload;
    return { externalAppointmentId: `mock_appt_${heldSlotId}` };
  }

  async releaseHold(_practiceId: string | null, heldSlotId: string) {
    void heldSlotId;
  }
}
