import { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-950">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:px-8 lg:py-28">
      <p className="text-sm font-semibold text-cyan-700">{eyebrow}</p>
      <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 text-balance sm:text-6xl">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-neutral-600 sm:text-xl">
        {body}
      </p>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <p className="text-sm font-semibold text-cyan-700">{eyebrow}</p>
      <h2 className="mx-auto mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-neutral-950 text-balance sm:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-neutral-600">
        {body}
      </p>
    </div>
  );
}

export function ProductVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`product-visual ${compact ? "min-h-[360px]" : "min-h-[520px]"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.18),transparent_28%),linear-gradient(145deg,#0a0f1f,#111827_42%,#f5f7fb)]" />
      <div className="relative z-10 grid h-full gap-5 p-5 sm:grid-cols-[0.75fr_1.25fr] sm:p-8">
        <div className="space-y-4 self-end">
          <div className="rounded-2xl bg-white/88 p-4 shadow-2xl backdrop-blur-xl">
            <p className="text-xs font-semibold text-neutral-500">Now</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">18 calls</p>
            <p className="mt-1 text-sm text-neutral-600">6 booked, 4 need review</p>
          </div>
          <div className="rounded-2xl bg-cyan-500 p-4 text-white shadow-2xl">
            <p className="text-xs font-semibold text-cyan-50">AI summary</p>
            <p className="mt-2 text-sm leading-6">
              Patient asked about crown estimate. Insurance check and treatment
              follow-up queued for approval.
            </p>
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/45 bg-white/82 p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div>
              <p className="text-xs font-semibold text-neutral-500">Patient timeline</p>
              <p className="mt-1 text-lg font-semibold text-neutral-950">Maya Thompson</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Clearable
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["Phone", "Call answered, transcript ready"],
              ["Insurance", "Eligibility evidence received"],
              ["RCM", "Attachment risk flagged"],
              ["Growth", "Review request scheduled"],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-2xl bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-neutral-950">{label}</p>
                  <span className="h-2 w-2 rounded-full bg-cyan-600" />
                </div>
                <p className="mt-2 text-sm text-neutral-600">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
