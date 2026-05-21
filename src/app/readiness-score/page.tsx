import type { Metadata } from "next";
import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { ReadinessScoreForm } from "@/components/readiness-score-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Readiness Score",
  description:
    "Score your dental practice across patient access, insurance readiness, RCM visibility, clinical documentation, reputation, analytics, and connector readiness.",
  path: "/readiness-score",
  keywords: ["dental AI readiness score", "dental AI checklist", "dental workflow assessment", "DSO AI readiness"],
});

export default function ReadinessScorePage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Dental AI Readiness Score"
          title="Find the workflows that should be fixed before buying another tool."
          body="Score the seven operating areas that determine whether AI will remove work or create another dashboard for your dental team."
        />
        <ReadinessScoreForm />
      </main>
    </MarketingShell>
  );
}
