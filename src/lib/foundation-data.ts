export type EnvironmentMode = "PRODUCTION_SETUP" | "LIVE";

export type PermissionScope =
  | "location"
  | "module"
  | "patient_phi"
  | "clinical"
  | "financial"
  | "payer_rcm"
  | "communications"
  | "settings_admin"
  | "audit_security"
  | "ai_governance";

export type RoleKey =
  | "owner_dentist"
  | "associate_provider"
  | "rdh"
  | "dental_assistant"
  | "front_desk"
  | "treatment_coordinator"
  | "billing_rcm"
  | "practice_manager"
  | "dso_regional"
  | "compliance_admin"
  | "support_admin";

export type ModuleStatus = "foundation_ready" | "setup_required" | "locked_by_policy";

export type ChairStatus = "occupied" | "ready" | "turnover" | "blocked";

export type FoundationRole = {
  key: RoleKey;
  title: string;
  description: string;
  scopes: PermissionScope[];
  hiddenByDefault: string[];
  sampleUser: string;
};

export type PracticeLocation = {
  id: string;
  name: string;
  city: string;
  timezone: string;
  operatories: number;
  providersToday: number;
  chairUtilization: number;
  status: "active" | "onboarding";
};

export type Chair = {
  id: string;
  locationId: string;
  room: string;
  operatory: string;
  chair: string;
  status: ChairStatus;
  assignedProvider: string;
  assignedStaff: string[];
  appointmentType: string;
  nextAction: string;
  accessClass: PermissionScope[];
};

export type TeamMember = {
  id: string;
  name: string;
  role: RoleKey;
  locationIds: string[];
  availability: "chairside" | "front_desk" | "billing_queue" | "admin" | "off";
  currentFocus: string;
};

export type FeatureModule = {
  id: string;
  name: string;
  suite: string;
  status: ModuleStatus;
  visibleTo: RoleKey[];
  summary: string;
  foundationReady: string;
  setupRequired: string;
  futurePhase: string;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  domain: string;
  version: string;
  inheritedFrom: "1DentalAI default" | "DSO template" | "Location override";
  configurable: string[];
  lockedControls: string[];
  nextPhaseDependency: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  role: RoleKey;
  action: string;
  target: string;
  dataClass: PermissionScope;
  outcome: "allowed" | "blocked" | "read_only";
};

export type ServiceRevenue = {
  service: string;
  bookedRevenue: number;
  appointments: number;
  acceptedCases: number;
};

export type ProviderRevenue = {
  provider: string;
  role: "Doctor" | "RDH";
  locationId: string;
  bookedRevenue: number;
  completedAppointments: number;
  openChairHours: number;
};

export type AppointmentMetric = {
  label: string;
  count: number;
  production: number;
};

export type LocationPerformance = {
  locationId: string;
  bookedRevenue: number;
  hygieneRevenue: number;
  treatmentRevenue: number;
  chairUtilization: number;
  unscheduledTreatment: number;
};

export type DailyDashboardKpi = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "cyan" | "amber" | "red" | "neutral";
};

export type DailyDashboardItem = {
  label: string;
  detail: string;
  meta: string;
  priority: "Today" | "Next" | "Watch" | "Blocked";
};

export type DailyDashboard = {
  role: RoleKey;
  title: string;
  summary: string;
  huddleFocus: string;
  kpis: DailyDashboardKpi[];
  workQueues: Array<{
    title: string;
    items: DailyDashboardItem[];
  }>;
  decisions: string[];
  modulesInFocus: string[];
};

export const foundationPractice = {
  id: "practice_summit_dental",
  name: "Summit Dental Group",
  mode: "PRODUCTION_SETUP" as EnvironmentMode,
  dso: "1DentalAI Production Tenant",
  label: "Production setup - no live PHI connected",
};

export const locations: PracticeLocation[] = [
  {
    id: "loc_denver",
    name: "Denver Care Center",
    city: "Denver, CO",
    timezone: "America/Denver",
    operatories: 8,
    providersToday: 6,
    chairUtilization: 82,
    status: "active",
  },
  {
    id: "loc_boulder",
    name: "Boulder Hygiene Studio",
    city: "Boulder, CO",
    timezone: "America/Denver",
    operatories: 5,
    providersToday: 3,
    chairUtilization: 68,
    status: "active",
  },
  {
    id: "loc_aurora",
    name: "Aurora Specialty Hub",
    city: "Aurora, CO",
    timezone: "America/Denver",
    operatories: 6,
    providersToday: 4,
    chairUtilization: 54,
    status: "onboarding",
  },
];

export const roles: FoundationRole[] = [
  {
    key: "owner_dentist",
    title: "Owner Dentist",
    description: "Sees practice production, schedule health, clinical operations, collections, compliance, and multi-location rollups.",
    scopes: ["location", "module", "patient_phi", "clinical", "financial", "payer_rcm", "communications", "settings_admin", "audit_security", "ai_governance"],
    hiddenByDefault: [],
    sampleUser: "Dr. Aisha Patel",
  },
  {
    key: "associate_provider",
    title: "Associate Dentist / Provider",
    description: "Sees assigned clinical work, patient context, chair flow, and provider-ready notes.",
    scopes: ["location", "module", "patient_phi", "clinical", "communications"],
    hiddenByDefault: ["Practice-wide collections", "Credentialing contracts", "Security admin"],
    sampleUser: "Dr. Marcus Lee",
  },
  {
    key: "rdh",
    title: "Hygienist / RDH",
    description: "Sees hygiene schedule, room/chair context, perio readiness, and assigned clinical tasks.",
    scopes: ["location", "module", "patient_phi", "clinical", "communications"],
    hiddenByDefault: ["Full collections", "Write-off approvals", "Security admin"],
    sampleUser: "Nina Gomez, RDH",
  },
  {
    key: "dental_assistant",
    title: "Dental Assistant",
    description: "Sees chairside prep, room turnover, patient alerts, lab/referral readiness, and assigned provider support.",
    scopes: ["location", "module", "patient_phi", "clinical"],
    hiddenByDefault: ["A/R", "Payer contracts", "Practice settings"],
    sampleUser: "Sofia Clark",
  },
  {
    key: "front_desk",
    title: "Front Desk",
    description: "Sees scheduling, check-in, patient messages, forms, reminders, and follow-up work for the front office.",
    scopes: ["location", "module", "communications"],
    hiddenByDefault: ["Clinical note drafts", "Provider compensation", "Security audit"],
    sampleUser: "Emma Brooks",
  },
  {
    key: "treatment_coordinator",
    title: "Treatment Coordinator",
    description: "Sees treatment case readiness, estimates, financing/membership setup states, and patient follow-up.",
    scopes: ["location", "module", "patient_phi", "financial", "communications"],
    hiddenByDefault: ["Clinical finalization", "Security admin"],
    sampleUser: "Liam Reed",
  },
  {
    key: "billing_rcm",
    title: "Billing / RCM Specialist",
    description: "Sees payer, claims, revenue integrity, EOB/ERA, and financial queues without clinical-edit authority.",
    scopes: ["location", "module", "financial", "payer_rcm", "communications"],
    hiddenByDefault: ["Edit clinical findings", "AI scribe signoff", "Security admin"],
    sampleUser: "Priya Shah",
  },
  {
    key: "practice_manager",
    title: "Practice Manager",
    description: "Sees daily operations, staffing, rooms, access controls, audit activity, and practice performance.",
    scopes: ["location", "module", "financial", "payer_rcm", "communications", "settings_admin", "audit_security"],
    hiddenByDefault: ["Clinical note signoff"],
    sampleUser: "Grace Morgan",
  },
  {
    key: "dso_regional",
    title: "DSO Regional Manager",
    description: "Sees location rollups, staffing, chair utilization, production trends, and rollout status with minimized PHI.",
    scopes: ["location", "module", "financial", "payer_rcm", "audit_security"],
    hiddenByDefault: ["Patient-level PHI by default", "Clinical drafts"],
    sampleUser: "Jordan Ellis",
  },
  {
    key: "compliance_admin",
    title: "Compliance / Security Admin",
    description: "Sees access policy, audit, data classes, support access, and compliance configuration.",
    scopes: ["settings_admin", "audit_security", "ai_governance"],
    hiddenByDefault: ["Routine clinical production views"],
    sampleUser: "Maya Chen",
  },
  {
    key: "support_admin",
    title: "Support Admin",
    description: "Audited support access for configuration and troubleshooting, with no default ownership of practice work.",
    scopes: ["audit_security", "settings_admin"],
    hiddenByDefault: ["Patient PHI unless break-glass is approved", "Financial write actions"],
    sampleUser: "1DentalAI Support",
  },
];

export const teamMembers: TeamMember[] = [
  { id: "tm_1", name: "Dr. Aisha Patel", role: "owner_dentist", locationIds: ["loc_denver", "loc_boulder"], availability: "chairside", currentFocus: "Crown seat and production review" },
  { id: "tm_2", name: "Dr. Marcus Lee", role: "associate_provider", locationIds: ["loc_denver"], availability: "chairside", currentFocus: "Emergency slot coverage" },
  { id: "tm_3", name: "Nina Gomez, RDH", role: "rdh", locationIds: ["loc_boulder"], availability: "chairside", currentFocus: "Perio maintenance block" },
  { id: "tm_4", name: "Sofia Clark", role: "dental_assistant", locationIds: ["loc_denver"], availability: "chairside", currentFocus: "Operatory turnover" },
  { id: "tm_5", name: "Emma Brooks", role: "front_desk", locationIds: ["loc_denver", "loc_aurora"], availability: "front_desk", currentFocus: "Check-in and missed-call queue" },
  { id: "tm_6", name: "Priya Shah", role: "billing_rcm", locationIds: ["loc_denver", "loc_boulder", "loc_aurora"], availability: "billing_queue", currentFocus: "ERA exceptions and revenue integrity" },
  { id: "tm_7", name: "Grace Morgan", role: "practice_manager", locationIds: ["loc_denver"], availability: "admin", currentFocus: "Schedule capacity and staffing" },
];

export const chairs: Chair[] = [
  {
    id: "chair_1",
    locationId: "loc_denver",
    room: "Room 1",
    operatory: "OP-1",
    chair: "Chair A",
    status: "occupied",
    assignedProvider: "Dr. Aisha Patel",
    assignedStaff: ["Sofia Clark"],
    appointmentType: "Crown seat",
    nextAction: "Provider signoff after occlusion check",
    accessClass: ["clinical", "patient_phi"],
  },
  {
    id: "chair_2",
    locationId: "loc_denver",
    room: "Room 2",
    operatory: "OP-2",
    chair: "Chair B",
    status: "turnover",
    assignedProvider: "Dr. Marcus Lee",
    assignedStaff: ["Sofia Clark"],
    appointmentType: "Emergency exam",
    nextAction: "Room turnover due in 8 minutes",
    accessClass: ["clinical", "communications"],
  },
  {
    id: "chair_3",
    locationId: "loc_boulder",
    room: "Hygiene 1",
    operatory: "HY-1",
    chair: "Chair H1",
    status: "occupied",
    assignedProvider: "Nina Gomez, RDH",
    assignedStaff: [],
    appointmentType: "Perio maintenance",
    nextAction: "Perio measurements due before doctor exam",
    accessClass: ["clinical", "patient_phi"],
  },
  {
    id: "chair_4",
    locationId: "loc_aurora",
    room: "Surgery 2",
    operatory: "SX-2",
    chair: "Chair S2",
    status: "blocked",
    assignedProvider: "Unassigned",
    assignedStaff: [],
    appointmentType: "Implant consult setup",
    nextAction: "Blocked until imaging connector phase",
    accessClass: ["clinical", "module"],
  },
  {
    id: "chair_5",
    locationId: "loc_denver",
    room: "Room 4",
    operatory: "OP-4",
    chair: "Chair D",
    status: "ready",
    assignedProvider: "Dr. Marcus Lee",
    assignedStaff: ["Sofia Clark"],
    appointmentType: "Open emergency slot",
    nextAction: "Available for triage-approved same-day case",
    accessClass: ["clinical", "communications"],
  },
];

export const modules: FeatureModule[] = [
  {
    id: "pms",
    name: "Practice management system",
    suite: "Practice operations",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional", "support_admin"],
    summary: "Patient records, family accounts, scheduling, treatment plans, ledger, recalls, forms, and PMS/EHR writeback.",
    foundationReady: "Practice locations, team roles, rooms, chairs, access groups, and daily operating views are established.",
    setupRequired: "Live PMS sync, permanent database storage, patient records, scheduling, and approved writeback are not enabled yet.",
    futurePhase: "Next build: connector setup, live dental data model, and controlled PMS writeback.",
  },
  {
    id: "scheduling_forms",
    name: "Scheduling, intake, and forms",
    suite: "Patient access",
    status: "setup_required",
    visibleTo: ["owner_dentist", "front_desk", "practice_manager", "treatment_coordinator"],
    summary: "Online booking, recalls, confirmations, digital forms, consent capture, cancellation fills, and patient timeline updates.",
    foundationReady: "Location, role, room, and provider context is available for schedule and intake planning.",
    setupRequired: "Live calendar sync, forms storage, consent records, reminder rules, and writeback are not enabled yet.",
    futurePhase: "Next build: appointment lifecycle, digital intake, confirmations, reminders, and recall automation.",
  },
  {
    id: "telephony",
    name: "Telephony and AI phone",
    suite: "Communications",
    status: "setup_required",
    visibleTo: ["owner_dentist", "front_desk", "practice_manager", "compliance_admin"],
    summary: "AI receptionist, call routing, call pop, transcription, missed-call recovery, escalation, and call outcome reporting.",
    foundationReady: "Front desk roles, location coverage, emergency slot context, and consent boundaries are modeled.",
    setupRequired: "Practice phone numbers, call routing, AI receptionist scripts, transcription, SMS consent, and provider escalation are not connected yet.",
    futurePhase: "Next build: phone, text, chat, missed-call recovery, and AI receptionist using the existing phone app patterns.",
  },
  {
    id: "patient_chat",
    name: "AI chat and patient messaging",
    suite: "Communications",
    status: "setup_required",
    visibleTo: ["owner_dentist", "front_desk", "practice_manager", "treatment_coordinator"],
    summary: "Two-way text, website chat, patient questions, appointment follow-up, routing, consent, and staff approval.",
    foundationReady: "Patient-facing communication roles and consent boundaries are defined.",
    setupRequired: "Messaging channels, chat widget, consent ledger, patient matching, and approval queues are not connected yet.",
    futurePhase: "Next build: secure messaging inbox, AI drafts, patient matching, and staff-controlled sending.",
  },
  {
    id: "reputation",
    name: "Reputation management",
    suite: "Growth",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "front_desk", "treatment_coordinator"],
    summary: "Review requests, review monitoring, AI response drafts, service recovery, surveys, and location reputation reporting.",
    foundationReady: "Practice roles and follow-up ownership are ready for review requests and service recovery queues.",
    setupRequired: "Review site connections, response approvals, unhappy-patient recovery, and listing updates are not connected yet.",
    futurePhase: "Next build: reviews, service recovery, surveys, listing updates, and reputation reporting.",
  },
  {
    id: "digital_marketing",
    name: "Digital marketing, Local SEO, and AI SEO",
    suite: "Growth",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional"],
    summary: "Listings, local pages, AI search visibility, campaigns, attribution, reactivation, and treatment follow-up marketing.",
    foundationReady: "Locations, providers, and service areas are available for future listing and local-search work.",
    setupRequired: "Listing connections, location-page publishing, campaign channels, AI search visibility, and attribution reporting are not connected yet.",
    futurePhase: "Next build: digital campaigns, local listings, local pages, AI search monitoring, and booked-production attribution.",
  },
  {
    id: "ai_studio",
    name: "AI Studio",
    suite: "AI controls",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "compliance_admin", "treatment_coordinator"],
    summary: "Approved prompts, brand voice, content generation, campaign drafts, automation policies, and AI audit reporting.",
    foundationReady: "AI access roles and approval boundaries are modeled for practice-safe content and automation.",
    setupRequired: "Brand voice, approved prompts, content review, campaign generation, and audit reports are not connected yet.",
    futurePhase: "Next build: approved AI content, patient-safe messaging, campaign workflows, and audit reporting.",
  },
  {
    id: "rcm",
    name: "RCM and payer workflows",
    suite: "Revenue",
    status: "setup_required",
    visibleTo: ["owner_dentist", "billing_rcm", "practice_manager", "dso_regional"],
    summary: "Eligibility, benefits, claims, attachments, prior auth, payer status, EOB/ERA, denials, appeals, and payment posting.",
    foundationReady: "Billing roles, financial access, payer work ownership, and audit history are modeled.",
    setupRequired: "Eligibility, benefits, claims, attachments, EOB/ERA, denials, credentialing, and payer follow-up are not connected yet.",
    futurePhase: "Next build: insurance verification, claims, payer follow-up, payment posting, and credentialing workflows.",
  },
  {
    id: "revenue_integrity",
    name: "Revenue integrity",
    suite: "Revenue",
    status: "setup_required",
    visibleTo: ["owner_dentist", "billing_rcm", "practice_manager", "dso_regional"],
    summary: "Past-claim checks, missed billing, underpayments, contract variance, write-off review, and recovery worklists.",
    foundationReady: "Financial roles and payer-work access are modeled for leakage review.",
    setupRequired: "Past-claim audits, underpayment detection, contract variance, missed billing, and recovery queues are not connected yet.",
    futurePhase: "Next build: revenue leakage detection, recovery worklists, and owner-level revenue reporting.",
  },
  {
    id: "credentialing",
    name: "Credentialing and payer enrollment",
    suite: "Revenue",
    status: "setup_required",
    visibleTo: ["owner_dentist", "billing_rcm", "practice_manager", "dso_regional"],
    summary: "Provider credentialing, payer enrollment, CAQH/NPI/license tracking, EFT/ERA enrollment, expirations, and recredentialing.",
    foundationReady: "Provider, role, location, and payer-work ownership are established.",
    setupRequired: "Provider documents, payer rosters, CAQH data, license verification, and enrollment workflows are not connected yet.",
    futurePhase: "Next build: credentialing records, payer applications, expiration alerts, and enrollment queues.",
  },
  {
    id: "clinical_ai",
    name: "Clinical AI and scribe",
    suite: "Clinical care",
    status: "locked_by_policy",
    visibleTo: ["owner_dentist", "associate_provider", "rdh", "compliance_admin"],
    summary: "Ambient scribing, clinical note drafts, chart summaries, treatment evidence, provider approval, and signed writeback.",
    foundationReady: "Provider roles, clinical access boundaries, and approval requirements are modeled.",
    setupRequired: "AI scribe, chart notes, provider signoff, source evidence, and EHR/PMS writeback are not connected yet.",
    futurePhase: "Next build: scribing, charting, perio support, provider review, and signed clinical writeback.",
  },
  {
    id: "charting_perio",
    name: "Charting, perio, and treatment planning",
    suite: "Clinical care",
    status: "locked_by_policy",
    visibleTo: ["owner_dentist", "associate_provider", "rdh", "dental_assistant", "compliance_admin"],
    summary: "Odontogram, perio charting, clinical findings, diagnoses, procedures, treatment plans, consent, and provider signoff.",
    foundationReady: "Clinical roles, room context, and provider approval boundaries are established.",
    setupRequired: "Patient chart, perio measurements, clinical templates, treatment plan writeback, and signed records are not connected yet.",
    futurePhase: "Next build: charting model, perio workflow, treatment planning, patient education, and signed clinical record.",
  },
  {
    id: "imaging",
    name: "Imaging AI and CBCT",
    suite: "Clinical care",
    status: "setup_required",
    visibleTo: ["owner_dentist", "associate_provider", "rdh", "dental_assistant"],
    summary: "X-rays, CBCT, intraoral photos, DICOM storage, AI findings, overlays, measurements, evidence, and attachments.",
    foundationReady: "Clinical roles, room context, and provider review boundaries are modeled.",
    setupRequired: "X-ray/CBCT connections, DICOM storage, AI findings, overlays, measurements, and clinician review are not connected yet.",
    futurePhase: "Next build: imaging import, AI-assisted findings, evidence capture, and claim-ready attachments.",
  },
  {
    id: "labs",
    name: "Labs and prosthetics",
    suite: "Clinical operations",
    status: "setup_required",
    visibleTo: ["owner_dentist", "associate_provider", "dental_assistant", "practice_manager"],
    summary: "Lab vendors, lab cases, scan files, due dates, shipments, remakes, prosthetics, aligners, appliances, and appointment linkage.",
    foundationReady: "Provider, assistant, room, and appointment context is established for lab tracking.",
    setupRequired: "Lab vendor connections, case files, scanner links, shipment tracking, and result writeback are not connected yet.",
    futurePhase: "Next build: lab case lifecycle, scanner uploads, shipment status, remakes, and chairside readiness.",
  },
  {
    id: "pharmacy_erx",
    name: "Pharmacy and eRx",
    suite: "Clinical operations",
    status: "locked_by_policy",
    visibleTo: ["owner_dentist", "associate_provider", "compliance_admin"],
    summary: "E-prescribing, medication history, allergies, formulary checks, renewals, changes, cancellations, and EPCS-aware controls.",
    foundationReady: "Provider approval and clinical access boundaries are established.",
    setupRequired: "eRx network/vendor setup, medication history, pharmacy search, EPCS controls, and prescription audit are not connected yet.",
    futurePhase: "Next build: eRx vendor integration, medication safety checks, pharmacy routing, and provider-signed prescribing.",
  },
  {
    id: "referrals",
    name: "Referrals and specialty handoffs",
    suite: "Clinical operations",
    status: "setup_required",
    visibleTo: ["owner_dentist", "associate_provider", "rdh", "dental_assistant", "front_desk"],
    summary: "Inbound and outbound referrals, specialist partners, referral packets, status tracking, results, and follow-up.",
    foundationReady: "Provider, patient-access, and communication roles are established.",
    setupRequired: "Referral partners, document packets, secure exchange, appointment status, and results intake are not connected yet.",
    futurePhase: "Next build: referral directory, packet generation, status tracking, specialist communication, and result review.",
  },
  {
    id: "financial_products",
    name: "Financing, memberships, practice plans",
    suite: "Patient financials",
    status: "setup_required",
    visibleTo: ["owner_dentist", "treatment_coordinator", "practice_manager", "billing_rcm"],
    summary: "Third-party financing, in-house plans, membership plans, subscriptions, discounts, agreements, and recurring payments.",
    foundationReady: "Treatment coordinator and financial access roles are modeled.",
    setupRequired: "Financing offers, in-house payment plans, memberships, recurring billing, signed agreements, and failed-payment recovery are not connected yet.",
    futurePhase: "Next build: financing, membership plans, practice plans, payment schedules, and production reporting.",
  },
  {
    id: "payments",
    name: "Payments and patient billing",
    suite: "Patient financials",
    status: "setup_required",
    visibleTo: ["owner_dentist", "front_desk", "treatment_coordinator", "billing_rcm", "practice_manager"],
    summary: "Payment links, statements, card-on-file, recurring billing, payment posting, reconciliation, refunds, and disputes.",
    foundationReady: "Financial access roles and patient follow-up ownership are established.",
    setupRequired: "Payment processor setup, card vaulting, statements, ledger posting, and reconciliation are not connected yet.",
    futurePhase: "Next build: patient payments, statement workflows, payment posting, reconciliation, and failed-payment recovery.",
  },
  {
    id: "analytics",
    name: "Practice intelligence and analytics",
    suite: "Analytics",
    status: "foundation_ready",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional", "billing_rcm"],
    summary: "Production, collections, schedule health, provider performance, service mix, payer delay, marketing attribution, and AI ROI.",
    foundationReady: "Production, schedule, provider, service, and location performance views are available for the current setup stage.",
    setupRequired: "Live PMS, payment, payer, phone, and marketing feeds are needed for production reporting.",
    futurePhase: "Next build: live metrics ingestion, source evidence, trend reporting, and DSO rollups.",
  },
  {
    id: "marketplace",
    name: "Integration marketplace",
    suite: "Platform",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional", "compliance_admin", "support_admin"],
    summary: "PMS, EHR, payer, CRM, phone, payment, imaging, lab, eRx, marketing, financing, and analytics vendor connections.",
    foundationReady: "Product areas and access boundaries are established for future connector setup.",
    setupRequired: "Connector registry, credential storage, health checks, approval rules, vendor status, and cost controls are not connected yet.",
    futurePhase: "Next build: connector registry, setup checks, health monitoring, routing rules, and manual work queues.",
  },
  {
    id: "security_compliance",
    name: "Security, audit, and compliance",
    suite: "Platform",
    status: "foundation_ready",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional", "compliance_admin", "support_admin"],
    summary: "Role-based access, location access, minimum necessary PHI, support access, audit trails, approvals, and compliance evidence.",
    foundationReady: "Role views, blocked access, read-only outcomes, audit events, and support boundaries are established.",
    setupRequired: "Production identity provider, tenant database, support break-glass workflow, and exportable audit reports are not connected yet.",
    futurePhase: "Next build: identity, tenant persistence, audit export, policy management, and support access controls.",
  },
];

export const workflows: WorkflowDefinition[] = [
  {
    id: "wf_emergency_triage",
    name: "Emergency triage intake",
    domain: "Patient access and emergency care",
    version: "0.1-draft",
    inheritedFrom: "1DentalAI default",
    configurable: ["front desk owner", "doctor callback provider", "same-day appointment pool"],
    lockedControls: ["red flag escalation", "AI cannot make final medical decisions"],
    nextPhaseDependency: "Requires live phone routing, consent checks, provider escalation, and schedule access.",
  },
  {
    id: "wf_chair_flow",
    name: "Chair flow and turnover",
    domain: "Practice operations",
    version: "0.1-draft",
    inheritedFrom: "Location override",
    configurable: ["turnover target", "assistant assignment", "blocked-room reasons"],
    lockedControls: ["blocked-chair history is recorded", "patient details stay off public room boards"],
    nextPhaseDependency: "Requires live schedule, room assignments, provider calendars, and PMS sync.",
  },
  {
    id: "wf_rcm_leakage",
    name: "Revenue integrity review",
    domain: "Revenue",
    version: "0.1-draft",
    inheritedFrom: "DSO template",
    configurable: ["minimum recovery amount", "payer priority", "appeal owner"],
    lockedControls: ["write-off reversal requires approval", "payer-facing action requires approval"],
    nextPhaseDependency: "Requires live claims, payments, fee schedules, payer contracts, and EOB/ERA data.",
  },
  {
    id: "wf_review_recovery",
    name: "Review and service recovery",
    domain: "Growth",
    version: "0.1-draft",
    inheritedFrom: "1DentalAI default",
    configurable: ["review request timing", "unhappy-patient owner", "location-specific templates"],
    lockedControls: ["AI response requires approval", "respect opt-out and consent"],
    nextPhaseDependency: "Requires review-site connections, consent, approved response templates, and patient follow-up queues.",
  },
  {
    id: "wf_ai_studio",
    name: "AI Studio content approval",
    domain: "AI content and growth",
    version: "0.1-draft",
    inheritedFrom: "DSO template",
    configurable: ["brand voice", "campaign approver", "channel templates"],
    lockedControls: ["no unapproved clinical claims", "PHI cannot enter marketing prompts"],
    nextPhaseDependency: "Requires approved brand rules, channel connections, compliance review, and publishing permissions.",
  },
];

export const auditEvents: AuditEvent[] = [
  {
    id: "audit_1",
    at: "2026-05-20T09:10:00-06:00",
    actor: "Dr. Aisha Patel",
    role: "owner_dentist",
    action: "Viewed practice dashboard",
    target: "Summit Dental Group",
    dataClass: "settings_admin",
    outcome: "allowed",
  },
  {
    id: "audit_2",
    at: "2026-05-20T09:12:00-06:00",
    actor: "Priya Shah",
    role: "billing_rcm",
    action: "Opened revenue operations view",
    target: "RCM and payer workflows",
    dataClass: "payer_rcm",
    outcome: "read_only",
  },
  {
    id: "audit_3",
    at: "2026-05-20T09:16:00-06:00",
    actor: "Emma Brooks",
    role: "front_desk",
    action: "Attempted clinical AI visibility",
    target: "Clinical AI and scribe",
    dataClass: "clinical",
    outcome: "blocked",
  },
  {
    id: "audit_4",
    at: "2026-05-20T09:21:00-06:00",
    actor: "Nina Gomez, RDH",
    role: "rdh",
    action: "Viewed chair flow",
    target: "Boulder Hygiene Studio",
    dataClass: "clinical",
    outcome: "allowed",
  },
];

export const serviceRevenue: ServiceRevenue[] = [
  { service: "Crowns and bridges", bookedRevenue: 48200, appointments: 18, acceptedCases: 13 },
  { service: "Hygiene and perio", bookedRevenue: 31650, appointments: 42, acceptedCases: 39 },
  { service: "Implant consults", bookedRevenue: 27400, appointments: 9, acceptedCases: 5 },
  { service: "Clear aligners", bookedRevenue: 22100, appointments: 7, acceptedCases: 4 },
  { service: "Emergency dentistry", bookedRevenue: 12850, appointments: 16, acceptedCases: 12 },
];

export const providerRevenue: ProviderRevenue[] = [
  { provider: "Dr. Aisha Patel", role: "Doctor", locationId: "loc_denver", bookedRevenue: 52700, completedAppointments: 31, openChairHours: 4.5 },
  { provider: "Dr. Marcus Lee", role: "Doctor", locationId: "loc_denver", bookedRevenue: 38900, completedAppointments: 28, openChairHours: 7.25 },
  { provider: "Nina Gomez, RDH", role: "RDH", locationId: "loc_boulder", bookedRevenue: 18450, completedAppointments: 34, openChairHours: 2.75 },
  { provider: "Aurora specialty team", role: "Doctor", locationId: "loc_aurora", bookedRevenue: 30150, completedAppointments: 17, openChairHours: 8 },
];

export const appointmentMetrics: AppointmentMetric[] = [
  { label: "Completed", count: 82, production: 94400 },
  { label: "Confirmed upcoming", count: 46, production: 67300 },
  { label: "Needs confirmation", count: 19, production: 21800 },
  { label: "Emergency holds", count: 6, production: 9200 },
  { label: "Unscheduled treatment", count: 23, production: 58600 },
];

export const locationPerformance: LocationPerformance[] = [
  { locationId: "loc_denver", bookedRevenue: 91600, hygieneRevenue: 14100, treatmentRevenue: 77500, chairUtilization: 82, unscheduledTreatment: 22600 },
  { locationId: "loc_boulder", bookedRevenue: 37450, hygieneRevenue: 23100, treatmentRevenue: 14350, chairUtilization: 68, unscheduledTreatment: 12100 },
  { locationId: "loc_aurora", bookedRevenue: 30150, hygieneRevenue: 4400, treatmentRevenue: 25750, chairUtilization: 54, unscheduledTreatment: 23900 },
];

export const dailyDashboards: Record<RoleKey, DailyDashboard> = {
  owner_dentist: {
    role: "owner_dentist",
    title: "Owner morning command center",
    summary: "Production, schedule health, provider performance, revenue leakage, reviews, and location risk before the first patient is seated.",
    huddleFocus: "Yesterday, today, tomorrow: production vs goal, case acceptance, hygiene reappointment, open treatment, collections, and location outliers.",
    kpis: [
      { label: "Scheduled production", value: "$142.2K", detail: "$17.8K below daily goal across three locations", tone: "amber" },
      { label: "Case acceptance", value: "64%", detail: "$58.6K still unscheduled from presented treatment", tone: "amber" },
      { label: "Hygiene reappointment", value: "81%", detail: "Boulder is 9 points below target", tone: "cyan" },
      { label: "Revenue at risk", value: "$31.4K", detail: "Payer delay, underpayment, and write-off review", tone: "red" },
    ],
    workQueues: [
      {
        title: "Owner decisions",
        items: [
          { label: "Approve revenue recovery worklist", detail: "12 claims with underpayment or missed attachment patterns.", meta: "$18.9K recoverable", priority: "Today" },
          { label: "Review Aurora specialty ramp", detail: "Chair utilization is 54% with $23.9K unscheduled treatment.", meta: "Location outlier", priority: "Today" },
          { label: "Provider production review", detail: "Dr. Marcus Lee has 7.25 open chair hours this week.", meta: "Schedule mix", priority: "Next" },
        ],
      },
      {
        title: "Growth and patient access",
        items: [
          { label: "Missed-call revenue risk", detail: "Nine calls need same-day recovery; three are new patient implant/ortho inquiries.", meta: "AI phone", priority: "Today" },
          { label: "Reputation recovery", detail: "Two negative feedback events need owner-approved response before review request resumes.", meta: "Reviews", priority: "Watch" },
          { label: "Membership opportunity", detail: "14 uninsured active patients match in-house plan criteria.", meta: "$9.6K annualized", priority: "Next" },
        ],
      },
    ],
    decisions: ["Approve payer recovery batch", "Assign Aurora schedule fill owner", "Review provider production per hour", "Approve negative-feedback recovery script"],
    modulesInFocus: ["Practice intelligence and analytics", "Revenue integrity", "RCM and payer workflows", "Reputation management", "Digital marketing, Local SEO, and AI SEO"],
  },
  associate_provider: {
    role: "associate_provider",
    title: "Provider clinical day",
    summary: "The provider sees today’s patients, clinical prep, note work, imaging evidence, labs, referrals, and approval items.",
    huddleFocus: "Be ready for the chair: medical alerts, unscheduled treatment in today’s patients, images to review, notes to sign, and emergency exams.",
    kpis: [
      { label: "Patients today", value: "14", detail: "Four restorative, two emergency, eight exams or follow-ups", tone: "cyan" },
      { label: "Notes to sign", value: "5", detail: "Three AI scribe drafts and two treatment plan addenda", tone: "amber" },
      { label: "Same-day opportunity", value: "$8.7K", detail: "Diagnosed treatment available in seated patients", tone: "green" },
      { label: "Lab risks", value: "2", detail: "Cases due before tomorrow’s crown seats", tone: "red" },
    ],
    workQueues: [
      {
        title: "Clinical prep",
        items: [
          { label: "Emergency exam at 10:40", detail: "Pain, swelling note, no recent PA; imaging needed before diagnosis.", meta: "Room 2", priority: "Today" },
          { label: "Implant consult packet", detail: "CBCT missing from chart; treatment coordinator is holding estimate.", meta: "Aurora", priority: "Blocked" },
          { label: "Crown seat signoff", detail: "Occlusion check and final note required after appointment.", meta: "Room 1", priority: "Today" },
        ],
      },
      {
        title: "Provider approvals",
        items: [
          { label: "AI scribe draft review", detail: "Three drafts need provider edits before PMS writeback.", meta: "Clinical AI", priority: "Today" },
          { label: "Referral result review", detail: "Endo report received for patient scheduled next week.", meta: "Referral", priority: "Next" },
          { label: "eRx approval locked", detail: "Prescription workflow requires provider signature and EPCS setup.", meta: "Pharmacy", priority: "Blocked" },
        ],
      },
    ],
    decisions: ["Sign or edit AI notes", "Approve same-day treatment", "Order missing imaging", "Release referral follow-up"],
    modulesInFocus: ["Clinical AI and scribe", "Charting, perio, and treatment planning", "Imaging AI and CBCT", "Labs and prosthetics", "Referrals and specialty handoffs"],
  },
  rdh: {
    role: "rdh",
    title: "Hygiene and perio day",
    summary: "The hygienist sees hygiene flow, perio charting, reappointment gaps, doctor exam timing, radiograph readiness, and preventive opportunities.",
    huddleFocus: "Keep continuing care moving: perio status, hygiene reappointment, fluoride, diagnosed treatment, doctor exam timing, and chart completeness.",
    kpis: [
      { label: "Hygiene visits", value: "9", detail: "Three perio maintenance, six prophy/recall", tone: "cyan" },
      { label: "Perio charting due", value: "4", detail: "Measurements required before doctor exam", tone: "amber" },
      { label: "Reappointment rate", value: "78%", detail: "Target is 90% before patient leaves", tone: "amber" },
      { label: "Preventive opportunity", value: "$1.8K", detail: "Fluoride and perio adjunctive codes in today’s schedule", tone: "green" },
    ],
    workQueues: [
      {
        title: "Chairside hygiene work",
        items: [
          { label: "Perio maintenance block", detail: "Two patients need bleeding points and pocket depths completed before exam.", meta: "HY-1", priority: "Today" },
          { label: "Overdue radiographs", detail: "Three continuing-care patients are due for BWX based on policy.", meta: "Imaging", priority: "Today" },
          { label: "Doctor exam timing", detail: "Dr. Lee exam needed before 11:20 to avoid room delay.", meta: "Schedule", priority: "Watch" },
        ],
      },
      {
        title: "Continuing care",
        items: [
          { label: "Reappoint before checkout", detail: "Two hygiene patients have no future continuing-care appointment.", meta: "Recall", priority: "Today" },
          { label: "Perio risk education", detail: "Patient has missed two maintenance intervals; chairside handoff needed.", meta: "Perio", priority: "Next" },
          { label: "Treatment found in hygiene", detail: "Three patients have open restorative treatment to mention at doctor exam.", meta: "$4.3K", priority: "Watch" },
        ],
      },
    ],
    decisions: ["Complete perio charting", "Flag doctor exam timing", "Reappoint hygiene", "Record treatment opportunities"],
    modulesInFocus: ["Charting, perio, and treatment planning", "Scheduling, intake, and forms", "Imaging AI and CBCT", "Practice intelligence and analytics"],
  },
  dental_assistant: {
    role: "dental_assistant",
    title: "Chairside operations",
    summary: "The assistant sees room readiness, turnover, provider support, lab case status, imaging readiness, blocked chairs, and procedure setup.",
    huddleFocus: "Protect chair time: what room is ready, what is blocked, which lab or image is missing, and where the provider needs support.",
    kpis: [
      { label: "Rooms ready", value: "3/5", detail: "One turnover, one blocked for imaging setup", tone: "amber" },
      { label: "Turnover target", value: "8 min", detail: "Room 2 is at risk of delaying emergency slot", tone: "red" },
      { label: "Lab cases due", value: "4", detail: "Two need verification before patient arrival", tone: "amber" },
      { label: "Emergency capacity", value: "1 chair", detail: "Room 4 open for triage-approved same-day case", tone: "green" },
    ],
    workQueues: [
      {
        title: "Room and procedure prep",
        items: [
          { label: "Room 2 turnover", detail: "Emergency exam room must be ready before 10:40.", meta: "8 min target", priority: "Today" },
          { label: "Crown seat setup", detail: "Verify crown, cement, bite material, and occlusion paper.", meta: "Room 1", priority: "Today" },
          { label: "Implant consult blocked", detail: "Imaging connector/setup not complete; coordinator needs status.", meta: "Room SX-2", priority: "Blocked" },
        ],
      },
      {
        title: "Clinical handoffs",
        items: [
          { label: "Lab case verification", detail: "Two cases need shade and delivery confirmation.", meta: "Labs", priority: "Today" },
          { label: "Referral packet prep", detail: "Oral surgery referral needs image export and signed note.", meta: "Referral", priority: "Next" },
          { label: "Sterilization watch", detail: "Surgical cassette count will be tight after 2 PM.", meta: "Inventory", priority: "Watch" },
        ],
      },
    ],
    decisions: ["Clear blocked room reason", "Verify lab cases", "Prepare emergency room", "Escalate missing imaging"],
    modulesInFocus: ["Rooms", "Labs and prosthetics", "Imaging AI and CBCT", "Referrals and specialty handoffs"],
  },
  front_desk: {
    role: "front_desk",
    title: "Patient access desk",
    summary: "The front desk sees calls, texts, voicemails, appointment requests, confirmations, forms, recalls, and emergency routing.",
    huddleFocus: "Keep the front door moving: missed calls, unconfirmed appointments, forms not complete, new patient requests, and emergency triage.",
    kpis: [
      { label: "Missed calls", value: "9", detail: "Three high-intent new patient calls need recovery", tone: "red" },
      { label: "Unconfirmed visits", value: "19", detail: "$21.8K production tied to confirmation status", tone: "amber" },
      { label: "Forms incomplete", value: "11", detail: "Four are first-visit patients before noon", tone: "amber" },
      { label: "Recall fill list", value: "27", detail: "Hygiene openings can be filled from overdue list", tone: "green" },
    ],
    workQueues: [
      {
        title: "Patient access queue",
        items: [
          { label: "Recover missed implant inquiry", detail: "AI call summary detected implant pricing and availability question.", meta: "New patient", priority: "Today" },
          { label: "Confirm tomorrow morning", detail: "Seven appointments need text or phone confirmation by 2 PM.", meta: "$8.4K", priority: "Today" },
          { label: "Emergency request triage", detail: "Two pain/swelling messages require provider escalation.", meta: "AI phone", priority: "Today" },
        ],
      },
      {
        title: "Schedule and forms",
        items: [
          { label: "Digital forms incomplete", detail: "Send secure link and flag arrivals with missing medical history.", meta: "Forms", priority: "Today" },
          { label: "Fill hygiene opening", detail: "Boulder has a 70-minute opening; recall list has 12 qualified patients.", meta: "Hygiene", priority: "Next" },
          { label: "Insurance card capture", detail: "Five upcoming patients missing front/back insurance images.", meta: "Intake", priority: "Watch" },
        ],
      },
    ],
    decisions: ["Call back high-intent missed calls", "Confirm production-heavy visits", "Route emergencies", "Complete intake before arrival"],
    modulesInFocus: ["Telephony and AI phone", "AI chat and patient messaging", "Scheduling, intake, and forms", "Practice management system"],
  },
  treatment_coordinator: {
    role: "treatment_coordinator",
    title: "Treatment acceptance desk",
    summary: "The treatment coordinator sees presented treatment, unscheduled treatment, financing candidates, membership opportunities, estimates, and follow-ups.",
    huddleFocus: "Turn diagnosed treatment into accepted care: estimates ready, financing options, membership fit, follow-up timing, and doctor handoff quality.",
    kpis: [
      { label: "Unscheduled treatment", value: "$58.6K", detail: "23 patients with presented treatment not booked", tone: "amber" },
      { label: "High-value open cases", value: "7", detail: "Implants, aligners, crowns, and perio therapy", tone: "cyan" },
      { label: "Financing candidates", value: "12", detail: "Cases over $1.5K without payment path", tone: "green" },
      { label: "Pending estimates", value: "8", detail: "Need benefit/fee review before patient call", tone: "red" },
    ],
    workQueues: [
      {
        title: "Case conversion queue",
        items: [
          { label: "Implant consult follow-up", detail: "Treatment plan drafted; missing imaging cost estimate.", meta: "$12.4K", priority: "Today" },
          { label: "Crown bridge acceptance", detail: "Three cases need financing option and provider-approved narrative.", meta: "$9.8K", priority: "Today" },
          { label: "Perio therapy handoff", detail: "RDH identified risk; patient needs benefits and payment plan.", meta: "$2.1K", priority: "Next" },
        ],
      },
      {
        title: "Financial presentation",
        items: [
          { label: "Membership enrollment", detail: "14 uninsured patients qualify for practice plan.", meta: "Plans", priority: "Next" },
          { label: "Estimate blocker", detail: "Two plans need payer benefit detail before quote is sent.", meta: "RCM", priority: "Blocked" },
          { label: "Accepted not scheduled", detail: "Four patients accepted treatment but have no appointment.", meta: "$6.7K", priority: "Today" },
        ],
      },
    ],
    decisions: ["Send estimates", "Offer financing", "Enroll memberships", "Book accepted treatment"],
    modulesInFocus: ["Financing, memberships, practice plans", "Payments and patient billing", "RCM and payer workflows", "Scheduling, intake, and forms"],
  },
  billing_rcm: {
    role: "billing_rcm",
    title: "RCM work center",
    summary: "Billing sees eligibility, benefit gaps, claim blockers, payer follow-up, denials, EOB/ERA exceptions, underpayments, and patient balances.",
    huddleFocus: "Clear money blockers: eligibility before visit, claims before timely filing, attachments before rejection, ERA exceptions before aging, and underpayments before write-off.",
    kpis: [
      { label: "Claim dollars blocked", value: "$24.7K", detail: "Attachments, coding review, and payer status work", tone: "red" },
      { label: "Eligibility failures", value: "13", detail: "Tomorrow’s schedule needs benefit evidence", tone: "amber" },
      { label: "ERA exceptions", value: "9", detail: "Posting variance or denial reason requires review", tone: "amber" },
      { label: "Underpayment queue", value: "$6.7K", detail: "Contract variance above threshold", tone: "red" },
    ],
    workQueues: [
      {
        title: "Insurance and payer queue",
        items: [
          { label: "Tomorrow eligibility sweep", detail: "13 patients missing verified benefit evidence.", meta: "270/271", priority: "Today" },
          { label: "Attachment risk", detail: "Seven claims need perio chart, narrative, or x-ray before submission.", meta: "$11.2K", priority: "Today" },
          { label: "Payer follow-up", detail: "Five claims are past expected response window.", meta: "Aging", priority: "Today" },
        ],
      },
      {
        title: "Revenue integrity",
        items: [
          { label: "Underpayment review", detail: "Contract variance found on two crown claims and one perio claim.", meta: "$6.7K", priority: "Today" },
          { label: "Write-off approval", detail: "Three proposed write-offs require owner approval.", meta: "$2.3K", priority: "Blocked" },
          { label: "Credentialing blocker", detail: "Aurora provider enrollment status affects specialty claims.", meta: "Payer setup", priority: "Watch" },
        ],
      },
    ],
    decisions: ["Fix eligibility gaps", "Submit attachments", "Appeal denials", "Escalate write-offs", "Recover underpayments"],
    modulesInFocus: ["RCM and payer workflows", "Revenue integrity", "Credentialing and payer enrollment", "Payments and patient billing"],
  },
  practice_manager: {
    role: "practice_manager",
    title: "Practice operations cockpit",
    summary: "The manager sees schedule gaps, room status, staff coverage, confirmations, forms, phone load, overdue tasks, and today’s production risk.",
    huddleFocus: "Run the day: holes in schedule, who owns each queue, which rooms are blocked, which patients are not ready, and which production is at risk.",
    kpis: [
      { label: "Schedule at risk", value: "$31.0K", detail: "Unconfirmed, holes, and patients not ready", tone: "red" },
      { label: "Chair utilization", value: "73%", detail: "Aurora is the drag at 54%", tone: "amber" },
      { label: "Staff coverage gaps", value: "3", detail: "Lunch coverage, surgery assistant, billing queue", tone: "amber" },
      { label: "Open tasks", value: "42", detail: "19 front desk, 13 RCM, 10 clinical ops", tone: "cyan" },
    ],
    workQueues: [
      {
        title: "Daily operations",
        items: [
          { label: "Fill production holes", detail: "Two openings can be filled from unscheduled treatment or recall lists.", meta: "$7.8K", priority: "Today" },
          { label: "Room 2 turnover delay", detail: "Emergency appointment may slip without assistant reassignment.", meta: "Rooms", priority: "Today" },
          { label: "Forms and confirmations", detail: "11 incomplete forms and 19 unconfirmed appointments.", meta: "Patient access", priority: "Today" },
        ],
      },
      {
        title: "Team coordination",
        items: [
          { label: "Billing backlog", detail: "Priya has 22 payer items; assign overflow before noon.", meta: "RCM", priority: "Next" },
          { label: "Provider exam timing", detail: "Hygiene doctor exams are stacked between 10:30 and 11:20.", meta: "Schedule", priority: "Watch" },
          { label: "Service recovery", detail: "Negative feedback needs manager call before review automation resumes.", meta: "Reputation", priority: "Today" },
        ],
      },
    ],
    decisions: ["Assign queue owners", "Fill schedule holes", "Rebalance staff", "Escalate production risk"],
    modulesInFocus: ["Practice intelligence and analytics", "Scheduling, intake, and forms", "Rooms", "Telephony and AI phone", "Reputation management"],
  },
  dso_regional: {
    role: "dso_regional",
    title: "Regional performance control",
    summary: "The regional manager sees location comparisons, rollout status, production outliers, RCM backlog, reputation risk, and playbook adoption.",
    huddleFocus: "Find the outliers: which location is behind goal, which queue is overloaded, where patient access is leaking, and where standards are not being followed.",
    kpis: [
      { label: "Locations below goal", value: "2/3", detail: "Aurora production and Boulder hygiene reappointment", tone: "amber" },
      { label: "RCM backlog", value: "$24.7K", detail: "Claim blockers concentrated in Aurora", tone: "red" },
      { label: "Call recovery SLA", value: "71%", detail: "Missed-call follow-up below standard", tone: "amber" },
      { label: "Review trend", value: "+18", detail: "Denver up, Aurora paused for recovery", tone: "cyan" },
    ],
    workQueues: [
      {
        title: "Location outliers",
        items: [
          { label: "Aurora specialty hub", detail: "54% chair utilization with credentialing and imaging blockers.", meta: "Highest risk", priority: "Today" },
          { label: "Boulder hygiene reappointment", detail: "Below standard; RDH reappoint workflow needs coaching.", meta: "78%", priority: "Next" },
          { label: "Denver provider mix", detail: "Open chair hours despite high demand for emergency dentistry.", meta: "Capacity", priority: "Watch" },
        ],
      },
      {
        title: "Standardization",
        items: [
          { label: "RCM playbook adoption", detail: "Attachment checklist is not consistently followed at Aurora.", meta: "Claims", priority: "Today" },
          { label: "Phone recovery playbook", detail: "Missed-call text and callback owner not consistent by location.", meta: "Phones", priority: "Next" },
          { label: "Launch readiness", detail: "Three connector setup items require practice manager confirmation.", meta: "Marketplace", priority: "Blocked" },
        ],
      },
    ],
    decisions: ["Intervene on Aurora", "Standardize RCM checklist", "Coach hygiene reappointment", "Approve rollout blockers"],
    modulesInFocus: ["Practice intelligence and analytics", "RCM and payer workflows", "Telephony and AI phone", "Integration marketplace", "Security, audit, and compliance"],
  },
  compliance_admin: {
    role: "compliance_admin",
    title: "Compliance and AI safety console",
    summary: "Compliance sees access attempts, support access, PHI boundaries, AI approvals, clinical writeback gates, consent issues, and audit exports.",
    huddleFocus: "Control risk before automation expands: who accessed what, which AI action needs approval, what connector failed, and what evidence must be retained.",
    kpis: [
      { label: "Blocked access attempts", value: "3", detail: "Clinical AI and patient PHI outside role", tone: "red" },
      { label: "AI approvals pending", value: "7", detail: "Clinical, marketing, and patient-message drafts", tone: "amber" },
      { label: "Support access", value: "0 active", detail: "No break-glass sessions open", tone: "green" },
      { label: "Consent gaps", value: "5", detail: "Messaging and call-recording consent incomplete", tone: "amber" },
    ],
    workQueues: [
      {
        title: "Risk review",
        items: [
          { label: "Clinical AI access blocked", detail: "Front desk attempted clinical AI visibility; review role policy.", meta: "Audit", priority: "Today" },
          { label: "Marketing prompt policy", detail: "Two AI Studio drafts reference clinical claims; approval required.", meta: "AI Studio", priority: "Today" },
          { label: "Consent ledger gaps", detail: "Five patients need SMS/call-recording consent captured before automation.", meta: "Communications", priority: "Today" },
        ],
      },
      {
        title: "Audit evidence",
        items: [
          { label: "Writeback gate", detail: "Clinical note and payer action writebacks remain approval locked.", meta: "Policy", priority: "Watch" },
          { label: "Connector credential review", detail: "Marketplace setup requires credential storage policy signoff.", meta: "Security", priority: "Blocked" },
          { label: "Monthly audit export", detail: "Prepare access and AI action evidence for owner review.", meta: "Compliance", priority: "Next" },
        ],
      },
    ],
    decisions: ["Approve AI policies", "Review blocked access", "Clear consent gaps", "Export audit evidence"],
    modulesInFocus: ["Security, audit, and compliance", "AI Studio", "Clinical AI and scribe", "Integration marketplace"],
  },
  support_admin: {
    role: "support_admin",
    title: "Support readiness console",
    summary: "Support sees connector setup health, environment readiness, support access status, deployment health, and tenant configuration issues without owning practice work.",
    huddleFocus: "Keep production setup clean: services healthy, connectors staged, no unauthorized PHI access, and no broken setup flows.",
    kpis: [
      { label: "Service health", value: "OK", detail: "1DentalAI and isolated DentalRCM health checks passing", tone: "green" },
      { label: "Connector setup items", value: "8", detail: "Credentials, health checks, and approval rules pending", tone: "amber" },
      { label: "Support access", value: "0 active", detail: "No break-glass access currently granted", tone: "green" },
      { label: "Broken setup flows", value: "0", detail: "Latest click test passed", tone: "green" },
    ],
    workQueues: [
      {
        title: "Production setup",
        items: [
          { label: "Marketplace credential vault", detail: "Credential storage and rotation policy needs final wiring.", meta: "Security", priority: "Blocked" },
          { label: "Connector health checks", detail: "PMS, payer, phone, payment, imaging, and eRx need smoke-test contracts.", meta: "Integrations", priority: "Next" },
          { label: "Audit export path", detail: "Compliance export must be available before live PHI is connected.", meta: "Audit", priority: "Today" },
        ],
      },
      {
        title: "Operational support",
        items: [
          { label: "Tenant setup review", detail: "Locations, roles, product areas, and work rules need owner signoff.", meta: "Setup", priority: "Today" },
          { label: "Deployment warning", detail: "GitHub Actions Node 20 deprecation should be addressed before June 2026 default change.", meta: "CI", priority: "Watch" },
          { label: "No practice ownership", detail: "Support role remains restricted from patient, clinical, and financial work by default.", meta: "Policy", priority: "Watch" },
        ],
      },
    ],
    decisions: ["Prepare connector smoke tests", "Confirm support policy", "Fix CI deprecation", "Review setup blockers"],
    modulesInFocus: ["Integration marketplace", "Security, audit, and compliance", "Practice management system"],
  },
};

export function getRole(roleKey?: string) {
  return roles.find((role) => role.key === roleKey) ?? roles[0];
}

export function getDailyDashboard(roleKey: RoleKey) {
  return dailyDashboards[roleKey] ?? dailyDashboards.owner_dentist;
}

export function canRoleSeeModule(roleKey: RoleKey, module: FeatureModule) {
  return module.visibleTo.includes(roleKey);
}

export function getVisibleModules(roleKey: RoleKey) {
  return modules.map((module) => ({
    ...module,
    visible: canRoleSeeModule(roleKey, module),
  }));
}

export function hasScope(roleKey: RoleKey, scope: PermissionScope) {
  return getRole(roleKey).scopes.includes(scope);
}

export function getLocationName(locationId: string) {
  return locations.find((location) => location.id === locationId)?.name ?? "Unknown location";
}

export function statusLabel(status: ModuleStatus | ChairStatus) {
  const labels: Record<string, string> = {
    foundation_ready: "ready for setup",
    setup_required: "setup required",
    locked_by_policy: "approval locked",
    read_only: "read only",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
