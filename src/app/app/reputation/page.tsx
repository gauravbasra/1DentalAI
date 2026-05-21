import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  createReferralRequest,
  createReputationCampaignRule,
  createReviewWorkflow,
  getReputationOperatingCenter,
  updateListingProfileStatus,
  updateReferralRequestStatus,
  updateReviewResponseApproval,
  updateReviewWorkflowStatus,
} from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type PatientRow = { id: string; firstName: string; lastName: string; chartNumber: string; phone?: string | null; email?: string | null };
type Metrics = {
  readyRequests: string;
  blockedRequests: string;
  lowSurveys: string;
  responseDrafts: string;
  listingIssues: string;
  openRecovery: string;
  referralReady: string;
  reviewVolume: string;
  averageRating: string;
};
type ReviewRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  reviewSite: string;
  serviceLine: string | null;
  providerName: string | null;
  locationName: string | null;
  requestChannel: string;
  requestStatus: string;
  rating: number | null;
  sentiment: string | null;
  publicReviewText: string | null;
  responseDraft: string | null;
  recoveryStatus: string;
  dueAt: string | null;
  appointmentType: string | null;
  appointmentStatus: string | null;
  appointmentReadiness: string | null;
  startsAt: string | null;
  responseApprovalStatus: string | null;
  publicationStatus: string | null;
  eligibilitySummary: unknown;
  suppressionReasons: string[];
  privateSurveyRequired: boolean;
  connectorStatus: string;
  blockedReason: string | null;
};
type SurveyRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  surveyType: string;
  status: string;
  score: number | null;
  nps: number | null;
  recoveryRequired: boolean;
  responseText: string | null;
  connectorStatus: string;
  blockedReason: string | null;
  dueAt: string | null;
};
type RecoveryRow = { id: string; firstName: string | null; lastName: string | null; chartNumber: string | null; status: string; sentiment: string; reason: string; recoveryNote: string | null; dueAt: string | null };
type ListingRow = {
  id: string;
  platform: string;
  locationName: string | null;
  profileUrl: string | null;
  nameOnListing: string;
  phoneOnListing: string | null;
  addressOnListing: string | null;
  rating: number | null;
  reviewCount: number;
  syncStatus: string;
  napConsistencyStatus: string;
  syncReadiness: unknown;
  ownerAction: string | null;
  dataQualityScore: number;
  issueSummary: string | null;
  nextAction: string;
  lastSyncedAt: string | null;
};
type ListingIssueRow = {
  id: string;
  title: string;
  taskType: string;
  status: string;
  priority: string;
  platform: string | null;
  serviceLine: string | null;
  issueSummary: string;
  nextAction: string;
  connectorStatus: string;
  dueAt: string | null;
  locationName: string | null;
  listingSyncStatus: string | null;
  napConsistencyStatus: string | null;
};
type ResponseRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  reviewSite: string;
  rating: number | null;
  publicReviewText: string | null;
  draftBody: string;
  approvalStatus: string;
  publicationStatus: string;
  blockedReason: string | null;
  hipaaGuardrails: unknown;
  sourceSiteStatus: string;
};
type RuleRow = {
  id: string;
  name: string;
  triggerEvent: string;
  serviceLine: string | null;
  channel: string;
  targetReviewSite: string;
  sendDelayHours: number;
  cooldownDays: number;
  minimumSurveyScore: number | null;
  suppressions: unknown;
  status: string;
  nextAction: string;
  lastEvaluatedAt: string | null;
};
type ReferralRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  chartNumber: string | null;
  requestType: string;
  channel: string;
  status: string;
  offerSummary: string | null;
  messageDraft: string;
  consentStatus: string;
  conversionStatus: string;
  complianceText: string | null;
  bookingAttributionStatus: string;
  attribution: unknown;
  connectorStatus: string;
  blockedReason: string | null;
  dueAt: string | null;
};

async function createReviewAction(formData: FormData) {
  "use server";
  await createReviewWorkflow({
    patientId: String(formData.get("patientId") ?? "") || undefined,
    serviceLine: String(formData.get("serviceLine") ?? "General dentistry"),
    reviewSite: String(formData.get("reviewSite") ?? "SMART_LINK"),
    requestChannel: String(formData.get("requestChannel") ?? "SMS"),
    responseDraft: String(formData.get("responseDraft") ?? ""),
  });
  revalidatePath("/app/reputation");
}

async function reviewStatusAction(formData: FormData) {
  "use server";
  await updateReviewWorkflowStatus(String(formData.get("id") ?? ""), String(formData.get("requestStatus") ?? "READY_FOR_APPROVAL"));
  revalidatePath("/app/reputation");
}

async function responseAction(formData: FormData) {
  "use server";
  await updateReviewResponseApproval(String(formData.get("id") ?? ""), String(formData.get("approvalStatus") ?? "NEEDS_REVIEW"));
  revalidatePath("/app/reputation");
}

async function listingAction(formData: FormData) {
  "use server";
  await updateListingProfileStatus(String(formData.get("id") ?? ""), String(formData.get("syncStatus") ?? "MANUAL_REVIEW"), String(formData.get("nextAction") ?? "Review listing fields and connector status."));
  revalidatePath("/app/reputation");
}

async function ruleAction(formData: FormData) {
  "use server";
  await createReputationCampaignRule({
    name: String(formData.get("name") ?? "Post-visit review rule"),
    triggerEvent: String(formData.get("triggerEvent") ?? "COMPLETED_APPOINTMENT"),
    serviceLine: String(formData.get("serviceLine") ?? "") || undefined,
    channel: String(formData.get("channel") ?? "SMS"),
    targetReviewSite: String(formData.get("targetReviewSite") ?? "SMART_LINK"),
    sendDelayHours: Number(formData.get("sendDelayHours") ?? 24),
    cooldownDays: Number(formData.get("cooldownDays") ?? 90),
    minimumSurveyScore: String(formData.get("minimumSurveyScore") ?? "") ? Number(formData.get("minimumSurveyScore")) : undefined,
    suppressions: String(formData.get("suppressions") ?? ""),
    nextAction: String(formData.get("nextAction") ?? "Evaluate eligible completed visits and hold any patient with open recovery, billing, consent, or clinical documentation risk."),
  });
  revalidatePath("/app/reputation");
}

async function referralCreateAction(formData: FormData) {
  "use server";
  await createReferralRequest({
    patientId: String(formData.get("patientId") ?? "") || undefined,
    requestType: String(formData.get("requestType") ?? "REFERRAL"),
    channel: String(formData.get("channel") ?? "SMS"),
    offerSummary: String(formData.get("offerSummary") ?? ""),
    messageDraft: String(formData.get("messageDraft") ?? ""),
    consentStatus: String(formData.get("consentStatus") ?? "UNKNOWN"),
  });
  revalidatePath("/app/reputation");
}

async function referralStatusAction(formData: FormData) {
  "use server";
  await updateReferralRequestStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "READY_FOR_APPROVAL"));
  revalidatePath("/app/reputation");
}

export default async function ReputationPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getReputationOperatingCenter();
  const metrics = center.metrics as Metrics;
  const reviews = center.reviews as ReviewRow[];
  const surveys = center.surveys as SurveyRow[];
  const recoveryCases = center.recoveryCases as RecoveryRow[];
  const listings = center.listings as ListingRow[];
  const listingIssueQueue = center.listingIssueQueue as ListingIssueRow[];
  const responses = center.responses as ResponseRow[];
  const campaignRules = center.campaignRules as RuleRow[];
  const referralRequests = center.referralRequests as ReferralRow[];
  const patients = center.patients as PatientRow[];

  return (
    <FoundationShell active="/app/reputation" roleKey={role.key}>
      <PageHeader
        eyebrow="Reputation, surveys, listings, and referrals"
        title="Patient experience command center"
        body="Public review requests, private surveys, service recovery, listing accuracy, response approvals, referrals, and testimonials are tied to PMS visits, consent, provider context, billing holds, and phone sentiment."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/reputation" />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Average rating" value={metrics.averageRating} />
        <Metric label="Review volume" value={metrics.reviewVolume} />
        <Metric label="Ready requests" value={metrics.readyRequests} />
        <Metric label="Response drafts" value={metrics.responseDrafts} />
        <Metric label="Listing issues" value={metrics.listingIssues} />
        <Metric label="Recovery holds" value={metrics.openRecovery} />
        <Metric label="Blocked asks" value={metrics.blockedRequests} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <PmsCard title="PMS-triggered review queue" eyebrow="Eligibility, suppression, response context">
          <div className="grid gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-950">{person(review)} · {clean(review.reviewSite)}</p>
                    <p className="mt-1 text-xs text-neutral-600">{review.serviceLine ?? "General dentistry"} · {review.providerName ?? "No provider"} · {review.locationName ?? "No location"} · {review.requestChannel}</p>
                    {review.appointmentType ? <p className="mt-1 text-xs text-neutral-600">{review.appointmentType} {review.startsAt ? `on ${formatDate(review.startsAt)}` : ""} · visit {clean(review.appointmentStatus ?? "not completed")} · readiness {clean(review.appointmentReadiness ?? "unknown")}</p> : null}
                  </div>
                  <StatusFor value={review.requestStatus} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <Mini label="Rating" value={review.rating ?? "pending"} />
                  <Mini label="Sentiment" value={clean(review.sentiment ?? "not scored")} />
                  <Mini label="Recovery" value={clean(review.recoveryStatus)} />
                  <Mini label="Response" value={clean(review.responseApprovalStatus ?? "not drafted")} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Mini label="Connector" value={clean(review.connectorStatus)} />
                  <Mini label="Private survey" value={review.privateSurveyRequired ? "Required before public ask" : "Positive survey cleared"} />
                  <Mini label="Suppressions" value={review.suppressionReasons?.length ? review.suppressionReasons.length : "none"} />
                </div>
                {review.suppressionReasons?.length ? <p className="mt-2 text-xs leading-5 text-red-700">Suppressed: {review.suppressionReasons.join("; ")}</p> : null}
                {review.blockedReason ? <p className="mt-1 text-xs leading-5 text-red-700">{review.blockedReason}</p> : null}
                <p className="mt-1 text-xs leading-5 text-neutral-500">Eligibility: {jsonSummary(review.eligibilitySummary)}</p>
                {review.publicReviewText ? <p className="mt-3 text-sm leading-6 text-neutral-700">{review.publicReviewText}</p> : null}
                {review.responseDraft ? <p className="mt-2 rounded-md border border-cyan-100 bg-white p-2 text-xs leading-5 text-neutral-700">{review.responseDraft}</p> : null}
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <ReviewStatusButton id={review.id} requestStatus="READY_FOR_APPROVAL" label="Ready for approval" />
                  <ReviewStatusButton id={review.id} requestStatus="APPROVED_STAGED" label="Approve request" />
                  <ReviewStatusButton id={review.id} requestStatus="BLOCKED_SERVICE_RECOVERY" label="Hold for recovery" />
                  <ReviewStatusButton id={review.id} requestStatus="COMPLETED" label="Complete internal work" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Create review work" eyebrow="Single-patient or practice-level">
          <form action={createReviewAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Patient<select name="patientId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">Practice-level request</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} - {p.chartNumber}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="serviceLine" label="Service line" placeholder="Hygiene, implant, emergency" />
              <Select name="requestChannel" label="Channel" options={["SMS", "EMAIL", "QR", "PORTAL", "PHONE"]} />
            </div>
            <Select name="reviewSite" label="Destination" options={["SMART_LINK", "GOOGLE_BUSINESS_PROFILE", "FACEBOOK_PAGE", "YELP", "HEALTHGRADES", "INTERNAL_TESTIMONIAL"]} />
            <Textarea name="responseDraft" label="Request note or response draft" required={false} />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create reputation work</button>
          </form>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Review response approvals" eyebrow="AI draft, human approval, connector-gated publishing">
          <div className="grid gap-3">
            {responses.map((response) => (
              <div key={response.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{person(response)} · {clean(response.reviewSite)}</p>
                    <p className="mt-1 text-xs text-neutral-600">Rating {response.rating ?? "pending"} · {clean(response.publicationStatus)}</p>
                  </div>
                  <StatusFor value={response.approvalStatus} />
                </div>
                {response.publicReviewText ? <p className="mt-3 text-sm leading-6 text-neutral-700">{response.publicReviewText}</p> : null}
                <p className="mt-3 rounded-md border border-neutral-200 bg-white p-2 text-sm leading-6 text-neutral-700">{response.draftBody}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Mini label="Source connector" value={clean(response.sourceSiteStatus)} />
                  <Mini label="HIPAA guardrails" value={jsonSummary(response.hipaaGuardrails)} />
                </div>
                {response.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{response.blockedReason}</p> : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <ResponseButton id={response.id} approvalStatus="NEEDS_REVIEW" label="Needs review" />
                  <ResponseButton id={response.id} approvalStatus="APPROVED" label="Approve reply" />
                  <ResponseButton id={response.id} approvalStatus="REVISION_REQUIRED" label="Request revision" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Survey and service recovery" eyebrow="Private feedback before public asks">
          <div className="grid gap-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{person(survey)} · {clean(survey.surveyType)}</p>
                    <p className="mt-1 text-xs text-neutral-600">Score {survey.score ?? "pending"} · NPS {survey.nps ?? "pending"} · due {formatDate(survey.dueAt)}</p>
                  </div>
                  <StatusFor value={survey.recoveryRequired ? "RECOVERY_REQUIRED" : survey.status} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Mini label="Connector" value={clean(survey.connectorStatus)} />
                  <Mini label="Public ask" value={survey.recoveryRequired ? "Blocked until recovery closes" : "Eligible after approval"} />
                </div>
                {survey.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{survey.blockedReason}</p> : null}
                {survey.responseText ? <p className="mt-2 text-sm leading-6 text-neutral-700">{survey.responseText}</p> : null}
              </div>
            ))}
            {recoveryCases.map((item) => (
              <div key={item.id} className="rounded-md border border-red-100 bg-red-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{person(item)} · {clean(item.sentiment)}</p>
                    <p className="mt-1 text-xs text-neutral-600">Due {formatDate(item.dueAt)}</p>
                  </div>
                  <StatusFor value={item.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{item.reason}</p>
                {item.recoveryNote ? <p className="mt-2 text-xs leading-5 text-neutral-600">{item.recoveryNote}</p> : null}
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <PmsCard title="Listing accuracy and review sources" eyebrow="Local-search profile operations">
          <div className="grid gap-3">
            {listings.map((listing) => (
              <div key={listing.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-950">{clean(listing.platform)} · {listing.locationName ?? "Practice"}</p>
                    <p className="mt-1 text-xs text-neutral-600">{listing.nameOnListing} · {listing.phoneOnListing ?? "No phone"} · {listing.addressOnListing ?? "No address"}</p>
                  </div>
                  <StatusFor value={listing.syncStatus} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Mini label="Rating" value={listing.rating ?? "pending"} />
                  <Mini label="Reviews" value={listing.reviewCount} />
                  <Mini label="Quality" value={`${listing.dataQualityScore}%`} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Mini label="NAP" value={clean(listing.napConsistencyStatus)} />
                  <Mini label="Sync readiness" value={jsonSummary(listing.syncReadiness)} />
                </div>
                {listing.issueSummary ? <p className="mt-3 text-sm leading-6 text-red-700">{listing.issueSummary}</p> : null}
                <p className="mt-2 text-xs leading-5 text-neutral-600">{listing.ownerAction ?? listing.nextAction}</p>
                <form action={listingAction} className="mt-3 grid gap-2 sm:grid-cols-[0.8fr_1.2fr_auto]">
                  <input type="hidden" name="id" value={listing.id} />
                  <select name="syncStatus" defaultValue={listing.syncStatus} className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
                    {["CONNECTED_REVIEW_SYNC", "DATA_MISMATCH", "NEEDS_CONNECTION", "MANUAL_REVIEW", "SYNC_ERROR"].map((item) => <option key={item} value={item}>{clean(item)}</option>)}
                  </select>
                  <input name="nextAction" defaultValue={listing.nextAction} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-xs" />
                  <button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Update</button>
                </form>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Listings issue queue" eyebrow="Rankings, Local SEO actions, owner proof">
          <div className="grid gap-3">
            {listingIssueQueue.map((task) => (
              <div key={task.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{task.title}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(task.taskType)} · {task.platform ?? "Website"} · {task.locationName ?? "Practice"}</p>
                  </div>
                  <StatusFor value={task.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Mini label="Priority" value={clean(task.priority)} />
                  <Mini label="Connector" value={clean(task.connectorStatus)} />
                  <Mini label="Listing state" value={clean(task.listingSyncStatus ?? task.napConsistencyStatus ?? "not linked")} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{task.issueSummary}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{task.nextAction}</p>
                <p className="mt-1 text-xs text-neutral-500">Due {formatDate(task.dueAt)}</p>
              </div>
            ))}
            {!listingIssueQueue.length ? <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">No open listing or Local SEO issues.</p> : null}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4">
        <PmsCard title="Campaign rules and suppression logic" eyebrow="Automated review, referral, and survey requests">
          <form action={ruleAction} className="mb-3 grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="name" label="Rule name" placeholder="Emergency visit follow-up" />
              <Select name="triggerEvent" label="Trigger" options={["COMPLETED_APPOINTMENT", "TREATMENT_PLAN_ACCEPTED", "LOW_SURVEY_OR_PHONE_SENTIMENT", "POST_PAYMENT_RESOLVED"]} />
              <Input name="serviceLine" label="Service line" placeholder="Emergency, hygiene, implants" />
              <Select name="targetReviewSite" label="Destination" options={["SMART_LINK", "GOOGLE_BUSINESS_PROFILE", "FACEBOOK_PAGE", "INTERNAL_TESTIMONIAL", "NONE"]} />
              <Input name="sendDelayHours" label="Delay hours" placeholder="24" />
              <Input name="cooldownDays" label="Cooldown days" placeholder="90" />
              <Input name="minimumSurveyScore" label="Minimum survey score" placeholder="8" />
              <Select name="channel" label="Channel" options={["SMS", "EMAIL", "PHONE", "PORTAL"]} />
            </div>
            <Textarea name="suppressions" label="Suppressions, comma-separated" placeholder="open recovery, no consent, unsigned note, billing question" required={false} />
            <Textarea name="nextAction" label="Next action" placeholder="Evaluate completed visits and stage only eligible requests." required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Save campaign rule</button>
          </form>
          <div className="grid gap-3">
            {campaignRules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{rule.name}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(rule.triggerEvent)} · {rule.serviceLine ?? "All services"} · {rule.channel} to {clean(rule.targetReviewSite)}</p>
                  </div>
                  <StatusFor value={rule.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Mini label="Delay" value={`${rule.sendDelayHours}h`} />
                  <Mini label="Cooldown" value={`${rule.cooldownDays}d`} />
                  <Mini label="Survey floor" value={rule.minimumSurveyScore ?? "none"} />
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{rule.nextAction}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-500">Suppressions: {jsonSummary(rule.suppressions)}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <PmsCard title="Create referral or testimonial request" eyebrow="Growth loop after good care">
          <form action={referralCreateAction} className="grid gap-3">
            <label className="grid gap-1 text-xs font-semibold text-neutral-700">Patient<select name="patientId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">Practice-level</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} - {p.chartNumber}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="requestType" label="Request type" options={["REFERRAL", "TESTIMONIAL", "CASE_STORY", "REVIEW_FOLLOWUP"]} />
              <Select name="channel" label="Channel" options={["SMS", "EMAIL", "PHONE", "PORTAL"]} />
              <Select name="consentStatus" label="Consent" options={["VERIFIED", "CONSENTED", "OPTED_IN", "UNKNOWN", "OPTED_OUT", "DECLINED"]} />
              <Input name="offerSummary" label="Offer summary" placeholder="Compliance-approved referral language" />
            </div>
            <Textarea name="messageDraft" label="Message draft" required />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Stage request</button>
          </form>
        </PmsCard>

        <PmsCard title="Referral and testimonial queue" eyebrow="Approved requests, connector-gated delivery">
          <div className="grid gap-3 lg:grid-cols-2">
            {referralRequests.map((item) => (
              <div key={item.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{person(item)} · {clean(item.requestType)}</p>
                    <p className="mt-1 text-xs text-neutral-600">{item.channel} · consent {clean(item.consentStatus)} · delivery {clean(item.conversionStatus)}</p>
                  </div>
                  <StatusFor value={item.status} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Mini label="Connector" value={clean(item.connectorStatus)} />
                  <Mini label="Attribution" value={clean(item.bookingAttributionStatus)} />
                </div>
                {item.offerSummary ? <p className="mt-2 text-xs leading-5 text-neutral-600">{item.offerSummary}</p> : null}
                {item.complianceText ? <p className="mt-1 text-xs leading-5 text-neutral-500">{item.complianceText}</p> : null}
                <p className="mt-1 text-xs leading-5 text-neutral-500">Attribution: {jsonSummary(item.attribution)}</p>
                {item.blockedReason ? <p className="mt-1 text-xs leading-5 text-red-700">{item.blockedReason}</p> : null}
                <p className="mt-2 text-sm leading-6 text-neutral-700">{item.messageDraft}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <ReferralButton id={item.id} status="READY_FOR_APPROVAL" label="Ready" />
                  <ReferralButton id={item.id} status="APPROVED_TO_SEND" label="Approve" />
                  <ReferralButton id={item.id} status="BLOCKED_NEEDS_REVIEW" label="Hold" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function ReviewStatusButton({ id, requestStatus, label }: { id: string; requestStatus: string; label: string }) {
  return <form action={reviewStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="requestStatus" value={requestStatus} /><Button>{label}</Button></form>;
}

function ResponseButton({ id, approvalStatus, label }: { id: string; approvalStatus: string; label: string }) {
  return <form action={responseAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="approvalStatus" value={approvalStatus} /><Button>{label}</Button></form>;
}

function ReferralButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={referralStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><Button>{label}</Button></form>;
}

function Button({ children }: { children: React.ReactNode }) {
  return <button className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">{children}</button>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-white p-2 ring-1 ring-neutral-200"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p><p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} placeholder={placeholder} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{clean(option)}</option>)}</select></label>;
}

function Textarea({ name, label, placeholder, required = false }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} placeholder={placeholder} required={required} rows={4} className="min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function person(row: { firstName: string | null; lastName: string | null; chartNumber?: string | null }) {
  return row.lastName ? `${row.lastName}, ${row.firstName}${row.chartNumber ? ` - ${row.chartNumber}` : ""}` : "Practice-level";
}

function clean(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "not scheduled";
  return new Date(value).toLocaleString();
}

function jsonSummary(value: unknown) {
  if (!value) return "none";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (Array.isArray(objectValue.rules)) return objectValue.rules.join(", ");
    return Object.entries(objectValue).map(([key, item]) => `${clean(key)}: ${String(item)}`).join("; ");
  }
  return String(value);
}
