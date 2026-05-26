"use client";

import { useRouter } from "next/navigation";
import { PmsCard } from "@/components/pms-ui";
import { useState } from "react";

export function PerioSignoffPanel({
  patientId,
  roleKey,
  defaultApprovalRole,
  signoffId,
}: {
  patientId: string;
  roleKey: string;
  defaultApprovalRole: string;
  signoffId: string;
}) {
  const router = useRouter();
  const [providerApprovalId, setProviderApprovalId] = useState(signoffId);
  const [providerApprovalRole, setProviderApprovalRole] = useState(defaultApprovalRole);
  const [providerApprovalNote, setProviderApprovalNote] = useState("Provider reviewed voice-entered perio chart, corrected all key sites, and approved for chart writeback.");
  const [perioSignoffId, setPerioSignoffId] = useState(() => signoffId || `PS-${Date.now()}`);
  const [message, setMessage] = useState("Complete or update at least six sites before writeback.");
  const [running, setRunning] = useState(false);

  const execute = async () => {
    if (!providerApprovalId.trim() || !perioSignoffId.trim()) {
      setMessage("Both provider approval id and perio signoff id are required.");
      return;
    }

    setRunning(true);
    setMessage("Submitting perio writeback request...");
    try {
      const response = await fetch(`/api/pms/perio/${encodeURIComponent(patientId)}/writeback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerApprovalId,
          providerApprovalRole,
          providerApprovalNote,
          perioSignoffId,
          preferredAction: "request",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error ? String(payload.error) : "Perio writeback request failed.");
        return;
      }
      setMessage(`Writeback job ${payload.data?.jobId ?? ""} created with status ${payload.data?.jobStatus ?? "unknown"}.`);
      if (payload.data?.jobStatus === "BLOCKED") {
        setMessage(`Blocked: ${payload.data?.blockedReason ?? "writeback policy blocked this request."}`);
      } else {
        router.refresh();
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <PmsCard title="Perio signoff and writeback" eyebrow="Clinical control">
      <div className="grid gap-3">
        <p className="text-sm text-neutral-600">Complete perio exam and provide one approval block before pushing chart writeback to PMS.</p>
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
          Provider approval id
          <input value={providerApprovalId} onChange={(event) => setProviderApprovalId(event.target.value)} className="rounded-xl border border-neutral-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
          Provider approval role
          <select value={providerApprovalRole} onChange={(event) => setProviderApprovalRole(event.target.value)} className="rounded-xl border border-neutral-300 px-3 py-2">
            <option>{roleKey}</option>
            <option value="owner_doctor">owner_doctor</option>
            <option value="associate_provider">associate_provider</option>
            <option value="rdh">rdh</option>
            <option value="super_admin">super_admin</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
          Perio signoff id
          <input value={perioSignoffId} onChange={(event) => setPerioSignoffId(event.target.value)} className="rounded-xl border border-neutral-300 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-700">
          Approval note
          <textarea
            rows={4}
            value={providerApprovalNote}
            onChange={(event) => setProviderApprovalNote(event.target.value)}
            className="rounded-xl border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          onClick={execute}
          disabled={running}
          className="rounded-full bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:bg-neutral-300"
        >
          {running ? "Submitting writeback..." : "Request perio writeback"}
        </button>
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    </PmsCard>
  );
}
