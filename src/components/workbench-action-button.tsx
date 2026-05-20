"use client";

import { useState } from "react";

export function WorkbenchActionButton({
  slug,
  role,
  actionId,
  label,
  blocked,
}: {
  slug: string;
  role: string;
  actionId: string;
  label: string;
  blocked?: boolean;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "blocked">("idle");
  const [message, setMessage] = useState("");

  async function runAction() {
    setState("running");
    setMessage("");
    const response = await fetch(`/api/workbenches/${slug}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, actionId }),
    });
    const payload = await response.json();
    setState(response.ok ? "done" : "blocked");
    setMessage(payload.audit?.summary ?? payload.error ?? "Action completed.");
  }

  return (
    <div>
      <button
        type="button"
        onClick={runAction}
        className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
          blocked
            ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
            : "bg-neutral-950 text-white hover:bg-cyan-800"
        }`}
      >
        {state === "running" ? "Working..." : label}
      </button>
      {message ? (
        <p className={`mt-2 text-xs leading-5 ${state === "blocked" ? "text-rose-700" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
