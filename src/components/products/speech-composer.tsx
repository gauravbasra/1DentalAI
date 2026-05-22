"use client";

import { useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

export function SpeechComposer({
  name,
  required,
  placeholder,
}: {
  name: string;
  required?: boolean;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");

  function appendTranscript(text: string) {
    const textarea = textareaRef.current;
    if (!textarea || !text.trim()) return;
    const prefix = textarea.value.trim() ? `${textarea.value.trim()} ` : "";
    textarea.value = `${prefix}${text.trim()}`.trim();
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("Voice typing is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) appendTranscript(finalText);
      setStatus(interimText ? `Listening: ${interimText}` : "Listening...");
    };
    recognition.onerror = () => {
      setListening(false);
      setStatus("Microphone access failed. Check browser permission and try again.");
    };
    recognition.onend = () => {
      setListening(false);
      setStatus("");
    };
    recognition.start();
    setListening(true);
    setStatus("Listening...");
  }

  return (
    <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-neutral-100 px-4">
      <span className="text-xl text-neutral-500">+</span>
      <textarea ref={textareaRef} name={name} required={required} className="min-h-12 flex-1 resize-none bg-transparent py-4 text-sm outline-none" placeholder={placeholder} />
      <button
        type="button"
        onClick={toggleSpeech}
        aria-label={listening ? "Stop voice typing" : "Start voice typing"}
        title={listening ? "Stop voice typing" : "Start voice typing"}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-neutral-700 transition ${listening ? "border-red-200 bg-red-50 text-red-700" : "border-neutral-200 bg-white hover:border-blue-300 hover:text-blue-700"}`}
      >
        <MicIcon />
      </button>
      {status ? <span className="max-w-48 truncate text-xs font-semibold text-neutral-500">{status}</span> : null}
    </div>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
      <path d="M8 22h8" />
    </svg>
  );
}
