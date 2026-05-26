"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PerioCommandPreview } from "@/components/perio/perio-command-preview";
import { PerioSiteCursor } from "@/components/perio/perio-site-cursor";

import type { ParsedPerioCommand } from "@/lib/perio-command-parser";

type CommandLogEntry = {
  rawText: string;
  parsed: ParsedPerioCommand;
  result: string;
  ok: boolean;
  createdAt: string;
};

type Props = {
  patientId: string;
};

type TrailKind = "heard" | "parsed" | "applied" | "error";

type TrailItem = { kind: TrailKind; text: string };

export function PerioVoiceCapture({ patientId }: Props) {
  const [transcript, setTranscript] = useState("");
  const [serverReady, setServerReady] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [help, setHelp] = useState("Use a supported microphone. Server transcription is required in production.");
  const [level, setLevel] = useState(0);
  const [running, setRunning] = useState(false);
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [tooth, setTooth] = useState(1);
  const [site, setSite] = useState<"MB" | "B" | "DB" | "ML" | "L" | "DL">("MB");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const stopAll = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setLevel(0);
    setStatus("Stopped");
  }, []);

  useEffect(() => {
    fetch("/api/clinical-ai/transcribe")
      .then((res) => res.json())
      .then((data) => {
        setServerReady(Boolean(data.serverTranscription));
        setHelp(data.serverTranscription ? `Server transcription active: ${data.model}` : "Server transcription blocked: configure OPENAI_API_KEY before live voice.");
      })
      .catch(() => setHelp("Unable to verify transcription health."));
    return () => stopAll();
  }, [stopAll]);

  const openMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access microphone input.");
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    streamRef.current = stream;
    startMeter(stream);
    setStatus("Mic ready");
    addTrail("heard", "Mic opened for perio capture.");
    return stream;
  };

  const startMeter = (stream: MediaStream) => {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const analyser = context.createAnalyser();
    const source = context.createMediaStreamSource(stream);
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    const draw = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      data.forEach((value) => {
        peak = Math.max(peak, Math.abs(value - 128));
      });
      setLevel(Math.min(100, peak * 2));
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const runCommand = async (text: string) => {
    if (!text.trim()) return;
    try {
      const response = await fetch(`/api/pms/perio/${encodeURIComponent(patientId)}/voice-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        addTrail("error", payload.error || "Command failed");
        addCommand(text, parsedFromPayload(payload), false, payload.error || "Command failed");
        return;
      }
      const data = payload?.data;
      const parsed = data?.command;
      addTrail("parsed", JSON.stringify(parsed || text));
      addCommand(text, parsed as ParsedPerioCommand | undefined, true, data?.actionSummary || "Command applied.");
      setTranscript("");
    } catch {
      addTrail("error", "Unable to process the command.");
      addCommand(text, undefined, false, "Unable to process the command.");
    }
  };

  const addCommand = (rawText: string, parsed: ParsedPerioCommand | undefined, ok: boolean, result: string) => {
    setCommandLog((items) => [
      {
        rawText,
        parsed: parsed || ({ type: "CONTROL", action: "NEXT_SITE", rawText } as ParsedPerioCommand),
        result,
        ok,
        createdAt: new Date().toLocaleTimeString(),
      },
      ...items,
    ].slice(0, 12));
  };

  const parsedFromPayload = (payload: { [key: string]: unknown }) => {
    const value = (payload as { data?: { command?: ParsedPerioCommand } }).data?.command;
    return value;
  };

  const transcribeChunk = async (blob: Blob) => {
    const form = new FormData();
    form.append("file", blob, "perio-voice.webm");
    const response = await fetch("/api/clinical-ai/transcribe", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) {
      addTrail("error", payload?.error || "Transcription failed.");
      setHelp(payload?.error || "Transcription failed.");
      return;
    }
    const spoken = String(payload.transcript || "").trim();
    if (!spoken) return;
    setTranscript((prev) => (prev ? `${prev}\n${spoken}` : spoken));
    addTrail("heard", spoken);
    await runCommand(spoken);
  };

  const startListening = async () => {
    if (running) return;
    try {
      if (!serverReady) {
        setHelp("Server transcription is not enabled. Configure OPENAI_API_KEY before live perio voice capture.");
        return;
      }
      const stream = await openMic();
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = async (event) => {
        if (!event.data.size || busyRef.current) return;
        busyRef.current = true;
        try {
          await transcribeChunk(event.data);
        } finally {
          busyRef.current = false;
        }
      };
      recorder.start(2500);
      recorderRef.current = recorder;
      setRunning(true);
      setStatus("Listening");
      addTrail("heard", "Listening started");
      setHelp("Speak: tooth 14 MB 5, or correction commands.");
    } catch (error) {
      setHelp(error instanceof Error ? error.message : "Could not open mic");
      addTrail("error", error instanceof Error ? error.message : "Could not open mic");
    }
  };

  const runTyped = async () => {
    const text = transcript.trim();
    await runCommand(text);
  };

  const addTrail = (kind: TrailKind, text: string) => {
    setTrail((items) => [{ kind, text }, ...items].slice(0, 20));
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Patient</p>
            <p className="text-lg font-semibold text-neutral-900">{patientId}</p>
          </div>
          <p className="text-xs text-neutral-600">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Status</span>
            {status}
          </p>
          <p className="text-xs text-neutral-600">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Server STT</span>
            {serverReady ? "enabled" : "disabled"}
          </p>
          <p className="text-xs text-neutral-600">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Commands</span>
            {commandLog.length}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startListening}
            disabled={running || !serverReady}
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            {running ? "Listening" : "Start voice"}
          </button>
          <button type="button" onClick={() => setRunning(false) || stopAll()} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold">
            Stop
          </button>
          <button type="button" onClick={async () => {
            try {
              const stream = await openMic();
              if (stream) {
                stopAll();
                addTrail("heard", "Mic opened in test mode.");
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : "Mic test failed";
              setHelp(message);
              addTrail("error", message);
            }
          }} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold">
            Test mic
          </button>
          <button type="button" onClick={runTyped} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
            Run typed
          </button>
        </div>

        <label className="mt-3 grid gap-1 text-sm font-semibold text-neutral-700">
          Command phrase
          <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} className="min-h-20 rounded-xl border border-neutral-300 px-3 py-2" />
        </label>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full bg-emerald-600" style={{ width: `${level}%` }} /></div>
        <p className="mt-2 text-xs text-neutral-600">{help}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PerioSiteCursor tooth={tooth} site={site} onToothChange={setTooth} onSiteChange={setSite} />
        <div className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Trail</p>
          <div className="mt-2 grid gap-1">
            {trail.length ? trail.map((item, index) => <p key={`${item.kind}-${index}-${item.text.slice(0, 20)}`} className={`rounded-md px-2 py-1 text-xs ${item.kind === "error" ? "bg-rose-50 text-rose-700" : "bg-neutral-50 text-neutral-700"}`}>{item.kind.toUpperCase()}: {item.text}</p>) : <p className="text-xs text-neutral-500">No capture yet.</p>}
          </div>
        </div>
      </div>

      <PerioCommandPreview entries={commandLog} />
    </div>
  );
}
