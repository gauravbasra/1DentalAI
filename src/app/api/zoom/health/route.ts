import { NextResponse } from "next/server";
import { getZoomCredentialStatus, runZoomConnectionSmokeTest } from "@/lib/zoom-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const credentialStatus = getZoomCredentialStatus();
  try {
    const smokeTest = await runZoomConnectionSmokeTest();
    return NextResponse.json(
      {
        ok: true,
        provider: "ZOOM",
        credentialStatus,
        smokeTest,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom connection smoke test failed.";
    return NextResponse.json(
      {
        ok: false,
        provider: "ZOOM",
        credentialStatus,
        error: message,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
