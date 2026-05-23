import "server-only";

import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";

type PmsApiSession = NonNullable<Awaited<ReturnType<typeof currentSession>>>;

const pmsApiRoles = new Set([
  "super_admin",
  "dso_admin",
  "practice_manager",
  "owner_doctor",
  "associate_provider",
  "rdh",
  "clinical_assistant",
  "front_desk",
  "treatment_coordinator",
  "billing_rcm",
  "insurance_coordinator",
  "marketing_growth",
]);

export type PmsApiAuthResult =
  | { session: PmsApiSession; response: null }
  | { session: null; response: NextResponse };

export async function requirePmsApiSession(): Promise<PmsApiAuthResult> {
  const session = await currentSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 }),
    };
  }

  if (!pmsApiRoles.has(session.roleKey)) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, error: "PMS access is not permitted for this role." }, { status: 403 }),
    };
  }

  return { session, response: null };
}
