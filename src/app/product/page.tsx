import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, ProductVisual, SectionIntro } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Product",
  description:
    "Explore the 1DentalAI product for AI phone, patient messaging, scheduling, insurance, RCM, clinical AI, reputation, payments, and practice analytics.",
  path: "/product",
  keywords: ["dental AI product", "dental practice workflow software", "AI dental operating system"],
});

const workflow = [
  {
    step: "01",
    title: "Capture",
    body: "Calls, texts, forms, appointment requests, eligibility checks, reviews, payments, and clinical context enter one operating layer.",
  },
  {
    step: "02",
    title: "Understand",
    body: "AI summarizes, classifies, matches patients, detects blockers, drafts next steps, and shows the source evidence behind every recommendation.",
  },
  {
    step: "03",
    title: "Approve",
    body: "Patient messages, PMS writeback, payer submissions, payment posting, and clinical notes stay behind human approval and audit trails.",
  },
  {
    step: "04",
    title: "Operate",
    body: "Front desk, billing, clinical, growth, and DSO teams work from clear queues instead of hunting across disconnected tools.",
  },
];

const replaces = [
  "standalone VoIP dashboards",
  "separate texting inboxes",
  "manual eligibility checks",
  "spreadsheet claim trackers",
  "review request tools",
  "unscheduled treatment lists",
  "clinical note scratchpads",
  "disconnected analytics",
];

const operatingSurfaces = [
  {
    title: "The daily command center",
    body: "A practice manager can see what needs attention today: missed calls, insurance blockers, unscheduled treatment, review recovery, claim delays, and provider approvals.",
  },
  {
    title: "The patient timeline",
    body: "Every workflow resolves back to the patient: contact history, appointment context, forms, benefits, treatment, balance, notes, and follow-up.",
  },
  {
    title: "The approval workbench",
    body: "AI can draft and recommend, but the product is built around controlled actions: approve, edit, reject, assign, retry, or escalate.",
  },
  {
    title: "Integration management",
    body: "Practice systems connect through setup checks, health monitoring, cost visibility, approval rules, and clear manual work queues when automation is not available.",
  },
];

const outcomes = [
  ["Front desk", "More calls answered, fewer missed opportunities, faster patient follow-up."],
  ["Insurance", "Cleaner eligibility checks, clearer benefit evidence, fewer day-of-care surprises."],
  ["Billing", "Fewer invisible claim blockers, better payer follow-up, stronger cash visibility."],
  ["Providers", "Better encounter context, faster note drafting, safer clinical writeback paths."],
  ["Owners", "Higher productivity without turning the practice into a maze of disconnected apps."],
  ["DSOs", "Central visibility across locations, playbooks, approvals, queues, and launch status."],
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <main>
        <section className="bg-white">
          <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-7xl items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Product</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl lg:text-8xl">
                From first ring to final payment.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-600 sm:text-xl">
                1DentalAI is the operating system for the business of dentistry:
                calls, texts, scheduling, forms, insurance, RCM, payments,
                reviews, clinical AI, and analytics connected around one patient
                record and one accountable workflow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demos"
                  className="rounded-full bg-neutral-950 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  View workflows
                </Link>
                <Link
                  href="/features"
                  className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:border-cyan-600 hover:text-cyan-700"
                >
                  Explore features
                </Link>
              </div>
            </div>
            <ProductVisual compact />
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="How it works"
            title="Not another dashboard. A working queue for the practice."
            body="The product is designed to notice work, understand what it means, propose the next step, and keep the team in control before messages, claims, payments, or clinical updates leave the system."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item) => (
              <article key={item.step} className="rounded-[2rem] bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold text-cyan-700">{item.step}</p>
                <h2 className="mt-8 text-3xl font-semibold tracking-tight text-neutral-950">
                  {item.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-neutral-950 px-6 py-24 text-white sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-cyan-300">What it replaces</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
                The pile of tools around the PMS.
              </h2>
              <p className="mt-6 text-lg leading-8 text-neutral-300">
                The PMS stays the source of truth. 1DentalAI becomes the layer
                that surrounds it: communications, payer work, follow-up,
                approvals, automation, and intelligence.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {replaces.map((item) => (
                <div key={item} className="rounded-full border border-white/15 bg-white/8 px-5 py-4 text-sm font-semibold text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="Product surfaces"
            title="Four places where the work becomes obvious."
            body="The best dental software should lower the temperature in the practice. Everyone should know what happened, what is blocked, who owns it, and what happens next."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2">
            {operatingSurfaces.map((surface) => (
              <article key={surface.title} className="rounded-[2rem] bg-[#f5f5f7] p-8">
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                  {surface.title}
                </h2>
                <p className="mt-5 text-base leading-8 text-neutral-600">{surface.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold text-cyan-700">Team outcomes</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
                Every role gets fewer loose ends.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {outcomes.map(([role, body]) => (
                <article key={role} className="rounded-[2rem] bg-white p-7 shadow-sm">
                  <h3 className="text-2xl font-semibold text-neutral-950">{role}</h3>
                  <p className="mt-4 text-sm leading-7 text-neutral-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-24 text-center sm:px-8">
          <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
            Built to connect the systems your practice already runs on.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
            1DentalAI is designed around an owned connector platform: smart
            system selection, setup checks, cost controls, approval rules, direct
            integrations, health monitoring, and staff work queues when a system
            or payer cannot support real-time automation.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-full bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            Sign up for onboarding
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
