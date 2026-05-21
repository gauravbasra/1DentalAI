export type SolutionPage = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  hero: string;
  audience: string;
  keywords: string[];
  outcomes: string[];
  workflow: string[];
  faqs: Array<{ question: string; answer: string }>;
};

export const solutionPages: SolutionPage[] = [
  {
    slug: "ai-receptionist-for-dentists",
    title: "AI Receptionist for Dentists",
    metaTitle: "AI Receptionist for Dentists",
    description:
      "Capture calls, identify patients, summarize conversations, draft replies, and route booking, billing, and treatment follow-up into accountable dental workflows.",
    eyebrow: "Dental AI receptionist",
    hero: "Answer more patient demand without adding another disconnected phone dashboard.",
    audience: "Front desk teams, practice owners, call centers, and DSOs that need cleaner patient access.",
    keywords: ["AI receptionist for dentists", "dental phone AI", "dental call automation", "missed call dental software"],
    outcomes: [
      "Missed calls become reviewed follow-up tasks.",
      "Known patient context appears with schedule, balance, recall, and treatment signals.",
      "New patient intent is routed to booking, insurance capture, and campaign attribution.",
      "Staff stay in control before messages, scheduling actions, or PMS updates are sent.",
    ],
    workflow: ["Inbound call or web chat", "Patient match and intent detection", "AI summary and recommended next step", "Staff review", "Booked appointment or routed task"],
    faqs: [
      {
        question: "Can an AI receptionist replace the front desk?",
        answer:
          "1DentalAI is designed to support the front desk, not remove accountability. The system captures demand, drafts next steps, and keeps staff approval in the workflow.",
      },
      {
        question: "Does 1DentalAI work with existing dental phone systems?",
        answer:
          "The platform is built around connector readiness for phone, PMS, messaging, and CRM systems so practices can map the workflow before going live.",
      },
    ],
  },
  {
    slug: "dental-insurance-verification-ai",
    title: "Dental Insurance Verification AI",
    metaTitle: "Dental Insurance Verification AI",
    description:
      "Use AI-assisted dental insurance verification to organize eligibility, benefit evidence, missing demographics, payer blockers, and financial clearance before the visit.",
    eyebrow: "Insurance and eligibility",
    hero: "Clear tomorrow's schedule before the patient reaches the chair.",
    audience: "Insurance coordinators, billing teams, treatment coordinators, and multi-location dental groups.",
    keywords: ["dental insurance verification AI", "dental eligibility automation", "270 271 dental eligibility", "dental financial clearance"],
    outcomes: [
      "Eligibility and benefit evidence are tied to the appointment.",
      "Missing subscriber, payer, plan, and demographic details surface early.",
      "Prior authorization, frequency, and attachment risks become visible work.",
      "Financial clearance moves from hallway updates into a tracked queue.",
    ],
    workflow: ["Appointment review", "Eligibility request or payer evidence capture", "Benefit and blocker summary", "Staff verification", "Clearance or follow-up task"],
    faqs: [
      {
        question: "Does 1DentalAI guarantee insurance benefits?",
        answer:
          "No. Dental benefits require payer evidence and staff review. 1DentalAI organizes the evidence and blockers so the team can make a clearer decision.",
      },
      {
        question: "Can the workflow support 270/271 eligibility?",
        answer:
          "The product is designed for eligibility evidence, payer routing, and connector-managed workflows, including 270/271-style readiness where supported.",
      },
    ],
  },
  {
    slug: "clinical-ai-scribe-dentistry",
    title: "Clinical AI Scribe for Dentistry",
    metaTitle: "Clinical AI Scribe for Dentistry",
    description:
      "Clinical AI scribe workflows for dental notes, charting context, perio support, provider review, audit history, and controlled writeback paths.",
    eyebrow: "Clinical AI",
    hero: "Draft better clinical documentation while keeping providers in control.",
    audience: "Dentists, hygienists, clinical leaders, and practice owners evaluating dental AI scribing.",
    keywords: ["clinical AI scribe dentistry", "dental AI scribe", "AI dental chart notes", "perio charting AI"],
    outcomes: [
      "Encounter context is gathered before the provider writes.",
      "AI note drafts stay behind provider review.",
      "Perio, treatment, imaging, and patient history signals stay connected.",
      "Clinical approval and audit history are part of the workflow.",
    ],
    workflow: ["Encounter context", "Transcript or note input", "AI clinical draft", "Provider edit and approval", "Controlled chart update"],
    faqs: [
      {
        question: "Can AI sign clinical notes?",
        answer:
          "No. 1DentalAI keeps clinical documentation behind provider review and approval so judgment remains with the licensed clinical team.",
      },
      {
        question: "Does the scribe connect to charting workflows?",
        answer:
          "The clinical AI module is designed around charting context, treatment history, perio support, and controlled writeback routes where connectors are configured.",
      },
    ],
  },
  {
    slug: "dental-rcm-automation",
    title: "Dental RCM Automation",
    metaTitle: "Dental RCM Automation",
    description:
      "Dental RCM automation for claim readiness, attachment risk, payer follow-up, denials, ERA visibility, leakage detection, and billing work queues.",
    eyebrow: "Revenue cycle",
    hero: "Turn invisible billing work into clear queues and measurable follow-up.",
    audience: "Billing managers, RCM teams, dental owners, and DSOs managing payer delay and claim rework.",
    keywords: ["dental RCM automation", "dental claims AI", "dental billing automation", "dental denial management"],
    outcomes: [
      "Claim blockers are grouped by owner, payer, and urgency.",
      "Attachment, narrative, perio, and eligibility risks surface earlier.",
      "Payer follow-up becomes tracked work rather than scattered notes.",
      "Collections and leakage signals connect back to practice operations.",
    ],
    workflow: ["Claim or ledger review", "Blocker and risk detection", "Evidence summary", "Billing owner assignment", "Follow-up or posting action"],
    faqs: [
      {
        question: "Does 1DentalAI submit claims automatically?",
        answer:
          "Actions that affect claims, payer submissions, or payment posting remain governed by connector configuration, evidence, and team approval.",
      },
      {
        question: "Who uses the RCM workflow?",
        answer:
          "Billing teams, practice managers, and central RCM teams use it to see eligibility, attachments, denials, payer delay, and collections follow-up.",
      },
    ],
  },
  {
    slug: "dental-reputation-management-ai",
    title: "Dental Reputation Management AI",
    metaTitle: "Dental Reputation Management AI",
    description:
      "Dental reputation AI for review requests, service recovery, response drafts, listing accuracy, referral prompts, and patient experience workflows.",
    eyebrow: "Growth and reputation",
    hero: "Ask for reviews at the right time and catch recovery issues before they go public.",
    audience: "Practice managers, marketing teams, owners, and DSOs focused on local search and patient experience.",
    keywords: ["dental reputation management AI", "dental review automation", "AI review responses dentists", "local SEO dentists"],
    outcomes: [
      "Review requests are tied to completed care and patient experience signals.",
      "Poor-experience indicators can suppress public asks and create recovery work.",
      "AI response drafts stay behind approval.",
      "Listings and local SEO tasks become visible practice work.",
    ],
    workflow: ["Completed visit or survey signal", "Experience check", "Review request or recovery task", "Response draft", "Approval and tracking"],
    faqs: [
      {
        question: "Can 1DentalAI help with local dental SEO?",
        answer:
          "Yes. Reputation workflows, review timing, listing accuracy tasks, and location performance signals support stronger local search operations.",
      },
      {
        question: "Are review responses auto-published?",
        answer:
          "No. Public-facing review responses should be reviewed by the practice before publishing through any connected channel.",
      },
    ],
  },
  {
    slug: "dental-practice-analytics-ai",
    title: "Dental Practice Analytics AI",
    metaTitle: "Dental Practice Analytics AI",
    description:
      "Dental practice analytics AI for call conversion, production, collections, payer delay, treatment acceptance, huddle workflows, and location scorecards.",
    eyebrow: "Practice intelligence",
    hero: "See what is slowing the practice down and which team owns the next step.",
    audience: "Practice owners, operations leaders, managers, providers, and DSO leadership teams.",
    keywords: ["dental practice analytics AI", "dental KPI dashboard", "dental huddle software", "DSO analytics AI"],
    outcomes: [
      "Daily huddle data connects to schedule, production, phones, and RCM.",
      "Call conversion, treatment acceptance, and payer delay become measurable.",
      "Location scorecards show work quality, not just top-line numbers.",
      "Owners see source-backed evidence behind performance signals.",
    ],
    workflow: ["Source data review", "AI signal detection", "Role-based queue", "Huddle or manager action", "Outcome tracking"],
    faqs: [
      {
        question: "What analytics matter most for dental AI?",
        answer:
          "Useful analytics connect performance to action: calls, scheduling, insurance readiness, treatment acceptance, collections, provider time, and follow-up quality.",
      },
      {
        question: "Can DSOs compare locations?",
        answer:
          "1DentalAI is designed to support central visibility across locations, queues, approvals, launch status, and operating playbooks.",
      },
    ],
  },
  {
    slug: "dso-dental-ai-platform",
    title: "DSO Dental AI Platform",
    metaTitle: "DSO Dental AI Platform",
    description:
      "A DSO dental AI platform for central inboxes, location rollout, RCM visibility, patient communications, clinical AI governance, analytics, and connector management.",
    eyebrow: "DSO dental AI",
    hero: "Give every location a common operating layer without losing local accountability.",
    audience: "DSO executives, regional managers, central billing teams, call centers, and operations leaders.",
    keywords: ["DSO dental AI platform", "multi location dental software", "dental AI for DSOs", "centralized dental operations"],
    outcomes: [
      "Central teams can see the same work language across locations.",
      "Rollouts track connector readiness, approvals, and workflow adoption.",
      "RCM, phones, reputation, and clinical AI governance share a common model.",
      "Location teams keep clear ownership for patient-facing work.",
    ],
    workflow: ["Location onboarding", "Connector readiness", "Workflow playbook", "Role-based queues", "Central analytics and governance"],
    faqs: [
      {
        question: "Is 1DentalAI built for multi-location groups?",
        answer:
          "Yes. The platform is designed around location-level work, central visibility, role permissions, connector status, and DSO operating workflows.",
      },
      {
        question: "Can each location keep its own systems?",
        answer:
          "The product is built around a connector strategy so groups can map PMS, phone, payer, reputation, payment, and CRM systems by location.",
      },
    ],
  },
];

export function getSolutionPage(slug: string) {
  return solutionPages.find((page) => page.slug === slug);
}
