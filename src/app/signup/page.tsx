import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#f3f4f6] px-6 py-10 text-neutral-950">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="py-8">
          <Link href="/" className="text-base font-semibold tracking-tight text-neutral-950">
            1DentalAI
          </Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Verified access request
          </p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl">
            Request access for your practice.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
            1DentalAI uses verified practice onboarding, least-privilege role assignment,
            session audit trails, and setup review before PHI-capable workflows are enabled.
          </p>
          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">No patient information</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              Do not submit patient names, chart numbers, insurance details, clinical notes,
              or other PHI in this request.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
            Signup request
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Your request will be held for administrator verification. Account activation,
            password setup, and MFA enrollment are separate controlled steps.
          </p>
          <SignupForm />
          <Link href="/app" className="mt-5 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
