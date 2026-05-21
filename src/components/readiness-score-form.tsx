"use client";

import { FormEvent, useMemo, useState } from "react";

const scoreItems = [
  ["patientAccess", "Patient access", "Missed calls, web chat, texts, booking requests, and patient follow-up have clear owners."],
  ["insurance", "Insurance readiness", "Eligibility, benefits, missing info, and payer blockers are reviewed before the visit."],
  ["rcm", "RCM visibility", "Claims, attachments, denials, payment posting, and payer follow-up are visible in one queue."],
  ["clinical", "Clinical documentation", "Clinical notes, perio, treatment context, and provider review are organized before writeback."],
  ["reputation", "Reputation workflow", "Review requests, service recovery, and response drafts are governed by patient experience signals."],
  ["analytics", "Practice analytics", "Managers can see production, calls, treatment acceptance, payer delay, and follow-up quality."],
  ["connectors", "Connector readiness", "PMS, phone, payer, payment, reputation, and CRM systems have clear integration ownership."],
] as const;

type Status = "idle" | "submitting" | "sent" | "error";

export function ReadinessScoreForm() {
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(scoreItems.map(([key]) => [key, 3])));
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const score = useMemo(() => {
    const total = Object.values(values).reduce((sum, value) => sum + Number(value), 0);
    return Math.round((total / (scoreItems.length * 5)) * 100);
  }, [values]);

  const lowest = useMemo(() => {
    return [...scoreItems]
      .sort(([left], [right]) => values[left] - values[right])
      .slice(0, 3)
      .map(([, label]) => label);
  }, [values]);

  async function submitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams(window.location.search);
    const priority = `Dental AI Readiness Score: ${score}. Top gaps: ${lowest.join(", ")}.`;

    formData.set("priority", priority);
    formData.set("source", "readiness_score");
    formData.set("readinessScore", String(score));

    for (const [key, value] of [
      ["utmSource", params.get("utm_source")],
      ["utmMedium", params.get("utm_medium")],
      ["utmCampaign", params.get("utm_campaign")],
      ["utmContent", params.get("utm_content")],
      ["utmTerm", params.get("utm_term")],
    ] as const) {
      if (value) {
        formData.set(key, value);
      }
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });

    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!response.ok || !result?.ok) {
      setStatus("error");
      setMessage(result?.error ?? "Something went wrong. Email hello@1dentalai.com.");
      return;
    }

    form.reset();
    setStatus("sent");
    setMessage("Score received. We will use it to prepare a workflow review.");
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="rounded-[2rem] bg-neutral-950 p-8 text-white">
        <p className="text-sm font-semibold text-cyan-300">Your score</p>
        <p className="mt-5 text-7xl font-semibold tracking-tight">{score}</p>
        <p className="mt-4 text-base leading-8 text-neutral-300">
          Score each workflow from 1 to 5. The fastest path to value is usually the lowest-scoring handoff with the highest daily volume.
        </p>
        <div className="mt-8 grid gap-3">
          {lowest.map((item) => (
            <p key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-neutral-100">
              {item}
            </p>
          ))}
        </div>
      </aside>
      <form onSubmit={submitScore} className="rounded-[2rem] bg-white p-7 shadow-sm">
        <div className="grid gap-4">
          {scoreItems.map(([key, label, body]) => (
            <label key={key} className="rounded-2xl border border-neutral-200 p-4">
              <span className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-base font-semibold text-neutral-950">{label}</span>
                  <span className="mt-1 block text-sm leading-6 text-neutral-600">{body}</span>
                </span>
                <span className="text-xl font-semibold text-cyan-700">{values[key]}</span>
              </span>
              <input
                type="range"
                min="1"
                max="5"
                value={values[key]}
                onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))}
                className="mt-4 w-full accent-cyan-700"
              />
            </label>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field name="practiceName" label="Practice name" required />
          <Field name="contactName" label="Your name" required />
          <Field name="email" label="Work email" type="email" required />
          <Field name="phone" label="Phone" type="tel" />
          <Field name="locations" label="Locations" />
          <Field name="pms" label="PMS or phone system" />
        </div>
        <input name="priority" type="hidden" />
        <input name="source" type="hidden" />
        <input name="readinessScore" type="hidden" />
        <input name="utmSource" type="hidden" />
        <input name="utmMedium" type="hidden" />
        <input name="utmCampaign" type="hidden" />
        <input name="utmContent" type="hidden" />
        <input name="utmTerm" type="hidden" />
        <p className="mt-3 text-xs leading-5 text-neutral-500">
          Do not include patient names, chart numbers, insurance details, clinical notes, or other PHI.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-6 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
        >
          {status === "submitting" ? "Sending..." : "Send my score"}
        </button>
        {message ? (
          <p className={`mt-4 text-sm font-medium ${status === "error" ? "text-red-700" : "text-emerald-700"}`}>
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full rounded-full border border-neutral-200 px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-cyan-600"
      />
    </label>
  );
}
