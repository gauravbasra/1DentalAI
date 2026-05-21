import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/pms-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json({ data: await listTasks(undefined, searchParams.get("role") ?? undefined) });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.ownerRoleKey || !body.title || !body.taskType) {
    return NextResponse.json({ error: "ownerRoleKey, title, and taskType are required" }, { status: 400 });
  }
  return NextResponse.json({ data: await createTask(body) }, { status: 201 });
}
