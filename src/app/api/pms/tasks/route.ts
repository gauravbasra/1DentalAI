import { NextResponse } from "next/server";
import { requirePmsApiSession } from "@/lib/pms-api-auth";
import { createTask, listTasks } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);
  return NextResponse.json({ data: await listTasks(auth.session.tenantId, searchParams.get("role") ?? undefined) });
}

export async function POST(request: Request) {
  const auth = await requirePmsApiSession();
  if (auth.response) return auth.response;
  const body = await request.json();
  if (!body.ownerRoleKey || !body.title || !body.taskType) {
    return NextResponse.json({ error: "ownerRoleKey, title, and taskType are required" }, { status: 400 });
  }
  return NextResponse.json({ data: await createTask({ ...body, tenantId: auth.session.tenantId }) }, { status: 201 });
}
