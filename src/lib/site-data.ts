export const navItems = [
  { href: "/product", label: "Product" },
  { href: "/features", label: "Features" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/demos", label: "Demos" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const productPillars = [
  {
    title: "AI communications",
    eyebrow: "Phones, text, chat",
    body: "Answer calls, summarize conversations, match patients, draft replies, route follow-ups, and keep every message inside one patient timeline.",
  },
  {
    title: "Insurance and RCM",
    eyebrow: "Eligibility to payment",
    body: "Turn payer checks, benefit details, claim readiness, attachments, denials, and ERA activity into clear operating queues.",
  },
  {
    title: "Growth and reputation",
    eyebrow: "Reviews, recalls, recovery",
    body: "Request reviews, triage unhappy feedback, reactivate overdue patients, follow up on unscheduled treatment, and measure booked production.",
  },
  {
    title: "Clinical AI",
    eyebrow: "Scribing, charting, perio",
    body: "Assist providers with draft notes, treatment context, perio workflows, and writeback requests behind explicit approval gates.",
  },
  {
    title: "Universal connectors",
    eyebrow: "PMS, EHR, CRM, payers",
    body: "Connect through owned routers first, with NexHealth and Stedi as accelerators rather than permanent product dependencies.",
  },
  {
    title: "Practice intelligence",
    eyebrow: "Truthful analytics",
    body: "Show production, collections, call conversion, payer delay, treatment acceptance, and data quality with source-backed evidence.",
  },
];

export const useCases = [
  {
    title: "Never miss the patient who is ready to book",
    role: "Front desk",
    body: "AI phone and messaging workflows catch missed calls, identify known patients, convert new patient leads, and open follow-up tasks.",
  },
  {
    title: "Clear tomorrow's schedule before the morning rush",
    role: "Insurance coordinator",
    body: "Eligibility, benefits, missing demographic data, prior auth risk, and claim blockers are organized before the patient arrives.",
  },
  {
    title: "Turn treatment plans into accepted care",
    role: "Treatment coordinator",
    body: "Patients get clear follow-ups, financing prompts, payment links, and reminders tied to the exact recommended treatment.",
  },
  {
    title: "Know which payers are slowing cash",
    role: "Billing manager",
    body: "Payer performance, claim status, ERA details, denials, and manual fallback work show up as measurable operational queues.",
  },
  {
    title: "Give providers clinical context without extra clicks",
    role: "Dentist and hygienist",
    body: "Call notes, forms, insurance context, treatment history, AI note drafts, and perio data stay connected to the encounter.",
  },
  {
    title: "Run every location with one operating system",
    role: "DSO leadership",
    body: "Central teams can see location performance, templates, approvals, inboxes, billing queues, and rollout readiness in one place.",
  },
];

export const demoWorkflows = [
  {
    title: "AI receptionist to booked appointment",
    steps: ["Inbound call", "Patient match", "Schedule options", "Confirmation text", "Timeline update"],
  },
  {
    title: "Insurance check to financial clearance",
    steps: ["Eligibility request", "Benefit evidence", "Blocker detection", "Staff task", "Appointment clearance"],
  },
  {
    title: "Missed call to revenue recovery",
    steps: ["Missed call", "Consent check", "AI draft", "Staff approval", "Booked follow-up"],
  },
  {
    title: "Clinical encounter to approved note",
    steps: ["Transcript", "AI draft", "Provider review", "Audit trail", "Writeback request"],
  },
];

export const resources = [
  {
    title: "Dental AI operating system blueprint",
    type: "Guide",
    body: "How communications, insurance, RCM, clinical documentation, and analytics become one practice workflow.",
  },
  {
    title: "PMS and payer connector strategy",
    type: "Technical brief",
    body: "Why 1DentalAI uses owned routers, capability maps, approval gates, and cost telemetry around vendor APIs.",
  },
  {
    title: "AI governance for dental practices",
    type: "Checklist",
    body: "Human approval, PHI controls, audit evidence, demo/live separation, and safe automation rules.",
  },
  {
    title: "Front desk productivity calculator",
    type: "Worksheet",
    body: "Estimate time lost to missed calls, insurance checks, review requests, recalls, no-shows, and claim rework.",
  },
];

export const stats = [
  { value: "1", label: "Patient timeline for every workflow" },
  { value: "24/7", label: "AI-assisted call and message capture" },
  { value: "270/271", label: "Eligibility workflow foundation" },
  { value: "0", label: "Fake production shortcuts allowed" },
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
