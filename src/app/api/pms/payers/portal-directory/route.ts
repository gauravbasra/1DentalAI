import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { getPayerPortalDirectory, upsertPayerPortalSettings } from "@/lib/payer-network-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await getPayerPortalDirectory(auth.session.tenantId) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await upsertPayerPortalSettings({
    tenantId: auth.session.tenantId,
    actorRole: auth.session.roleKey,
    payerRegistryEntryId: String(body.payerRegistryEntryId ?? ""),
    portalUrl: String(body.portalUrl ?? ""),
    loginPath: typeof body.loginPath === "string" ? body.loginPath : undefined,
    eligibilityPath: typeof body.eligibilityPath === "string" ? body.eligibilityPath : undefined,
    supportedTasks: Array.isArray(body.supportedTasks) ? body.supportedTasks.map((task) => String(task)) : [],
    credentialStatus: typeof body.credentialStatus === "string" ? body.credentialStatus : undefined,
    credentialVaultId: typeof body.credentialVaultId === "string" ? body.credentialVaultId : undefined,
    ownerRoleKey: typeof body.ownerRoleKey === "string" ? body.ownerRoleKey : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });
  return NextResponse.json({ data: result });
}
