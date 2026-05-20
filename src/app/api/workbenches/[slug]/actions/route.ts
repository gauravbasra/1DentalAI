import { NextResponse } from "next/server";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { canRoleAccessWorkbench, evaluateAction, findWorkbenchAction } from "@/lib/workbench-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => null) as { role?: string; actionId?: string } | null;
  const role = getRole(body?.role);

  if (!body?.actionId) {
    return NextResponse.json({ error: "actionId is required." }, { status: 400 });
  }

  const match = findWorkbenchAction(slug, body.actionId);
  if (!match) {
    return NextResponse.json({ error: "Unknown workbench action." }, { status: 404 });
  }

  if (!canRoleAccessWorkbench(role.key as RoleKey, match.area)) {
    return NextResponse.json({
      error: "Role does not have access to this workbench.",
      data: { role: role.key, slug },
      audit: {
        outcome: "BLOCKED",
        eventType: "workbench.action.denied",
        summary: `${role.title} attempted ${match.action.label} without workbench access.`,
      },
    }, { status: 403 });
  }

  const decision = evaluateAction(role.key as RoleKey, match.action);
  const status = decision.allowed ? 200 : 409;

  return NextResponse.json({
    data: {
      slug,
      queueItemId: match.item.id,
      actionId: match.action.id,
      action: match.action.label,
      allowed: decision.allowed,
      resultStatus: match.action.resultStatus,
      reason: decision.reason,
    },
    audit: {
      outcome: decision.outcome,
      eventType: decision.allowed ? "workbench.action.accepted" : "workbench.action.blocked",
      summary: decision.allowed
        ? `${role.title} staged ${match.action.label} for ${match.item.title}.`
        : `${role.title} was blocked from ${match.action.label}: ${decision.reason}`,
    },
    meta: {
      source: "phase2-workbench-action-service",
      persistenceContract: "WorkbenchAuditEvent stores this action result when DATABASE_URL is enabled.",
    },
  }, { status });
}
