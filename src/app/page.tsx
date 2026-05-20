const platformFacts = [
  {
    label: "Runtime",
    value: "Next.js App Router",
    detail: "Independent service on port 3001 behind the droplet web server.",
  },
  {
    label: "Production rule",
    value: "Phase-gated",
    detail: "No feature coding begins without an approved phase plan.",
  },
  {
    label: "Current phase",
    value: "Phase 0 bootstrap",
    detail: "Repository, deployment, health checks, and operating guardrails.",
  },
  {
    label: "Existing DentalRCM",
    value: "Isolated",
    detail: "The DentalRCM app on port 3000 remains a separate process.",
  },
];

const operatingRules = [
  "No shells, fake buttons, pretend connectors, or decorative completion.",
  "Every external side effect must pass an approval gate.",
  "NexHealth and Stedi are accelerators behind owned 1DentalAI routers.",
  "PMS, EHR, CRM, payer, phone, payment, reputation, and clinical connectors are vendor-neutral contracts.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              1DentalAI
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              Dental AI operating system bootstrap
            </h1>
          </div>
          <a
            href="/api/health"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-600 hover:text-cyan-800"
          >
            Health
          </a>
        </header>

        <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section>
            <p className="max-w-3xl text-lg leading-8 text-slate-700">
              This is the first production bootstrap for 1DentalAI. It is live
              only as infrastructure truth: repository, app runtime, health
              endpoint, deployment isolation, and the phase-gated rule that
              protects the project from unfinished product surfaces.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {platformFacts.map((item) => (
                <article
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">
                    {item.value}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Operating contract
            </h2>
            <div className="mt-5 space-y-4">
              {operatingRules.map((rule) => (
                <div key={rule} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-600" />
                  <p className="text-sm leading-6 text-slate-700">{rule}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">
                Next required approval
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Phase 0 architecture packet: repo strategy, DentalRCM reuse
                boundary, phone app scan, deployment topology, and connector
                extraction decision.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
