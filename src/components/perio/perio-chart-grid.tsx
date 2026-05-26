type PerioMeasure = {
  id: string;
  tooth: string;
  site: string;
  probingDepth: number;
  bleeding: boolean;
  recession: number | null;
  mobility: string | null;
  furcation: string | null;
};

type Props = {
  measures: PerioMeasure[];
};

export function PerioChartGrid({ measures }: Props) {
  if (!measures.length) {
    return <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">No measurements yet.</div>;
  }

  const sorted = [...measures].sort((a, b) => Number(a.tooth) - Number(b.tooth) || a.site.localeCompare(b.site));
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
            <th className="px-3 py-2">Tooth</th>
            <th className="px-3 py-2">Site</th>
            <th className="px-3 py-2">PD</th>
            <th className="px-3 py-2">BOP</th>
            <th className="px-3 py-2">Recession</th>
            <th className="px-3 py-2">Mobility</th>
            <th className="px-3 py-2">Furcation</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((measure) => (
            <tr key={measure.id} className="border-t border-neutral-100">
              <td className="px-3 py-2 font-semibold text-neutral-900">{measure.tooth}</td>
              <td className="px-3 py-2 text-neutral-700">{measure.site}</td>
              <td className={`px-3 py-2 ${measure.probingDepth >= 5 ? "font-semibold text-rose-700" : "text-neutral-900"}`}>{measure.probingDepth}</td>
              <td className="px-3 py-2 text-neutral-700">{measure.bleeding ? "Yes" : "No"}</td>
              <td className="px-3 py-2 text-neutral-700">{measure.recession ?? "-"}</td>
              <td className="px-3 py-2 text-neutral-700">{measure.mobility ?? "-"}</td>
              <td className="px-3 py-2 text-neutral-700">{measure.furcation ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
