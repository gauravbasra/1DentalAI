import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";

const requiredTables = [
  "Tenant",
  "Location",
  "TenantRole",
  "WorkbenchArea",
  "WorkbenchAreaRole",
  "WorkbenchQueueItem",
  "WorkbenchAction",
  "ConnectorReadinessItem",
  "WorkbenchAuditEvent",
  "PmsFamilyAccount",
  "PmsPatient",
  "PmsProvider",
  "PmsStaffMember",
  "PmsOperatory",
  "PmsAppointment",
  "PmsAppointmentCategory",
  "PmsBlockout",
  "PmsAppointmentStatusHistory",
  "PmsAppointmentRequest",
  "PmsRecall",
  "PmsProcedureCode",
  "PmsAppointmentProcedure",
  "PmsMedicalAlert",
  "PmsMedication",
  "PmsAllergy",
  "PmsClinicalNote",
  "PmsToothCondition",
  "PmsProcedureLog",
  "PmsPerioExam",
  "PmsPerioMeasure",
  "PmsTreatmentPlan",
  "PmsTreatmentPlanItem",
  "PmsInsurancePlan",
  "PmsPatientInsurance",
  "PmsBenefitSummary",
  "PmsClaim",
  "PmsClaimLine",
  "PmsLedgerEntry",
  "PmsLedgerAdjustment",
  "PmsPayment",
  "PmsStatement",
  "PmsDocument",
  "PmsLabCase",
  "PmsTask",
  "PmsAuditEvent",
];

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        database: "not_configured",
        requiredTables,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    const result = await client.query<{ table_name: string }>(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
        order by table_name
      `,
      [requiredTables],
    );
    const presentTables = result.rows.map((row) => row.table_name);
    const missingTables = requiredTables.filter((table) => !presentTables.includes(table));

    return NextResponse.json(
      {
        ok: missingTables.length === 0,
        database: missingTables.length === 0 ? "ready" : "migration_incomplete",
        presentTables,
        missingTables,
        requiredTables,
      },
      {
        status: missingTables.length === 0 ? 200 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "connection_failed",
        error: error instanceof Error ? error.message : "Unknown database error",
        requiredTables,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
