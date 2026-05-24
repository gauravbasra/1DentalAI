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
      <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1 shadow-sm">
        {(["light", "dark", "system"] as ThemeMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            className={`h-10 rounded-lg px-3 text-xs font-semibold capitalize ${mode === option ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            title={option === "system" ? "Follow device appearance" : `${option} console theme`}
          >
            {option}
          </button>
        ))}
      </div>
    </>
  );
}
