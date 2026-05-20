import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      app: "1DentalAI",
      phase: "phase-1-core-platform-foundation",
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
