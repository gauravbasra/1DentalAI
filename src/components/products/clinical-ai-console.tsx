"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Site = "MB" | "B" | "DB" | "ML" | "L" | "DL";
type Metric = "PD" | "GM" | "CAL" | "MGJ" | "Bld" | "Sup";
type Chart = Record<number, Partial<Record<Site, Partial<Record<Metric, string>>>>>;
type Trail = { kind: "heard" | "parsed" | "charted" | "error"; text: string };

const upper = Array.from({ length: 16 }, (_, index) => index + 1);
const lower = Array.from({ length: 16 }, (_, index) => 32 - index);
const facial: Site[] = ["MB", "B", "DB"];
const lingual: Site[] = ["ML", "L", "DL"];
const metrics: Metric[] = ["PD", "GM", "CAL", "MGJ", "Bld", "Sup"];

const numberWords: Record<string, string> = {
  zero: "0", oh: "0", one: "1", won: "1", two: "2", too: "2", three: "3", tree: "3", four: "4", for: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20", "twenty one": "21", "twenty two": "22", "twenty three": "23", "twenty four": "24", "twenty five": "25", "twenty six": "26", "twenty seven": "27", "twenty eight": "28", "twenty nine": "29", thirty: "30", "thirty one": "31", "thirty two": "32",
};

export function ClinicalAiConsole({ provider }: { provider: string }) {
  const [patientId, setPatientId] = useState("doctor-test-001");
  const [room, setRoom] = useState("op-1");
  const [input, setInput] = useState("tooth fourteen pocket depth three two three");
  const [live, setLive] = useState("Mic idle. Press Test mic first, then Start voice.");
  const [help, setHelp] = useState("Use Chrome/Edge. Server transcription needs OPENAI_API_KEY on the deployment.");
  const [status, setStatus] = useState("idle");
  const [serverReady, setServerReady] = useState(false);
  const [level, setLevel] = useState(0);
  const [cursor, setCursor] = useState<{ tooth: number; site: Site }>({ tooth: 1, site: "MB" });
  const [chart, setChart] = useState<Chart>({});
  const [trail, setTrail] = useState<Trail[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyzingRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const sitesWithData = useMemo(() => Object.values(chart).reduce((sum, tooth) => sum + Object.values(tooth).filter(Boolean).length, 0), [chart]);
  const teethWithData = useMemo(() => Object.keys(chart).length, [chart]);

  useEffect(() => {
    fetch("/api/clinical-ai/transcribe")
      .then((res) => res.json())
      .then((data) => {
        setServerReady(Boolean(data.serverTranscription));
        setHelp(Boolean(data.serverTranscription) ? `Server transcription ready: ${data.model}` : "Server transcription is off. Add OPENAI_API_KEY in DigitalOcean/GitHub secrets for reliable voice.");
      })
      .catch(() => setHelp("Could not check server transcription status."));
    return () => stopAll();
  }, []);

  function addTrail(kind: Trail["kind"], text: string) {
    setTrail((current) => [...current, { kind, text }].slice(-24));
  }

  async function openMic() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access a microphone.");
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    streamRef.current = stream;
    startMeter(stream);
    setStatus("mic ready");
    setHelp("Mic permission granted. Speak and watch the meter move.");
    addTrail("heard", "Mic test started.");
    return stream;
  }

  function startMeter(stream: MediaStream) {
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const analyser = context.createAnalyser();
    const source = context.createMediaStreamSource(stream);
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      data.forEach((value) => { peak = Math.max(peak, Math.abs(value - 128)); });
      setLevel(Math.min(100, peak * 3));
      analyzingRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  async function startVoice() {
    try {
      const stream = await openMic();
      if (!serverReady) {
        setHelp("Server transcription is not enabled on this deployment. Use Practice Voice Phrase or configure OPENAI_API_KEY.");
        setStatus("server key needed");
        addTrail("error", "OPENAI_API_KEY missing for reliable transcription.");
        return;
      }
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = async (event) => {
        if (!event.data.size || busyRef.current) return;
        busyRef.current = true;
        try { await transcribeChunk(event.data); } finally { busyRef.current = false; }
      };
      recorder.start(3000);
      recorderRef.current = recorder;
      setStatus("listening");
      setLive("Listening with server transcription. Speak naturally.");
      addTrail("heard", "Server transcription started.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mic failed.";
      setHelp(message);
      addTrail("error", message);
    }
  }

  async function transcribeChunk(blob: Blob) {
    const form = new FormData();
    form.append("file", blob, "clinical-voice.webm");
    const response = await fetch("/api/clinical-ai/transcribe", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) {
      addTrail("error", data.error || "Transcription failed.");
      setHelp(data.error || "Transcription failed.");
      return;
    }
    const transcript = String(data.transcript || "").trim();
    if (!transcript) return;
    setLive(transcript);
    addTrail("heard", transcript);
    runPhrase(transcript);
  }

  function stopAll() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (analyzingRef.current) cancelAnimationFrame(analyzingRef.current);
    setLevel(0);
    setStatus("stopped");
  }

  function normalize(text: string) {
    let out = text.toLowerCase().replace(/[.,;]/g, " then ");
    const replacements: Array<[RegExp, string]> = [
      [/pocket (death|debt|dept|depths)/g, "pocket depth"],
      [/ginger margin/g, "gingival margin"],
      [/bleeding on probing|b o p/g, "bleeding"],
      [/super ration|supperation|supuration/g, "suppuration"],
      [/forkation|fur cation/g, "furcation"],
      [/medial/g, "mesial"],
      [/buckle/g, "buccal"],
    ];
    replacements.forEach(([pattern, value]) => { out = out.replace(pattern, value); });
    Object.entries(numberWords).sort((a, b) => b[0].length - a[0].length).forEach(([word, value]) => {
      out = out.replace(new RegExp(`\\b${word}\\b`, "g"), value);
    });
    return out.replace(/\s+/g, " ").trim();
  }

  function extract(text: string) {
    const normalized = normalize(text);
    const commands: string[] = [];
    const toothMatches = [...normalized.matchAll(/\btooth\s+(\d{1,2})\b/g)];
    if (!toothMatches.length) return [normalized];
    toothMatches.forEach((match, index) => {
      const tooth = Number(match[1]);
      const next = toothMatches[index + 1]?.index ?? normalized.length;
      const chunk = normalized.slice(match.index, next);
      const metricRules: Array<[Metric, RegExp]> = [
        ["PD", /(?:pocket depth|pd)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/g],
        ["GM", /(?:gingival margin|gm)\s+(-?\d{1,2})\s+(-?\d{1,2})\s+(-?\d{1,2})/g],
        ["CAL", /(?:cal|clinical attachment level)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/g],
        ["MGJ", /mgj\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/g],
      ];
      metricRules.forEach(([metric, pattern]) => {
        [...chunk.matchAll(pattern)].forEach((m) => commands.push(`tooth ${tooth} ${metric} ${m[1]} ${m[2]} ${m[3]}`));
      });
      if (/bleeding/.test(chunk)) commands.push(`tooth ${tooth} Bld present`);
      if (/suppuration/.test(chunk)) commands.push(`tooth ${tooth} Sup present`);
    });
    return commands;
  }

  function runPhrase(phrase: string) {
    setLive(phrase);
    const commands = extract(phrase);
    commands.forEach((command) => {
      addTrail("parsed", command);
      applyCommand(command);
      addTrail("charted", command);
    });
  }

  function applyCommand(command: string) {
    const metric = command.match(/tooth\s+(\d{1,2})\s+(PD|GM|CAL|MGJ)\s+(-?\d{1,2})\s+(-?\d{1,2})\s+(-?\d{1,2})/);
    if (metric) {
      const tooth = Number(metric[1]);
      const row = metric[2] as Metric;
      const values = [metric[3], metric[4], metric[5]];
      const sites: Site[] = tooth <= 16 ? ["MB", "B", "DB"] : ["ML", "L", "DL"];
      setChart((current) => {
        const next = structuredClone(current) as Chart;
        next[tooth] = next[tooth] ?? {};
        sites.forEach((site, index) => {
          next[tooth][site] = { ...(next[tooth][site] ?? {}), [row]: values[index] };
        });
        return next;
      });
      setCursor({ tooth, site: sites[2] });
      return;
    }
    const condition = command.match(/tooth\s+(\d{1,2})\s+(Bld|Sup)\s+present/);
    if (condition) {
      const tooth = Number(condition[1]);
      const row = condition[2] as Metric;
      const sites: Site[] = tooth <= 16 ? ["MB", "B", "DB"] : ["ML", "L", "DL"];
      setChart((current) => {
        const next = structuredClone(current) as Chart;
        next[tooth] = next[tooth] ?? {};
        sites.forEach((site) => { next[tooth][site] = { ...(next[tooth][site] ?? {}), [row]: "●" }; });
        return next;
      });
    } else if (command.startsWith("note ")) {
      setNotes((items) => [...items, command.slice(5)]);
    }
  }

  function arch(teeth: number[], sites: Site[], label: string) {
    return (
      <div className="min-w-[920px] overflow-hidden rounded-xl border border-neutral-300 bg-white font-mono text-[11px]">
        <div className="grid min-h-8 grid-cols-[42px_repeat(48,minmax(18px,1fr))] border-b-2 border-neutral-900 bg-neutral-100">
          <div className="grid place-items-center font-bold">{label}</div>
          {teeth.map((tooth) => <div key={tooth} className="col-span-3 grid place-items-center border-l border-neutral-300 font-bold">{tooth}</div>)}
        </div>
        <div className="grid min-h-7 grid-cols-[42px_repeat(48,minmax(18px,1fr))] border-b border-neutral-200">
          <div />
          {teeth.flatMap((tooth) => sites.map((site) => <div key={`${tooth}-${site}`} className="grid place-items-center border-l border-neutral-200 text-[10px] text-neutral-500">{site}</div>))}
        </div>
        {metrics.map((metric) => (
          <div key={metric} className="grid min-h-7 grid-cols-[42px_repeat(48,minmax(18px,1fr))] border-b border-neutral-100 last:border-b-0">
            <div className="grid place-items-center bg-neutral-50 font-bold text-neutral-600">{metric}</div>
            {teeth.flatMap((tooth) => sites.map((site) => {
              const value = chart[tooth]?.[site]?.[metric] ?? "";
              const hot = metric === "PD" && Number(value) >= 5;
              return <div key={`${tooth}-${site}-${metric}`} className={`grid place-items-center border-l border-neutral-100 font-bold ${hot ? "bg-rose-50 text-rose-700" : "text-neutral-900"}`}>{value}</div>;
            }))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
      <section className="space-y-4">
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Patient<input value={patientId} onChange={(event) => setPatientId(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm normal-case tracking-normal text-neutral-950" /></label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Provider<input value={provider} readOnly className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm normal-case tracking-normal text-neutral-700" /></label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Room<input value={room} onChange={(event) => setRoom(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm normal-case tracking-normal text-neutral-950" /></label>
            <div className="rounded-xl bg-neutral-950 px-4 py-3 text-white"><p className="text-xs uppercase tracking-[0.12em] text-white/60">Status</p><p className="mt-1 text-lg font-semibold">{status}</p></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-20 rounded-2xl border border-neutral-200 px-4 py-3 text-sm" />
            <button onClick={() => openMic()} className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold hover:bg-neutral-50">Test mic</button>
            <button onClick={startVoice} className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800">Start voice</button>
            <button onClick={stopAll} className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold hover:bg-neutral-50">Stop</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => runPhrase(input)} className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">Practice Voice Phrase</button>
            <button onClick={() => runPhrase("tooth fifteen pocket depth four five six bleeding")} className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700">Demo phrase</button>
          </div>
          <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Live transcript</p>
            <p className="mt-1 text-sm font-semibold text-neutral-950">{live}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${level}%` }} /></div>
            <p className="mt-2 text-xs leading-5 text-neutral-600">{help}</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">Perio chart</p><h2 className="text-2xl font-semibold text-neutral-950">Full mouth chart</h2></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">Tooth {cursor.tooth} / {cursor.site}</span></div>
          <div className="mt-4 space-y-4 overflow-x-auto">{arch(upper, facial, "F")}{arch(upper, lingual, "L")}{arch(lower, lingual, "L")}{arch(lower, facial, "F")}</div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Teeth" value={teethWithData} /><Metric label="Sites" value={sitesWithData} /><Metric label="Events" value={trail.length} /><Metric label="Mode" value={serverReady ? "STT" : "Key"} />
        </div>
        <Panel title="Heard / Parsed / Charted">{trail.length ? trail.slice().reverse().map((item, index) => <div key={index} className={`rounded-xl border px-3 py-2 text-sm ${item.kind === "error" ? "border-rose-200 bg-rose-50" : "border-neutral-200 bg-white"}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-700">{item.kind}</p><p className="mt-1 text-neutral-800">{item.text}</p></div>) : <p className="text-sm text-neutral-500">No voice captured yet.</p>}</Panel>
        <Panel title="Practice notes">{notes.length ? notes.map((note, index) => <p key={index} className="text-sm text-neutral-700">{note}</p>) : <p className="text-sm text-neutral-500">Scribing and treatment-plan recommendations live here next.</p>}</Panel>
        <Panel title="Command legend"><div className="grid gap-2 text-sm text-neutral-700"><code>tooth fourteen pocket depth three two three</code><code>tooth fifteen gingival margin one one two</code><code>tooth four bleeding suppuration</code><code>tooth fourteen mobility grade two</code></div></Panel>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-semibold text-neutral-950">{title}</h3><div className="mt-4 grid gap-2">{children}</div></section>;
}
