"use client";

export function PrintLabelButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      Print labels
    </button>
  );
}
