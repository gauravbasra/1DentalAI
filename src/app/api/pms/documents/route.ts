import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await listDocuments() });
}
