import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createMarketingCampaign, getMarketingOperatingCenter, updateLocalSeoTaskStatus, updateMarketingStatus } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  campaignType: string;
  status: string;
  audienceDefinition: string;
  channelMix: string[];
  sourceAudience: string;
  channelPlan: unknown;
  connectorReadiness: unknown;
  attribution: unknown;
  blockedReason: string | null;
  estimatedAudience: number;
  attributedBookings: number;
  attributedProductionCents: number;
  complianceStatus: string;
};

type MarketingMetrics = {
  campaigns: string;
  landingPages: string;
  aiDrafts: string;
  attributedProduction: string;
  localSeoOpen: string;
  stagedChannels: string;
  approvalQueue: string;
  bookedAppointments: string;
  acceptedTreatment: string;
  aiSeoOpen: string;
};

type LandingPageRow = {
  id: string;
  slug: string;
  title: string;
  serviceLine: string;
  status: string;
  offerSummary: string | null;
  primaryCta: string;
  trackingPlan: unknown;
  formMapping: unknown;
  bookingRouting: string | null;
  attribution: unknown;
  connectorStatus: string;
};

type AssetRow = {
  id: string;
  title: string;
  sourceModule: string;
  assetType: string;
  promptInput: string;
  generatedDraft: string;
  approvalStatus: string;
  complianceNotes: string | null;
  brief: string | null;
  sourceData: unknown;
  reviewerRoleKey: string | null;
  revisionState: string;
  useTarget: string | null;
  approvalNotes: string | null;
};

type LocalSeoTaskRow = {
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
};

async function createAction(formData: FormData) {
  "use server";
  await createMarketingCampaign({
    landingPageId: String(formData.get("landingPageId") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    campaignType: String(formData.get("campaignType") ?? "RECALL_REACTIVATION"),
    audienceDefinition: String(formData.get("audienceDefinition") ?? ""),
    primaryGoal: String(formData.get("primaryGoal") ?? ""),
    channelMix: String(formData.get("channelMix") ?? ""),
    aiStudioBrief: String(formData.get("aiStudioBrief") ?? ""),
  });
  revalidatePath("/app/marketing");
}

async function statusAction(formData: FormData) {
  "use server";
  await updateMarketingStatus(String(formData.get("target") ?? "campaign") as "campaign" | "landingPage" | "asset", String(formData.get("id") ?? ""), String(formData.get("status") ?? "DRAFT"));
  revalidatePath("/app/marketing");
}

async function localSeoStatusAction(formData: FormData) {
  "use server";
  await updateLocalSeoTaskStatus(String(formData.get("id") ?? ""), String(formData.get("status") ?? "OPEN"));
  revalidatePath("/app/marketing");
}

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getMarketingOperatingCenter();
  const metrics = center.metrics as MarketingMetrics;
  const campaigns = center.campaigns as CampaignRow[];
  const landingPages = center.landingPages as LandingPageRow[];
  const assets = center.assets as AssetRow[];
  const localSeoTasks = center.localSeoTasks as LocalSeoTaskRow[];

  return (
    <FoundationShell active="/app/marketing" roleKey={role.key}>
      <PageHeader
        eyebrow="Marketing, AI Studio, Local SEO, and AI SEO"
        title="Growth studio tied to PMS production"
        body="Campaigns, landing pages, surveys, review drafts, Local SEO tasks, AI SEO content, landing-page copy, and phone follow-up copy are managed here, but attribution flows back to PMS bookings, accepted treatment, production, and reputation outcomes."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/marketing" />

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Campaigns" value={metrics.campaigns} />
        <Metric label="Landing pages" value={metrics.landingPages} />
        <Metric label="AI drafts" value={metrics.aiDrafts} />
        <Metric label="Attributed production" value={<Money cents={Number(metrics.attributedProduction)} />} />
        <Metric label="Local SEO open" value={metrics.localSeoOpen} />
        <Metric label="Staged plans" value={metrics.stagedChannels} />
        <Metric label="Approval queue" value={metrics.approvalQueue} />
        <Metric label="AI SEO open" value={metrics.aiSeoOpen} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <PmsCard title="Audience builder" eyebrow="PMS, RCM, reputation graph">
          <div className="grid gap-2 text-sm leading-6 text-neutral-700">
            <Small label="Booked appointments" value={metrics.bookedAppointments} />
            <Small label="Accepted treatment" value={<Money cents={Number(metrics.acceptedTreatment ?? 0)} />} />
            <Small label="Audience gates" value="Consent, channel preference, quiet hours, service recovery, billing dispute, duplicate outreach" />
          </div>
        </PmsCard>
        <PmsCard title="Approval workflow" eyebrow="Internal only until proof is present">
          <div className="grid gap-2 text-sm leading-6 text-neutral-700">
            <Small label="Policy" value="Marketing plus manager review; provider review for clinical, local, and AI SEO claims" />
            <Small label="Evidence" value="Audience snapshot, suppressions, AI draft, route test, connector readiness, attribution plan" />
            <Small label="External action" value="Blocked without connector acknowledgement or manual owner proof" />
          </div>
        </PmsCard>
        <PmsCard title="Attribution spine" eyebrow="Booked appointment to revenue">
          <div className="grid gap-2 text-sm leading-6 text-neutral-700">
            <Small label="First touch" value="UTM, listing source, call tracking, form route, or booking link" />
            <Small label="Conversion" value="PMS appointment, completed visit, treatment acceptance, ledger production, collection" />
            <Small label="Feedback loop" value="Review, referral, and service recovery outcomes feed the next audience build" />
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <PmsCard title="Create campaign" eyebrow="Audience and attribution plan">
          <form action={createAction} className="grid gap-3">
            <Input name="name" label="Campaign name" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="campaignType" label="Campaign type" options={["RECALL_REACTIVATION", "UNSCHEDULED_TREATMENT", "INACTIVE_PATIENTS", "FAILED_APPOINTMENTS", "BALANCE_FOLLOW_UP", "NEW_PATIENT", "IMPLANTS", "WHITENING", "CLEAR_ALIGNERS", "MEMBERSHIP", "REFERRAL_GROWTH", "TESTIMONIALS", "LOCAL_SEO", "AI_SEO"]} />
              <label className="grid gap-1 text-xs font-semibold text-neutral-700">Landing page<select name="landingPageId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm"><option value="">No landing page</option>{landingPages.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}</select></label>
            </div>
            <Textarea name="audienceDefinition" label="Audience definition" required />
            <Textarea name="primaryGoal" label="Primary goal" required />
            <Input name="channelMix" label="Channel mix" placeholder="SMS, EMAIL, PHONE, LANDING_PAGE" />
            <Textarea name="aiStudioBrief" label="AI Studio brief" />
            <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Create campaign</button>
          </form>
        </PmsCard>

        <PmsCard title="Campaign workbench" eyebrow="No external send until channel connector is live">
          <div className="grid gap-3">
            {campaigns.map((campaign) => {
              const channelPlan = asRecord(campaign.channelPlan);
              const audienceBuilder = asRecord(channelPlan?.pmsRcmReputationAudienceBuilder) ?? asRecord(channelPlan?.audienceBlueprint);
              const approvalWorkflow = asRecord(channelPlan?.approvalWorkflow);
              return (
              <div key={campaign.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{campaign.name}</p>
                    <p className="mt-1 text-xs text-neutral-600">{String(campaign.campaignType).replaceAll("_", " ")} · {campaign.channelMix?.join(", ")}</p>
                    <p className="mt-1 text-xs text-neutral-600">Audience: {campaign.sourceAudience} · {campaign.audienceDefinition}</p>
                  </div>
                  <StatusFor value={campaign.status} />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-neutral-600 md:grid-cols-4">
                  <Small label="Audience" value={campaign.estimatedAudience} />
                  <Small label="Bookings" value={campaign.attributedBookings} />
                  <Small label="Production" value={<Money cents={Number(campaign.attributedProductionCents ?? 0)} />} />
                  <Small label="Compliance" value={String(campaign.complianceStatus).replaceAll("_", " ")} />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <Small label="PMS cohort" value={String(audienceBuilder?.pms ?? "Appointment, recall, treatment, and patient status")} />
                  <Small label="RCM filter" value={String(audienceBuilder?.rcm ?? "Balance, benefits, financing, and claim sensitivity")} />
                  <Small label="Reputation filter" value={String(audienceBuilder?.reputation ?? "Survey, review, referral, and recovery context")} />
                  <Small label="Suppressions" value={listSummary(audienceBuilder?.suppressions)} />
                  <Small label="Approval" value={listSummary(approvalWorkflow?.requiredRoles)} />
                  <Small label="Connectors" value={jsonSummary(campaign.connectorReadiness)} />
                  <Small label="Attribution" value={jsonSummary(campaign.attribution)} />
                </div>
                {campaign.blockedReason ? <p className="mt-2 text-xs leading-5 text-red-700">{campaign.blockedReason}</p> : null}
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <StatusButton target="campaign" id={campaign.id} status="READY_FOR_APPROVAL" label="Ready review" />
                  <StatusButton target="campaign" id={campaign.id} status="APPROVED_STAGED" label="Approve staged" />
                  <StatusButton target="campaign" id={campaign.id} status="ACTIVE_INTERNAL" label="Internal live" />
                </div>
              </div>
            );
            })}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Landing pages and website" eyebrow="Website, Local SEO, conversion routing">
          <div className="grid gap-3">
            {landingPages.map((page) => (
              <div key={page.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{page.title}</p><StatusFor value={page.status} /></div>
                <p className="mt-1 text-xs text-neutral-600">/{page.slug} · {page.serviceLine} · CTA: {page.primaryCta}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{page.offerSummary}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <Small label="Connector" value={clean(page.connectorStatus)} />
                  <Small label="Tracking" value={jsonSummary(page.trackingPlan)} />
                  <Small label="Form mapping" value={jsonSummary(page.formMapping)} />
                  <Small label="Attribution" value={jsonSummary(page.attribution)} />
                  <Small label="Routing" value={page.bookingRouting ?? "PMS booking route required"} />
                  <Small label="Local/AI SEO" value={`${page.serviceLine} page, schema, listing source, and AI search answer grounding`} />
                </div>
                {page.bookingRouting ? <p className="mt-2 text-xs leading-5 text-neutral-600">{page.bookingRouting}</p> : null}
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <StatusButton target="landingPage" id={page.id} status="READY_FOR_APPROVAL" label="Ready review" />
                  <StatusButton target="landingPage" id={page.id} status="APPROVED_STAGED" label="Approve staged" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="AI Studio production queue" eyebrow="Drafts require human approval">
          <div className="grid gap-3">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{asset.title}</p><StatusFor value={asset.approvalStatus} /></div>
                <p className="mt-1 text-xs text-neutral-600">{asset.sourceModule} · {String(asset.assetType).replaceAll("_", " ")}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <Small label="Reviewer" value={asset.reviewerRoleKey ?? "unassigned"} />
                  <Small label="Revision" value={clean(asset.revisionState)} />
                  <Small label="Use target" value={asset.useTarget ?? asset.assetType} />
                </div>
                {asset.brief ? <p className="mt-2 text-xs leading-5 text-neutral-600">Brief: {asset.brief}</p> : null}
                <p className="mt-2 text-xs leading-5 text-neutral-600">Prompt: {asset.promptInput}</p>
                <p className="mt-2 rounded-md border border-cyan-100 bg-white p-2 text-sm leading-6 text-neutral-700">{asset.generatedDraft}</p>
                <p className="mt-2 text-xs text-neutral-500">Grounding data: {jsonSummary(asset.sourceData)}</p>
                {asset.approvalNotes ?? asset.complianceNotes ? <p className="mt-2 text-xs text-neutral-500">{asset.approvalNotes ?? asset.complianceNotes}</p> : null}
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <StatusButton target="asset" id={asset.id} status="APPROVED" label="Approve draft" />
                  <StatusButton target="asset" id={asset.id} status="REVISION_REQUIRED" label="Needs revision" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4">
        <PmsCard title="Local SEO task queue" eyebrow="Listings, GBP-style posts, services, citations, rankings">
          <div className="grid gap-3 lg:grid-cols-3">
            {localSeoTasks.map((task) => (
              <div key={task.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{task.title}</p>
                    <p className="mt-1 text-xs text-neutral-600">{clean(task.taskType)} · {task.platform ?? "Website"} · {task.locationName ?? "Practice"}</p>
                  </div>
                  <StatusFor value={task.status} />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Small label="Priority" value={clean(task.priority)} />
                  <Small label="Connector" value={clean(task.connectorStatus)} />
                  <Small label="Service" value={task.serviceLine ?? "Practice"} />
                  <Small label="AI SEO signal" value={["AI_SEO", "SCHEMA", "LOCATION_PAGE", "GBP_POST"].includes(task.taskType) ? "Feeds AI/local search readiness" : "Listing hygiene"} />
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{task.issueSummary}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">{task.nextAction}</p>
                <p className="mt-1 text-xs text-neutral-500">Due {formatDate(task.dueAt)}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <LocalSeoButton id={task.id} status="READY_FOR_APPROVAL" label="Ready" />
                  <LocalSeoButton id={task.id} status="APPROVED_STAGED" label="Stage" />
                  <LocalSeoButton id={task.id} status="COMPLETED" label="Done" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>
    </FoundationShell>
  );
}

function StatusButton({ target, id, status, label }: { target: string; id: string; status: string; label: string }) {
  return <form action={statusAction}><input type="hidden" name="target" value={target} /><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><button className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-white">{label}</button></form>;
}

function LocalSeoButton({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={localSeoStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><button className="w-full rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-white">{label}</button></form>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p><p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p></div>;
}

function Small({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-white px-3 py-2 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{label}</p><p className="mt-1 font-semibold text-neutral-950">{value}</p></div>;
}

function Input({ name, label, required = false, placeholder }: { name: string; label: string; required?: boolean; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<input name={name} required={required} placeholder={placeholder} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function Select({ name, label, options }: { name: string; label: string; options: string[] }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<select name={name} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

function Textarea({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-neutral-700">{label}<textarea name={name} required={required} rows={3} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" /></label>;
}

function clean(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "not scheduled";
  return new Date(value).toLocaleString();
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listSummary(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value) return String(value);
  return "not set";
}

function jsonSummary(value: unknown) {
  if (!value) return "none";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${clean(key)}: ${Array.isArray(item) ? item.join(", ") : typeof item === "object" && item !== null ? JSON.stringify(item) : String(item)}`).join("; ");
  }
  return String(value);
}
