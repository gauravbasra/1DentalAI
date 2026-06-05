import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { MarketingShell } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign Up",
  description:
    "Sign up for 1DentalAI practice onboarding and start configuring locations, team roles, phone, AI voice, scheduling, insurance, RCM, payments, reviews, and go-live readiness.",
  path: "/signup",
  keywords: ["1DentalAI signup", "dental practice onboarding", "dental AI signup"],
});

const onboardingItems = [
  "Practice profile, locations, NPI, operating hours, holidays, and policies",
  "Doctors, hygienists, front desk, billing, marketing, roles, specialties, and responsibilities",
  "Phone, SMS, AI voice policy, hold music, escalation rules, and call routing",
  "Insurance credentialing, payer portals, RCM, billing, payments, reviews, and marketing",
];

export default function SignupPage() {
  return (
    <MarketingShell>
      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <div className="py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">
              New practice onboarding
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl">
              Sign up and start onboarding your practice.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              We are glad you chose 1DentalAI. This guided onboarding starts the setup path for your practice,
              team, phone workflows, AI voice rules, insurance, billing, payments, reviews, and go-live readiness.
            </p>
            <div className="mt-8 grid gap-3">
              {onboardingItems.map((item) => (
                <p key={item} className="rounded-2xl bg-white px-5 py-4 text-sm font-medium leading-6 text-neutral-700 shadow-sm">
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">No patient information</p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Do not submit patient names, chart numbers, insurance details, clinical notes,
                or other PHI during initial signup.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
              Create your onboarding profile
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Start here and our setup flow will verify the practice, activate the right role,
              and move you into the full onboarding wizard.
            </p>
            <SignupForm />
            <Link href="/app" className="mt-5 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900">
              Already have an account? Sign in
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
