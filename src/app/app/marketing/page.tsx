import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { Money, PmsCard, StatusFor } from "@/components/pms-ui";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import { createMarketingCampaign, getMarketingOperatingCenter, updateMarketingStatus } from "@/lib/operating-system-repository";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  campaignType: string;
  status: string;
  audienceDefinition: string;
  channelMix: string[];
  estimatedAudience: number;
  attributedBookings: number;
  attributedProductionCents: number;
  complianceStatus: string;
};

type LandingPageRow = {
  id: string;
  slug: string;
  title: string;
  serviceLine: string;
  status: string;
  offerSummary: string | null;
  primaryCta: string;
};

type AssetRow = {
  id: string;
  title: string;
  sourceModule: string;
  assetType: string;
  generatedDraft: string;
  approvalStatus: string;
  complianceNotes: string | null;
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

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const role = getRole(params.role);
  const center = await getMarketingOperatingCenter();
  const metrics = center.metrics;
  const campaigns = center.campaigns as CampaignRow[];
  const landingPages = center.landingPages as LandingPageRow[];
  const assets = center.assets as AssetRow[];

  return (
    <FoundationShell active="/app/marketing" roleKey={role.key}>
      <PageHeader
        eyebrow="Marketing, AI Studio, Local SEO, and AI SEO"
        title="Growth studio tied to PMS production"
        body="Campaigns, landing pages, surveys, review drafts, Local SEO tasks, AI SEO content, landing-page copy, and phone follow-up copy are managed here, but attribution flows back to PMS bookings, accepted treatment, production, and reputation outcomes."
      />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/marketing" />

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Campaigns" value={metrics.campaigns} />
        <Metric label="Landing pages" value={metrics.landingPages} />
        <Metric label="AI drafts" value={metrics.aiDrafts} />
        <Metric label="Attributed production" value={<Money cents={Number(metrics.attributedProduction)} />} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <PmsCard title="Create campaign" eyebrow="Audience and attribution plan">
          <form action={createAction} className="grid gap-3">
            <Input name="name" label="Campaign name" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select name="campaignType" label="Campaign type" options={["RECALL_REACTIVATION", "UNSCHEDULED_TREATMENT", "NEW_PATIENT", "IMPLANTS", "WHITENING", "MEMBERSHIP", "REFERRAL_GROWTH", "LOCAL_SEO", "AI_SEO"]} />
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
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{campaign.name}</p>
                    <p className="mt-1 text-xs text-neutral-600">{String(campaign.campaignType).replaceAll("_", " ")} · {campaign.channelMix?.join(", ")}</p>
                    <p className="mt-1 text-xs text-neutral-600">Audience: {campaign.audienceDefinition}</p>
                  </div>
                  <StatusFor value={campaign.status} />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-neutral-600 md:grid-cols-4">
                  <Small label="Audience" value={campaign.estimatedAudience} />
                  <Small label="Bookings" value={campaign.attributedBookings} />
                  <Small label="Production" value={<Money cents={Number(campaign.attributedProductionCents ?? 0)} />} />
                  <Small label="Compliance" value={String(campaign.complianceStatus).replaceAll("_", " ")} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <StatusButton target="campaign" id={campaign.id} status="READY_FOR_APPROVAL" label="Ready review" />
                  <StatusButton target="campaign" id={campaign.id} status="APPROVED_STAGED" label="Approve staged" />
                  <StatusButton target="campaign" id={campaign.id} status="ACTIVE_INTERNAL" label="Activate internal" />
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <PmsCard title="Landing pages and website" eyebrow="Website, Local SEO, conversion">
          <div className="grid gap-3">
            {landingPages.map((page) => (
              <div key={page.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-neutral-950">{page.title}</p><StatusFor value={page.status} /></div>
                <p className="mt-1 text-xs text-neutral-600">/{page.slug} · {page.serviceLine} · CTA: {page.primaryCta}</p>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{page.offerSummary}</p>
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
                <p className="mt-2 rounded-md border border-cyan-100 bg-white p-2 text-sm leading-6 text-neutral-700">{asset.generatedDraft}</p>
                {asset.complianceNotes ? <p className="mt-2 text-xs text-neutral-500">{asset.complianceNotes}</p> : null}
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <StatusButton target="asset" id={asset.id} status="APPROVED" label="Approve draft" />
                  <StatusButton target="asset" id={asset.id} status="REVISION_REQUIRED" label="Needs revision" />
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
