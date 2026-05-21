import { NextResponse } from "next/server";
import { createAppointmentHold } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.startsAt || !body.endsAt || !body.appointmentType) {
    return NextResponse.json({ error: "startsAt, endsAt, and appointmentType are required" }, { status: 400 });
  }
  const hold = await createAppointmentHold(body);
  return NextResponse.json({ data: hold }, { status: 201 });
}
