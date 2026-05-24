import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { resolveInsurancePlanPayer, searchPayerMatrix } from "@/lib/payer-network-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const payerId = searchParams.get("payerId");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 50);

  if (!query.trim() && !payerId?.trim()) {
    return NextResponse.json({ error: "q or payerId is required." }, { status: 400 });
  }

  if (payerId?.trim()) {
    const resolution = await resolveInsurancePlanPayer({ tenantId: auth.session.tenantId, payerName: query, payerId });
    return NextResponse.json({ data: resolution });
  }

  return NextResponse.json({ data: await searchPayerMatrix({ tenantId: auth.session.tenantId, query, limit }) });
}
