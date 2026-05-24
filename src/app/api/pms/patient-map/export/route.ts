import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { getPatientMapAnalytics, parsePatientMapFilters } from "@/lib/pms-patient-map-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;

  const filters = parsePatientMapFilters(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const analytics = await getPatientMapAnalytics(auth.session.tenantId, filters);
  const rows = [
    ["household", "city", "state", "zip", "patients", "family_members", "production_cents", "treatment_cents", "opportunity_score", "services", "payers", "providers", "referral_sources", "age_bands", "gender_segments"],
    ...analytics.points.map((point) => [
      point.label,
      point.city ?? "",
      point.state ?? "",
      point.postalCode ?? "",
      String(point.patientCount),
      String(point.familyMemberCount),
      String(point.productionCents),
      String(point.treatmentCents),
      String(point.opportunityScore),
      point.serviceLines.join("; "),
      point.payerNames.join("; "),
      point.providerNames.join("; "),
      point.referralSources.join("; "),
      point.ageBands.join("; "),
      point.genderSegments.join("; "),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patient-map-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
