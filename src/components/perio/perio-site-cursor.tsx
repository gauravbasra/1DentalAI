type Props = {
  tooth: number;
  site: "MB" | "B" | "DB" | "ML" | "L" | "DL";
  onToothChange: (value: number) => void;
  onSiteChange: (value: Props["site"]) => void;
};

export function PerioSiteCursor({ tooth, site, onToothChange, onSiteChange }: Props) {
  const sites = ["MB", "B", "DB", "ML", "L", "DL"] as const;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Cursor</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Tooth
          <input
            type="number"
            value={tooth}
            min={1}
            max={32}
            onChange={(event) => onToothChange(Math.max(1, Math.min(32, Number(event.target.value || 1))))}
            className="w-24 rounded-lg border border-neutral-300 px-2 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-neutral-700">
          Site
          <select
            value={site}
            onChange={(event) => onSiteChange(event.target.value as Props["site"]) }
            className="rounded-lg border border-neutral-300 px-2 py-2 text-sm"
          >
            {sites.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-2 rounded-md bg-white p-2 text-sm font-semibold text-neutral-950">
        Active: tooth {tooth}, site {site}
      </p>
    </div>
  );
}
