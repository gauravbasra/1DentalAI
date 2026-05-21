import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

const accessOptions = [
  "Owner dentist",
  "Practice manager",
  "Front desk",
  "Billing and RCM",
];

export default async function AppLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; loggedOut?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && (params.next.startsWith("/app") || params.next.startsWith("/admin")) ? params.next : "/app/overview";

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
          <Link href="/signup" className="mt-8 inline-flex text-sm font-semibold text-cyan-700 transition hover:text-cyan-900">
            Request a verified practice account
          </Link>
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

          {params.loggedOut ? (
            <p className="mt-6 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              You have been signed out.
            </p>
          ) : null}
          <LoginForm next={next} error={Boolean(params.error)} />

          <div className="mt-6 rounded-lg bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">Compliance posture</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Do not enter patient information on this screen. Access is session-based,
              audited, role-scoped, and intended for verified practice users only.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
