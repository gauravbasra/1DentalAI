import { NextResponse } from "next/server";
import { getPerio } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const perio = await getPerio(patientId);
  if (!perio.patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  return NextResponse.json({ data: perio });
}
