"use client";

import { useState } from "react";
import type { PmsPatientSummary } from "@/lib/pms-repository";
import { scribeTemplates, type ScribeDraft, type ScribeProcedureCode, type ScribeSuggestion, type ScribeTaskDraft } from "@/lib/pms-scribe";

type Props = {
  patients: PmsPatientSummary[];
  procedureCodes: ScribeProcedureCode[];
};

const controlClass = "min-w-0 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300";
const secondaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50";

export function PmsScribeWorkspace({ patients, procedureCodes }: Props) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [templateKey, setTemplateKey] = useState("specific_exam");
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [draft, setDraft] = useState<ScribeDraft | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [suggestions, setSuggestions] = useState<ScribeSuggestion[]>([]);
  const [tasks, setTasks] = useState<ScribeTaskDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Ready to capture or paste the appointment conversation.");

  const selectedPatient = patients.find((patient) => patient.id === patientId);
  async function generateDraft() {
    setMessage("Generating scribe draft...");
    const response = await fetch("/api/pms/scribe/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        templateKey,
        patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Patient",
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to generate draft.");
      return;
    }
    setDraft(payload.data);
    setNoteBody(payload.data.noteBody);
    setSuggestions(payload.data.treatmentSuggestions);
    setTasks(payload.data.taskDrafts);
    setMessage("Draft generated. Review and edit before saving to the PMS chart.");
  }

  async function saveDraft() {
    if (!draft || !patientId) return;
    setSaving(true);
    setMessage("Saving approved note, treatment plan, and tasks...");
    const response = await fetch("/api/pms/scribe/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        noteType: draft.noteType,
        noteBody,
        treatmentPlanName: draft.treatmentPlanName,
        treatmentPlanNote: draft.treatmentPlanNote,
        treatmentSuggestions: suggestions,
        taskDrafts: tasks,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save scribe package.");
      return;
    }
    setMessage(`Saved note${payload.data.treatmentPlan ? ", treatment plan" : ""}, ${payload.data.treatmentItems.length} CDT rows, and ${payload.data.tasks.length} tasks.`);
  }

  function updateSuggestion(index: number, patch: Partial<ScribeSuggestion>) {
    setSuggestions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function updateSuggestionCode(index: number, code: string) {
    const procedure = procedureCodes.find((item) => item.code === code);
    updateSuggestion(index, {
      code,
      procedureCodeId: procedure?.id,
      description: procedure?.description ?? code,
    });
  }

  function addSuggestion() {
    const first = procedureCodes[0];
    if (!first) return;
    setSuggestions((current) => [
      ...current,
      {
        code: first.code,
        procedureCodeId: first.id,
        description: first.description,
        tooth: "",
        surface: "",
        phase: 1,
        priority: "NORMAL",
        ownerRoleKey: "treatment_coordinator",
        reason: "Added manually by practice.",
      },
    ]);
  }

  function removeSuggestion(index: number) {
    setSuggestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addTask() {
    setTasks((current) => [
      ...current,
      {
        ownerRoleKey: "treatment_coordinator",
        title: "Follow up on scribe treatment plan",
        taskType: "SCRIBE_FOLLOW_UP",
        priority: "NORMAL",
      },
    ]);
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Patient
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)} className={controlClass}>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} - {patient.chartNumber}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Template
              <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className={controlClass}>
                {scribeTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-neutral-700">
              Transcript / dictation
              <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={14} className={controlClass} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={generateDraft} className={buttonClass}>Generate draft</button>
              <button type="button" onClick={() => setTranscript("")} className={secondaryButtonClass}>Clear</button>
            </div>
            <p className="rounded-md bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-950">{message}</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Provider review</p>
              <h2 className="text-base font-semibold text-neutral-950">Clinical note draft</h2>
            </div>
            <button type="button" disabled={!draft || saving} onClick={saveDraft} className={buttonClass}>Save approved output</button>
          </div>
          {draft ? (
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={24} className={`${controlClass} mt-4 font-mono text-xs leading-5`} />
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
              Generate a draft to review the note here. Nothing is written to the patient chart until Save approved output is clicked.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Treatment plan</p>
              <h2 className="text-base font-semibold text-neutral-950">CDT suggestions, editable by practice</h2>
            </div>
            <button type="button" onClick={addSuggestion} className={secondaryButtonClass}>Add CDT row</button>
          </div>
          <div className="mt-4 grid gap-3">
            {suggestions.length ? suggestions.map((item, index) => (
              <div key={`${item.code}-${index}`} className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 lg:grid-cols-[1.4fr_0.5fr_0.5fr_0.45fr_auto]">
                <label className="grid gap-1 text-xs font-semibold text-neutral-600">
                  CDT code
                  <select value={item.code} onChange={(event) => updateSuggestionCode(index, event.target.value)} className={controlClass}>
                    {procedureCodes.map((code) => <option key={code.id} value={code.code}>{code.code} - {code.description}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-neutral-600">Tooth<input value={item.tooth} onChange={(event) => updateSuggestion(index, { tooth: event.target.value })} className={controlClass} /></label>
                <label className="grid gap-1 text-xs font-semibold text-neutral-600">Surface<input value={item.surface} onChange={(event) => updateSuggestion(index, { surface: event.target.value })} className={controlClass} /></label>
                <label className="grid gap-1 text-xs font-semibold text-neutral-600">Phase<input type="number" value={item.phase} onChange={(event) => updateSuggestion(index, { phase: Number(event.target.value || 1) })} className={controlClass} /></label>
                <button type="button" onClick={() => removeSuggestion(index)} className="self-end rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700">Remove</button>
                <p className="lg:col-span-5 text-xs leading-5 text-neutral-500">{item.description} - {item.reason}</p>
              </div>
            )) : (
              <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">No CDT suggestions yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Tasks and analytics</p>
              <h2 className="text-base font-semibold text-neutral-950">Team handoff</h2>
            </div>
            <button type="button" onClick={addTask} className={secondaryButtonClass}>Add task</button>
          </div>
          {draft ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Completeness" value={`${draft.analytics.completeness}%`} />
              <Metric label="CDT rows" value={String(suggestions.length)} />
              <Metric label="Tasks" value={String(tasks.length)} />
              <Metric label="Review sections" value={String(draft.analytics.needsReview.length)} />
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {tasks.length ? tasks.map((task, index) => (
              <div key={`${task.title}-${index}`} className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <input value={task.title} onChange={(event) => setTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className={controlClass} />
                <div className="grid gap-2 sm:grid-cols-3">
                  <select value={task.ownerRoleKey} onChange={(event) => setTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ownerRoleKey: event.target.value } : item))} className={controlClass}>
                    <option value="associate_provider">Provider</option>
                    <option value="dental_assistant">Dental assistant</option>
                    <option value="rdh">Hygienist / RDH</option>
                    <option value="treatment_coordinator">Treatment coordinator</option>
                    <option value="billing_rcm">Billing / RCM</option>
                  </select>
                  <select value={task.priority} onChange={(event) => setTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, priority: event.target.value as "HIGH" | "NORMAL" } : item))} className={controlClass}>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                  </select>
                  <button type="button" onClick={() => setTasks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700">Remove</button>
                </div>
              </div>
            )) : (
              <p className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">Tasks appear after draft generation or can be added manually.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

const defaultTranscript = [
  "Patient reports crown came off tooth 30 while eating and the tooth feels sensitive.",
  "PA radiograph reviewed. Discussed porcelain crown and core buildup, alternatives, benefits, risks, and insurance estimate.",
  "Patient wants earliest morning appointment and treatment coordinator follow-up.",
].join("\n");
