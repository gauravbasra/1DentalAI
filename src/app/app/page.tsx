import Link from "next/link";

const accessOptions = [
  "Owner dentist",
  "Practice manager",
  "Front desk",
  "Billing and RCM",
];

export default function AppLogin() {
  return (
    <main className="min-h-screen bg-[#f3f4f6] text-neutral-950">
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Link href="/" className="text-base font-semibold tracking-tight text-neutral-950">
            1DentalAI
          </Link>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Secure practice workspace
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl">
            Sign in to your dental operating system.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            Access phones, scheduling, patient workflows, insurance, RCM, reputation,
            marketing, analytics, and practice controls from one governed workspace.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {accessOptions.map((option) => (
              <div key={option} className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-sm font-semibold text-neutral-800">{option}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-6">
            <div>
              <p className="text-sm font-semibold text-cyan-700">1DentalAI</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
                Practice login
              </h2>
            </div>
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              setup mode
            </span>
          </div>

          <form className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@practice.com"
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter password"
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/overview"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                Continue to workspace
              </Link>
              <Link
                href="/contact"
                className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:border-cyan-600 hover:text-cyan-700"
              >
                Request access
              </Link>
            </div>
          </form>

          <div className="mt-6 rounded-lg bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">Demo environment</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Authentication is staged for production setup. The workspace preview uses
              sample practice data only.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
