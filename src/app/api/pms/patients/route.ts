import { NextResponse } from "next/server";
import { createPatient, listPatients } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patients = await listPatients(undefined, searchParams.get("q") ?? "");
  return NextResponse.json({ data: patients });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.firstName || !body.lastName) {
    return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
  }
  const patient = await createPatient(body);
  return NextResponse.json({ data: patient }, { status: 201 });
}
