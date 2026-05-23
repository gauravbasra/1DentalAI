"use client";

import { useRef, useState } from "react";
import type { PmsPatientSummary } from "@/lib/pms-repository";
import { scribeTemplates, type ScribeDraft, type ScribeProcedureCode, type ScribeSuggestion, type ScribeTaskDraft } from "@/lib/pms-scribe";

type Props = {
  patients: PmsPatientSummary[];
  procedureCodes: ScribeProcedureCode[];
};

const controlClass = "min-w-0 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:bg-neutral-300";
const secondaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:text-neutral-400";

const defaultTranscript = "Patient reports sensitivity on tooth #19. Bitewing reviewed. Discussed MOD composite and possible crown if symptoms persist. Medical history reviewed with no changes.";

export function PmsScribeWorkspace({ patients, procedureCodes }: Props) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [templateKey, setTemplateKey] = useState("specific_exam");
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [signedByName, setSignedByName] = useState("");
  const [patientAcknowledged, setPatientAcknowledged] = useState(false);
  const [providerAttestation, setProviderAttestation] = useState(false);
  const [recordingMode, setRecordingMode] = useState("manual_dictation");
  const [draft, setDraft] = useState<ScribeDraft | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [suggestions, setSuggestions] = useState<ScribeSuggestion[]>([]);
  const [tasks, setTasks] = useState<ScribeTaskDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("Ready to capture or paste the appointment conversation.");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const selectedPatient = patients.find((patient) => patient.id === patientId);
  const consent = {
    patientAcknowledged,
    providerAttestation,
    signedByName,
    recordingMode,
  };
  const consentReady = patientAcknowledged && providerAttestation && signedByName.trim().length > 1;

  async function generateDraft() {
    if (!consentReady) {
      setMessage("Patient acknowledgement, signer name, and provider attestation are required before AI scribe generation.");
      return;
    }
    setMessage("Generating provider-review scribe draft...");
    const response = await fetch("/api/pms/scribe/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        templateKey,
        patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Patient",
        consent,
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

  async function startRecording() {
    if (!consentReady) {
      setMessage("Capture requires patient acknowledgement, signer name, and provider attestation.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Audio capture is not available in this browser.");
      return;
    }
    setRecordingMode("ambient_audio");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      void transcribeAudio(new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setMessage("Recording appointment audio...");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setMessage("Transcribing governed scribe audio...");
  }

  async function transcribeAudio(blob: Blob) {
    const formData = new FormData();
    formData.set("file", blob, "scribe-audio.webm");
    formData.set("patientAcknowledged", String(patientAcknowledged));
    formData.set("providerAttestation", String(providerAttestation));
    formData.set("signedByName", signedByName.trim());
    formData.set("recordingMode", "ambient_audio");
    const response = await fetch("/api/pms/scribe/transcribe", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to transcribe audio.");
      return;
    }
    setTranscript((current) => [current.trim(), payload.data.transcript].filter(Boolean).join("\n\n"));
    setMessage(`Audio transcribed with ${payload.data.model}. Review transcript before draft generation.`);
  }

  async function saveDraft() {
    if (!draft || !patientId) return;
    if (!consentReady) {
      setMessage("Patient acknowledgement, signer name, and provider attestation are required before PMS save.");
      return;
    }
    setSaving(true);
    setMessage("Saving approved draft package...");
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
        consent,
        generation: draft.generation,
      }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save scribe package.");
      return;
    }
    setMessage(`Saved draft note, ${payload.data.treatmentItemIds?.length ?? 0} CDT rows, and ${payload.data.taskIds?.length ?? 0} tasks for provider review.`);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="grid gap-4">
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Patient
          <select value={patientId} onChange={(event) => setPatientId(event.target.value)} className={controlClass}>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>{patient.lastName}, {patient.firstName} - {patient.chartNumber}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Template
          <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className={controlClass}>
            {scribeTemplates.map((template) => <option key={template.key} value={template.key}>{template.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Patient or guardian signer
          <input value={signedByName} onChange={(event) => setSignedByName(event.target.value)} className={controlClass} placeholder="Name on acknowledgement" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Capture mode
          <select value={recordingMode} onChange={(event) => setRecordingMode(event.target.value)} className={controlClass}>
            <option value="manual_dictation">Manual dictation</option>
            <option value="ambient_audio">Ambient audio</option>
            <option value="imported_transcript">Imported transcript</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-xs font-semibold text-neutral-700">
          <input type="checkbox" checked={patientAcknowledged} onChange={(event) => setPatientAcknowledged(event.target.checked)} className="mt-1" />
          Patient acknowledged AI scribe recording/dictation use.
        </label>
        <label className="flex items-start gap-2 text-xs font-semibold text-neutral-700">
          <input type="checkbox" checked={providerAttestation} onChange={(event) => setProviderAttestation(event.target.checked)} className="mt-1" />
          Provider attests the draft will be reviewed before chart writeback.
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Transcript or dictation
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={9} className={controlClass} />
        </label>
        <div className="flex flex-wrap gap-2">
          {recording ? (
            <button type="button" onClick={stopRecording} className={buttonClass}>Stop and transcribe</button>
          ) : (
            <button type="button" onClick={startRecording} className={secondaryButtonClass}>Record audio</button>
          )}
          <button type="button" onClick={generateDraft} className={buttonClass}>Generate draft</button>
          <button type="button" onClick={() => setTranscript(defaultTranscript)} className={secondaryButtonClass}>Load sample</button>
        </div>
        <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">{message}</p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">Provider review draft</p>
              <h3 className="mt-1 text-lg font-semibold text-neutral-950">{draft?.treatmentPlanName || "No draft generated"}</h3>
            </div>
            <button type="button" disabled={!draft || saving} onClick={saveDraft} className={buttonClass}>{saving ? "Saving..." : "Save approved output"}</button>
          </div>
          <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} rows={14} className={`${controlClass} mt-4 font-mono`} placeholder="Generated note appears here." />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Summary title="CDT Suggestions" value={suggestions.length} detail={suggestions.map((item) => item.code).join(", ") || "None"} />
          <Summary title="Tasks" value={tasks.length} detail={tasks.map((task) => task.ownerRoleKey).join(", ") || "None"} />
          <Summary title="Known CDT Codes" value={procedureCodes.length} detail="Allowed code catalog loaded from PMS tenant data." />
          <Summary title="AI Source" value={draft?.generation.source ?? "pending"} detail={draft?.generation.blockedReason ?? draft?.generation.model ?? "No generation yet."} />
        </div>
      </div>
    </div>
  );
}

function Summary({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-600">{detail}</p>
    </div>
  );
}
