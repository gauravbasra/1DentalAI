import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { getPayerMatrixCoverage } from "@/lib/payer-network-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await getPayerMatrixCoverage(auth.session.tenantId) });
}
