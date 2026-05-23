import { NextResponse } from "next/server";
import { addClinicalNote, addTreatmentPlanItem, createTask, createTreatmentPlan, listProcedureCodes } from "@/lib/pms-repository";
import type { ScribeSuggestion, ScribeTaskDraft } from "@/lib/pms-scribe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const patientId = String(body.patientId ?? "").trim();
  const noteBody = String(body.noteBody ?? "").trim();
  const noteType = String(body.noteType ?? "PROGRESS").trim();
  const suggestions = (body.treatmentSuggestions ?? []) as ScribeSuggestion[];
  const taskDrafts = (body.taskDrafts ?? []) as ScribeTaskDraft[];

  if (!patientId || noteBody.length < 3) {
    return NextResponse.json({ error: "patientId and noteBody are required" }, { status: 400 });
  }

  const note = await addClinicalNote(patientId, noteBody, noteType);
  const procedureCodes = await listProcedureCodes();
  const procedureByCode = new Map(procedureCodes.map((code) => [code.code, code]));

  let treatmentPlan = null;
  const savedItems = [];
  const validSuggestions = suggestions.filter((item) => procedureByCode.has(item.code));
  if (validSuggestions.length) {
    treatmentPlan = await createTreatmentPlan({
      patientId,
      name: String(body.treatmentPlanName || "AI scribe treatment plan"),
      presentationNote: String(body.treatmentPlanNote || "Generated from approved scribe note. CDT codes and sequence reviewed by practice before presentation."),
    });

    for (const suggestion of validSuggestions) {
      const code = procedureByCode.get(suggestion.code);
      if (!code) continue;
      savedItems.push(
        await addTreatmentPlanItem({
          treatmentPlanId: treatmentPlan.id,
          procedureCodeId: code.id,
          phase: Number(suggestion.phase || 1),
          tooth: suggestion.tooth || undefined,
          surface: suggestion.surface || undefined,
        }),
      );
    }
  }

  const savedTasks = [];
  for (const task of taskDrafts) {
    savedTasks.push(
      await createTask({
        patientId,
        ownerRoleKey: task.ownerRoleKey,
        title: task.title,
        taskType: task.taskType,
        priority: task.priority,
      }),
    );
  }

  return NextResponse.json(
    {
      data: {
        note,
        treatmentPlan,
        treatmentItems: savedItems,
        tasks: savedTasks,
      },
    },
    { status: 201 },
  );
}
