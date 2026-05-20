import { NextResponse } from "next/server";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { getWorkbenchesForRole, workbenchAreas } from "@/lib/workbench-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = getRole(searchParams.get("role") ?? undefined);
  const areas = getWorkbenchesForRole(role.key as RoleKey);

  return NextResponse.json({
    data: {
      role: role.key,
      workbenches: areas,
      allWorkbenchCount: workbenchAreas.length,
    },
    meta: {
      source: "phase2-workbench-service",
      persistenceContract: "prisma.WorkbenchArea + WorkbenchQueueItem + WorkbenchAction + WorkbenchAuditEvent",
    },
  });
}
