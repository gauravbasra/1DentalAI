import { NextResponse } from "next/server";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { canRoleAccessWorkbench, getWorkbench } from "@/lib/workbench-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const role = getRole(searchParams.get("role") ?? undefined);
  const area = getWorkbench(slug);

  if (!area) {
    return NextResponse.json({ error: "Unknown workbench." }, { status: 404 });
  }

  if (!canRoleAccessWorkbench(role.key as RoleKey, area)) {
    return NextResponse.json({
      error: "Role does not have access to this workbench.",
      data: { role: role.key, slug },
    }, { status: 403 });
  }

  return NextResponse.json({
    data: area,
    meta: {
      source: "phase2-workbench-detail-service",
      liveCapability: area.liveCapability,
    },
  });
}
