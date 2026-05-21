import { NextResponse } from "next/server";
import { getPatient } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const patient = await getPatient(patientId);
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ data: patient });
}
