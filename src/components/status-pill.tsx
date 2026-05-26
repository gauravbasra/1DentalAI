export function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "cyan" | "amber" | "red" | "neutral";
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800",
    cyan: "bg-cyan-100 text-cyan-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-rose-100 text-rose-800",
    neutral: "bg-neutral-100 text-neutral-700",
  };
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-left text-[11px] font-semibold uppercase leading-4 tracking-[0.04em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

