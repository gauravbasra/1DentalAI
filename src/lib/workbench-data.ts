import { getRole, type PermissionScope, type RoleKey } from "@/lib/foundation-data";

export type WorkbenchSlug =
  | "pms-schedule"
  | "patient-chart"
  | "perio-charting"
  | "rcm-queue"
  | "phone-inbox"
  | "treatment-plans"
  | "imaging"
  | "labs-referrals"
  | "rooms-chairs"
  | "growth-reputation"
  | "marketing-studio"
  | "local-ai-seo"
  | "connector-setup";

export type WorkbenchStatus = "OPEN" | "SETUP_REQUIRED" | "APPROVAL_LOCKED" | "BLOCKED";
export type WorkbenchActionKind = "LOCAL_STATE_CHANGE" | "APPROVAL_REQUEST" | "CONNECTOR_SETUP" | "EXTERNAL_EXECUTION_BLOCKED";
export type WorkbenchPriority = "STAT" | "TODAY" | "NEXT" | "WATCH" | "BLOCKED";

export type WorkbenchAction = {
  id: string;
  label: string;
  kind: WorkbenchActionKind;
  requiresScope: PermissionScope[];
  externalSystem?: string;
  blockedReason?: string;
  resultStatus: "READY" | "REQUIRES_APPROVAL" | "BLOCKED";
};

export type WorkbenchQueueItem = {
  id: string;
  ownerRoleKey: RoleKey;
  locationId: string;
  patientRef?: string;
  title: string;
  detail: string;
  status: string;
  priority: WorkbenchPriority;
  due: string;
  amount?: string;
  sourceSystem: string;
  sourceObjectType: string;
  sourceObjectId: string;
  clinicalData?: Record<string, string | number | boolean>;
  financialData?: Record<string, string | number | boolean>;
  marketingData?: Record<string, string | number | boolean>;
  actions: WorkbenchAction[];
};

export type ConnectorReadinessItem = {
  id: string;
  connectorCategory: string;
  capability: string;
  status: "READY" | "NEEDS_CREDENTIALS" | "NEEDS_APPROVAL" | "BLOCKED";
  requiredFields: string[];
  missingFields: string[];
  policyGate: string;
  nextAction: string;
};

export type WorkbenchArea = {
  slug: WorkbenchSlug;
  title: string;
  domain: string;
  primarySystem: string;
  status: WorkbenchStatus;
  liveCapability: boolean;
  summary: string;
  setupReason?: string;
  approvalReason?: string;
  roles: RoleKey[];
  layout: "schedule" | "chart" | "perio" | "queue" | "inbox" | "studio" | "seo" | "rooms" | "connectors";
  primaryMetric: string;
  secondaryMetric: string;
  queue: WorkbenchQueueItem[];
  connectors: ConnectorReadinessItem[];
};

const localAction = (id: string, label: string, scopes: PermissionScope[] = ["module"]): WorkbenchAction => ({
  id,
  label,
  kind: "LOCAL_STATE_CHANGE",
  requiresScope: scopes,
  resultStatus: "READY",
});

const approvalAction = (id: string, label: string, scopes: PermissionScope[], blockedReason?: string): WorkbenchAction => ({
  id,
  label,
  kind: "APPROVAL_REQUEST",
  requiresScope: scopes,
  blockedReason,
  resultStatus: "REQUIRES_APPROVAL",
});

const blockedAction = (id: string, label: string, externalSystem: string, blockedReason: string, scopes: PermissionScope[]): WorkbenchAction => ({
  id,
  label,
  kind: "EXTERNAL_EXECUTION_BLOCKED",
  requiresScope: scopes,
  externalSystem,
  blockedReason,
  resultStatus: "BLOCKED",
});

const connector = (
  id: string,
  connectorCategory: string,
  capability: string,
  missingFields: string[],
  policyGate: string,
  nextAction: string,
): ConnectorReadinessItem => ({
  id,
  connectorCategory,
  capability,
  status: missingFields.length ? "NEEDS_CREDENTIALS" : "NEEDS_APPROVAL",
  requiredFields: ["tenant approval", "credential vault reference", "capability map", "audit policy"],
  missingFields,
  policyGate,
  nextAction,
});

export const workbenchAreas: WorkbenchArea[] = [
  {
    slug: "pms-schedule",
    title: "PMS Schedule Workbench",
    domain: "PMS",
    primarySystem: "PMS/EHR router",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Live schedule read/write requires PMS connector credentials, capability map, and tenant approval.",
    summary: "Provider columns, operatory timeline, confirmation/forms/insurance readiness, production holes, and same-day capacity.",
    roles: ["owner_dentist", "associate_provider", "rdh", "dental_assistant", "front_desk", "practice_manager"],
    layout: "schedule",
    primaryMetric: "$31.0K schedule at risk",
    secondaryMetric: "19 confirmations, 11 form gaps, 2 production holes",
    queue: [
      {
        id: "pms_apt_1001",
        ownerRoleKey: "front_desk",
        locationId: "loc_denver",
        patientRef: "PAT-1001",
        title: "Unconfirmed crown seat at 10:20",
        detail: "High-value appointment is not confirmed and has incomplete medical history update.",
        status: "Needs confirmation",
        priority: "TODAY",
        due: "Before 9:30 AM",
        amount: "$2,840",
        sourceSystem: "PMS schedule",
        sourceObjectType: "Appointment",
        sourceObjectId: "APT-1001",
        financialData: { scheduledProduction: 2840, patientBalance: 180 },
        actions: [
          localAction("act_pms_assign_followup", "Assign confirmation follow-up", ["communications"]),
          localAction("act_pms_open_chart", "Open patient chart", ["patient_phi"]),
          blockedAction("act_pms_writeback", "Write confirmation to PMS", "PMS connector", "PMS writeback is blocked until connector approval and field mapping are complete.", ["communications"]),
        ],
      },
      {
        id: "pms_gap_2001",
        ownerRoleKey: "practice_manager",
        locationId: "loc_denver",
        title: "Two production holes before 2 PM",
        detail: "Open chair time can be filled from accepted-not-scheduled treatment and overdue hygiene recall.",
        status: "Capacity open",
        priority: "TODAY",
        due: "Before 11:00 AM",
        amount: "$7,800",
        sourceSystem: "PMS schedule",
        sourceObjectType: "ScheduleGap",
        sourceObjectId: "GAP-2001",
        financialData: { recoverableProduction: 7800 },
        actions: [
          localAction("act_pms_make_fill_list", "Build fill list", ["communications"]),
          localAction("act_pms_assign_owner", "Assign schedule owner", ["settings_admin"]),
          blockedAction("act_pms_book", "Book into PMS", "PMS connector", "Appointment creation requires live PMS connector and duplicate-booking checks.", ["communications"]),
        ],
      },
    ],
    connectors: [
      connector("conn_pms_schedule", "PMS/EHR", "appointments, operatories, providers, procedure codes, production, recalls", ["PMS credential", "writeback approval"], "Tenant PMS data-use approval", "Complete PMS connector setup and run schedule smoke test."),
    ],
  },
  {
    slug: "patient-chart",
    title: "Patient Chart Workbench",
    domain: "Clinical",
    primarySystem: "Patient EHR/chart",
    status: "APPROVAL_LOCKED",
    liveCapability: false,
    approvalReason: "Clinical chart writeback requires provider approval rules and audit controls.",
    summary: "Patient header, alerts, meds, allergies, treatment history, imaging, perio, notes, referrals, labs, and claim evidence.",
    roles: ["owner_dentist", "associate_provider", "rdh", "dental_assistant", "treatment_coordinator"],
    layout: "chart",
    primaryMetric: "5 unsigned clinical items",
    secondaryMetric: "3 AI drafts, 2 missing evidence requests",
    queue: [
      {
        id: "chart_3001",
        ownerRoleKey: "associate_provider",
        locationId: "loc_denver",
        patientRef: "PAT-3001",
        title: "Emergency exam chart incomplete",
        detail: "Pain/swelling note needs PA image, medical alert review, diagnosis, and provider-signed plan.",
        status: "Provider review",
        priority: "STAT",
        due: "Before seating",
        sourceSystem: "PMS/EHR chart",
        sourceObjectType: "ClinicalEncounter",
        sourceObjectId: "ENC-3001",
        clinicalData: { medicalAlert: true, imagingNeeded: true, providerSignoffRequired: true },
        actions: [
          localAction("act_chart_request_image", "Request PA image", ["clinical"]),
          approvalAction("act_chart_provider_signoff", "Route to provider signoff", ["clinical"], "Provider signature required before writeback."),
          blockedAction("act_chart_writeback", "Write chart note", "PMS/EHR connector", "Clinical writeback is locked until approval policy is configured.", ["clinical"]),
        ],
      },
    ],
    connectors: [
      connector("conn_chart_ehr", "PMS/EHR", "patient demographics, medical alerts, allergies, meds, procedures, notes", ["clinical approval policy", "PMS chart capability map"], "Provider writeback approval", "Configure clinical writeback policy and chart field mapping."),
    ],
  },
  {
    slug: "perio-charting",
    title: "Perio Charting Workbench",
    domain: "Clinical",
    primarySystem: "Perio chart",
    status: "APPROVAL_LOCKED",
    liveCapability: false,
    approvalReason: "Perio writeback and voice capture require clinical approval, PMS perio mapping, and AI policy.",
    summary: "Tooth-aware perio grid for probing depths, bleeding, recession, mobility, furcation, plaque, calculus, diagnosis support, and doctor-exam flags.",
    roles: ["owner_dentist", "associate_provider", "rdh", "dental_assistant"],
    layout: "perio",
    primaryMetric: "4 perio charts due",
    secondaryMetric: "96 sites need measurement review",
    queue: [
      {
        id: "perio_4001",
        ownerRoleKey: "rdh",
        locationId: "loc_boulder",
        patientRef: "PAT-4001",
        title: "Perio maintenance chart before doctor exam",
        detail: "Pocket depths, BOP, recession, mobility, and furcation review needed before hygiene doctor exam.",
        status: "Measurements due",
        priority: "TODAY",
        due: "Before 11:20 AM",
        sourceSystem: "PMS perio exam",
        sourceObjectType: "PerioExam",
        sourceObjectId: "PERIO-4001",
        clinicalData: { teeth: 28, sites: 168, bleedingPointsOpen: 18, voiceCaptureReady: false },
        actions: [
          localAction("act_perio_mark_measured", "Mark measurements reviewed", ["clinical"]),
          approvalAction("act_perio_flag_doctor", "Flag doctor exam", ["clinical"], "Doctor review required for diagnosis support."),
          blockedAction("act_perio_voice", "Start voice perio capture", "AI voice/perio engine", "Voice capture requires AI runtime policy, consent, and PMS perio mapping.", ["clinical", "ai_governance"]),
        ],
      },
    ],
    connectors: [
      connector("conn_perio_pms", "PMS/EHR", "perio exams, perio measures, tooth/site mappings, provider signoff", ["PMS perio API", "clinical approval policy"], "Clinical writeback gate", "Map perio fields and approve provider signoff workflow."),
    ],
  },
  {
    slug: "rcm-queue",
    title: "RCM Queue Workbench",
    domain: "RCM",
    primarySystem: "RCM and payer router",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Payer execution requires connector credentials, enrollment status, payer rules, and approval policy.",
    summary: "Eligibility, benefits, estimates, prior auth, claim readiness, attachments, ERA/EOB, denials, underpayments, and credentialing blockers.",
    roles: ["owner_dentist", "billing_rcm", "practice_manager", "dso_regional"],
    layout: "queue",
    primaryMetric: "$24.7K claim dollars blocked",
    secondaryMetric: "13 eligibility gaps, 9 ERA exceptions",
    queue: [
      {
        id: "rcm_5001",
        ownerRoleKey: "billing_rcm",
        locationId: "loc_aurora",
        patientRef: "PAT-5001",
        title: "Claim needs perio chart and narrative",
        detail: "SRP claim is missing perio measurements, radiograph evidence, and provider-approved narrative.",
        status: "Attachment blocker",
        priority: "TODAY",
        due: "Before timely-filing risk",
        amount: "$1,480",
        sourceSystem: "DentalRCM pattern",
        sourceObjectType: "Claim",
        sourceObjectId: "CLM-5001",
        financialData: { claimAmount: 1480, payerDelayDays: 11 },
        actions: [
          localAction("act_rcm_request_evidence", "Request clinical evidence", ["payer_rcm", "communications"]),
          approvalAction("act_rcm_mark_ready", "Mark ready for approval", ["payer_rcm"], "Human approval required before payer submission."),
          blockedAction("act_rcm_submit", "Submit claim", "Payer/clearinghouse connector", "Live claim submission requires payer connector, enrollment, and approval controls.", ["payer_rcm"]),
        ],
      },
    ],
    connectors: [
      connector("conn_rcm_payer", "Payer/Clearinghouse", "270/271, 837D, 277CA, 835 ERA, attachment routing, payer portal fallback", ["payer credential", "enrollment evidence", "837D approval"], "Payer transaction approval", "Stage payer connector and run non-PHI transaction smoke test."),
    ],
  },
  {
    slug: "phone-inbox",
    title: "Phone and Messaging Inbox",
    domain: "Communications",
    primarySystem: "Phone/SMS router",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Outbound phone/SMS requires phone provider, consent ledger, call recording disclosure, and routing policy.",
    summary: "Missed calls, voicemails, transcripts, AI summaries, patient match, booking intent, emergency routing, and service recovery handoffs.",
    roles: ["owner_dentist", "front_desk", "practice_manager", "support_admin"],
    layout: "inbox",
    primaryMetric: "9 missed calls",
    secondaryMetric: "3 high-intent new patient calls",
    queue: [
      {
        id: "phone_6001",
        ownerRoleKey: "front_desk",
        locationId: "loc_denver",
        patientRef: "NEW-6001",
        title: "New patient missed call: implant consult",
        detail: "Caller asked about implant consult availability and financing; no appointment booked.",
        status: "Needs callback",
        priority: "TODAY",
        due: "Within 15 minutes",
        amount: "$12,400 case potential",
        sourceSystem: "Phone app pattern",
        sourceObjectType: "Call",
        sourceObjectId: "CALL-6001",
        marketingData: { intent: "implant consult", source: "Google Business Profile", aiSummaryReady: true },
        actions: [
          localAction("act_phone_assign_callback", "Assign callback owner", ["communications"]),
          localAction("act_phone_open_schedule", "Open scheduling context", ["communications"]),
          blockedAction("act_phone_send_text", "Send missed-call text", "Phone/SMS provider", "SMS is blocked until phone provider, consent, and quiet-hour policy are configured.", ["communications"]),
        ],
      },
    ],
    connectors: [
      connector("conn_phone_provider", "Phone/SMS", "inbound call, outbound call, SMS/MMS, voicemail, transcript, AI summary", ["phone number", "provider credential", "consent ledger"], "Communications consent and disclosure gate", "Connect phone provider and approve patient communication policy."),
    ],
  },
  {
    slug: "treatment-plans",
    title: "Treatment Plans Workbench",
    domain: "Treatment",
    primarySystem: "Treatment planning and patient financials",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Treatment plan, financing, membership, and payment execution require PMS, payments, and financing connector approvals.",
    summary: "Presented treatment, accepted-not-scheduled cases, estimates, patient portion, financing, memberships, payment plans, and follow-up timelines.",
    roles: ["owner_dentist", "associate_provider", "treatment_coordinator", "practice_manager"],
    layout: "queue",
    primaryMetric: "$58.6K unscheduled treatment",
    secondaryMetric: "12 financing candidates, 14 membership candidates",
    queue: [
      {
        id: "tx_7001",
        ownerRoleKey: "treatment_coordinator",
        locationId: "loc_denver",
        patientRef: "PAT-7001",
        title: "Implant case accepted but not scheduled",
        detail: "Patient accepted clinical plan; estimate needs benefits, financing option, and signed agreement.",
        status: "Financial presentation",
        priority: "TODAY",
        due: "Before 3:00 PM",
        amount: "$12,400",
        sourceSystem: "PMS treatment plan",
        sourceObjectType: "TreatmentPlan",
        sourceObjectId: "TX-7001",
        financialData: { caseValue: 12400, patientPortionPending: true, financingCandidate: true },
        actions: [
          localAction("act_tx_prepare_estimate", "Prepare estimate package", ["financial"]),
          approvalAction("act_tx_request_benefits", "Request benefit verification", ["payer_rcm"], "Benefits required before patient quote."),
          blockedAction("act_tx_financing", "Send financing application", "Financing connector", "Financing execution requires vendor connector and patient consent.", ["financial"]),
        ],
      },
    ],
    connectors: [
      connector("conn_tx_financial", "Payments/Financing/Memberships", "payment plans, financing, memberships, agreements, card-on-file", ["payment provider", "financing provider", "membership rules"], "Patient financial authorization", "Configure financial product policies and connector routing."),
    ],
  },
  {
    slug: "imaging",
    title: "Imaging Workbench",
    domain: "Clinical imaging",
    primarySystem: "Imaging/PACS/AI evidence",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Image ingestion and AI analysis require imaging connector, storage policy, model approval, and clinician review.",
    summary: "Needed radiographs, captured images, AI finding status, CBCT/pano/intraoral readiness, and claim-evidence attachments.",
    roles: ["owner_dentist", "associate_provider", "rdh", "dental_assistant"],
    layout: "queue",
    primaryMetric: "7 image evidence tasks",
    secondaryMetric: "3 BWX due, 2 claim attachments blocked",
    queue: [
      {
        id: "img_8001",
        ownerRoleKey: "dental_assistant",
        locationId: "loc_denver",
        patientRef: "PAT-8001",
        title: "PA needed before emergency diagnosis",
        detail: "Emergency pain visit has no recent PA; provider cannot complete diagnosis or claim evidence.",
        status: "Image needed",
        priority: "STAT",
        due: "Before provider exam",
        sourceSystem: "Imaging policy",
        sourceObjectType: "ImagingOrder",
        sourceObjectId: "IMG-8001",
        clinicalData: { modality: "PA", claimEvidence: true },
        actions: [
          localAction("act_img_mark_needed", "Mark image needed", ["clinical"]),
          localAction("act_img_request_capture", "Request capture from assistant", ["clinical"]),
          blockedAction("act_img_ai_analysis", "Run imaging AI", "Imaging AI connector", "Imaging AI is blocked until model, storage, and clinician-review policy are approved.", ["clinical", "ai_governance"]),
        ],
      },
    ],
    connectors: [
      connector("conn_imaging", "Imaging/PACS", "radiographs, CBCT, intraoral photos, overlays, claim attachments", ["imaging source", "storage policy", "AI model approval"], "Clinician review and imaging AI gate", "Connect imaging source and approve model review workflow."),
    ],
  },
  {
    slug: "labs-referrals",
    title: "Labs and Referrals Workbench",
    domain: "Clinical operations",
    primarySystem: "Lab/referral router",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Lab and referral submission require vendor directory, packet rules, consent, and attachment policy.",
    summary: "Open lab cases, due dates, scan/impression status, remake risk, referral packets, specialist follow-up, and incoming results.",
    roles: ["owner_dentist", "associate_provider", "dental_assistant", "treatment_coordinator", "practice_manager"],
    layout: "queue",
    primaryMetric: "4 lab cases due",
    secondaryMetric: "2 referral packets missing evidence",
    queue: [
      {
        id: "lab_9001",
        ownerRoleKey: "dental_assistant",
        locationId: "loc_denver",
        patientRef: "PAT-9001",
        title: "Crown case delivery confirmation",
        detail: "Crown seat is tomorrow; lab case needs arrival verification, shade confirmation, and remake risk review.",
        status: "Verify received",
        priority: "TODAY",
        due: "Before close",
        sourceSystem: "Lab tracker",
        sourceObjectType: "LabCase",
        sourceObjectId: "LAB-9001",
        clinicalData: { restoration: "crown", shadeConfirmed: false, dueTomorrow: true },
        actions: [
          localAction("act_lab_mark_received", "Mark received locally", ["clinical"]),
          localAction("act_lab_assign_followup", "Assign lab follow-up", ["clinical"]),
          blockedAction("act_lab_send_packet", "Send lab packet", "Lab connector", "Lab submission requires vendor connector and packet approval.", ["clinical"]),
        ],
      },
    ],
    connectors: [
      connector("conn_labs", "Lab/Referral", "lab cases, scans, referral packets, specialist updates, incoming results", ["vendor directory", "packet template", "attachment policy"], "Referral and attachment authorization", "Approve referral/lab packet rules and vendor routing."),
    ],
  },
  {
    slug: "rooms-chairs",
    title: "Rooms and Chairs Workbench",
    domain: "Practice operations",
    primarySystem: "Rooms/chairs board",
    status: "OPEN",
    liveCapability: true,
    summary: "Operatory occupancy, provider/RDH/staff assignment, room readiness, seated/late/ready status, blockers, sterilization, and material needs.",
    roles: ["owner_dentist", "dental_assistant", "front_desk", "practice_manager"],
    layout: "rooms",
    primaryMetric: "3/5 rooms ready",
    secondaryMetric: "1 turnover, 1 imaging setup blocker",
    queue: [
      {
        id: "room_10001",
        ownerRoleKey: "dental_assistant",
        locationId: "loc_denver",
        title: "Room 2 turnover before emergency exam",
        detail: "Emergency slot will slip if room is not turned over in the next 8 minutes.",
        status: "Turnover",
        priority: "TODAY",
        due: "8 minutes",
        sourceSystem: "1DentalAI rooms",
        sourceObjectType: "RoomStatus",
        sourceObjectId: "ROOM-2",
        actions: [
          localAction("act_room_update_status", "Update room status", ["clinical"]),
          localAction("act_room_escalate", "Escalate blocker", ["communications"]),
        ],
      },
    ],
    connectors: [],
  },
  {
    slug: "growth-reputation",
    title: "Growth and Reputation Workbench",
    domain: "Reputation",
    primarySystem: "Reputation/growth router",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Review requests and posting require review-site connectors, consent, service-recovery policy, and approval rules.",
    summary: "Review request queue, negative feedback, AI response approvals, review velocity, competitor gaps, patient consent, and service recovery.",
    roles: ["owner_dentist", "practice_manager", "dso_regional", "compliance_admin", "marketing_growth"],
    layout: "queue",
    primaryMetric: "2 service recovery holds",
    secondaryMetric: "18 approved review opportunities",
    queue: [
      {
        id: "rep_11001",
        ownerRoleKey: "marketing_growth",
        locationId: "loc_aurora",
        patientRef: "PAT-11001",
        title: "Negative feedback before review request",
        detail: "Patient reported long wait and unclear estimate; review automation must stay paused until manager recovery call is complete.",
        status: "Service recovery",
        priority: "TODAY",
        due: "Before review batch",
        sourceSystem: "Reputation app pattern",
        sourceObjectType: "ServiceRecoveryCase",
        sourceObjectId: "REP-11001",
        marketingData: { sentiment: "negative", reviewAutomationPaused: true, source: "post-visit survey" },
        actions: [
          localAction("act_rep_assign_recovery", "Assign service recovery owner", ["communications"]),
          approvalAction("act_rep_approve_response", "Submit AI response for approval", ["ai_governance", "communications"], "Human approval required before posting."),
          blockedAction("act_rep_post_review_response", "Post review response", "Review site connector", "External review posting requires connector, consent, and approval policy.", ["communications"]),
        ],
      },
    ],
    connectors: [
      connector("conn_reputation", "Reputation/Listings", "review requests, monitoring, response posting, surveys, service recovery", ["review site connection", "consent ledger", "approval policy"], "Review posting and patient-contact approval", "Connect review sources and approve response workflow."),
    ],
  },
  {
    slug: "marketing-studio",
    title: "Marketing Studio Workbench",
    domain: "AI Studio and campaigns",
    primarySystem: "AI Studio/growth campaigns",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Campaign send/publish requires channel connectors, audience rules, opt-out controls, PHI boundaries, and approval policy.",
    summary: "Campaign backlog, audience rules, AI Studio drafts, compliance review, brand voice, opt-out controls, and attribution plan.",
    roles: ["owner_dentist", "dso_regional", "compliance_admin", "marketing_growth"],
    layout: "studio",
    primaryMetric: "7 AI drafts awaiting approval",
    secondaryMetric: "5 campaign audiences need rules",
    queue: [
      {
        id: "mkt_12001",
        ownerRoleKey: "marketing_growth",
        locationId: "loc_boulder",
        title: "Perio maintenance reactivation campaign",
        detail: "Audience includes overdue perio maintenance patients; requires exclusions, PHI-safe copy review, and owner approval.",
        status: "Draft",
        priority: "NEXT",
        due: "This week",
        amount: "$9,600 annualized",
        sourceSystem: "AI Studio",
        sourceObjectType: "CampaignDraft",
        sourceObjectId: "MKT-12001",
        marketingData: { audienceSize: 42, channel: "SMS/email", phiBoundary: "restricted" },
        actions: [
          localAction("act_mkt_create_draft", "Create draft from template", ["ai_governance"]),
          approvalAction("act_mkt_submit_approval", "Submit content for approval", ["ai_governance"], "Compliance approval required for clinical claims and PHI boundaries."),
          blockedAction("act_mkt_send", "Send campaign", "Campaign channel connector", "Campaign sending requires consent, opt-out, quiet-hour, and channel connector setup.", ["communications"]),
        ],
      },
    ],
    connectors: [
      connector("conn_campaigns", "Marketing/Campaigns", "SMS/email campaigns, landing pages, call tracking, attribution", ["email/SMS provider", "opt-out ledger", "website publishing"], "Marketing consent and claim-review gate", "Configure channel connectors and approval workflow."),
    ],
  },
  {
    slug: "local-ai-seo",
    title: "Local SEO and AI SEO Workbench",
    domain: "Local/AI SEO",
    primarySystem: "Listings and AI search visibility",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Listing and website publishing require GBP/listing/website connectors, location approval, and content policy.",
    summary: "Listing health, NAP consistency, GBP readiness, service/category coverage, local pages, reviews/topics, and AI search visibility gaps.",
    roles: ["owner_dentist", "dso_regional", "support_admin", "marketing_growth"],
    layout: "seo",
    primaryMetric: "14 listing corrections staged",
    secondaryMetric: "3 AI-search reputation gaps",
    queue: [
      {
        id: "seo_13001",
        ownerRoleKey: "marketing_growth",
        locationId: "loc_aurora",
        title: "Aurora implant visibility gap",
        detail: "AI search and local listing checks show weak implant service coverage and inconsistent category/source signals.",
        status: "Needs content and listing update",
        priority: "TODAY",
        due: "Before next campaign",
        sourceSystem: "Local SEO audit",
        sourceObjectType: "LocalSeoIssue",
        sourceObjectId: "SEO-13001",
        marketingData: { serviceLine: "implants", listingGap: true, aiVisibilityRisk: true },
        actions: [
          localAction("act_seo_stage_correction", "Stage listing correction", ["settings_admin"]),
          localAction("act_seo_create_page_task", "Create local page task", ["settings_admin"]),
          blockedAction("act_seo_publish", "Publish GBP/website update", "Listings/website connector", "Publishing requires listing, GBP, website connector, and approval policy.", ["settings_admin"]),
        ],
      },
    ],
    connectors: [
      connector("conn_local_seo", "Listings/Website/AI search", "GBP, listings, local pages, citations, AI search checks", ["GBP connection", "website publishing", "listing provider"], "Publishing approval gate", "Connect listings/website channels and approve publishing policy."),
    ],
  },
  {
    slug: "connector-setup",
    title: "Connector Setup Workbench",
    domain: "Integrations",
    primarySystem: "Connector registry",
    status: "SETUP_REQUIRED",
    liveCapability: false,
    setupReason: "Runtime use requires credential vault, capability maps, health checks, cost telemetry, and approval policies.",
    summary: "PMS/EHR, payers, phone/SMS, reputation, marketing, Local SEO, payments, financing, imaging, labs, eRx, analytics, and website connectors.",
    roles: ["owner_dentist", "dso_regional", "compliance_admin", "support_admin"],
    layout: "connectors",
    primaryMetric: "12 connector categories",
    secondaryMetric: "8 credentials and 6 approval policies pending",
    queue: [
      {
        id: "conn_14001",
        ownerRoleKey: "support_admin",
        locationId: "loc_denver",
        title: "PMS connector capability map",
        detail: "Schedule, patient, provider, treatment plan, chart, perio, claims, and recall capabilities must be mapped before workbench writeback.",
        status: "Setup required",
        priority: "TODAY",
        due: "Before live PHI",
        sourceSystem: "Connector registry",
        sourceObjectType: "ConnectorSetup",
        sourceObjectId: "CONN-14001",
        actions: [
          localAction("act_conn_stage", "Stage connector setup request", ["settings_admin"]),
          localAction("act_conn_readiness", "Run readiness check", ["audit_security"]),
          blockedAction("act_conn_enable_live", "Enable live runtime", "Connector registry", "Live runtime requires credentials, approval policy, health checks, and audit confirmation.", ["settings_admin", "audit_security"]),
        ],
      },
    ],
    connectors: [
      connector("conn_registry_all", "Connector registry", "owned routing, capability maps, cost telemetry, approval policies, fallback workflows", ["credential vault", "health checks", "approval policies"], "Runtime connector governance", "Build connector vault and smoke-test harness."),
    ],
  },
];

export function getWorkbench(slug: string) {
  return workbenchAreas.find((area) => area.slug === slug);
}

export function getWorkbenchesForRole(roleKey: RoleKey) {
  return workbenchAreas.filter((area) => area.roles.includes(roleKey));
}

export function canRoleAccessWorkbench(roleKey: RoleKey, area: WorkbenchArea) {
  return area.roles.includes(roleKey);
}

export function evaluateAction(roleKey: RoleKey, action: WorkbenchAction) {
  const role = getRole(roleKey);
  const missingScopes = action.requiresScope.filter((scope) => !role.scopes.includes(scope));
  if (missingScopes.length) {
    return {
      allowed: false,
      outcome: "BLOCKED" as const,
      reason: `Missing scope: ${missingScopes.join(", ")}`,
    };
  }
  if (action.kind === "EXTERNAL_EXECUTION_BLOCKED") {
    return {
      allowed: false,
      outcome: "BLOCKED" as const,
      reason: action.blockedReason ?? "External execution is blocked until connector setup is complete.",
    };
  }
  return {
    allowed: true,
    outcome: "ALLOWED" as const,
    reason: action.kind === "APPROVAL_REQUEST" ? "Approval request can be staged for human review." : "Local workbench state can be updated.",
  };
}

export function findWorkbenchAction(slug: string, actionId: string) {
  const area = getWorkbench(slug);
  const item = area?.queue.find((queueItem) => queueItem.actions.some((action) => action.id === actionId));
  const action = item?.actions.find((candidate) => candidate.id === actionId);
  return area && item && action ? { area, item, action } : null;
}
