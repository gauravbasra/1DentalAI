"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "sent" | "error";

export function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!response.ok || !result?.ok) {
      setStatus("error");
      setMessage(result?.error ?? "Something went wrong. Email hello@1dentalai.com.");
      return;
    }

    form.reset();
    setStatus("sent");
    setMessage("Request received. The 1DentalAI team will use this to prepare the workflow review.");
  }

  return (
    <form onSubmit={submitLead} className="rounded-[2rem] bg-white p-7 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <Field name="practiceName" label="Practice name" required />
        <Field name="contactName" label="Your name" required />
        <Field name="email" label="Work email" type="email" required />
        <Field name="phone" label="Phone" type="tel" />
        <Field name="locations" label="Locations" />
        <Field name="pms" label="PMS or phone system" />
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-semibold text-neutral-800">Top workflow priority</span>
        <textarea
          name="priority"
          required
          rows={5}
          className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-cyan-600"
          placeholder="Example: missed calls, insurance verification, RCM follow-up, clinical scribe, reputation, analytics."
        />
      </label>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Do not include patient names, chart numbers, insurance details, clinical notes, or other PHI.
      </p>
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
      >
        {status === "submitting" ? "Sending..." : "Request workflow review"}
      </button>
      {message ? (
        <p className={`mt-4 text-sm font-medium ${status === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </form>
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
