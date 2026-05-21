import Link from "next/link";
import { MarketingShell, PageHero } from "@/components/marketing-shell";

const contactPaths = [
  ["Dental practice", "Discuss phone, scheduling, insurance, payments, and growth workflows for one location."],
  ["DSO or group", "Map central inbox, billing, analytics, location rollout, and connector requirements."],
  ["Integration partner", "Explore PMS, payer, phone, payment, reputation, CRM, imaging, or clinical connector work."],
  ["Platform walkthrough", "Review the workflows, systems, and operating goals that matter most for your team."],
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Contact"
          title="Talk with the 1DentalAI team."
          body="Tell us what kind of practice you run, where work gets stuck, and which systems 1DentalAI needs to connect first."
        />
        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[2rem] bg-neutral-950 p-8 text-white">
            <h2 className="text-3xl font-semibold tracking-tight">Start with a guided conversation.</h2>
            <p className="mt-5 text-base leading-8 text-neutral-300">
              The right first step is a workflow review: PMS, phone system,
              payer mix, patient volume, billing process, and growth goals.
            </p>
            <Link href="mailto:hello@1dentalai.com" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950">
              hello@1dentalai.com
            </Link>
          </aside>
          <div className="grid gap-5 md:grid-cols-2">
            {contactPaths.map(([title, body]) => (
              <article key={title} className="rounded-[2rem] bg-white p-7 shadow-sm">
                <h2 className="text-2xl font-semibold text-neutral-950">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
