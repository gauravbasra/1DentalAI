export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readTime: string;
  category: string;
  keywords: string[];
  sections: Array<{ heading: string; body: string[] }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "dental-ai-operating-system",
    title: "What Is a Dental AI Operating System?",
    description:
      "How dental practices can connect phones, insurance, RCM, treatment follow-up, clinical AI, and analytics into one accountable workflow.",
    publishedAt: "2026-05-21",
    readTime: "6 min read",
    category: "Dental AI",
    keywords: ["dental AI operating system", "dental practice automation", "AI for dental practices"],
    sections: [
      {
        heading: "The PMS is necessary, but it is not the whole operating layer",
        body: [
          "Most dental teams already have a practice management system, a phone system, texting tools, payer portals, review tools, spreadsheets, and clinical documentation workflows. The problem is not that one tool is missing. The problem is that the work moves across too many places without a shared queue, source evidence, or ownership.",
          "A dental AI operating system sits around the systems a practice already uses. It captures signals, understands context, drafts next steps, and routes work to the right team member while keeping humans in control.",
        ],
      },
      {
        heading: "The best workflows start before the appointment",
        body: [
          "A patient call, missed voicemail, text message, online request, or eligibility response can change the day. When those signals are disconnected, teams discover blockers at the front desk or chairside.",
          "1DentalAI is built to connect patient access, insurance readiness, treatment context, RCM, clinical notes, and follow-up so the practice can act before work becomes urgent.",
        ],
      },
      {
        heading: "AI should make work accountable",
        body: [
          "Good dental AI is not just a chatbot. It should create a clear operating record: what happened, what evidence supports it, who owns the next step, and what needs review before anything sensitive is sent or written back.",
          "That is especially important for patient communication, claim activity, payments, and clinical documentation.",
        ],
      },
    ],
  },
  {
    slug: "ai-receptionist-dental-practices",
    title: "AI Receptionist for Dental Practices: What It Should Actually Do",
    description:
      "A practical guide to AI phone workflows for missed calls, new patient conversion, scheduling, summaries, and follow-up ownership.",
    publishedAt: "2026-05-21",
    readTime: "5 min read",
    category: "AI Phone",
    keywords: ["AI receptionist dental", "dental phone AI", "missed calls dental practice"],
    sections: [
      {
        heading: "Answering is only the first step",
        body: [
          "Dental practices do not just need more answered calls. They need better conversion, cleaner patient identification, accurate summaries, and follow-up tasks that do not disappear after the phone rings.",
          "An AI receptionist workflow should identify the patient, understand intent, capture urgency, connect appointment options, and preserve a timeline for the team.",
        ],
      },
      {
        heading: "Every call should become practice intelligence",
        body: [
          "Calls reveal demand: new patient interest, crown questions, insurance concerns, cancellations, pain calls, payment questions, and treatment hesitation. When those calls are summarized and routed, managers can see which patients and workflows need attention.",
        ],
      },
      {
        heading: "The handoff matters",
        body: [
          "For healthcare operations, automation should not mean uncontrolled execution. Practices need review points, consent awareness, patient context, and clear ownership before sensitive replies or writebacks happen.",
        ],
      },
    ],
  },
  {
    slug: "dental-insurance-verification-ai",
    title: "Dental Insurance Verification AI: From Eligibility to a Clear Schedule",
    description:
      "How AI can organize eligibility, benefit evidence, missing demographics, prior authorization risk, and financial clearance before the visit.",
    publishedAt: "2026-05-21",
    readTime: "5 min read",
    category: "Insurance",
    keywords: ["dental insurance verification AI", "270 271 dental eligibility", "dental financial clearance"],
    sections: [
      {
        heading: "Insurance work is schedule work",
        body: [
          "Eligibility and benefits are not back-office details. They affect whether a patient is financially clear, whether the estimate is trustworthy, and whether the visit becomes stressful for the front desk.",
          "AI can help by organizing eligibility responses, missing demographics, prior authorization risk, benefit evidence, and follow-up tasks before the patient arrives.",
        ],
      },
      {
        heading: "Evidence beats guesswork",
        body: [
          "Teams need to know where information came from: payer response, portal note, PMS field, document, call summary, or staff review. A good workflow keeps source evidence attached so the practice can explain estimates and resolve blockers.",
        ],
      },
      {
        heading: "The goal is fewer day-of-care surprises",
        body: [
          "When insurance work is visible in a shared queue, practices can clear tomorrow's schedule earlier and reduce same-day administrative pressure.",
        ],
      },
    ],
  },
  {
    slug: "clinical-ai-scribe-dentistry",
    title: "Clinical AI Scribe for Dentistry: Scribing, Charting, Perio, and Provider Review",
    description:
      "What dental clinical AI should support today: encounter context, AI note drafts, chart note review, perio workflows, provider approval, and audit history.",
    publishedAt: "2026-05-21",
    readTime: "6 min read",
    category: "Clinical AI",
    keywords: ["clinical AI scribe dentistry", "dental AI scribe", "perio charting AI"],
    sections: [
      {
        heading: "Clinical AI should reduce documentation drag",
        body: [
          "Dentists and hygienists need context before, during, and after the encounter: patient history, forms, benefits, treatment plans, perio data, prior notes, and follow-up needs.",
          "A clinical AI scribe can help draft encounter notes, organize treatment context, and support chart review without replacing clinical judgment.",
        ],
      },
      {
        heading: "Provider review is the control point",
        body: [
          "Clinical documentation needs a review path. AI can draft, summarize, and organize. Providers should approve, edit, or reject before chart updates or writeback requests become final.",
        ],
      },
      {
        heading: "Perio workflows deserve connected context",
        body: [
          "Perio data, hygiene production, treatment follow-up, recall, and patient education all affect practice operations. When clinical and operational data stay connected, teams can support better care and better follow-up.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
