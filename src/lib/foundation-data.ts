export type EnvironmentMode = "DEMO" | "LIVE";

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

export const foundationPractice = {
  id: "practice_summit_dental",
  name: "Summit Dental Group",
  mode: "DEMO" as EnvironmentMode,
  dso: "1DentalAI Demo DSO",
  label: "Synthetic demo workspace - no live PHI",
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
    description: "Sees clinical, operational, financial, compliance, and DSO-level foundation views.",
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
    description: "Sees scheduling, check-in, communications, forms, reminders, and setup-required patient front-door modules.",
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
    description: "Sees daily operations, staffing, rooms, modules, audit activity, and practice-level readiness.",
    scopes: ["location", "module", "financial", "payer_rcm", "communications", "settings_admin", "audit_security"],
    hiddenByDefault: ["Clinical note signoff"],
    sampleUser: "Grace Morgan",
  },
  {
    key: "dso_regional",
    title: "DSO Regional Manager",
    description: "Sees rollups, location readiness, staffing/utilization, and module adoption with minimized PHI.",
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
    description: "Special audited support scope with no default practice workflow ownership.",
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
    name: "PMS-grade practice layer",
    suite: "Foundation",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional", "support_admin"],
    foundationReady: "Practice, location, team, room, chair, role, and module registry are available in demo foundation.",
    setupRequired: "Production PMS connector, database persistence, and writeback approval policy are future phases.",
    futurePhase: "Phase 2 connector governance and Phase 3 canonical dental data.",
  },
  {
    id: "telephony",
    name: "Telephony and AI phone",
    suite: "Communications",
    status: "setup_required",
    visibleTo: ["owner_dentist", "front_desk", "practice_manager", "compliance_admin"],
    foundationReady: "Role access, location scope, emergency slot context, and consent data classes are modeled.",
    setupRequired: "Phone numbers, call routing, AI receptionist, transcription, SMS consent, and provider escalation need communications phase approval.",
    futurePhase: "Communications phase with Outreachhubphonesystem workflow reuse.",
  },
  {
    id: "reputation",
    name: "Reputation management",
    suite: "Growth",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "front_desk", "treatment_coordinator"],
    foundationReady: "Module access and workflow template slots exist.",
    setupRequired: "Review platform connectors, service recovery workflow, AI response approvals, and listing sync are future scope.",
    futurePhase: "Growth and reputation phase.",
  },
  {
    id: "local_seo",
    name: "Local SEO and AI SEO",
    suite: "Growth",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "dso_regional"],
    foundationReady: "Location and DSO hierarchy exists for future listing and page strategy.",
    setupRequired: "GBP/listing connectors, local page workflow, AI search visibility, and attribution are future scope.",
    futurePhase: "Growth marketplace phase.",
  },
  {
    id: "ai_studio",
    name: "AI Studio",
    suite: "AI governance",
    status: "setup_required",
    visibleTo: ["owner_dentist", "practice_manager", "compliance_admin", "treatment_coordinator"],
    foundationReady: "AI governance scope and workflow template objects exist.",
    setupRequired: "Brand voice, prompt/tool policies, content approvals, campaign generation, and audit are future scope.",
    futurePhase: "AI governance and growth studio phase.",
  },
  {
    id: "rcm",
    name: "RCM and payer workflows",
    suite: "Revenue",
    status: "setup_required",
    visibleTo: ["owner_dentist", "billing_rcm", "practice_manager", "dso_regional"],
    foundationReady: "Biller role, payer/financial scopes, and audit foundation exist.",
    setupRequired: "Payer routing, eligibility, claims, EOB/ERA, denials, credentialing, and approval policies are future scope.",
    futurePhase: "RCM and payer phase with DentalRCM research validation.",
  },
  {
    id: "revenue_integrity",
    name: "Revenue integrity",
    suite: "Revenue",
    status: "setup_required",
    visibleTo: ["owner_dentist", "billing_rcm", "practice_manager", "dso_regional"],
    foundationReady: "Financial and payer access scopes exist.",
    setupRequired: "Historical claim audits, underpayment detection, contract variance, and recovery queues need RCM phase approval.",
    futurePhase: "Revenue integrity phase.",
  },
  {
    id: "clinical_ai",
    name: "Clinical AI and scribe",
    suite: "Clinical",
    status: "locked_by_policy",
    visibleTo: ["owner_dentist", "associate_provider", "rdh", "compliance_admin"],
    foundationReady: "Clinical data-class and provider role boundaries exist.",
    setupRequired: "AI scribe, clinical drafts, provider signoff, source evidence, and writeback are future scope.",
    futurePhase: "Clinical AI phase.",
  },
  {
    id: "imaging",
    name: "Imaging AI and CBCT",
    suite: "Clinical",
    status: "setup_required",
    visibleTo: ["owner_dentist", "associate_provider", "rdh", "dental_assistant"],
    foundationReady: "Clinical roles and room/chair context exist.",
    setupRequired: "Imaging connectors, DICOM storage, findings, overlays, and clinician review are future scope.",
    futurePhase: "Imaging phase.",
  },
  {
    id: "financial_products",
    name: "Financing, memberships, practice plans",
    suite: "Patient financials",
    status: "setup_required",
    visibleTo: ["owner_dentist", "treatment_coordinator", "practice_manager", "billing_rcm"],
    foundationReady: "Financial access scopes and treatment coordinator role exist.",
    setupRequired: "Financing offers, membership enrollment, recurring billing, and agreements are future scope.",
    futurePhase: "Patient financial products phase.",
  },
];

export const workflows: WorkflowDefinition[] = [
  {
    id: "wf_emergency_triage",
    name: "Emergency triage intake",
    domain: "Communications and doctor-owner safety",
    version: "0.1-draft",
    inheritedFrom: "1DentalAI default",
    configurable: ["front desk routing", "doctor callback owner", "same-day slot pool"],
    lockedControls: ["red flag escalation", "AI cannot final-disposition medical emergencies"],
    nextPhaseDependency: "Telephony and emergency workflow implementation",
  },
  {
    id: "wf_chair_flow",
    name: "Chair flow and turnover",
    domain: "Practice operations",
    version: "0.1-draft",
    inheritedFrom: "Location override",
    configurable: ["turnover target minutes", "assistant assignment", "blocked-room reason list"],
    lockedControls: ["audit chair blocks", "no PHI in public room boards"],
    nextPhaseDependency: "Scheduling/PMS phase",
  },
  {
    id: "wf_rcm_leakage",
    name: "Revenue integrity review",
    domain: "Revenue",
    version: "0.1-draft",
    inheritedFrom: "DSO template",
    configurable: ["minimum recoverable amount", "payer priority", "appeal owner"],
    lockedControls: ["write-off reversal requires approval", "payer-facing action requires approval"],
    nextPhaseDependency: "RCM and revenue integrity phase",
  },
  {
    id: "wf_review_recovery",
    name: "Review and service recovery",
    domain: "Growth",
    version: "0.1-draft",
    inheritedFrom: "1DentalAI default",
    configurable: ["review request timing", "negative feedback owner", "location-specific templates"],
    lockedControls: ["AI response requires approval", "respect opt-out and consent"],
    nextPhaseDependency: "Reputation/local SEO phase",
  },
  {
    id: "wf_ai_studio",
    name: "AI Studio content approval",
    domain: "AI governance and growth",
    version: "0.1-draft",
    inheritedFrom: "DSO template",
    configurable: ["brand voice", "campaign approver", "channel templates"],
    lockedControls: ["no unapproved clinical claims", "PHI cannot enter marketing prompts"],
    nextPhaseDependency: "AI Studio phase",
  },
];

export const auditEvents: AuditEvent[] = [
  {
    id: "audit_1",
    at: "2026-05-20T09:10:00-06:00",
    actor: "Dr. Aisha Patel",
    role: "owner_dentist",
    action: "Viewed foundation dashboard",
    target: "Summit Dental Group",
    dataClass: "settings_admin",
    outcome: "allowed",
  },
  {
    id: "audit_2",
    at: "2026-05-20T09:12:00-06:00",
    actor: "Priya Shah",
    role: "billing_rcm",
    action: "Opened revenue module readiness",
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

export function getRole(roleKey?: string) {
  return roles.find((role) => role.key === roleKey) ?? roles[0];
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
  return status.replaceAll("_", " ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
