export const navItems = [
  { href: "/product", label: "Product" },
  { href: "/solutions", label: "Solutions" },
  { href: "/features", label: "Features" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/demos", label: "Workflows" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const productPillars = [
  {
    title: "Smart Scheduler",
    eyebrow: "Appointments, waitlist, calendar",
    body: "Drag-and-drop schedule with operatory management, provider colour-coding, real-time waitlist, bulk confirm, no-show tracking, and one-click check-in.",
  },
  {
    title: "Patient Management",
    eyebrow: "Charts, records, families",
    body: "Complete patient master records with medical alerts, insurance, family accounts, portal invites, merge duplicates, and a full audit trail.",
  },
  {
    title: "Insurance & RCM",
    eyebrow: "Eligibility to payment",
    body: "EDI 270/271 eligibility checks, claim submission and tracking, ERA posting, denial management, appeal generation, and payer performance dashboards.",
  },
  {
    title: "Clinical AI",
    eyebrow: "Scribe, perio, CDT coding",
    body: "AI encounter scribe turns voice transcripts into structured chart notes, assisted perio charting with staging/grading, and AI-suggested CDT codes.",
  },
  {
    title: "Treatment Plans",
    eyebrow: "Present, accept, finance",
    body: "Multi-phase treatment plans with fee estimates, insurance breakdowns, patient acceptance tracking, and one-click checkout.",
  },
  {
    title: "Billing & Ledger",
    eyebrow: "Payments, adjustments, statements",
    body: "Real-time ledger with procedure-level posting, insurance adjustments, payment collection, Stripe-powered checkout, and aging reports.",
  },
  {
    title: "Communications",
    eyebrow: "Reminders, portal, messaging",
    body: "Automated appointment reminders, a patient-facing portal for forms and messaging, two-way SMS, and review request campaigns.",
  },
  {
    title: "Practice Intelligence",
    eyebrow: "Reports, analytics, AI insights",
    body: "Production and collection reports, AI-driven revenue opportunity detection, provider performance, and payer analytics — all backed by source data.",
  },
  {
    title: "PMS Data Migration",
    eyebrow: "Dentrix, Eaglesoft, Open Dental, Curve",
    body: "One-click connectors migrate your complete patient history, appointments, ledger, insurance, and clinical records from your existing PMS in hours, not weeks.",
  },
];

export const useCases = [
  {
    title: "Never miss the patient ready to book",
    role: "Front desk",
    body: "AI phone and messaging workflows catch missed calls, match known patients, confirm appointments in bulk, and surface every waitlist opportunity.",
  },
  {
    title: "Clear tomorrow's schedule before the morning rush",
    role: "Insurance coordinator",
    body: "EDI eligibility, benefits, missing demographics, prior-auth risk, and claim blockers are resolved before the patient reaches the chair.",
  },
  {
    title: "Turn treatment plans into accepted care",
    role: "Treatment coordinator",
    body: "Patients get timely follow-ups, financing prompts, and payment links tied to the exact treatment that was recommended.",
  },
  {
    title: "Know which payers are slowing cash",
    role: "Billing manager",
    body: "Payer performance, claim status, ERA details, denials with AI-drafted appeals, and fallback work show up as measurable queues.",
  },
  {
    title: "Document encounters without extra clicks",
    role: "Dentist and hygienist",
    body: "AI scribe drafts chart notes from voice, perio charting is guided by AI staging, and CDT codes are suggested automatically.",
  },
  {
    title: "Migrate your existing PMS in hours",
    role: "Practice transitioning PMS",
    body: "Connect Dentrix, Eaglesoft, Open Dental, or Curve — we extract all historical data and import patients, appointments, ledger, insurance, and clinical records.",
  },
];

export const demoWorkflows = [
  {
    title: "New patient to first appointment",
    steps: ["Signup / portal invite", "Insurance eligibility", "Treatment plan", "Checkout", "Ledger posting"],
  },
  {
    title: "Insurance eligibility to claim payment",
    steps: ["EDI 270 check", "Benefit evidence", "Claim submission", "ERA posting", "Denial appeal"],
  },
  {
    title: "Voice encounter to signed chart note",
    steps: ["AI scribe transcript", "CDT suggestions", "Provider review", "Note signed", "Audit trail"],
  },
  {
    title: "PMS migration in one session",
    steps: ["Connect existing PMS", "Extract patient data", "Map schema", "Import records", "Go live"],
  },
];

export const resources = [
  {
    title: "1DentalAI PMS complete feature guide",
    type: "Guide",
    body: "Every module from scheduling to RCM to clinical AI — what it does, how it connects, and how it replaces your current stack.",
  },
  {
    title: "PMS migration playbook",
    type: "Technical brief",
    body: "How to move from Dentrix, Eaglesoft, Open Dental, or Curve to 1DentalAI without losing a single patient record or claim history.",
  },
  {
    title: "AI governance for dental practices",
    type: "Checklist",
    body: "Human review, PHI controls, audit evidence, role permissions, and safe AI automation rules that keep you HIPAA compliant.",
  },
  {
    title: "Front desk productivity calculator",
    type: "Worksheet",
    body: "Estimate hours lost to missed calls, manual insurance checks, no-show tracking, recall follow-ups, and claim rework.",
  },
  {
    title: "Dental AI Readiness Score",
    type: "Assessment",
    body: "Score your practice readiness across scheduling, insurance, RCM, clinical documentation, reputation, and analytics before choosing what to automate first.",
  },
  {
    title: "Insurance & RCM automation guide",
    type: "Partner resource",
    body: "How 1DentalAI's EDI eligibility, claim management, denial appeals, and ERA posting cuts your AR days in half.",
  },
];

export const stats = [
  { value: "1 platform", label: "Replaces your PMS, RCM tool, scribe, and patient portal" },
  { value: "< 1 day", label: "Average time to migrate a practice from an existing PMS" },
  { value: "270/271", label: "Real-time EDI eligibility before every appointment" },
  { value: "AI-first", label: "Scribe, CDT coding, perio staging, and appeal drafts built in" },
];

export const imageUrls = {
  hero:
    "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1800&q=85",
  practice:
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=85",
  team:
    "https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=1600&q=85",
  patient:
    "https://images.unsplash.com/photo-1600959907703-125ba1374a12?auto=format&fit=crop&w=1600&q=85",
};
