import type { ParsedPerioCommand } from "@/lib/perio-command-parser";

type PerioCommandEntry = {
  rawText: string;
  parsed: ParsedPerioCommand;
  result: string;
  ok: boolean;
  createdAt: string;
};

type Props = {
  entries: PerioCommandEntry[];
};

function previewLine(entry: PerioCommandEntry) {
  if (entry.parsed.type === "CONTROL") {
    return `Control: ${entry.parsed.action}`;
  }

  if (entry.parsed.type === "MEASUREMENT") {
    return `Measurement: ${entry.parsed.tooth}-${entry.parsed.site} ${entry.parsed.probingDepth}mm${entry.parsed.bleeding ? " + BOP" : ""}`;
  }

  return `Correction: ${entry.parsed.tooth}-${entry.parsed.site}`;
}

export function PerioCommandPreview({ entries }: Props) {
  if (!entries.length) {
    return <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">No command events yet. Use voice or demo command.</div>;
  }

  return (
    <div className="grid gap-2">
      {entries.map((entry) => (
        <div
          key={`${entry.createdAt}-${entry.rawText}`}
          className={`rounded-xl border px-3 py-2 text-sm ${entry.ok ? "border-neutral-200 bg-white" : "border-rose-200 bg-rose-50"}`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${entry.ok ? "text-cyan-700" : "text-rose-700"}`}>
            {entry.ok ? "Parsed" : "Blocked"}
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">{entry.createdAt}</p>
          <p className="mt-1 text-neutral-900">{entry.rawText}</p>
          <p className="mt-1 text-neutral-700">{previewLine(entry)}</p>
          <p className="mt-1 text-xs text-neutral-500">{entry.result}</p>
        </div>
      ))}
    </div>
  );
}
