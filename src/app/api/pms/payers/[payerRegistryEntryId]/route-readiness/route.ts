import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { getPayerRouteReadiness, PAYER_TRANSACTION_FAMILIES, type PayerTransactionFamily } from "@/lib/payer-network-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ payerRegistryEntryId: string }> }) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const { payerRegistryEntryId } = await params;
  const { searchParams } = new URL(request.url);
  const transactionFamily = searchParams.get("transactionFamily");

  if (!transactionFamily || !PAYER_TRANSACTION_FAMILIES.includes(transactionFamily as PayerTransactionFamily)) {
    return NextResponse.json({ error: "A supported transactionFamily is required.", supportedFamilies: PAYER_TRANSACTION_FAMILIES }, { status: 400 });
  }

  const readiness = await getPayerRouteReadiness({
    tenantId: auth.session.tenantId,
    payerRegistryEntryId,
    transactionFamily: transactionFamily as PayerTransactionFamily,
  });

  return NextResponse.json({ data: readiness });
}
