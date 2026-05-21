import { NextResponse } from "next/server";
import { updateAppointmentStatus } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

const allowed = new Set(["HELD", "CONFIRMED", "ARRIVED", "SEATED", "COMPLETED", "BROKEN", "CANCELED"]);

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const body = await request.json();
  if (!allowed.has(body.status)) return NextResponse.json({ error: "Invalid appointment status" }, { status: 400 });
  const row = await updateAppointmentStatus(appointmentId, body.status);
  if (!row) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  return NextResponse.json({ data: row });
}
