"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const storageKey = "oneDentalAI.patientEngagement.theme";

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  document.documentElement.dataset.peTheme = resolved;
  document.documentElement.dataset.peThemeMode = mode;
}

export function ThemeModeControl() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem(storageKey) as ThemeMode | null;
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });

  useEffect(() => {
    applyTheme(mode);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      const current = (window.localStorage.getItem(storageKey) as ThemeMode | null) ?? "system";
      if (current === "system") applyTheme("system");
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [mode]);

  function choose(next: ThemeMode) {
    setMode(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return (
    <>
      <style>{`
        [data-pe-theme="dark"] .pe-shell,
        [data-pe-theme="dark"] .pe-shell .bg-white {
          background: #0f1216 !important;
          color: #f6f7f8 !important;
        }
        [data-pe-theme="dark"] .pe-shell .bg-\\[\\#f4f6f7\\],
        [data-pe-theme="dark"] .pe-shell .bg-\\[\\#f7f8f8\\],
        [data-pe-theme="dark"] .pe-shell .bg-\\[\\#fbfcfb\\],
        [data-pe-theme="dark"] .pe-shell .bg-neutral-50,
        [data-pe-theme="dark"] .pe-shell .bg-neutral-100,
        [data-pe-theme="dark"] .pe-shell .bg-\\[\\#e9eef2\\] {
          background: #171b21 !important;
        }
        [data-pe-theme="dark"] .pe-shell .border-neutral-100,
        [data-pe-theme="dark"] .pe-shell .border-neutral-200,
        [data-pe-theme="dark"] .pe-shell .border-neutral-300 {
          border-color: #2b313a !important;
        }
        [data-pe-theme="dark"] .pe-shell .text-neutral-400,
        [data-pe-theme="dark"] .pe-shell .text-neutral-500,
        [data-pe-theme="dark"] .pe-shell .text-neutral-600,
        [data-pe-theme="dark"] .pe-shell .text-neutral-700,
        [data-pe-theme="dark"] .pe-shell input,
        [data-pe-theme="dark"] .pe-shell textarea {
          color: #b8c0cc !important;
        }
        [data-pe-theme="dark"] .pe-shell .text-neutral-950 {
          color: #f6f7f8 !important;
        }
        [data-pe-theme="dark"] .pe-shell input,
        [data-pe-theme="dark"] .pe-shell textarea,
        [data-pe-theme="dark"] .pe-shell button,
        [data-pe-theme="dark"] .pe-shell a {
          border-color: #2b313a;
        }
      `}</style>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["light", "dark", "system"] as ThemeMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            className={`rounded-2xl border px-5 py-4 text-left shadow-sm ${mode === option ? "border-blue-600 bg-blue-50 text-blue-800" : "border-neutral-200 bg-white text-neutral-700"}`}
          >
            <span className="block text-base font-semibold capitalize">{option}</span>
            <span className="mt-1 block text-xs text-neutral-500">
              {option === "system" ? "Follow device appearance" : `${option} console theme`}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
