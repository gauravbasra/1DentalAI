import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      app: "1DentalAI",
      phase: "phase-2-role-workbenches",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      dentalRcmPort3000Shared: false,
      servicePort: Number(process.env.PORT ?? 3001),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
